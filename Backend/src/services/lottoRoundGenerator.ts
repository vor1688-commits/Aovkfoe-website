import { Pool } from 'pg';
import * as schedule from 'node-schedule'; 

interface LottoType {
    id: number;
    name: string;
    betting_start_time: string;
    betting_cutoff_time: string;
    generation_strategy: 'daily' | 'interval' | 'monthly_fixed_days' | 'monthly_floating_dates' | 'onlyday';
    interval_minutes: number | null;
    monthly_fixed_days: number[] | null;
    monthly_floating_dates: any[] | null;
    specific_days_of_week: number[] | null;
    betting_skip_start_day: number;
}

const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function calculateNextRoundDatetimes(
    baseDate: Date,
    strategy: string,
    bettingStartTime: string,
    bettingCutoffTime: string,
    intervalMinutes: number | null,
    monthlyFixedDays: number[] | null,
    monthlyFloatingDates: any[] | null,
    specificDaysOfWeek: number[] | null,
    betting_skip_start_day: number,
    isFirstRoundEver: boolean
): { open: Date; cutoff: Date } | null {

    const [openHour, openMinute] = bettingStartTime ? bettingStartTime.split(':').map(Number) : [0, 0];
    const [cutoffHour, cutoffMinute] = bettingCutoffTime ? bettingCutoffTime.split(':').map(Number) : [0, 0];
    
    const nowInThailand = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));

    const setTimeOnDate = (date: Date, hour: number, minute: number): Date => {
        const newDate = new Date(date);
        newDate.setHours(hour, minute, 0, 0);
        return newDate;
    };

    // [แก้ไข] เพิ่มเงื่อนไข && intervalMinutes !== null
    if (strategy === 'interval' && intervalMinutes !== null) {
        let nextOpenDate = new Date(baseDate.getTime() + 1000); 
        let nextCutoffDate = new Date(nextOpenDate.getTime() + (intervalMinutes * 60 * 1000));
        
        while (nextCutoffDate <= nowInThailand) {
            nextOpenDate = new Date(nextOpenDate.getTime() + intervalMinutes * 60 * 1000);
            nextCutoffDate = new Date(nextCutoffDate.getTime() + intervalMinutes * 60 * 1000);
        }
        return { open: nextOpenDate, cutoff: nextCutoffDate };
    }
    
    let searchDate = new Date(baseDate);
    searchDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 730; i++) {
        if (i > 0) {
            searchDate.setDate(searchDate.getDate() + 1);
        }

        let isValidDay = false;
        switch (strategy) {
            case 'daily': isValidDay = true; break;
            case 'onlyday': if (specificDaysOfWeek) { isValidDay = specificDaysOfWeek.includes(searchDate.getDay()); } break;
            case 'monthly_fixed_days': if (monthlyFixedDays) { const day = searchDate.getDate(); const month = searchDate.getMonth() + 1; const isFloating = monthlyFloatingDates?.some(rule => rule.month === month && rule.day === day) ?? false; isValidDay = monthlyFixedDays.includes(day) || isFloating; } break;
        }

        if (isValidDay) {
            if (!isFirstRoundEver && (toLocalDateString(searchDate) === toLocalDateString(baseDate))) {
                continue;
            }
            
            const potentialCutoff = setTimeOnDate(searchDate, cutoffHour, cutoffMinute);

            if (potentialCutoff > nowInThailand) {
                const openDate = new Date(searchDate);
                openDate.setDate(openDate.getDate() + betting_skip_start_day);
                const finalOpen = setTimeOnDate(openDate, openHour, openMinute);
                const finalCutoff = setTimeOnDate(searchDate, cutoffHour, cutoffMinute);
                return { open: finalOpen, cutoff: finalCutoff };
            }
        }
    }

    console.warn(`[Generator] Could not find a valid future date for strategy: ${strategy}`);
    return null;
} 


export async function generateLottoRoundsJob(db: Pool) {
    var _a, _b, _c;
    console.log('Running scheduled job: generate-next-rounds');
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const updateExpiredAutoResult = await client.query(`UPDATE lotto_rounds SET status = 'closed' WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active'`);
        if (((_a = updateExpiredAutoResult.rowCount) !== null && _a !== void 0 ? _a : 0) > 0) { console.log(`[Scheduled Job] Updated ${updateExpiredAutoResult.rowCount} auto rounds to 'closed'.`); }

        const updateExpiredManualResult = await client.query(`UPDATE lotto_rounds SET status = 'manual_closed' WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'manual_active'`);
        if (((_b = updateExpiredManualResult.rowCount) !== null && _b !== void 0 ? _b : 0) > 0) { console.log(`[Scheduled Job] Updated ${updateExpiredManualResult.rowCount} manual rounds to 'manual_closed'.`); }

        const lottoTypesResult = await client.query<LottoType>(`SELECT id, name, betting_start_time, betting_cutoff_time, generation_strategy, interval_minutes, monthly_fixed_days, monthly_floating_dates, specific_days_of_week, betting_skip_start_day FROM lotto_types ORDER BY id`);

        let generatedCount = 0;
        const now = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));

        for (const lottoType of lottoTypesResult.rows) {
            const hasFutureActiveRoundResult = await client.query(`SELECT 1 FROM lotto_rounds WHERE lotto_type_id = $1 AND cutoff_datetime > (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active' LIMIT 1`, [lottoType.id]);
            if (((_c = hasFutureActiveRoundResult.rowCount) !== null && _c !== void 0 ? _c : 0) > 0) { continue; }

            const latestRoundResult = await client.query(`SELECT cutoff_datetime FROM lotto_rounds WHERE lotto_type_id = $1 ORDER BY cutoff_datetime DESC LIMIT 1`, [lottoType.id]);

            let baseDate;
            const isFirstRoundEver = latestRoundResult.rows.length === 0;

            if (isFirstRoundEver) {
                baseDate = now;
            } else {
                const dbCutoffDate = new Date(latestRoundResult.rows[0].cutoff_datetime);
                baseDate = new Date(dbCutoffDate.getTime() + (7 * 60 * 60 * 1000));
            }

            const nextRoundTimes = calculateNextRoundDatetimes(
                baseDate, 
                lottoType.generation_strategy, 
                lottoType.betting_start_time, 
                lottoType.betting_cutoff_time, 
                lottoType.interval_minutes, 
                lottoType.monthly_fixed_days, 
                lottoType.monthly_floating_dates, 
                lottoType.specific_days_of_week, 
                lottoType.betting_skip_start_day,
                isFirstRoundEver
            );

            if (nextRoundTimes) {
                await client.query(`INSERT INTO lotto_rounds (name, open_datetime, cutoff_datetime, lotto_type_id, status) VALUES ($1, $2, $3, $4, 'active')`, [lottoType.name, nextRoundTimes.open, nextRoundTimes.cutoff, lottoType.id]);
                generatedCount++;
                console.log(`[Scheduled Job] Generated new round for ${lottoType.name}: Open=${nextRoundTimes.open.toISOString()}, Cutoff=${nextRoundTimes.cutoff.toISOString()}`);
            }
        }

        await client.query('COMMIT');
        if (generatedCount > 0) { console.log(`[Scheduled Job] Finished. Generated ${generatedCount} new rounds.`); }
    }
    catch (innerErr) {
        await client.query('ROLLBACK');
        console.error('[Scheduled Job] Error during transaction:', innerErr);
    }
    finally {
        client.release();
    }
}

export function startLottoRoundGenerationJob(db: Pool) {
    console.log('Lotto round generation job scheduled to run every 1 minute.');
    schedule.scheduleJob('*/3 * * * *', () => { 
        generateLottoRoundsJob(db);
    });
}