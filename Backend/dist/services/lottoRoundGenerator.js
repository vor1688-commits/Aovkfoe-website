"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLottoRoundsJob = generateLottoRoundsJob;
exports.startLottoRoundGenerationJob = startLottoRoundGenerationJob;
const schedule = __importStar(require("node-schedule"));
function calculateNextRoundDatetimes(baseDate, strategy, bettingStartTime, bettingCutoffTime, intervalMinutes, monthlyFixedDays, monthlyFloatingDates, specificDaysOfWeek, betting_skip_start_day, isFirstRoundEver // Flag ที่บอกว่าเป็น "งวดแรก" หรือไม่
) {
    var _d;
    const [openHour, openMinute] = bettingStartTime ? bettingStartTime.split(':').map(Number) : [0, 0];
    const [cutoffHour, cutoffMinute] = bettingCutoffTime ? bettingCutoffTime.split(':').map(Number) : [0, 0];
    const nowInThailand = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
    const setTimeOnDate = (date, hour, minute) => {
        const newDate = new Date(date);
        newDate.setHours(hour, minute, 0, 0);
        return newDate;
    };
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
            case 'daily':
                isValidDay = true;
                break;
            case 'onlyday':
                if (specificDaysOfWeek) {
                    isValidDay = specificDaysOfWeek.includes(searchDate.getDay());
                }
                break;
            case 'monthly_fixed_days':
                if (monthlyFixedDays) {
                    const day = searchDate.getDate();
                    const month = searchDate.getMonth() + 1;
                    const isFloating = (_d = monthlyFloatingDates === null || monthlyFloatingDates === void 0 ? void 0 : monthlyFloatingDates.some(rule => rule.month === month && rule.day === day)) !== null && _d !== void 0 ? _d : false;
                    isValidDay = monthlyFixedDays.includes(day) || isFloating;
                }
                break;
        }
        if (isValidDay) {
            // [จุดแก้ไขที่ 1] - เพิ่มเงื่อนไขตรวจสอบ "วันเดียวกัน"
            if (!isFirstRoundEver) {
                // ถ้าไม่ใช่งวดแรกสุด ให้เช็คว่า "วันที่" ที่กำลังจะสร้าง เป็นวันเดียวกับ "วันที่" ของงวดล่าสุดหรือไม่
                const searchDateDay = searchDate.toISOString().slice(0, 10);
                const baseDateDay = baseDate.toISOString().slice(0, 10);
                if (searchDateDay === baseDateDay) {
                    continue; // ถ้าเป็นวันเดียวกัน ให้ข้ามไปวันถัดไปทันที
                }
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
function generateLottoRoundsJob(db) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        console.log('Running scheduled job: generate-next-rounds');
        const client = yield db.connect();
        try {
            yield client.query('BEGIN');
            const updateExpiredAutoResult = yield client.query(`
            UPDATE lotto_rounds 
            SET status = 'closed' 
            WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active'
        `);
            if (((_a = updateExpiredAutoResult.rowCount) !== null && _a !== void 0 ? _a : 0) > 0) {
                console.log(`[Scheduled Job] Updated ${updateExpiredAutoResult.rowCount} auto rounds to 'closed'.`);
            }
            const updateExpiredManualResult = yield client.query(`
            UPDATE lotto_rounds 
            SET status = 'manual_closed' 
            WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'manual_active'
        `);
            if (((_b = updateExpiredManualResult.rowCount) !== null && _b !== void 0 ? _b : 0) > 0) {
                console.log(`[Scheduled Job] Updated ${updateExpiredManualResult.rowCount} manual rounds to 'manual_closed'.`);
            }
            const lottoTypesResult = yield client.query(`
            SELECT id, name, betting_start_time, betting_cutoff_time,
                   generation_strategy, interval_minutes, monthly_fixed_days, monthly_floating_dates,
                   specific_days_of_week, betting_skip_start_day
            FROM lotto_types ORDER BY id
        `);
            let generatedCount = 0;
            const now = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
            for (const lottoType of lottoTypesResult.rows) {
                const hasFutureActiveRoundResult = yield client.query(`
                SELECT 1 FROM lotto_rounds 
                WHERE lotto_type_id = $1 AND cutoff_datetime > (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active' 
                LIMIT 1
            `, [lottoType.id]);
                if (((_c = hasFutureActiveRoundResult.rowCount) !== null && _c !== void 0 ? _c : 0) > 0) {
                    continue;
                }
                const latestRoundResult = yield client.query(`
                SELECT cutoff_datetime FROM lotto_rounds
                WHERE lotto_type_id = $1 ORDER BY cutoff_datetime DESC LIMIT 1
            `, [lottoType.id]);
                let baseDate;
                const isFirstRoundEver = latestRoundResult.rows.length === 0; // [จุดแก้ไขที่ 2] - สร้าง Flag
                if (isFirstRoundEver) {
                    baseDate = now; // ถ้าเป็นงวดแรกสุด ให้ใช้เวลาปัจจุบัน
                }
                else {
                    const dbCutoffDate = new Date(latestRoundResult.rows[0].cutoff_datetime);
                    baseDate = new Date(dbCutoffDate.getTime() + (7 * 60 * 60 * 1000));
                }
                const nextRoundTimes = calculateNextRoundDatetimes(baseDate, lottoType.generation_strategy, lottoType.betting_start_time, lottoType.betting_cutoff_time, lottoType.interval_minutes, lottoType.monthly_fixed_days, lottoType.monthly_floating_dates, lottoType.specific_days_of_week, lottoType.betting_skip_start_day, isFirstRoundEver // [จุดแก้ไขที่ 3] - ส่ง Flag เข้าไป
                );
                if (nextRoundTimes) {
                    yield client.query(`
                    INSERT INTO lotto_rounds (name, open_datetime, cutoff_datetime, lotto_type_id, status)
                    VALUES ($1, $2, $3, $4, 'active')
                `, [lottoType.name, nextRoundTimes.open, nextRoundTimes.cutoff, lottoType.id]);
                    generatedCount++;
                    console.log(`[Scheduled Job] Generated new round for ${lottoType.name}: Open=${nextRoundTimes.open.toISOString()}, Cutoff=${nextRoundTimes.cutoff.toISOString()}`);
                }
            }
            yield client.query('COMMIT');
            if (generatedCount > 0) {
                console.log(`[Scheduled Job] Finished. Generated ${generatedCount} new rounds.`);
            }
        }
        catch (innerErr) {
            yield client.query('ROLLBACK');
            console.error('[Scheduled Job] Error during transaction:', innerErr);
        }
        finally {
            client.release();
        }
    });
}
function startLottoRoundGenerationJob(db) {
    console.log('Lotto round generation job scheduled to run every 1 minute.');
    schedule.scheduleJob('*/1 * * * *', () => {
        generateLottoRoundsJob(db);
    });
}
