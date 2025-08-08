// src/services/billStatusUpdater.ts

import { Pool } from 'pg';
import * as schedule from 'node-schedule';

/**
 * Job ที่จะทำงานเบื้องหลังเพื่ออัปเดตสถานะบิลที่ยัง "รอผล" (ฉบับแก้ไข Timezone)
 */
export async function updatePendingBillsJob(db: Pool) {
    console.log('Running scheduled job: update-pending-bills');
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // ✨ --- [จุดที่แก้ไข] ปรับปรุง SQL Query ให้เปรียบเทียบเวลาแบบ UTC ตรงๆ --- ✨
        const billsToUpdateResult = await client.query(`
            SELECT b.id
            FROM bills b
            LEFT JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
            WHERE b.status = 'รอผล'
              AND (
                -- เงื่อนไขที่ 1: เวลาผ่านไปแล้ว 40 นาที (เทียบ UTC ตรงๆ)
                NOW() - b.created_at > INTERVAL '40 minutes'
                OR
                -- เงื่อนไขที่ 2: สถานะของงวดนั้นๆ ปิดไปแล้ว
                lr.status LIKE '%closed%'
              )
        `);
        // ✨ --- [สิ้นสุดการแก้ไข] --- ✨

        const billIdsToUpdate = billsToUpdateResult.rows.map(row => row.id);

        if (billIdsToUpdate.length > 0) {
            console.log(`[Bill Updater] Found ${billIdsToUpdate.length} bills to update.`);

            const updatedBillsResult = await client.query(
                `UPDATE bills SET status = 'ยืนยันแล้ว' WHERE id = ANY($1::int[])`,
                [billIdsToUpdate]
            );

            const updatedItemsResult = await client.query(
                `UPDATE bet_items
                 SET status = 'ยืนยัน'
                 WHERE status IS NULL
                   AND bill_entry_id IN (
                       SELECT id FROM bill_entries WHERE bill_id = ANY($1::int[])
                   )`,
                [billIdsToUpdate]
            );

            console.log(`[Bill Updater] Updated ${updatedBillsResult.rowCount} bills to 'ยืนยันแล้ว'.`);
            console.log(`[Bill Updater] Updated ${updatedItemsResult.rowCount} bet_items to 'ยืนยัน'.`);
        }

        await client.query('COMMIT');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Bill Updater] Error during bill status update job:', err);
    } finally {
        client.release();
    }
}

/**
 * ฟังก์ชันสำหรับเริ่มตั้งเวลาการทำงานของ Job
 * @param db - Connection Pool ของฐานข้อมูล
 */
export function startBillStatusUpdateJob(db: Pool) {
    console.log('Bill status update job scheduled to run every 5 minutes.');
    schedule.scheduleJob('*/5 * * * *', () => { 
        updatePendingBillsJob(db);
    });
}