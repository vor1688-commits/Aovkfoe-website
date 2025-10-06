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
/**
 * ฟังก์ชันคำนวณรอบถัดไป
 */
function calculateNextRoundDatetimes(baseDate, strategy, bettingStartTime, bettingCutoffTime, intervalMinutes, monthlyFixedDays, monthlyFloatingDates, specificDaysOfWeek, betting_skip_start_day, isFirstEverRound // ✨ 1. รับ Flag เข้ามา
) {
    var _a;
    const [openHour, openMinute] = bettingStartTime
        ? bettingStartTime.split(":").map(Number)
        : [0, 0];
    const [cutoffHour, cutoffMinute] = bettingCutoffTime
        ? bettingCutoffTime.split(":").map(Number)
        : [0, 0];
    const nowInThailand = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const setTimeOnDate = (date, hour, minute) => {
        const newDate = new Date(date);
        newDate.setHours(hour, minute, 0, 0);
        return newDate;
    };
    if (strategy === "interval" && intervalMinutes !== null) {
        let nextOpenDate = new Date(baseDate.getTime() + 1000);
        let nextCutoffDate = new Date(nextOpenDate.getTime() + intervalMinutes * 60 * 1000);
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
            case "daily":
                isValidDay = true;
                break;
            case "onlyday":
                if (specificDaysOfWeek) {
                    isValidDay = specificDaysOfWeek.includes(searchDate.getDay());
                }
                break;
            case "monthly_fixed_days":
                if (monthlyFixedDays) {
                    const day = searchDate.getDate();
                    const month = searchDate.getMonth() + 1;
                    const isFloating = (_a = monthlyFloatingDates === null || monthlyFloatingDates === void 0 ? void 0 : monthlyFloatingDates.some((rule) => rule.month === month && rule.day === day)) !== null && _a !== void 0 ? _a : false;
                    isValidDay = monthlyFixedDays.includes(day) || isFloating;
                }
                break;
        }
        if (isValidDay) {
            const potentialCutoff = setTimeOnDate(searchDate, cutoffHour, cutoffMinute);
            if (potentialCutoff > nowInThailand) {
                const openDate = new Date(searchDate);
                openDate.setDate(openDate.getDate() + betting_skip_start_day);
                const finalOpen = setTimeOnDate(openDate, openHour, openMinute);
                // ============ ✨ [กฎเหล็กที่ฉลาดขึ้น] ✨ ============
                // กฎนี้จะทำงาน "ยกเว้น" ตอนสร้างรอบแรกสุด
                if (!isFirstEverRound && finalOpen <= baseDate) {
                    continue;
                }
                // ==================================================
                if (finalOpen >= potentialCutoff) {
                    continue;
                }
                return { open: finalOpen, cutoff: potentialCutoff };
            }
        }
    }
    console.warn(`[Generator] Could not find a valid future date for lotto: ${strategy}`);
    return null;
}
/**
 * Job หลัก: ทำการปิดรอบเก่า และสร้างรอบใหม่
 */
function generateLottoRoundsJob(db) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        console.log(`[Lotto Generator] Running job at ${new Date().toLocaleString("th-TH")}`);
        const client = yield db.connect();
        try {
            yield client.query("BEGIN");
            // ส่วนของการปิดรอบหวย (เหมือนเดิม)
            const updateExpiredAutoResult = yield client.query(`UPDATE lotto_rounds SET status = 'closed' WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active'`);
            if (((_a = updateExpiredAutoResult.rowCount) !== null && _a !== void 0 ? _a : 0) > 0) {
                console.log(`[Lotto Generator] Closed ${updateExpiredAutoResult.rowCount} auto rounds.`);
            }
            const updateExpiredManualResult = yield client.query(`UPDATE lotto_rounds SET status = 'manual_closed' WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'manual_active'`);
            if (((_b = updateExpiredManualResult.rowCount) !== null && _b !== void 0 ? _b : 0) > 0) {
                console.log(`[Lotto Generator] Closed ${updateExpiredManualResult.rowCount} manual rounds.`);
            }
            const lottoTypesResult = yield client.query("SELECT * FROM lotto_types ORDER BY id");
            let generatedCount = 0;
            for (const lottoType of lottoTypesResult.rows) {
                const hasFutureActiveRoundResult = yield client.query("SELECT 1 FROM lotto_rounds WHERE lotto_type_id = $1 AND cutoff_datetime > (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active' LIMIT 1", [lottoType.id]);
                if (((_c = hasFutureActiveRoundResult.rowCount) !== null && _c !== void 0 ? _c : 0) > 0) {
                    continue;
                }
                const latestRoundResult = yield client.query("SELECT cutoff_datetime FROM lotto_rounds WHERE lotto_type_id = $1 ORDER BY cutoff_datetime DESC LIMIT 1", [lottoType.id]);
                let baseDate;
                let isFirstEverRound = false; // ✨ 2. สร้าง Flag
                if (latestRoundResult.rows.length > 0) {
                    baseDate = new Date(latestRoundResult.rows[0].cutoff_datetime);
                }
                else {
                    baseDate = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
                    isFirstEverRound = true; // ✨ 3. ตั้ง Flag เป็น true เมื่อ DB ว่าง
                }
                const nextRoundTimes = calculateNextRoundDatetimes(baseDate, lottoType.generation_strategy, lottoType.betting_start_time, lottoType.betting_cutoff_time, lottoType.interval_minutes, lottoType.monthly_fixed_days, lottoType.monthly_floating_dates, lottoType.specific_days_of_week, lottoType.betting_skip_start_day, isFirstEverRound // ✨ 4. ส่ง Flag ไปกับฟังก์ชัน
                );
                if (nextRoundTimes) {
                    yield client.query("INSERT INTO lotto_rounds (name, open_datetime, cutoff_datetime, lotto_type_id, status) VALUES ($1, $2, $3, $4, 'active')", [
                        lottoType.name,
                        nextRoundTimes.open,
                        nextRoundTimes.cutoff,
                        lottoType.id,
                    ]);
                    generatedCount++;
                    console.log(`[Lotto Generator] Generated new round for ${lottoType.name}: Open=${nextRoundTimes.open.toISOString()}, Cutoff=${nextRoundTimes.cutoff.toISOString()}`);
                }
            }
            yield client.query("COMMIT");
            if (generatedCount > 0) {
                console.log(`[Lotto Generator] Finished job. Generated ${generatedCount} new rounds.`);
            }
        }
        catch (err) {
            yield client.query("ROLLBACK");
            console.error("[Lotto Generator] An error occurred. Transaction was rolled back.", err);
        }
        finally {
            client.release();
        }
    });
}
/**
 * ฟังก์ชันสำหรับเริ่มตั้งเวลาการทำงานของ Job
 */
function startLottoRoundGenerationJob(db) {
    console.log("Lotto round generation job scheduled to run every 1 minute.");
    // เรียก Job ครั้งแรกทันทีที่เริ่ม Server เพื่อจัดการงานที่อาจค้างอยู่
    generateLottoRoundsJob(db);
    // ตั้งเวลาให้ทำงานทุกๆ 1 นาที
    schedule.scheduleJob("*/1 * * * *", () => {
        generateLottoRoundsJob(db);
    });
}
