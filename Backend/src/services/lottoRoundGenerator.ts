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

/**
 * คำนวณวัน-เวลาเปิดและปิดของรอบถัดไป (ฉบับปรับปรุง)
 * @returns Object ที่มี open และ cutoff Date (ในรูปแบบ UTC) หรือ null หากคำนวณไม่ได้
 */
function calculateNextRoundDatetimes(
    baseDate: Date, // ควรเป็นเวลา UTC
    strategy: string,
    bettingStartTime: string,
    bettingCutoffTime: string,
    intervalMinutes: number | null,
    monthlyFixedDays: number[] | null,
    monthlyFloatingDates: any[] | null,
    specificDaysOfWeek: number[] | null,
    betting_skip_start_day: number
): { open: Date; cutoff: Date } | null {

    const [openHour, openMinute] = bettingStartTime ? bettingStartTime.split(':').map(Number) : [0, 0];
    const [cutoffHour, cutoffMinute] = bettingCutoffTime ? bettingCutoffTime.split(':').map(Number) : [0, 0];
    
    const now = new Date(); // เวลาปัจจุบันของ Server (UTC)

    const setTimeOnDate = (date: Date, hour: number, minute: number): Date => {
        const newDate = new Date(date);
        // ใช้ setUTCHours เพื่อให้แน่ใจว่าเรากำลังทำงานกับเวลา UTC
        newDate.setUTCHours(hour, minute, 0, 0);
        return newDate;
    };

    if (strategy === 'interval' && intervalMinutes !== null) {
        let nextOpenDate = new Date(baseDate.getTime() + 1000); 
        let nextCutoffDate = new Date(nextOpenDate.getTime() + (intervalMinutes * 60 * 1000));
        
        while (nextCutoffDate <= now) {
            nextOpenDate.setTime(nextOpenDate.getTime() + intervalMinutes * 60 * 1000);
            nextCutoffDate.setTime(nextCutoffDate.getTime() + intervalMinutes * 60 * 1000);
        }
        return { open: nextOpenDate, cutoff: nextCutoffDate };
    }
    
    let searchDate = new Date(baseDate);
    searchDate.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < 730; i++) { // วนลูปสูงสุด 2 ปี
        if (i > 0) {
            searchDate.setUTCDate(searchDate.getUTCDate() + 1);
        }

        let isRuleMatchedDay = false;
        switch (strategy) {
            case 'daily':
                isRuleMatchedDay = true;
                break;
            case 'onlyday':
                if (specificDaysOfWeek) {
                    isRuleMatchedDay = specificDaysOfWeek.includes(searchDate.getUTCDay());
                }
                break;
            case 'monthly_fixed_days':
                if (monthlyFixedDays) {
                    const dayOfMonth = searchDate.getUTCDate();
                    isRuleMatchedDay = monthlyFixedDays.includes(dayOfMonth);
                    // หมายเหตุ: Logic สำหรับ monthlyFloatingDates สามารถเพิ่มได้ที่นี่
                }
                break;
        }

        if (isRuleMatchedDay) {
            const finalDate = new Date(searchDate);
            finalDate.setUTCDate(finalDate.getUTCDate() + betting_skip_start_day);
            const potentialCutoff = setTimeOnDate(finalDate, cutoffHour, cutoffMinute);

            if (potentialCutoff > now) {
                const finalOpen = setTimeOnDate(finalDate, openHour, openMinute);
                return { open: finalOpen, cutoff: potentialCutoff };
            }
        }
    }

    console.warn(`[Generator] Could not find a valid future date for lottoType with strategy: ${strategy}`);
    return null;
}

export async function generateLottoRoundsJob(db: Pool) {
    console.log('Running scheduled job: generate-next-rounds');
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const updateExpiredAutoResult = await client.query(`
            UPDATE lotto_rounds 
            SET status = 'closed' 
            WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active'
        `);
        if ((updateExpiredAutoResult.rowCount ?? 0) > 0) {
            console.log(`[Scheduled Job] Updated ${updateExpiredAutoResult.rowCount} auto rounds to 'closed'.`);
        }

        const updateExpiredManualResult = await client.query(`
            UPDATE lotto_rounds 
            SET status = 'manual_closed' 
            WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'manual_active'
        `);
        if ((updateExpiredManualResult.rowCount ?? 0) > 0) {
            console.log(`[Scheduled Job] Updated ${updateExpiredManualResult.rowCount} manual rounds to 'manual_closed'.`);
        }

        const lottoTypesResult = await client.query<LottoType>(`
            SELECT id, name, betting_start_time, betting_cutoff_time,
                   generation_strategy, interval_minutes, monthly_fixed_days, monthly_floating_dates,
                   specific_days_of_week, betting_skip_start_day
            FROM lotto_types ORDER BY id
        `);

        let generatedCount = 0;
        const now = new Date(); // ใช้เวลา UTC ปัจจุบัน

        for (const lottoType of lottoTypesResult.rows) {
            const hasFutureActiveRoundResult = await client.query(`
                SELECT 1 FROM lotto_rounds 
                WHERE lotto_type_id = $1 AND cutoff_datetime > (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active' 
                LIMIT 1
            `, [lottoType.id]);

            if ((hasFutureActiveRoundResult.rowCount ?? 0) > 0) {
                continue;
            }

            const latestRoundResult = await client.query(`
                SELECT cutoff_datetime FROM lotto_rounds
                WHERE lotto_type_id = $1 ORDER BY cutoff_datetime DESC LIMIT 1
            `, [lottoType.id]);

            let baseDate;
            if (latestRoundResult.rows.length > 0) {
                const lastCutoff = new Date(latestRoundResult.rows[0].cutoff_datetime);
                
                if (lottoType.generation_strategy === 'interval') {
                    // สำหรับหวยรายนาที ให้ใช้เวลาล่าสุดเป็นฐานในการคำนวณต่อ
                    baseDate = lastCutoff;
                } else {
                    // สำหรับหวยประเภทอื่น ให้เริ่มค้นหางวดใหม่จาก "วันถัดไป" เสมอ
                    lastCutoff.setUTCDate(lastCutoff.getUTCDate() + 1);
                    lastCutoff.setUTCHours(0, 0, 0, 0);
                    baseDate = lastCutoff;
                }
            } else {
                // ถ้าไม่เคยมีงวดมาก่อน ให้เริ่มจากเวลาปัจจุบัน
                baseDate = now; 
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
                lottoType.betting_skip_start_day
            );

            if (nextRoundTimes) {
                await client.query(`
                    INSERT INTO lotto_rounds (name, open_datetime, cutoff_datetime, lotto_type_id, status)
                    VALUES ($1, $2, $3, $4, 'active')
                `, [lottoType.name, nextRoundTimes.open, nextRoundTimes.cutoff, lottoType.id]);
                generatedCount++;
                console.log(`[Scheduled Job] Generated new round for ${lottoType.name}: Open=${nextRoundTimes.open.toISOString()}, Cutoff=${nextRoundTimes.cutoff.toISOString()}`);
            }
        }

        await client.query('COMMIT');
        if (generatedCount > 0) {
            console.log(`[Scheduled Job] Finished. Generated ${generatedCount} new rounds.`);
        }
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
    console.log('Lotto round generation job scheduled to run every 3 minutes.');
    schedule.scheduleJob('*/3 * * * *', () => { 
        generateLottoRoundsJob(db);
    });
}
