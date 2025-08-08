"use strict";
// src/services/billStatusUpdater.ts
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
exports.updatePendingBillsJob = updatePendingBillsJob;
exports.startBillStatusUpdateJob = startBillStatusUpdateJob;
const schedule = __importStar(require("node-schedule"));
/**
 * Job ที่จะทำงานเบื้องหลังเพื่ออัปเดตสถานะบิลที่ยัง "รอผล"
 */
function updatePendingBillsJob(db) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Running scheduled job: update-pending-bills');
        const client = yield db.connect();
        try {
            yield client.query('BEGIN');
            // 1. ค้นหา ID ของบิลทั้งหมดที่เข้าเงื่อนไข
            // เงื่อนไขคือ: สถานะเป็น 'รอผล' และ (ครบ 40 นาทีแล้ว หรือ งวดของบิลนั้นปิดไปแล้ว)
            const billsToUpdateResult = yield client.query(`
            SELECT b.id
            FROM bills b
            JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
            WHERE b.status = 'รอผล'
              AND (
                -- เงื่อนไขที่ 1: เวลาผ่านไปแล้ว 40 นาที (เทียบกับเวลาไทย)
                (NOW() AT TIME ZONE 'Asia/Bangkok') - b.created_at > INTERVAL '40 minutes'
                OR
                -- เงื่อนไขที่ 2: สถานะของงวดนั้นๆ มีคำว่า 'closed'
                lr.status LIKE '%closed%'
              )
        `);
            const billIdsToUpdate = billsToUpdateResult.rows.map(row => row.id);
            if (billIdsToUpdate.length > 0) {
                console.log(`[Bill Updater] Found ${billIdsToUpdate.length} bills to update.`);
                // 2. อัปเดตสถานะของ 'bills' ที่เข้าเงื่อนไขให้เป็น 'ยืนยันแล้ว'
                const updatedBillsResult = yield client.query(`UPDATE bills SET status = 'ยืนยันแล้ว' WHERE id = ANY($1::int[])`, [billIdsToUpdate]);
                // 3. อัปเดตสถานะของ 'bet_items' ที่เป็น NULL ในบิลเหล่านั้นให้เป็น 'ยืนยัน'
                const updatedItemsResult = yield client.query(`UPDATE bet_items
                 SET status = 'ยืนยัน'
                 WHERE status IS NULL
                   AND bill_entry_id IN (
                       SELECT id FROM bill_entries WHERE bill_id = ANY($1::int[])
                   )`, [billIdsToUpdate]);
                console.log(`[Bill Updater] Updated ${updatedBillsResult.rowCount} bills to 'ยืนยันแล้ว'.`);
                console.log(`[Bill Updater] Updated ${updatedItemsResult.rowCount} bet_items to 'ยืนยัน'.`);
            }
            yield client.query('COMMIT');
        }
        catch (err) {
            yield client.query('ROLLBACK');
            console.error('[Bill Updater] Error during bill status update job:', err);
        }
        finally {
            client.release();
        }
    });
}
/**
 * ฟังก์ชันสำหรับเริ่มตั้งเวลาการทำงานของ Job
 * @param db - Connection Pool ของฐานข้อมูล
 */
function startBillStatusUpdateJob(db) {
    console.log('Bill status update job scheduled to run every 5 minutes.');
    // ตั้งเวลาให้ทำงานทุกๆ 5 นาที
    schedule.scheduleJob('*/5 * * * *', () => {
        updatePendingBillsJob(db);
    });
}
