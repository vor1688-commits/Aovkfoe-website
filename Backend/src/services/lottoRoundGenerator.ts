import { Pool } from "pg";
import * as schedule from "node-schedule";

// Interface สำหรับประเภทหวย
interface LottoType {
  id: number;
  name: string;
  betting_start_time: string;
  betting_cutoff_time: string;
  generation_strategy:
    | "daily"
    | "interval"
    | "monthly_fixed_days"
    | "monthly_floating_dates"
    | "onlyday";
  interval_minutes: number | null;
  monthly_fixed_days: number[] | null;
  monthly_floating_dates: any[] | null;
  specific_days_of_week: number[] | null;
  betting_skip_start_day: number;
}

/**
 * ฟังก์ชันคำนวณรอบถัดไป
 */
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
  isFirstEverRound: boolean // ✨ 1. รับ Flag เข้ามา
): { open: Date; cutoff: Date } | null {
  const [openHour, openMinute] = bettingStartTime
    ? bettingStartTime.split(":").map(Number)
    : [0, 0];
  const [cutoffHour, cutoffMinute] = bettingCutoffTime
    ? bettingCutoffTime.split(":").map(Number)
    : [0, 0];

  const nowInThailand = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);

  const setTimeOnDate = (date: Date, hour: number, minute: number): Date => {
    const newDate = new Date(date);
    newDate.setHours(hour, minute, 0, 0);
    return newDate;
  };

  if (strategy === "interval" && intervalMinutes !== null) {
    let nextOpenDate = new Date(baseDate.getTime() + 1000);
    let nextCutoffDate = new Date(
      nextOpenDate.getTime() + intervalMinutes * 60 * 1000
    );

    while (nextCutoffDate <= nowInThailand) {
      nextOpenDate = new Date(
        nextOpenDate.getTime() + intervalMinutes * 60 * 1000
      );
      nextCutoffDate = new Date(
        nextCutoffDate.getTime() + intervalMinutes * 60 * 1000
      );
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
          const isFloating =
            monthlyFloatingDates?.some(
              (rule) => rule.month === month && rule.day === day
            ) ?? false;
          isValidDay = monthlyFixedDays.includes(day) || isFloating;
        }
        break;
    }

    if (isValidDay) {
      const potentialCutoff = setTimeOnDate(
        searchDate,
        cutoffHour,
        cutoffMinute
      );

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

  console.warn(
    `[Generator] Could not find a valid future date for lotto: ${strategy}`
  );
  return null;
}

/**
 * Job หลัก: ทำการปิดรอบเก่า และสร้างรอบใหม่
 */
export async function generateLottoRoundsJob(db: Pool) {
  console.log(
    `[Lotto Generator] Running job at ${new Date().toLocaleString("th-TH")}`
  );
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // ส่วนของการปิดรอบหวย (เหมือนเดิม)
    const updateExpiredAutoResult = await client.query(
      `UPDATE lotto_rounds SET status = 'closed' WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active'`
    );
    if ((updateExpiredAutoResult.rowCount ?? 0) > 0) {
      console.log(
        `[Lotto Generator] Closed ${updateExpiredAutoResult.rowCount} auto rounds.`
      );
    }
    const updateExpiredManualResult = await client.query(
      `UPDATE lotto_rounds SET status = 'manual_closed' WHERE cutoff_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'manual_active'`
    );
    if ((updateExpiredManualResult.rowCount ?? 0) > 0) {
      console.log(
        `[Lotto Generator] Closed ${updateExpiredManualResult.rowCount} manual rounds.`
      );
    }

    const lottoTypesResult = await client.query<LottoType>(
      "SELECT * FROM lotto_types ORDER BY id"
    );
    let generatedCount = 0;

    for (const lottoType of lottoTypesResult.rows) {
      const hasFutureActiveRoundResult = await client.query(
        "SELECT 1 FROM lotto_rounds WHERE lotto_type_id = $1 AND cutoff_datetime > (NOW() AT TIME ZONE 'Asia/Bangkok') AND status = 'active' LIMIT 1",
        [lottoType.id]
      );
      if ((hasFutureActiveRoundResult.rowCount ?? 0) > 0) {
        continue;
      }

      const latestRoundResult = await client.query(
        "SELECT cutoff_datetime FROM lotto_rounds WHERE lotto_type_id = $1 ORDER BY cutoff_datetime DESC LIMIT 1",
        [lottoType.id]
      );

      let baseDate;
      let isFirstEverRound = false; // ✨ 2. สร้าง Flag
      if (latestRoundResult.rows.length > 0) {
        baseDate = new Date(latestRoundResult.rows[0].cutoff_datetime);
      } else {
        baseDate = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
        isFirstEverRound = true; // ✨ 3. ตั้ง Flag เป็น true เมื่อ DB ว่าง
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
        isFirstEverRound // ✨ 4. ส่ง Flag ไปกับฟังก์ชัน
      );

      if (nextRoundTimes) {
        await client.query(
          "INSERT INTO lotto_rounds (name, open_datetime, cutoff_datetime, lotto_type_id, status) VALUES ($1, $2, $3, $4, 'active')",
          [
            lottoType.name,
            nextRoundTimes.open,
            nextRoundTimes.cutoff,
            lottoType.id,
          ]
        );
        generatedCount++;
        console.log(
          `[Lotto Generator] Generated new round for ${
            lottoType.name
          }: Open=${nextRoundTimes.open.toISOString()}, Cutoff=${nextRoundTimes.cutoff.toISOString()}`
        );
      }
    }

    await client.query("COMMIT");
    if (generatedCount > 0) {
      console.log(
        `[Lotto Generator] Finished job. Generated ${generatedCount} new rounds.`
      );
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(
      "[Lotto Generator] An error occurred. Transaction was rolled back.",
      err
    );
  } finally {
    client.release();
  }
}

/**
 * ฟังก์ชันสำหรับเริ่มตั้งเวลาการทำงานของ Job
 */
export function startLottoRoundGenerationJob(db: Pool) {
  console.log("Lotto round generation job scheduled to run every 1 minute.");

  // เรียก Job ครั้งแรกทันทีที่เริ่ม Server เพื่อจัดการงานที่อาจค้างอยู่
  generateLottoRoundsJob(db);

  // ตั้งเวลาให้ทำงานทุกๆ 1 นาที
  schedule.scheduleJob("*/3 * * * *", () => {
    generateLottoRoundsJob(db);
  });
}