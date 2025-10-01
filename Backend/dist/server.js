"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const pg_1 = __importDefault(require("pg"));
const lottoRoundGenerator_1 = require("./services/lottoRoundGenerator");
const billStatusUpdater_1 = require("./services/billStatusUpdater");
const { Pool } = pg_1.default;
const app = (0, express_1.default)();
// --- Middleware ---
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- Database Connection ---
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
});
(0, lottoRoundGenerator_1.startLottoRoundGenerationJob)(db);
(0, billStatusUpdater_1.startBillStatusUpdateJob)(db);
console.log('Lotto round generation job initialized.');
// --- Middleware ---
app.post("/api/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    try {
        const userResult = yield db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userResult.rowCount === 0) {
            return res.status(401).json({ error: "Username หรือ Password ไม่ถูกต้อง" });
        }
        const user = userResult.rows[0];
        const isMatch = yield bcrypt_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Username หรือ Password ไม่ถูกต้อง" });
        }
        const userPayload = { id: user.id, username: user.username, role: user.role };
        // สร้าง Token
        const token = jsonwebtoken_1.default.sign(userPayload, process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY', { expiresIn: '1d' });
        // ส่งทั้ง user และ token กลับไป
        res.json({
            message: "เข้าสู่ระบบสำเร็จ",
            user: userPayload,
            token: token
        });
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }
}));
const isAuthenticated = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (token == null) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};
const isAdminOrOwner = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
    if (userRole === 'admin' || userRole === 'owner') {
        next(); // ผ่าน! ไปยัง Endpoint ต่อไปได้
    }
    else {
        res.status(403).json({ error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้' });
    }
});
app.post("/api/register", isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { username, password, role = 'user' } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "กรุณากรอก Username และ Password" });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }
    if (!['user', 'admin', 'owner'].includes(role)) {
        return res.status(400).json({ error: "Role ไม่ถูกต้อง" });
    }
    try {
        const existingUser = yield db.query('SELECT id FROM users WHERE username = $1', [username]);
        if ((_a = existingUser.rowCount) !== null && _a !== void 0 ? _a : 0 > 0) {
            return res.status(409).json({ error: "Username นี้ถูกใช้งานแล้ว" });
        }
        const saltRounds = 10;
        const passwordHash = yield bcrypt_1.default.hash(password, saltRounds);
        const newUserResult = yield db.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role', [username, passwordHash, role]);
        res.status(201).json({ message: "สร้างผู้ใช้สำเร็จ", user: newUserResult.rows[0] });
    }
    catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }
}));
app.post('/api/add-lotto-types', isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // รับข้อมูลสำหรับ lotto_type และ lotto_round แรก
    const { name, rate_3_top = 0, rate_3_tote = 0, rate_3_bottom = 0, rate_2_top = 0, rate_2_bottom = 0, rate_run_top = 0, rate_run_bottom = 0, betting_start_time = null, betting_cutoff_time = null, generation_strategy = null, interval_minutes = null, monthly_fixed_days = null, monthly_floating_dates = null, specific_days_of_week = null, betting_skip_start_day = 0, 
    // ✨ รับค่าใหม่สำหรับงวดแรก
    open_datetime, cutoff_datetime } = req.body;
    if (!name || !open_datetime || !cutoff_datetime) {
        return res.status(400).json({ error: 'กรุณาระบุชื่อ, วันที่เปิด และวันที่ปิดสำหรับงวดแรก' });
    }
    const client = yield db.connect();
    try {
        // เริ่ม Transaction
        yield client.query('BEGIN');
        // 1. สร้าง lotto_type ใหม่
        const lottoTypeQuery = `
            INSERT INTO lotto_types (
                name, rate_3_top, rate_3_tote, rate_3_bottom, rate_2_top, rate_2_bottom, 
                rate_run_top, rate_run_bottom, betting_start_time, betting_cutoff_time, 
                generation_strategy, interval_minutes, monthly_fixed_days, 
                monthly_floating_dates, specific_days_of_week, betting_skip_start_day
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
            RETURNING *;
        `;
        const lottoTypeValues = [
            name, rate_3_top, rate_3_tote, rate_3_bottom, rate_2_top, rate_2_bottom,
            rate_run_top, rate_run_bottom, betting_start_time, betting_cutoff_time,
            generation_strategy, interval_minutes, monthly_fixed_days,
            monthly_floating_dates ? JSON.stringify(monthly_floating_dates) : null,
            specific_days_of_week, betting_skip_start_day
        ];
        const lottoTypeResult = yield client.query(lottoTypeQuery, lottoTypeValues);
        const newLottoType = lottoTypeResult.rows[0];
        // 2. สร้าง lotto_round แรก โดยใช้ข้อมูลจาก lotto_type ที่เพิ่งสร้าง
        const lottoRoundQuery = `
            INSERT INTO lotto_rounds (name, lotto_type_id, open_datetime, cutoff_datetime, status)
            VALUES ($1, $2, $3, $4, 'active');
        `;
        const lottoRoundValues = [newLottoType.name, newLottoType.id, open_datetime, cutoff_datetime];
        yield client.query(lottoRoundQuery, lottoRoundValues);
        // ยืนยัน Transaction
        yield client.query('COMMIT');
        res.status(201).json(newLottoType);
    }
    catch (error) {
        // ยกเลิก Transaction หากเกิดข้อผิดพลาด
        yield client.query('ROLLBACK');
        console.error('Error creating lotto type and first round:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: `ชื่อประเภทหวย "${name}" ถูกใช้งานแล้ว` });
        }
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างข้อมูล', details: error.message });
    }
    finally {
        client.release();
    }
}));
app.get('/api/lotto-types/current-and-next', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db.query(`SELECT
                lt.id AS lotto_type_id,
                lt.name AS lotto_type_name,
                -- ดึงงวดปัจจุบัน
                (SELECT
                    JSON_BUILD_OBJECT(
                        'id', lr_current.id,
                        'name', lr_current.name,
                        'open_datetime', lr_current.open_datetime,
                        'cutoff_datetime', lr_current.cutoff_datetime,
                        'status', lr_current.status
                    )
                   FROM lotto_rounds lr_current
                   WHERE lr_current.lotto_type_id = lt.id 
                     -- ⭐ แก้ไข: เทียบกับเวลาไทย
                     AND lr_current.cutoff_datetime > (NOW() AT TIME ZONE 'Asia/Bangkok') 
                     AND lr_current.open_datetime <= (NOW() AT TIME ZONE 'Asia/Bangkok')
                     AND lr_current.status = 'active'
                   ORDER BY lr_current.cutoff_datetime ASC
                   LIMIT 1
                ) AS current_round,
                -- ดึงงวดถัดไป
                (SELECT
                    JSON_BUILD_OBJECT(
                        'id', lr_next.id,
                        'name', lr_next.name,
                        'open_datetime', lr_next.open_datetime,
                        'cutoff_datetime', lr_next.cutoff_datetime,
                        'status', lr_next.status
                    )
                   FROM lotto_rounds lr_next
                   WHERE lr_next.lotto_type_id = lt.id 
                     -- ⭐ แก้ไข: เทียบกับเวลาไทย
                     AND lr_next.open_datetime > (NOW() AT TIME ZONE 'Asia/Bangkok')
                     AND lr_next.status = 'active'
                   ORDER BY lr_next.open_datetime ASC
                   LIMIT 1
                ) AS next_round
            FROM lotto_types lt
            ORDER BY lt.id`);
        res.json({
            rounds: result.rows,
            serverTime: new Date().toISOString()
        });
    }
    catch (err) {
        console.error('Error fetching current and next lotto rounds:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงวดปัจจุบันและถัดไป', details: err.message });
    }
}));
app.get("/api/lotto-rounds", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ⭐ แก้ไข SQL Query ตรงนี้: เพิ่ม closed_numbers, half_pay_numbers, และ winning_numbers
        const result = yield db.query(`SELECT 
         id, name, cutoff_datetime, open_datetime, created_at, lotto_type_id, status,
         closed_numbers, 
         half_pay_numbers, 
         winning_numbers 
       FROM lotto_rounds 
       WHERE cutoff_datetime > NOW() 
       ORDER BY cutoff_datetime ASC`);
        // ไม่ต้องแก้ไขส่วนที่เหลือ
        res.json({
            rounds: result.rows,
            serverTime: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error("Error fetching lotto rounds:", err);
        res.status(500).json({
            error: "เกิดข้อผิดพลาดในการดึงข้อมูลงวดหวย",
            details: err.message,
        });
    }
}));
app.get('/api/round-limit-summary/:lottoRoundId/user/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lottoRoundId, userId } = req.params;
    const client = yield db.connect();
    try {
        const roundLimitsResult = yield client.query('SELECT limit_2d_amount, limit_3d_amount FROM lotto_rounds WHERE id = $1', [lottoRoundId]);
        const specificLimitsResult = yield client.query('SELECT bet_number, max_amount FROM lotto_round_number_limits WHERE lotto_round_id = $1', [lottoRoundId]);
        const rangeLimitsResult = yield client.query('SELECT range_start, range_end, max_amount FROM lotto_round_range_limits WHERE lotto_round_id = $1', [lottoRoundId]);
        const totalSpentResult = yield client.query(`SELECT 
               bi.bet_number, 
               SUM(
                 CASE
                   WHEN b.status = 'รอผล' THEN bi.price
                   WHEN b.status IN ('ยืนยันแล้ว', 'ยกเลิก') AND (bi.status IS NULL OR bi.status = 'ยืนยัน') THEN bi.price
                   ELSE 0
                 END
               ) as total_spent
             FROM bet_items bi
             JOIN bill_entries be ON bi.bill_entry_id = be.id
             JOIN bills b ON be.bill_id = b.id
             WHERE b.user_id = $1 
               AND b.lotto_round_id = $2
               AND b.status IN ('รอผล', 'ยืนยันแล้ว', 'ยกเลิก')
             GROUP BY bi.bet_number`, [userId, lottoRoundId]);
        res.json({
            defaultLimits: roundLimitsResult.rows[0] || {},
            specificLimits: specificLimitsResult.rows,
            rangeLimits: rangeLimitsResult.rows,
            spentSummary: totalSpentResult.rows,
        });
    }
    catch (err) {
        console.error('Error fetching limit summary:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาด', details: err.message });
    }
    finally {
        client.release();
    }
}));
app.get("/api/lotto-rounds-fetch-all-manual-auto", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fetchAll, typeId } = req.query;
    try {
        // --- ⬇️ แก้ไข Query ให้ดึง exemptions มาด้วย ⬇️ ---
        let query = `
            SELECT 
                lr.id, lr.name, lr.cutoff_datetime, lr.open_datetime, lr.created_at, 
                lr.lotto_type_id, lr.status, lr.closed_numbers, lr.half_pay_numbers,
                lr.limit_2d_amount, lr.limit_3d_amount,
                (
                    SELECT json_agg(lrl.*)
                    FROM lotto_round_range_limits lrl
                    WHERE lrl.lotto_round_id = lr.id
                ) as range_limits,
                (
                    SELECT json_agg(lre.*)
                    FROM lotto_round_exemptions lre
                    WHERE lre.lotto_round_id = lr.id
                ) as exemptions
            FROM lotto_rounds lr
        `;
        // --- ⬆️ สิ้นสุดการแก้ไข ⬆️ ---
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (fetchAll !== 'true') {
            conditions.push(`lr.cutoff_datetime > NOW()`);
        }
        if (typeId) {
            conditions.push(`lr.lotto_type_id = $${paramIndex++}`);
            params.push(typeId);
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += " ORDER BY lr.cutoff_datetime DESC";
        const result = yield db.query(query, params);
        res.json({
            rounds: result.rows,
            serverTime: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error("Error fetching lotto rounds:", err);
        res.status(500).json({
            error: "เกิดข้อผิดพลาดในการดึงข้อมูลงวดหวย",
            details: err.message,
        });
    }
}));
app.get('/api/lotto-rounds/manual-active', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
            SELECT
                lr.lotto_type_id,
                lt.name as lotto_type_name,
                json_build_object(
                    'id', lr.id,
                    'name', lr.name,
                    'open_datetime', lr.open_datetime,
                    'cutoff_datetime', lr.cutoff_datetime,
                    'status', lr.status
                ) as current_round
            FROM lotto_rounds lr
            JOIN lotto_types lt ON lr.lotto_type_id = lt.id
            WHERE lr.status = 'manual_active' AND lr.cutoff_datetime > NOW()
            ORDER BY lr.cutoff_datetime ASC;
        `;
        const result = yield db.query(query);
        // จัดรูปแบบข้อมูลให้ตรงกับ Frontend และเพิ่ม next_round ที่เป็น null
        const formattedResult = result.rows.map(row => (Object.assign(Object.assign({}, row), { next_round: null })));
        res.json({
            rounds: formattedResult,
            serverTime: new Date().toISOString()
        });
    }
    catch (err) {
        console.error('Error fetching manual active rounds:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงวด manual', details: err.message });
    }
}));
app.post('/api/admin/lotto-rounds/manual', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, lotto_type_id, open_datetime, cutoff_datetime, status, closed_numbers = [], // <-- รับค่าใหม่ (ถ้าไม่ส่งมา ให้เป็น Array ว่าง)
    half_pay_numbers = [] // <-- รับค่าใหม่ (ถ้าไม่ส่งมา ให้เป็น Array ว่าง)
     } = req.body;
    // ตรวจสอบข้อมูลเบื้องต้น
    if (!name || !lotto_type_id || !open_datetime || !cutoff_datetime || !status) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }
    // ตรวจสอบว่าข้อมูลที่ส่งมาเป็น Array
    if (!Array.isArray(closed_numbers) || !Array.isArray(half_pay_numbers)) {
        return res.status(400).json({ error: "ข้อมูลเลขพิเศษต้องเป็น Array" });
    }
    try {
        const query = `
            INSERT INTO lotto_rounds 
            (name, lotto_type_id, open_datetime, cutoff_datetime, status, closed_numbers, half_pay_numbers)
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *;
        `;
        const values = [
            name,
            lotto_type_id,
            open_datetime,
            cutoff_datetime,
            status,
            JSON.stringify(closed_numbers), // <-- แปลง Array เป็น JSON String
            JSON.stringify(half_pay_numbers) // <-- แปลง Array เป็น JSON String
        ];
        const result = yield db.query(query, values);
        res.status(201).json({
            message: "สร้างงวดหวยด้วยตนเองสำเร็จ",
            round: result.rows[0]
        });
    }
    catch (err) {
        console.error('Error creating manual lotto round:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างงวดหวย', details: err.message });
    }
}));
app.get("/api/lotto-rounds/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield db.query("SELECT id, name, cutoff_datetime, open_datetime, created_at, lotto_type_id, status FROM lotto_rounds WHERE id = $1", [
            id,
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลงวดหวยนี้" });
        }
        // console.log(`data curereunt ======> ${result.rows}`);
        res.json({
            round: result.rows[0],
            serverTime: new Date().toISOString()
        });
    }
    catch (err) {
        console.error(`Error fetching lotto round ${id}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาด", details: err.message });
    }
}));
app.post("/api/savebills", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billRef, userId, lottoRoundId, note, totalAmount, billEntries } = req.body;
    const client = yield db.connect();
    try {
        yield client.query("BEGIN");
        const lottoRoundResult = yield client.query("SELECT cutoff_datetime, lotto_type_id, closed_numbers, half_pay_numbers FROM lotto_rounds WHERE id = $1", [lottoRoundId]);
        if (lottoRoundResult.rowCount === 0)
            throw new Error("Lotto Round ID ไม่ถูกต้อง");
        const { cutoff_datetime: billLottoDraw, lotto_type_id: lottoTypeId, closed_numbers: closedNumbers, half_pay_numbers: halfPayNumbers } = lottoRoundResult.rows[0];
        const ratesResult = yield client.query("SELECT * FROM lotto_types WHERE id = $1", [lottoTypeId]);
        if (ratesResult.rowCount === 0)
            throw new Error(`ไม่พบอัตราจ่ายสำหรับ Lotto Type ID: ${lottoTypeId}`);
        const lottoTypeDetails = ratesResult.rows[0];
        // ✨ [เพิ่ม] คำนวณยอดรวมที่แท้จริงใหม่อีกครั้งที่ฝั่ง Backend เพื่อความถูกต้อง 100%
        let actualTotalAmount = 0;
        for (const entry of billEntries) {
            const validBets = entry.bets.filter((bet) => !closedNumbers.includes(bet));
            const pricePerBet = entry.priceTop + entry.priceTote + entry.priceBottom;
            actualTotalAmount += validBets.length * pricePerBet;
        }
        const billResult = yield client.query(`INSERT INTO bills (bill_ref, user_id, lotto_round_id, note, total_amount, bet_name, status, bill_lotto_draw) 
       VALUES ($1, $2, $3, $4, $5, $6, 'รอผล', $7) RETURNING id`, 
        // ✨ [แก้ไข] ใช้ยอดรวมที่คำนวณใหม่
        [billRef, userId, lottoRoundId, note, actualTotalAmount, lottoTypeDetails.name, billLottoDraw]);
        const newBillId = billResult.rows[0].id;
        for (const entry of billEntries) {
            // ✨ [แก้ไข] กรองเอาเฉพาะเลขที่ไม่ใช่เลขปิด
            const validBets = entry.bets.filter((bet) => !closedNumbers.includes(bet));
            // ถ้าใน entry ไม่มีเลขที่สามารถซื้อได้เลย ให้ข้ามไป entry ถัดไป
            if (validBets.length === 0) {
                continue;
            }
            // ✨ [แก้ไข] คำนวณ total ของ entry นี้ใหม่จาก validBets
            const pricePerBet = entry.priceTop + entry.priceTote + entry.priceBottom;
            const actualEntryTotal = validBets.length * pricePerBet;
            let betTypeToSave = entry.betTypes;
            if (entry.betTypes === '6d')
                betTypeToSave = '3d';
            if (entry.betTypes === '19d')
                betTypeToSave = '2d';
            const entryResult = yield client.query(`INSERT INTO bill_entries (bill_id, bet_type, total) VALUES ($1, $2, $3) RETURNING id`, [newBillId, betTypeToSave, actualEntryTotal] // ✨ [แก้ไข] ใช้ total ของ entry ที่คำนวณใหม่
            );
            const newBillEntryId = entryResult.rows[0].id;
            const isThreeDigitMode = entry.betTypes === '3d' || entry.betTypes === '6d';
            const isRunMode = entry.betTypes === 'run';
            let topRate;
            let bottomRate;
            if (isRunMode) {
                topRate = Number(lottoTypeDetails.rate_run_top);
                bottomRate = Number(lottoTypeDetails.rate_run_bottom);
            }
            else if (isThreeDigitMode) {
                topRate = Number(lottoTypeDetails.rate_3_top);
                bottomRate = Number(lottoTypeDetails.rate_3_bottom);
            }
            else { // กรณี 2 ตัว และอื่นๆ
                topRate = Number(lottoTypeDetails.rate_2_top);
                bottomRate = Number(lottoTypeDetails.rate_2_bottom);
            }
            const processBetItems = (originalPrice, style, standardRate) => __awaiter(void 0, void 0, void 0, function* () {
                if (originalPrice <= 0)
                    return;
                // ✨ [แก้ไข] วนลูปเฉพาะ validBets เท่านั้น
                for (const betNumber of validBets) {
                    // ไม่จำเป็นต้องเช็คเลขปิดอีกแล้ว เพราะกรองออกไปแล้ว
                    const isHalfPay = halfPayNumbers.includes(betNumber);
                    const effectivePriceForPayout = isHalfPay ? originalPrice / 2 : originalPrice;
                    const payoutRate = standardRate;
                    const finalPayoutAmount = effectivePriceForPayout * payoutRate;
                    yield client.query(`INSERT INTO bet_items (bill_entry_id, bet_number, price, bet_style, rate, payout_amount, baht_per) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                        newBillEntryId,
                        betNumber,
                        originalPrice,
                        style,
                        effectivePriceForPayout,
                        finalPayoutAmount,
                        payoutRate
                    ]);
                }
            });
            //   await processBetItems(Number(entry.priceTop), isThreeDigitMode ? 'ตรง' : 'บน', isThreeDigitMode ? Number(lottoTypeDetails.rate_3_top) : Number(lottoTypeDetails.rate_2_top));
            //   if(isThreeDigitMode) {
            //     await processBetItems(Number(entry.priceTote), 'โต๊ด', Number(lottoTypeDetails.rate_3_tote));
            //   }
            //   await processBetItems(Number(entry.priceBottom), 'ล่าง', isThreeDigitMode ? Number(lottoTypeDetails.rate_3_bottom) : Number(lottoTypeDetails.rate_2_bottom));
            yield processBetItems(Number(entry.priceTop), isThreeDigitMode ? 'ตรง' : 'บน', topRate);
            if (isThreeDigitMode) {
                yield processBetItems(Number(entry.priceTote), 'โต๊ด', Number(lottoTypeDetails.rate_3_tote));
            }
            yield processBetItems(Number(entry.priceBottom), 'ล่าง', bottomRate);
        }
        yield client.query("COMMIT");
        res.status(201).json({ message: "บันทึกสำเร็จ", billId: newBillId });
    }
    catch (err) {
        yield client.query("ROLLBACK");
        console.error("Error saving bill:", err);
        res.status(500).json({ error: "ไม่สามารถบันทึกบิลได้", details: err.message });
    }
    finally {
        client.release();
    }
}));
app.post('/api/bills/batch-delete', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. รับ Array ของ billIds จาก request body
    const { billIds } = req.body;
    // 2. ตรวจสอบข้อมูลเบื้องต้น
    if (!Array.isArray(billIds) || billIds.length === 0) {
        return res.status(400).json({ error: 'billIds ต้องเป็น Array ที่ไม่ว่าง' });
    }
    const client = yield db.connect();
    try {
        // 3. ใช้ Transaction เพื่อความปลอดภัย
        yield client.query('BEGIN');
        // 4. สร้าง Query เพื่อลบข้อมูล โดยใช้ WHERE id = ANY($1) ของ PostgreSQL
        // ซึ่งเหมาะสำหรับการลบข้อมูลจาก Array ของ ID
        const result = yield client.query('DELETE FROM bills WHERE id = ANY($1)', [billIds]);
        yield client.query('COMMIT');
        // 5. ส่งผลลัพธ์กลับไป
        res.status(200).json({
            message: `ลบข้อมูลจำนวน ${result.rowCount} บิลสำเร็จ`,
            deletedCount: result.rowCount
        });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error('เกิดข้อผิดพลาดในการลบหลายบิล:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์' });
    }
    finally {
        client.release();
    }
}));
app.post('/api/batch-check-bet-limits', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, lottoRoundId, bets } = req.body;
    const client = yield db.connect();
    try {
        // --- ส่วน exemption ---
        const userResult = yield client.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userResult.rowCount === 0)
            throw new Error('User not found');
        const userRole = userResult.rows[0].role;
        const exemptionResult = yield client.query('SELECT * FROM lotto_round_exemptions WHERE lotto_round_id = $1', [lottoRoundId]);
        const isExempt = exemptionResult.rows.some(ex => (ex.exemption_type === 'user' && ex.user_id === userId) ||
            (ex.exemption_type === 'role' && ex.user_role === userRole));
        if (isExempt) {
            // client.release();
            return res.status(200).json({ message: 'สามารถซื้อได้ทั้งหมด (User ได้รับการยกเว้น)' });
        }
        // --- สิ้นสุดส่วน exemption ---
        const failedBets = [];
        const roundLimitsResult = yield client.query('SELECT limit_2d_amount, limit_3d_amount FROM lotto_rounds WHERE id = $1', [lottoRoundId]);
        const roundLimits = roundLimitsResult.rows[0] || {};
        const specificLimitsResult = yield client.query('SELECT bet_number, max_amount FROM lotto_round_number_limits WHERE lotto_round_id = $1', [lottoRoundId]);
        const specificLimits = specificLimitsResult.rows.reduce((acc, row) => {
            acc[row.bet_number] = parseFloat(row.max_amount);
            return acc;
        }, {});
        const rangeLimitsResult = yield client.query('SELECT range_start, range_end, max_amount FROM lotto_round_range_limits WHERE lotto_round_id = $1', [lottoRoundId]);
        const rangeLimits = rangeLimitsResult.rows;
        for (const bet of bets) {
            const { betNumber, price } = bet;
            const totalSpentResult = yield client.query(`SELECT COALESCE(SUM(
                 CASE
                   -- 1. ถ้าบิลยัง 'รอผล' ให้นับยอดทุกรายการ ไม่ว่าสถานะของ item จะเป็นอะไร
                   WHEN b.status = 'รอผล' THEN bi.price
                   -- 2. ถ้าบิล 'ยืนยันแล้ว' หรือ 'ยกเลิก' ให้นับเฉพาะ item ที่ไม่ถูก 'คืนเลข'
                   WHEN b.status IN ('ยืนยันแล้ว', 'ยกเลิก') AND (bi.status IS NULL OR bi.status = 'ยืนยัน') THEN bi.price
                   -- 3. กรณีอื่นๆ ไม่นับยอด
                   ELSE 0
                 END
               ), 0) as total
               FROM bet_items bi
               JOIN bill_entries be ON bi.bill_entry_id = be.id
               JOIN bills b ON be.bill_id = b.id
               WHERE b.user_id = $1
                 AND b.lotto_round_id = $2
                 AND bi.bet_number = $3
                 AND b.status IN ('รอผล', 'ยืนยันแล้ว', 'ยกเลิก')`, [userId, lottoRoundId, betNumber]);
            const totalSpent = parseFloat(totalSpentResult.rows[0].total);
            let limitAmount = null;
            if (specificLimits[betNumber]) {
                limitAmount = specificLimits[betNumber];
            }
            else {
                const numInt = parseInt(betNumber, 10);
                const matchingRange = rangeLimits.find(range => betNumber.length === range.range_start.length &&
                    numInt >= parseInt(range.range_start, 10) &&
                    numInt <= parseInt(range.range_end, 10));
                if (matchingRange) {
                    limitAmount = parseFloat(matchingRange.max_amount);
                }
                else {
                    if (roundLimits.limit_2d_amount !== null && betNumber.length <= 2) {
                        limitAmount = parseFloat(roundLimits.limit_2d_amount);
                    }
                    else if (roundLimits.limit_3d_amount !== null && betNumber.length >= 3) {
                        limitAmount = parseFloat(roundLimits.limit_3d_amount);
                    }
                }
            }
            if (limitAmount !== null && (totalSpent + price > limitAmount)) {
                failedBets.push({
                    betNumber,
                    message: `ยอดซื้อสำหรับเลข "${betNumber}" เกินลิมิต`,
                    details: { limit: limitAmount, spent: totalSpent, remaining: limitAmount - totalSpent }
                });
            }
        }
        if (failedBets.length > 0) {
            return res.status(400).json({
                error: 'LimitExceeded',
                message: 'มีบางรายการเกินลิมิตที่กำหนด',
                failedBets: failedBets
            });
        }
        res.status(200).json({ message: 'สามารถซื้อได้ทั้งหมด' });
    }
    catch (err) {
        console.error('Error batch checking bet limit:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ', details: err.message });
    }
    finally {
        client.release();
    }
}));
app.get('/api/lotto-rounds/:id/range-limits', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield db.query('SELECT * FROM lotto_round_range_limits WHERE lotto_round_id = $1 ORDER BY id', [id]);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Error fetching range limits:', err);
        res.status(500).json({ error: 'Failed to fetch range limits' });
    }
}));
app.put('/api/lotto-rounds/:id/save-range-limits', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const rangeLimits = req.body; // รับข้อมูลเป็น Array
    const client = yield db.connect();
    try {
        yield client.query('BEGIN');
        // ล้างข้อมูลเก่าของงวดนี้ทิ้งทั้งหมด
        yield client.query('DELETE FROM lotto_round_range_limits WHERE lotto_round_id = $1', [id]);
        // เพิ่มข้อมูลใหม่เข้าไปทีละแถว
        for (const limit of rangeLimits) {
            if (limit.range_start && limit.range_end && limit.max_amount) {
                yield client.query('INSERT INTO lotto_round_range_limits (lotto_round_id, range_start, range_end, max_amount) VALUES ($1, $2, $3, $4)', [id, limit.range_start, limit.range_end, limit.max_amount]);
            }
        }
        yield client.query('COMMIT');
        res.status(200).json({ message: 'Range limits updated successfully' });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error('Error updating range limits:', err);
        res.status(500).json({ error: 'Failed to update range limits' });
    }
    finally {
        client.release();
    }
}));
app.get('/api/lotto-rounds/:id/exemptions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield db.query('SELECT * FROM lotto_round_exemptions WHERE lotto_round_id = $1', [id]);
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch exemptions' });
    }
}));
// PUT /api/lotto-rounds/:id/exemptions - บันทึกรายชื่อผู้ที่ได้รับการยกเว้น
app.put('/api/lotto-rounds/:id/exemptions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const exemptions = req.body; // รับ Array ของ exemptions
    const client = yield db.connect();
    try {
        yield client.query('BEGIN');
        // ล้างของเก่า
        yield client.query('DELETE FROM lotto_round_exemptions WHERE lotto_round_id = $1', [id]);
        // เพิ่มของใหม่
        for (const ex of exemptions) {
            if (ex.exemption_type === 'user' && ex.user_id) {
                yield client.query('INSERT INTO lotto_round_exemptions (lotto_round_id, exemption_type, user_id) VALUES ($1, $2, $3)', [id, 'user', ex.user_id]);
            }
            else if (ex.exemption_type === 'role' && ex.user_role) {
                yield client.query('INSERT INTO lotto_round_exemptions (lotto_round_id, exemption_type, user_role) VALUES ($1, $2, $3)', [id, 'role', ex.user_role]);
            }
        }
        yield client.query('COMMIT');
        res.status(200).json({ message: 'Exemptions updated successfully' });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to update exemptions' });
    }
    finally {
        client.release();
    }
}));
// (อย่าลืม API สำหรับดึงรายชื่อ user ทั้งหมด เพื่อเอาไปใส่ใน dropdown)
app.get("/api/users", isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db.query('SELECT id, username, role FROM users ORDER BY username ASC');
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้" });
    }
}));
app.get('/api/bills', isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const loggedInUser = req.user;
    const usePagination = req.query.limit && !isNaN(parseInt(req.query.limit, 10));
    const { startDate, endDate, status, billRef, noteRef, username, lottoCategory, lottoName } = req.query;
    const queryParams = [];
    const whereConditions = ['1=1'];
    if (loggedInUser.role === 'user') {
        queryParams.push(loggedInUser.id);
        whereConditions.push(`b.user_id = $${queryParams.length}`);
    }
    else if ((loggedInUser.role === 'admin' || loggedInUser.role === 'owner') && username && username !== 'all' && username !== '') {
        queryParams.push(username);
        whereConditions.push(`u.username = $${queryParams.length}`);
    }
    if (startDate) {
        queryParams.push(startDate);
        whereConditions.push(`b.created_at::date >= $${queryParams.length}`);
    }
    if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        queryParams.push(nextDay.toISOString().split('T')[0]);
        whereConditions.push(`b.created_at < $${queryParams.length}`);
    }
    if (status && status !== 'all') {
        queryParams.push(status);
        whereConditions.push(`b.status = $${queryParams.length}`);
    }
    if (billRef) {
        queryParams.push(`%${billRef}%`);
        whereConditions.push(`b.bill_ref ILIKE $${queryParams.length}`);
    }
    if (noteRef) {
        queryParams.push(`%${noteRef}%`);
        whereConditions.push(`b.note ILIKE $${queryParams.length}`);
    }
    if (lottoCategory) {
        queryParams.push(`%${lottoCategory}%`);
        whereConditions.push(`b.bet_name ILIKE $${queryParams.length}`);
    }
    if (lottoName && lottoName !== 'all') {
        whereConditions.push(`lr.name = $${queryParams.length + 1}`);
        queryParams.push(lottoName);
    }
    const whereClause = whereConditions.join(' AND ');
    try {
        if (usePagination) {
            // --- A: โหมด Pagination (เร็ว) ---
            const limit = parseInt(req.query.limit, 10);
            const page = parseInt(req.query.page, 10) || 1;
            const offset = (page - 1) * limit;
            // ✨ [FIX] เพิ่ม LEFT JOIN lotto_rounds lr เข้าไปใน countQuery เพื่อป้องกัน Error
            const countQuery = `SELECT COUNT(b.id) as "total" FROM bills b JOIN users u ON b.user_id = u.id LEFT JOIN lotto_rounds lr ON b.lotto_round_id = lr.id WHERE ${whereClause};`;
            const dataQuery = `
                SELECT 
                    b.id, b.bill_ref AS "billRef", b.created_at AS "createdAt", b.bet_name AS "lottoName",
                    b.total_amount AS "totalAmount", b.status, b.note, b.bill_lotto_draw AS "billLottoDraw", u.username,
                    COALESCE(agg.returned_amount, 0)::float AS "returnedAmount",
                    (b.total_amount - COALESCE(agg.returned_amount, 0))::float AS "netAmount",
                    COALESCE(agg.item_count, 0)::int AS "itemCount",
                    COALESCE(agg.has_half_rate_item, false) AS "hasHalfRateItem"
                FROM bills b
                JOIN users u ON b.user_id = u.id
                LEFT JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
                LEFT JOIN (
                    SELECT
                        be.bill_id,
                        SUM(CASE WHEN bi.status = 'คืนเลข' THEN bi.price ELSE 0 END) as returned_amount,
                        COUNT(bi.id) as item_count,
                        BOOL_OR((bi.price * 0.5) = bi.rate) as has_half_rate_item
                    FROM bill_entries be
                    JOIN bet_items bi ON be.id = bi.bill_entry_id
                    GROUP BY be.bill_id
                ) agg ON b.id = agg.bill_id
                WHERE ${whereClause}
                ORDER BY b.id DESC
                LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
            `;
            const [countResult, dataResult] = yield Promise.all([
                db.query(countQuery, queryParams),
                db.query(dataQuery, [...queryParams, limit, offset])
            ]);
            const totalBills = parseInt(countResult.rows[0].total, 10);
            const totalPages = Math.ceil(totalBills / limit);
            res.json({
                bills: dataResult.rows,
                pagination: { currentPage: page, totalPages, totalBills, limit }
            });
        }
        else {
            // --- B: โหมดดึงทั้งหมด (ช้า, แบบเดิม) ---
            const originalQuery = `
                SELECT 
                    b.id, b.bill_ref as "billRef", b.created_at as "createdAt", b.bet_name as "lottoName",
                    b.total_amount as "totalAmount", b.status, b.note, b.bill_lotto_draw, u.username,
                    COUNT(DISTINCT bi.id) as "itemCount",
                    COALESCE((SELECT SUM(bi_ret.price) FROM bet_items bi_ret JOIN bill_entries be_ret ON bi_ret.bill_entry_id = be_ret.id WHERE be_ret.bill_id = b.id AND bi_ret.status = 'คืนเลข'), 0) AS "returnedAmount",
                    (b.total_amount - COALESCE((SELECT SUM(bi_ret.price) FROM bet_items bi_ret JOIN bill_entries be_ret ON bi_ret.bill_entry_id = be_ret.id WHERE be_ret.bill_id = b.id AND bi_ret.status = 'คืนเลข'), 0)) AS "netAmount",
                    CASE WHEN EXISTS (SELECT 1 FROM bet_items bi_sub JOIN bill_entries be_sub ON bi_sub.bill_entry_id = be_sub.id WHERE be_sub.bill_id = b.id AND (bi_sub.price * 0.5) = bi_sub.rate) THEN true ELSE false END as "hasHalfRateItem"
                FROM bills b
                JOIN users u ON b.user_id = u.id
                LEFT JOIN bill_entries be ON be.bill_id = b.id
                LEFT JOIN bet_items bi ON bi.bill_entry_id = be.id
                LEFT JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
                WHERE ${whereClause}
                GROUP BY b.id, u.username
                ORDER BY b.id DESC;
            `;
            const result = yield db.query(originalQuery, queryParams);
            res.json(result.rows);
        }
    }
    catch (err) {
        console.error('Error fetching bills:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบิล', details: err.message });
    }
}));
app.delete('/api/delete-bills/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield db.query('DELETE FROM bills WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'ไม่พบโพยที่ต้องการลบ' });
        }
        // ส่ง Status 204 (No Content) เพื่อยืนยันว่าการลบสำเร็จ
        res.status(204).send();
    }
    catch (err) {
        console.error(`เกิดข้อผิดพลาดในการลบโพย ID ${id}:`, err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์' });
    }
}));
app.get('/api/users-with-bills', isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ใช้ DISTINCT เพื่อไม่ให้ได้ชื่อซ้ำ
        const result = yield db.query(`
            SELECT DISTINCT u.id, u.username 
            FROM users u
            JOIN bills b ON u.id = b.user_id
            ORDER BY u.username
        `);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Error fetching users with bills:', err);
        res.status(500).json({ error: 'ไม่สามารถดึงรายชื่อผู้ใช้ได้', details: err.message });
    }
}));
app.get("/api/bills/:billId/details", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { billId } = req.params;
    try {
        const entriesResult = yield db.query("SELECT * FROM bill_entries WHERE bill_id = $1 ORDER BY id", [billId]);
        const itemsResult = yield db.query(`
        SELECT bi.* FROM bet_items bi
        JOIN bill_entries be ON bi.bill_entry_id = be.id
        WHERE be.bill_id = $1 ORDER BY bi.id
        `, [billId]);
        const responseData = entriesResult.rows.map((entry) => (Object.assign(Object.assign({}, entry), { items: itemsResult.rows.filter((item) => item.bill_entry_id === entry.id) })));
        res.json(responseData);
        // console.log(`result bill detail => ${JSON.stringify(responseData)}`);
    }
    catch (err) {
        console.error("Error fetching bill details:", err);
        res
            .status(500)
            .json({ error: "ไม่สามารถดึงข้อมูลรายละเอียดได้", details: err.message });
    }
}));
// ในไฟล์ server.ts
app.put('/api/bet-items/:itemId/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { itemId } = req.params;
    const { status } = req.body;
    const client = yield db.connect();
    try {
        yield client.query('BEGIN');
        const itemResult = yield client.query('UPDATE bet_items SET status = $1 WHERE id = $2 RETURNING *', [status, itemId]);
        if (((_a = itemResult.rowCount) !== null && _a !== void 0 ? _a : 0) === 0) {
            yield client.query('ROLLBACK');
            return res.status(404).json({ error: 'ไม่พบรายการ' });
        }
        const updatedItem = itemResult.rows[0];
        const entryResult = yield client.query('SELECT bill_id FROM bill_entries WHERE id = $1', [updatedItem.bill_entry_id]);
        const billId = entryResult.rows[0].bill_id;
        let newBillStatus = null;
        // ✨ --- [เริ่ม] Logic ที่แก้ไขใหม่ --- ✨
        // 1. ดึงข้อมูล "ทุก" รายการในบิลนี้มาตรวจสอบสถานะ
        const allItemsResult = yield client.query(`SELECT status FROM bet_items WHERE bill_entry_id IN (SELECT id FROM bill_entries WHERE bill_id = $1)`, [billId]);
        const allItems = allItemsResult.rows;
        // 2. ตรวจสอบเงื่อนไขเพื่อตัดสินใจสถานะของบิล
        if (allItems.length > 0) {
            const areAllItemsReturned = allItems.every(item => item.status === 'คืนเลข');
            const areAllItemsProcessed = allItems.every(item => item.status === 'ยืนยัน' || item.status === 'คืนเลข');
            if (areAllItemsReturned) {
                // ถ้าทุกรายการเป็น 'คืนเลข' -> บิลนี้จะถูก 'ยกเลิก'
                const billUpdateResult = yield client.query(`UPDATE bills SET status = 'ยกเลิก' WHERE id = $1 RETURNING status`, [billId]);
                if (((_b = billUpdateResult.rowCount) !== null && _b !== void 0 ? _b : 0) > 0) {
                    newBillStatus = billUpdateResult.rows[0].status;
                }
            }
            else if (areAllItemsProcessed) {
                // ถ้าทุกรายการถูกจัดการแล้ว (ไม่มีรายการรอผล) -> บิลนี้จะถูก 'ยืนยันแล้ว'
                const billUpdateResult = yield client.query(`UPDATE bills SET status = 'ยืนยันแล้ว' WHERE id = $1 AND status = 'รอผล' RETURNING status`, [billId]);
                if (((_c = billUpdateResult.rowCount) !== null && _c !== void 0 ? _c : 0) > 0) {
                    newBillStatus = billUpdateResult.rows[0].status;
                }
            }
        }
        // ✨ --- [สิ้นสุด] Logic ที่แก้ไขใหม่ --- ✨
        yield client.query('COMMIT');
        res.json({ updatedItem, newBillStatus });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error('Error updating item status:', err);
        res.status(500).json({ error: 'อัปเดตสถานะไม่สำเร็จ', details: err.message });
    }
    finally {
        client.release();
    }
}));
// ในไฟล์ server.ts
app.post('/api/bills/:billId/update-all-items', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { billId } = req.params;
    const { status: newItemStatus } = req.body; // รับสถานะที่ต้องการอัปเดต เช่น 'ยืนยัน' หรือ 'คืนเลข'
    const client = yield db.connect();
    try {
        yield client.query('BEGIN');
        // 1. อัปเดตรายการที่ยังเป็น NULL (รอการตัดสินใจ) ให้เป็นสถานะใหม่
        const updateItemsResult = yield client.query(`
            UPDATE bet_items SET status = $1 
            WHERE status IS NULL AND bill_entry_id IN (SELECT id FROM bill_entries WHERE bill_id = $2)
            RETURNING *`, [newItemStatus, billId]);
        let newBillStatus = null;
        // 2. ดึงข้อมูล "ทุก" รายการในบิลนี้มาตรวจสอบอีกครั้ง
        const allItemsResult = yield client.query(`SELECT status FROM bet_items WHERE bill_entry_id IN (SELECT id FROM bill_entries WHERE bill_id = $1)`, [billId]);
        const allItems = allItemsResult.rows;
        // 3. Logic ใหม่ในการตัดสินใจสถานะของบิล
        if (allItems.length > 0) {
            const areAllItemsReturned = allItems.every(item => item.status === 'คืนเลข');
            const areAllItemsProcessed = allItems.every(item => item.status === 'ยืนยัน' || item.status === 'คืนเลข');
            if (areAllItemsReturned) {
                // ✨ ถ้าทุกรายการถูก 'คืนเลข' -> สถานะบิลหลักจะเป็น 'ยกเลิก'
                const billUpdateResult = yield client.query(`UPDATE bills SET status = 'ยกเลิก' WHERE id = $1 RETURNING status`, [billId]);
                if (((_a = billUpdateResult.rowCount) !== null && _a !== void 0 ? _a : 0) > 0) {
                    newBillStatus = billUpdateResult.rows[0].status;
                }
            }
            else if (areAllItemsProcessed) {
                // ✨ ถ้าทุกรายการถูกจัดการแล้ว (ไม่มีรายการที่รอผล) -> สถานะบิลหลักจะเป็น 'ยืนยันแล้ว'
                const billUpdateResult = yield client.query(`UPDATE bills SET status = 'ยืนยันแล้ว' WHERE id = $1 AND status = 'รอผล' RETURNING status`, [billId]);
                if (((_b = billUpdateResult.rowCount) !== null && _b !== void 0 ? _b : 0) > 0) {
                    newBillStatus = billUpdateResult.rows[0].status;
                }
            }
        }
        yield client.query('COMMIT');
        res.json({
            message: `อัปเดต ${(_c = updateItemsResult.rowCount) !== null && _c !== void 0 ? _c : 0} รายการสำเร็จ`,
            updatedRows: updateItemsResult.rows,
            newBillStatus
        });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error('Error bulk updating items:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตรายการทั้งหมด', details: err.message });
    }
    finally {
        client.release();
    }
}));
app.post('/api/bills/:billId/confirm', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { billId } = req.params;
    const client = yield db.connect();
    try {
        yield client.query('BEGIN');
        const billUpdateResult = yield client.query(`UPDATE bills SET status = 'ยืนยันแล้ว' WHERE id = $1 RETURNING *`, [billId]);
        if (((_a = billUpdateResult.rowCount) !== null && _a !== void 0 ? _a : 0) === 0) {
            throw new Error('ไม่พบบิลที่ต้องการยืนยัน');
        }
        yield client.query(`UPDATE bet_items SET status = 'ยืนยัน' 
             WHERE bill_entry_id IN (SELECT id FROM bill_entries WHERE bill_id = $1)`, [billId]);
        yield client.query('COMMIT');
        res.status(200).json({
            message: `บิล #${billId} ได้รับการยืนยันเรียบร้อยแล้ว`,
            updatedBill: billUpdateResult.rows[0]
        });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error(`Error confirming bill ${billId}:`, err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการยืนยันบิล', details: err.message });
    }
    finally {
        client.release();
    }
}));
app.post('/api/bills/:billId/cancel', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { billId } = req.params;
    const client = yield db.connect();
    try {
        yield client.query('BEGIN');
        const billUpdateResult = yield client.query(`UPDATE bills SET status = 'ยกเลิก' WHERE id = $1 RETURNING *`, [billId]);
        if (((_a = billUpdateResult.rowCount) !== null && _a !== void 0 ? _a : 0) === 0) {
            throw new Error('ไม่พบบิลที่ต้องการยกเลิก');
        }
        yield client.query(`UPDATE bet_items SET status = 'คืนเลข' 
             WHERE bill_entry_id IN (SELECT id FROM bill_entries WHERE bill_id = $1)`, [billId]);
        yield client.query('COMMIT');
        res.status(200).json({
            message: `บิล #${billId} ถูกยกเลิกเรียบร้อยแล้ว`,
            updatedBill: billUpdateResult.rows[0]
        });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error(`Error canceling bill ${billId}:`, err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการยกเลิกบิล', details: err.message });
    }
    finally {
        client.release();
    }
}));
app.get('/api/lotto-types', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db.query('SELECT * FROM lotto_types ORDER BY id');
        res.json(result.rows);
    }
    catch (err) {
        console.error('Error fetching lotto types:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทหวย', details: err.message });
    }
}));
app.get('/api/lotto-types/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield db.query('SELECT * FROM lotto_types WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'ไม่พบประเภทหวยนี้' });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(`Error fetching lotto type ${id}:`, err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทหวย', details: err.message });
    }
}));
// --- NEW ENDPOINT: สำหรับสร้างงวดหวยถัดไปโดยอัตโนมัติ (ถูกย้าย Logic ไปที่อื่นแล้ว) ---
// Endpoint นี้อาจจะยังคงอยู่เพื่อการ Test หรือ Trigger แบบ Manual
app.post('/api/lotto-rounds/generate-next-rounds', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Logic ของ API นี้จะเรียกใช้ generateLottoRoundsJob(db) โดยตรง
    // เพื่อให้ทำงานได้ชั่วคราว:
    try {
        // ต้อง import generateLottoRoundsJob จาก './services/lottoRoundGenerator' ก่อน
        // ซึ่งใน App จริง เราควรแยก Logic การรัน Job ออกจาก API endpoint
        // แต่เพื่อการทดสอบ คุณสามารถเรียก generateLottoRoundsJob(db) ตรงนี้ได้
        yield (0, lottoRoundGenerator_1.generateLottoRoundsJob)(db); // เรียก Logic Job โดยตรง
        res.json({ message: "Triggered lotto round generation." }); // ตอบกลับทันที
    }
    catch (err) {
        res.status(500).json({ error: "Failed to manually trigger generation." });
    }
}));
app.put('/api/lotto-rounds/update-all/:id', isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { open_datetime, cutoff_datetime, closed_numbers, half_pay_numbers, limit_2d_amount, limit_3d_amount } = req.body;
    /**
     * ฟังก์ชันสำหรับเรียงลำดับตัวเลข:
     * 1. เรียงตามจำนวนหลักก่อน (น้อยไปมาก)
     * 2. ถ้าจำนวนหลักเท่ากัน ให้เรียงตามค่าของตัวเลข (น้อยไปมาก)
     */
    const customNumberSort = (a, b) => {
        const lengthDifference = a.length - b.length;
        if (lengthDifference !== 0) {
            return lengthDifference;
        }
        return Number(a) - Number(b);
    };
    if (!open_datetime || !cutoff_datetime) {
        return res.status(400).json({ error: 'กรุณาระบุเวลาเปิดและปิดรับ' });
    }
    // --- Logic การทำความสะอาดและเรียงข้อมูล ---
    const uniqueSortedClosed = [...new Set(closed_numbers || [])].sort(customNumberSort);
    const closedNumbersSet = new Set(uniqueSortedClosed);
    const finalHalfPayNumbers = [...new Set(half_pay_numbers || [])]
        .filter((num) => !closedNumbersSet.has(num))
        .sort(customNumberSort);
    const client = yield db.connect();
    try {
        yield client.query('BEGIN');
        const oldRoundResult = yield client.query('SELECT name, cutoff_datetime FROM lotto_rounds WHERE id = $1', [id]);
        if (oldRoundResult.rows.length === 0) {
            throw new Error('ไม่พบข้อมูลงวดหวยที่ต้องการแก้ไข');
        }
        const oldRound = oldRoundResult.rows[0];
        const oldCutoffTime = new Date(oldRound.cutoff_datetime).getTime();
        const newCutoffTime = new Date(cutoff_datetime).getTime();
        const roundName = oldRound.name;
        const updateRoundQuery = `
            UPDATE lotto_rounds
            SET 
                open_datetime = $1,
                cutoff_datetime = $2,
                closed_numbers = $3,
                half_pay_numbers = $4,
                limit_2d_amount = $5, 
                limit_3d_amount = $6 
            WHERE id = $7;
        `;
        yield client.query(updateRoundQuery, [
            open_datetime,
            cutoff_datetime,
            JSON.stringify(uniqueSortedClosed),
            JSON.stringify(finalHalfPayNumbers),
            limit_2d_amount,
            limit_3d_amount,
            id
        ]);
        if (oldCutoffTime !== newCutoffTime) {
            console.log(`ตรวจพบการเปลี่ยนแปลงเวลาของงวด ID: ${id}, กำลังอัปเดตโพยที่เกี่ยวข้อง...`);
            const updateBillsQuery = `
                UPDATE bills
                SET 
                    bet_name = $1,
                    bill_lotto_draw = $2
                WHERE lotto_round_id = $3;
            `;
            const updateResult = yield client.query(updateBillsQuery, [roundName, cutoff_datetime, id]);
            console.log(`อัปเดตโพยจำนวน ${updateResult.rowCount} รายการสำเร็จ`);
        }
        yield client.query('COMMIT');
        res.status(200).json({ message: 'บันทึกข้อมูลงวดสำเร็จ' });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล:', error);
        res.status(500).json({ error: 'ไม่สามารถบันทึกข้อมูลได้', details: error.message });
    }
    finally {
        client.release();
    }
}));
app.post('/api/add-lotto-types', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, rate_3_top, rate_3_bottom, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom, betting_start_time, betting_cutoff_time, generation_strategy, interval_minutes, monthly_fixed_days, monthly_floating_dates, specific_days_of_week, betting_skip_start_day // *** เพิ่ม specific_days_of_week ***
     } = req.body;
    try {
        const query = `
            INSERT INTO lotto_types (
                name, rate_3_top, rate_3_bottom, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom,
                betting_start_time, betting_cutoff_time, generation_strategy, interval_minutes,
                monthly_fixed_days, monthly_floating_dates, specific_days_of_week, betting_skip_start_day -- *** เพิ่ม specific_days_of_week ***
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *;`;
        const values = [
            name, rate_3_top, rate_3_bottom, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom,
            betting_start_time, betting_cutoff_time, generation_strategy, interval_minutes,
            monthly_fixed_days, monthly_floating_dates, specific_days_of_week, betting_skip_start_day // *** เพิ่ม specific_days_of_week ***
        ];
        const result = yield db.query(query, values);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error('Error creating lotto type:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างข้อมูล', details: err.message });
    }
}));
// PUT /api/lotto-types/:id - สำหรับอัปเดต lotto type ที่มีอยู่
app.put('/api/update-lotto-types/:id', isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, rate_3_top, rate_3_tote, rate_3_bottom, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom, betting_start_time, betting_cutoff_time, generation_strategy, interval_minutes, monthly_fixed_days, monthly_floating_dates, specific_days_of_week, betting_skip_start_day } = req.body;
    try {
        const query = `
            UPDATE lotto_types SET
                name = $1, rate_3_top = $2, rate_3_tote = $3, rate_3_bottom = $4, 
                rate_2_top = $5, rate_2_bottom = $6, rate_run_top = $7, rate_run_bottom = $8,
                betting_start_time = $9, betting_cutoff_time = $10,
                generation_strategy = $11, interval_minutes = $12,
                monthly_fixed_days = $13, monthly_floating_dates = $14,
                specific_days_of_week = $15, betting_skip_start_day = $16
            WHERE id = $17 RETURNING *;
        `;
        const values = [
            name, rate_3_top,
            rate_3_tote, // ✨ เพิ่ม rate_3_tote
            rate_3_bottom, rate_2_top, rate_2_bottom,
            rate_run_top, rate_run_bottom, betting_start_time, betting_cutoff_time,
            generation_strategy, interval_minutes, monthly_fixed_days,
            monthly_floating_dates ? JSON.stringify(monthly_floating_dates) : null,
            specific_days_of_week, betting_skip_start_day,
            id
        ];
        const result = yield db.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลที่ต้องการอัปเดต' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(`Error updating lotto type ${id}:`, error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', details: error.message });
    }
}));
// DELETE /api/lotto-types/:id - สำหรับลบ lotto type
app.delete('/api/delete-lotto-types/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const client = yield db.connect();
    try {
        // 1. เริ่ม Transaction
        yield client.query('BEGIN');
        // 2. อัปเดตสถานะในตาราง 'bet_items' ให้เป็น 'คืนเลข'
        // โดยค้นหาจาก lotto_type_id ผ่านตาราง bills และ bill_entries
        const updateBetItemsQuery = `
            UPDATE bet_items
            SET status = 'คืนเลข'
            WHERE bill_entry_id IN (
                SELECT be.id FROM bill_entries be
                JOIN bills b ON be.bill_id = b.id
                WHERE b.lotto_round_id IN (
                    SELECT lr.id FROM lotto_rounds lr WHERE lr.lotto_type_id = $1
                )
            )
        `;
        yield client.query(updateBetItemsQuery, [id]);
        // 3. อัปเดต 'bills' ที่เกี่ยวข้อง
        // - เปลี่ยน bet_name
        // - เปลี่ยน status เป็น 'ยกเลิก'
        const updateBillsQuery = `
            UPDATE bills
            SET
                bet_name = 'หวยนี้ถูกนำออกจากระบบแล้ว',
                status = 'ยกเลิก'
            WHERE lotto_round_id IN (
                SELECT id FROM lotto_rounds WHERE lotto_type_id = $1
            )
        `;
        yield client.query(updateBillsQuery, [id]);
        // 4. ลบ 'lotto_rounds' ที่เกี่ยวข้องทั้งหมด
        // (ฐานข้อมูลจะตั้งค่า bills.lotto_round_id เป็น NULL ให้เอง เพราะตั้งค่า ON DELETE SET NULL ไว้)
        yield client.query('DELETE FROM lotto_rounds WHERE lotto_type_id = $1', [id]);
        // 5. ลบ 'lotto_type' ตัวหลัก
        const deleteLottoTypeResult = yield client.query('DELETE FROM lotto_types WHERE id = $1 RETURNING *', [id]);
        if (deleteLottoTypeResult.rowCount === 0) {
            yield client.query('ROLLBACK');
            return res.status(404).json({ error: 'ไม่พบข้อมูล lotto_type ที่ต้องการลบ' });
        }
        // 6. ถ้าทุกอย่างสำเร็จ ให้ Commit Transaction
        yield client.query('COMMIT');
        res.status(204).send();
    }
    catch (err) {
        // 7. หากมีข้อผิดพลาดเกิดขึ้น ให้ Rollback Transaction
        yield client.query('ROLLBACK');
        console.error(`Error performing complex delete for lotto type ${id}:`, err);
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการลบข้อมูล',
            details: err.message
        });
    }
    finally {
        // 8. คืน Client กลับสู่ Pool
        client.release();
    }
}));
// ====================================================================
// ==              API ROUTES FOR ADMIN LOTTO MANAGEMENT             ==
// ====================================================================
// GET /api/admin/lotto-types - ดึงข้อมูลประเภทหวยทั้งหมดสำหรับแอดมิน
app.get('/api/admin/lotto-types', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ดึงข้อมูลทั้งหมดที่จำเป็นสำหรับตารางแอดมิน
        const result = yield db.query('SELECT id, name, rate_3_top, rate_2_top, rate_2_bottom, generation_strategy FROM lotto_types ORDER BY id');
        res.json(result.rows);
    }
    catch (err) {
        console.error('Admin Fetch Error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทหวย' });
    }
}));
app.get('/api/admin/lotto-types/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield db.query('SELECT * FROM lotto_types WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'ไม่พบข้อมูล' });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(`Admin Fetch Error (ID: ${id}):`, err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
}));
// POST /api/admin/lotto-types - สร้างประเภทหวยใหม่
app.post('/api/admin/lotto-types', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // ดึงข้อมูลจาก body ของ request
    const { name, rate_3_top, rate_3_tote, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom, betting_start_time, betting_cutoff_time, generation_strategy } = req.body;
    try {
        const query = `
            INSERT INTO lotto_types (
                name, rate_3_top, rate_3_tote, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom,
                betting_start_time, betting_cutoff_time, generation_strategy
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;`;
        const values = [
            name, rate_3_top, rate_3_tote, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom,
            betting_start_time, betting_cutoff_time, generation_strategy
        ];
        const result = yield db.query(query, values);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error('Admin Create Error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างข้อมูล', details: err.message });
    }
}));
// PUT /api/admin/lotto-types/:id - อัปเดตประเภทหวย
app.put('/api/admin/update-lotto-types/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, rate_3_top, rate_3_tote, rate_3_bottom, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom, betting_start_time, betting_cutoff_time, generation_strategy, interval_minutes, monthly_fixed_days, monthly_floating_dates, specific_days_of_week, betting_skip_start_day } = req.body;
    try {
        const query = `
            UPDATE lotto_types SET
                name = $1, rate_3_top = $2, rate_3_tote = $3, rate_3_bottom = $4,
                rate_2_top = $5, rate_2_bottom = $6, rate_run_top = $7, rate_run_bottom = $8, 
                betting_start_time = $9, betting_cutoff_time = $10, 
                generation_strategy = $11, interval_minutes = $12,
                monthly_fixed_days = $13, monthly_floating_dates = $14,
                specific_days_of_week = $15, betting_skip_start_day = $16
            WHERE id = $17 RETURNING *;`;
        const values = [
            name,
            rate_3_top, rate_3_tote, rate_3_bottom, rate_2_top, rate_2_bottom, rate_run_top, rate_run_bottom,
            betting_start_time, betting_cutoff_time,
            generation_strategy,
            interval_minutes,
            monthly_fixed_days,
            monthly_floating_dates ? JSON.stringify(monthly_floating_dates) : null,
            specific_days_of_week,
            betting_skip_start_day,
            id
        ];
        const result = yield db.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลที่ต้องการอัปเดต' });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(`Admin Update Error (ID: ${id}):`, err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', details: err.message });
    }
}));
app.delete('/api/admin/lotto-types/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield db.query('DELETE FROM lotto_types WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลที่ต้องการลบ' });
        }
        // ตอบกลับด้วย 200 OK และ message เพื่อให้ frontend จัดการได้ง่าย
        res.status(200).json({ message: `Lotto type ID: ${id} deleted successfully.` });
    }
    catch (err) {
        console.error(`Admin Delete Error (ID: ${id}):`, err);
        if (err.code === '23503') { // Foreign key violation
            return res.status(400).json({
                error: 'ไม่สามารถลบได้',
                details: 'ข้อมูลนี้กำลังถูกใช้งานโดยส่วนอื่นของระบบ'
            });
        }
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล', details: err.message });
    }
}));
// GET /api/lotto-rounds/:id/limits - ดึงเลขปิด/อั้นของงวดที่ระบุ (เฉพาะงวดที่ active)
app.get("/api/lotto-rounds/:id/number-special", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    /**
     * ฟังก์ชันสำหรับเรียงลำดับตัวเลข:
     * 1. เรียงตามจำนวนหลักก่อน (น้อยไปมาก)
     * 2. ถ้าจำนวนหลักเท่ากัน ให้เรียงตามค่าของตัวเลข (น้อยไปมาก)
     */
    const customNumberSort = (a, b) => {
        const lengthDifference = a.length - b.length;
        if (lengthDifference !== 0) {
            return lengthDifference;
        }
        return Number(a) - Number(b);
    };
    try {
        const query = `
            SELECT 
                closed_numbers, 
                half_pay_numbers 
            FROM lotto_rounds 
            WHERE id = $1 AND status IN ('active', 'manual_active')`;
        const result = yield db.query(query, [id]);
        if (result.rowCount === 0) {
            // ถ้าไม่เจอ ให้ส่งค่าว่างกลับไปแทน 404 เพื่อให้ Frontend ทำงานต่อได้
            return res.json({ closed_numbers: [], half_pay_numbers: [] });
        }
        const data = result.rows[0];
        // จัดเรียงข้อมูลก่อนส่งกลับ
        const sortedClosed = (data.closed_numbers || []).sort(customNumberSort);
        const sortedHalfPay = (data.half_pay_numbers || []).sort(customNumberSort);
        res.json({
            closed_numbers: sortedClosed,
            half_pay_numbers: sortedHalfPay,
        });
    }
    catch (err) {
        console.error(`Error fetching limits for lotto round ${id}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์", details: err.message });
    }
}));
// server.ts
app.put("/api/lotto-rounds/update-number-special/:lottoId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lottoId } = req.params;
    const newClosedNumbers = req.body.closed_numbers || [];
    const newHalfPayNumbers = req.body.half_pay_numbers || [];
    /**
     * ฟังก์ชันสำหรับเรียงลำดับตัวเลข:
     * 1. เรียงตามจำนวนหลักก่อน (น้อยไปมาก)
     * 2. ถ้าจำนวนหลักเท่ากัน ให้เรียงตามค่าของตัวเลข (น้อยไปมาก)
     */
    const customNumberSort = (a, b) => {
        const lengthDifference = a.length - b.length;
        if (lengthDifference !== 0) {
            return lengthDifference;
        }
        return Number(a) - Number(b);
    };
    if (!Array.isArray(newClosedNumbers) || !Array.isArray(newHalfPayNumbers)) {
        return res.status(400).json({ error: "ข้อมูลที่ส่งมาต้องเป็นรูปแบบ Array" });
    }
    // --- Logic การทำความสะอาดและเรียงข้อมูล ---
    const uniqueSortedClosed = [...new Set(newClosedNumbers)].sort(customNumberSort);
    const closedNumbersSet = new Set(uniqueSortedClosed);
    const finalHalfPayNumbers = [...new Set(newHalfPayNumbers)]
        .filter((num) => !closedNumbersSet.has(num))
        .sort(customNumberSort);
    try {
        const query = `
            UPDATE lotto_rounds 
            SET 
                closed_numbers = $1, 
                half_pay_numbers = $2 
            WHERE id = $3
            RETURNING id, closed_numbers, half_pay_numbers;
        `;
        const result = yield db.query(query, [
            JSON.stringify(uniqueSortedClosed),
            JSON.stringify(finalHalfPayNumbers),
            lottoId
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลงวดหวยที่ต้องการอัปเดต" });
        }
        // ส่งข้อมูลที่ถูกจัดเรียงแล้วกลับไป
        const responseData = result.rows[0];
        responseData.closed_numbers = (responseData.closed_numbers || []).sort(customNumberSort);
        responseData.half_pay_numbers = (responseData.half_pay_numbers || []).sort(customNumberSort);
        res.status(200).json({
            message: "อัปเดตข้อมูลเลขพิเศษสำเร็จ",
            updatedData: responseData
        });
    }
    catch (err) {
        console.error(`Error updating special numbers for lotto round ${lottoId}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์", details: err.message });
    }
}));
app.get("/api/admin/lotto-rounds", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT 
        lr.id, 
        lr.name, 
        lr.cutoff_datetime, 
        lr.status, 
        lr.winning_numbers,
        lt.name as lotto_type_name 
      FROM lotto_rounds lr
      JOIN lotto_types lt ON lr.lotto_type_id = lt.id
      ORDER BY lr.cutoff_datetime DESC;
    `;
        const result = yield db.query(query);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Error fetching all lotto rounds:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์", details: err.message });
    }
}));
app.get("/api/admin/lotto-rounds/closed", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT id, name, cutoff_datetime, winning_numbers 
      FROM lotto_rounds
      WHERE status = 'closed'
      ORDER BY cutoff_datetime DESC;
    `;
        const result = yield db.query(query);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Error fetching closed lotto rounds:", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลงวดหวย" });
    }
}));
app.get("/api/admin/lotto-rounds/closed-and-manual_closed", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT id, name, cutoff_datetime, winning_numbers, status 
      FROM lotto_rounds
      WHERE status IN ('closed', 'manual_closed') 
      ORDER BY cutoff_datetime DESC;
    `;
        const result = yield db.query(query);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Error fetching closed lotto rounds:", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลงวดหวย" });
    }
}));
// GET /api/admin/lotto-rounds/:id - ดึงข้อมูลงวดหวย 1 รายการตาม ID
// app.get("/api/admin/lotto-rounds/:id", async (req: Request, res: Response) => {
//   const { id } = req.params;
//   try {
//     const result = await db.query("SELECT * FROM lotto_rounds WHERE id = $1", [id]);
//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "ไม่พบข้อมูลงวดหวย" });
//     }
//     res.json(result.rows[0]);
//   } catch (err: any) {
//     console.error(`Error fetching lotto round ${id}:`, err);
//     res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์", details: err.message });
//   }
// });
// GET /api/admin/lotto-rounds/:id - ดึงข้อมูลงวดหวย 1 รายการตาม ID
app.get("/api/admin/lotto-rounds/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const client = yield db.connect();
    try {
        const roundResult = yield client.query("SELECT * FROM lotto_rounds WHERE id = $1", [id]);
        if (roundResult.rowCount === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลงวดหวย" });
        }
        const rangeLimitsResult = yield client.query("SELECT * FROM lotto_round_range_limits WHERE lotto_round_id = $1 ORDER BY range_start", [id]);
        // --- เพิ่มส่วนนี้เพื่อดึงข้อมูล exemptions ---
        const exemptionsResult = yield client.query("SELECT * FROM lotto_round_exemptions WHERE lotto_round_id = $1 ORDER BY id", [id]);
        const responseData = Object.assign(Object.assign({}, roundResult.rows[0]), { range_limits: rangeLimitsResult.rows, exemptions: exemptionsResult.rows // <-- เพิ่ม exemptions เข้าไปใน response
         });
        res.json(responseData);
    }
    catch (err) {
        console.error(`Error fetching lotto round ${id}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์", details: err.message });
    }
    finally {
        client.release();
    }
}));
// PUT /api/lotto-rounds/winning-numbers/:id
app.put("/api/lotto-rounds/winning-numbers/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { winning_numbers } = req.body;
    // ตรวจสอบข้อมูลเบื้องต้น
    if (!winning_numbers || typeof winning_numbers !== 'object') {
        return res.status(400).json({ error: "ข้อมูล winning_numbers ไม่ถูกต้อง" });
    }
    try {
        const query = `
      UPDATE lotto_rounds
      SET winning_numbers = $1
      WHERE id = $2
      RETURNING *;
    `;
        // PostgreSQL จะแปลง Object เป็น JSON/JSONB โดยอัตโนมัติ
        const result = yield db.query(query, [winning_numbers, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลงวดที่ต้องการอัปเดต" });
        }
        res.status(200).json({
            message: "อัปเดตเลขรางวัลสำเร็จ",
            updatedRound: result.rows[0],
        });
    }
    catch (err) {
        console.error(`Error updating winning numbers for round ${id}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์" });
    }
}));
// PUT /api/admin/lotto-rounds/:id/winning-numbers - บันทึกผลรางวัลของงวดที่ระบุ
app.put("/api/admin/lotto-rounds/:id/winning-numbers", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { "3top": three_top, "2top": two_top, "2bottom": two_bottom, "3bottom": three_bottom } = req.body;
    try {
        // --- 1. ดึงข้อมูล winning_numbers เดิมออกมาก่อน ---
        const currentResult = yield db.query("SELECT winning_numbers FROM lotto_rounds WHERE id = $1", [id]);
        if (currentResult.rowCount === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลงวดหวย" });
        }
        const currentNumbers = currentResult.rows[0].winning_numbers;
        // --- 2. สร้างเลขโต๊ดอัตโนมัติถ้ามี 3 ตัวบนส่งมา ---
        let toteNumbers = currentNumbers.tote || [];
        if (three_top && /^\d{3}$/.test(three_top)) {
            const chars = three_top.split('');
            // สร้างชุดเลขโต๊ดโดยไม่เอาเลขซ้ำ (Set) แล้วแปลงกลับเป็น Array
            toteNumbers = [...new Set([
                    `${chars[0]}${chars[1]}${chars[2]}`, `${chars[0]}${chars[2]}${chars[1]}`,
                    `${chars[1]}${chars[0]}${chars[2]}`, `${chars[1]}${chars[2]}${chars[0]}`,
                    `${chars[2]}${chars[0]}${chars[1]}`, `${chars[2]}${chars[1]}${chars[0]}`,
                ])];
        }
        // --- 3. สร้าง Object ข้อมูลใหม่ โดยใช้ข้อมูลเก่าเป็นฐานและทับด้วยข้อมูลใหม่ที่ส่งมา ---
        const newWinningNumbers = Object.assign(Object.assign({}, currentNumbers), { "3top": three_top !== undefined ? three_top : currentNumbers["3top"], "2top": two_top !== undefined ? two_top : currentNumbers["2top"], "2bottom": two_bottom !== undefined ? two_bottom : currentNumbers["2bottom"], "3bottom": three_bottom !== undefined ? three_bottom : currentNumbers["3bottom"], "3tote": toteNumbers });
        // --- 4. อัปเดตข้อมูลกลับลงฐานข้อมูล ---
        const updateQuery = `
      UPDATE lotto_rounds 
      SET winning_numbers = $1 
      WHERE id = $2
      RETURNING id, winning_numbers;
    `;
        const result = yield db.query(updateQuery, [newWinningNumbers, id]);
        res.status(200).json({
            message: "บันทึกผลรางวัลสำเร็จ",
            updatedData: result.rows[0]
        });
    }
    catch (err) {
        console.error(`Error updating winning numbers for lotto round ${id}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์", details: err.message });
    }
}));
// สำหรับเพิ่มงวดหวยเองแบบ Manual
app.get("/api/prize-check/flat-list", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // รับค่าจาก query string สำหรับการกรอง
    const { startDate, endDate, billRef } = req.query;
    try {
        let query = `
      SELECT
          bi.id,
          bi.bet_number,
          bi.price,
          bi.bet_style,
          bi.baht_per,
          be.bet_type,
          b.bill_ref AS "billRef",
          b.note,
          b.created_at AS "createdAt",
          lr.name AS "lottoName",
          lr.cutoff_datetime AS "lottoDrawDate",
          lr.winning_numbers AS "winningNumbers",
          u.username
      FROM bet_items bi
      JOIN bill_entries be ON bi.bill_entry_id = be.id
      JOIN bills b ON be.bill_id = b.id
      JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
      JOIN users u ON b.user_id = u.id
      WHERE bi.status = 'ยืนยัน'
    `;
        const queryParams = [];
        let paramIndex = 1;
        // เพิ่มเงื่อนไขการกรองเข้าไปใน query
        if (startDate && endDate) {
            query += ` AND b.created_at::date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
            queryParams.push(startDate, endDate);
        }
        if (billRef) {
            query += ` AND b.bill_ref ILIKE $${paramIndex++}`;
            queryParams.push(`%${billRef}%`);
        }
        query += ' ORDER BY b.created_at DESC, bi.id ASC;';
        const result = yield db.query(query, queryParams);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Error fetching flat prize check list:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์", details: err.message });
    }
}));
app.delete("/api/users/:id", isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    // Get a client from the connection pool
    const client = yield db.connect();
    try {
        // 1. Start a database transaction
        yield client.query('BEGIN');
        const deletedBillsResult = yield client.query('DELETE FROM bills WHERE user_id = $1', [id]);
        // Log how many bills were deleted for this user
        console.log(`Deleted ${deletedBillsResult.rowCount} bills for user ID: ${id}`);
        // 3. Now, delete the user themselves
        const deletedUserResult = yield client.query('DELETE FROM users WHERE id = $1 RETURNING username', [id]);
        // 4. Check if the user was actually found and deleted
        if (deletedUserResult.rowCount === 0) {
            // If the user doesn't exist, we shouldn't commit any changes. Rollback.
            yield client.query('ROLLBACK');
            return res.status(404).json({ error: "ไม่พบผู้ใช้ที่ต้องการลบ" });
        }
        // 5. If both deletions were successful, commit the transaction
        yield client.query('COMMIT');
        const deletedUsername = deletedUserResult.rows[0].username;
        res.status(200).json({
            message: `ลบผู้ใช้ '${deletedUsername}' (ID: ${id}) และโพยทั้งหมด (${deletedBillsResult.rowCount} ใบ) สำเร็จ`
        });
    }
    catch (err) {
        // 6. If any error occurs during the process, roll back all changes
        yield client.query('ROLLBACK');
        console.error(`Error during transaction for deleting user ${id}:`, err);
        res.status(500).json({
            error: "เกิดข้อผิดพลาดในการลบผู้ใช้และข้อมูลที่เกี่ยวข้อง",
            details: err.message
        });
    }
    finally {
        // 7. Always release the client back to the pool in the end
        client.release();
    }
}));
// 1. GET /api/users - ดึงข้อมูลผู้ใช้ทั้งหมด
app.get("/api/users", isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db.query('SELECT id, username, role FROM users ORDER BY id ASC');
        res.json(result.rows);
    }
    catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้", details: err.message });
    }
}));
app.put("/api/users/:id", isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { username, role } = req.body;
    try {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (username) {
            updates.push(`username = $${paramIndex++}`);
            values.push(username);
        }
        if (role && ['user', 'admin', 'owner'].includes(role)) {
            updates.push(`role = $${paramIndex++}`);
            values.push(role);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: "ไม่มีข้อมูลให้อัปเดต" });
        }
        values.push(id);
        const query = `
            UPDATE users 
            SET ${updates.join(', ')} 
            WHERE id = $${paramIndex} 
            RETURNING id, username, role
        `;
        const result = yield db.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "ไม่พบผู้ใช้ที่ต้องการอัปเดต" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: "Username นี้ถูกใช้งานแล้ว" });
        }
        console.error(`Error updating user ${id}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล", details: err.message });
    }
}));
// 2. PUT /api/users/:id/role - อัปเดตบทบาท (role)
app.put("/api/users/:id/role", isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { role } = req.body;
    // ตรวจสอบว่า role ที่ส่งมาถูกต้องหรือไม่
    if (!['user', 'admin', 'owner'].includes(role)) {
        return res.status(400).json({ error: "บทบาทไม่ถูกต้อง" });
    }
    try {
        const result = yield db.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role', [role, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "ไม่พบผู้ใช้ที่ต้องการอัปเดต" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(`Error updating role for user ${id}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตบทบาท", details: err.message });
    }
}));
// 3. DELETE /api/users/:id - ลบผู้ใช้
// ในระบบจริง อาจจะต้องส่งอีเมลยืนยัน หรือสร้างรหัสผ่านชั่วคราว
app.put("/api/users/:id/reset-password", isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
    }
    try {
        const saltRounds = 10;
        const passwordHash = yield bcrypt_1.default.hash(newPassword, saltRounds);
        yield db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
        res.status(200).json({ message: `รีเซ็ตรหัสผ่านสำหรับ user ID: ${id} สำเร็จ` });
    }
    catch (err) {
        console.error(`Error resetting password for user ${id}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน", details: err.message });
    }
}));
app.get("/api/bills/grouped", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, billRef, status, noteRef } = req.query;
        let baseQuery = `
      SELECT
        b.id,
        b.bill_ref AS "billRef",
        b.created_at AS "createdAt",
        b.bet_name AS "lottoName",
        b.total_amount AS "totalAmount",
        b.status,
        b.note,
        u.username,
        lr.cutoff_datetime AS "lottoDrawDate",
        lr.winning_numbers AS "winningNumbers",
        -- ใช้ json_agg เพื่อรวบรวมรายการแทงทั้งหมดที่อยู่ในโพยเดียวกันให้เป็น JSON array
        json_agg(
          json_build_object(
            'id', bi.id,
            'bet_number', bi.bet_number,
            'bet_style', bi.bet_style,
            'bet_type', be.bet_type,
            'price', bi.price,
            'rate', bi.rate,
            'payout_amount', bi.payout_amount,
            'baht_per', bi.baht_per,
            'status', bi.status
          ) ORDER BY be.id, bi.id
        ) AS items
      FROM bills b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
      LEFT JOIN bill_entries be ON b.id = be.bill_id
      LEFT JOIN bet_items bi ON be.id = bi.bill_entry_id
    `;
        const whereClauses = [];
        const queryParams = [];
        let paramIndex = 1;
        // สร้างเงื่อนไข WHERE แบบไดนามิกเหมือนเดิม
        if (startDate && endDate) {
            whereClauses.push(`b.created_at::date BETWEEN $${paramIndex++} AND $${paramIndex++}`);
            queryParams.push(startDate, endDate);
        }
        if (billRef) {
            whereClauses.push(`b.bill_ref ILIKE $${paramIndex++}`);
            queryParams.push(`%${billRef}%`);
        }
        if (noteRef) {
            whereClauses.push(`b.note ILIKE $${paramIndex++}`);
            queryParams.push(`%${noteRef}%`);
        }
        if (status) {
            whereClauses.push(`b.status = $${paramIndex++}`);
            queryParams.push(status);
        }
        if (whereClauses.length > 0) {
            baseQuery += " WHERE " + whereClauses.join(" AND ");
        }
        // GROUP BY ข้อมูลหลักของโพย
        baseQuery += ' GROUP BY b.id, u.username, lr.cutoff_datetime, lr.winning_numbers ORDER BY b.created_at DESC';
        const result = yield db.query(baseQuery, queryParams);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Error fetching grouped bills:", err);
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูลโพยแบบกลุ่มได้", details: err.message });
    }
}));
app.get("/api/financial-summary", isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const loggedInUser = req.user;
    const { startDate, endDate, username, status, lottoName, lottoDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please provide both startDate and endDate.' });
    }
    const client = yield db.connect();
    try {
        const queryParams = [];
        const whereConditions = [];
        // --- ส่วนการสร้างเงื่อนไข (เหมือนเดิม) ---
        if (lottoDate && lottoDate !== 'all') {
            whereConditions.push(`lr.cutoff_datetime::date = $${queryParams.length + 1}`);
            queryParams.push(lottoDate);
        }
        else {
            whereConditions.push(`b.created_at BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`);
            queryParams.push(startDate, `${endDate} 23:59:59`);
        }
        if (loggedInUser.role === 'owner' || loggedInUser.role === 'admin') {
            if (username && username !== 'all') {
                whereConditions.push(`u.username = $${queryParams.length + 1}`);
                queryParams.push(username);
            }
        }
        else {
            whereConditions.push(`u.id = $${queryParams.length + 1}`);
            queryParams.push(loggedInUser.id);
        }
        if (status && status !== 'all') {
            whereConditions.push(`b.status = $${queryParams.length + 1}`);
            queryParams.push(status);
        }
        if (lottoName && lottoName !== 'all') {
            whereConditions.push(`b.bet_name = $${queryParams.length + 1}`);
            queryParams.push(lottoName);
        }
        const baseWhereClauses = whereConditions.join(' AND ');
        // --- สิ้นสุดส่วนการสร้างเงื่อนไข ---
        // ✨ --- [จุดที่แก้ไข] สร้าง CTE เพื่อคำนวณยอดสุทธิและยอดคืนของแต่ละบิล --- ✨
        const baseQueryWithCTE = `
            WITH filtered_bills AS (
                SELECT b.*
                FROM bills b
                JOIN users u ON b.user_id = u.id
                JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
                WHERE ${baseWhereClauses}
            ),
            bill_calculations AS (
                SELECT
                    fb.id,
                    COALESCE((
                        SELECT SUM(bi.price)
                        FROM bet_items bi
                        JOIN bill_entries be ON bi.bill_entry_id = be.id
                        WHERE be.bill_id = fb.id AND bi.status = 'คืนเลข'
                    ), 0) AS returned_amount,
                    COALESCE((
                        SELECT SUM(bi.payout_amount)
                        FROM bet_items bi
                        JOIN bill_entries be ON bi.bill_entry_id = be.id
                        WHERE be.bill_id = fb.id 
                          AND bi.status = 'ยืนยัน' 
                          AND EXISTS (
                              SELECT 1 FROM lotto_rounds lr 
                              WHERE lr.id = fb.lotto_round_id AND lr.status IN ('closed', 'manual_closed')
                                AND ((be.bet_type IN ('3d', '6d') AND bi.bet_style = 'ตรง' AND lr.winning_numbers->>'3top' = bi.bet_number) OR 
                                     (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'โต๊ด' AND lr.winning_numbers->'3tote' @> to_jsonb(bi.bet_number::text)) OR 
                                     (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'บน' AND lr.winning_numbers->>'2top' = bi.bet_number) OR 
                                     (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'ล่าง' AND lr.winning_numbers->>'2bottom' = bi.bet_number))
                          )
                    ), 0) AS winning_amount
                FROM filtered_bills fb
            )
        `;
        const summaryQuery = `
            ${baseQueryWithCTE}
            SELECT
                (SELECT COALESCE(SUM(fb.total_amount - COALESCE(bc.returned_amount, 0)), 0) FROM filtered_bills fb LEFT JOIN bill_calculations bc ON fb.id = bc.id)::float AS "totalBetAmount",
                (SELECT COALESCE(SUM(bc.returned_amount), 0) FROM bill_calculations bc)::float AS "totalReturnedAmount",
                (SELECT COALESCE(SUM(bc.winning_amount), 0) FROM bill_calculations bc)::float AS "totalWinnings",
                (SELECT COUNT(id) FROM filtered_bills) AS "totalBills"
        `;
        const byLottoTypeQuery = `
            ${baseQueryWithCTE}
            SELECT 
                fb.bet_name as name, 
                SUM(fb.total_amount - COALESCE(bc.returned_amount, 0))::float AS "totalAmount", 
                COUNT(fb.id) AS "billCount" 
            FROM filtered_bills fb
            LEFT JOIN bill_calculations bc ON fb.id = bc.id
            GROUP BY fb.bet_name HAVING COUNT(fb.id) > 0 
            ORDER BY "totalAmount" DESC;
        `;
        const allBetItemsSummaryQuery = `
            SELECT 
                bi.bet_number as "number", 
                bi.bet_style as "style",
                SUM(bi.price)::float as "totalAmount", 
                COUNT(bi.id) as "count"
            FROM bet_items bi
            JOIN bill_entries be ON bi.bill_entry_id = be.id
            JOIN bills b ON be.bill_id = b.id
            JOIN users u ON b.user_id = u.id
            JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
            WHERE ${baseWhereClauses} AND (bi.status IS NULL OR bi.status = 'ยืนยัน')
            GROUP BY bi.bet_number, bi.bet_style
            ORDER BY "totalAmount" DESC;
        `;
        const recentBillsQuery = `
            ${baseQueryWithCTE}
            SELECT 
                fb.id, 
                fb.bill_ref AS "billRef", 
                u.username, 
                fb.created_at AS "createdAt", 
                (fb.total_amount - COALESCE(bc.returned_amount, 0))::float AS "totalAmount", 
                COALESCE(bc.returned_amount, 0)::float as "returnedAmount",
                fb.status, 
                fb.bet_name AS "lottoName", 
                fb.bill_lotto_draw AS "billLottoDraw", 
                fb.note, 
                fb.lotto_round_id as "lottoRoundId"
            FROM filtered_bills fb
            JOIN users u ON fb.user_id = u.id
            LEFT JOIN bill_calculations bc ON fb.id = bc.id
            ORDER BY fb.created_at DESC;
        `;
        const [summaryResult, byLottoTypeResult, allBetItemsSummaryResult, recentBillsResult, usersResult] = yield Promise.all([
            client.query(summaryQuery, queryParams),
            client.query(byLottoTypeQuery, queryParams),
            client.query(allBetItemsSummaryQuery, queryParams),
            client.query(recentBillsQuery, queryParams),
            client.query('SELECT id, username FROM users')
        ]);
        const summary = summaryResult.rows[0] || {};
        summary.netProfit = (summary.totalWinnings || 0) - (summary.totalBetAmount || 0);
        res.json({
            summary,
            breakdown: { byLottoType: byLottoTypeResult.rows },
            allBetItemsSummary: allBetItemsSummaryResult.rows,
            recentBills: recentBillsResult.rows,
            users: usersResult.rows,
        });
    }
    catch (err) {
        console.error("Error fetching financial summary:", err);
        res.status(500).json({ error: 'Error fetching financial summary', details: err.message });
    }
    finally {
        client.release();
    }
}));
// ในไฟล์ server.ts หรือไฟล์ API ของคุณ
app.get("/api/financial-summary-fast-version", isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const loggedInUser = req.user;
    const { startDate, endDate, username, status, lottoName, lottoDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please provide both startDate and endDate.' });
    }
    const client = yield db.connect();
    try {
        // --- ส่วนที่ 1: BET SUMMARY ---
        // ใช้ betParams และ betWhereClause สำหรับทุก Query ที่เกี่ยวข้องกับ "ยอดแทง"
        const betConditions = [];
        const betParams = [];
        if (lottoDate && lottoDate !== 'all' && lottoDate !== '') {
            betConditions.push(`lr.cutoff_datetime::date = $${betParams.length + 1}`);
            betParams.push(lottoDate);
            // ยังคงใช้ created_at เพื่อจำกัดขอบเขตของบิล
            betConditions.push(`b.created_at BETWEEN $${betParams.length + 1} AND $${betParams.length + 2}`);
            betParams.push(startDate, `${endDate} 23:59:59`);
        }
        else {
            betConditions.push(`b.created_at BETWEEN $${betParams.length + 1} AND $${betParams.length + 2}`);
            betParams.push(startDate, `${endDate} 23:59:59`);
        }
        // (...เงื่อนไข user, lottoName, status เหมือนเดิม...)
        if (loggedInUser.role === 'owner' || loggedInUser.role === 'admin') {
            if (username && username !== 'all' && username !== '') {
                betConditions.push(`u.username = $${betParams.length + 1}`);
                betParams.push(username);
            }
        }
        else {
            betConditions.push(`u.id = $${betParams.length + 1}`);
            betParams.push(loggedInUser.id);
        }
        if (lottoName && lottoName !== 'all' && lottoName !== '') {
            betConditions.push(`b.bet_name = $${betParams.length + 1}`);
            betParams.push(lottoName);
        }
        if (status && status !== 'all') {
            betConditions.push(`b.status = $${betParams.length + 1}`);
            betParams.push(status);
        }
        const betWhereClause = betConditions.join(' AND ');
        // ✅✅✅ [จุดแก้ไข] สร้าง winConditions และ winParams จาก betConditions และ betParams โดยตรง ✅✅✅
        // เพื่อให้แน่ใจว่าใช้ตรรกะการกรองชุดเดียวกันทั้งหมด
        const winConditions = [...betConditions];
        const winParams = [...betParams];
        // เพิ่มเงื่อนไขเฉพาะสำหรับการคำนวณรางวัล
        winConditions.push(`bi.status = 'ยืนยัน'`);
        winConditions.push(`lr.status IN ('closed', 'manual_closed')`);
        // กรองเอาเฉพาะบิลที่ยืนยันแล้วเท่านั้นมาคำนวณ
        if (!status || status === 'all') {
            winConditions.push(`b.status = 'ยืนยันแล้ว'`);
        }
        const winWhereClause = winConditions.join(' AND ');
        // --- QUERIES ---
        const betSummaryQuery = `
            WITH filtered_bills AS (SELECT b.id, b.total_amount FROM bills b JOIN users u ON b.user_id = u.id JOIN lotto_rounds lr ON b.lotto_round_id = lr.id WHERE ${betWhereClause}),
            returned_amounts AS (SELECT be.bill_id, SUM(bi.price) as returned_amount FROM bill_entries be JOIN bet_items bi ON bi.bill_entry_id = be.id WHERE be.bill_id IN (SELECT id FROM filtered_bills) AND bi.status = 'คืนเลข' GROUP BY be.bill_id)
            SELECT COALESCE(SUM(fb.total_amount), 0)::float AS "rawTotalAmount", COALESCE(SUM(ra.returned_amount), 0)::float AS "totalReturnedAmount", (SELECT COUNT(*) FROM filtered_bills) AS "totalBills"
            FROM filtered_bills fb LEFT JOIN returned_amounts ra ON fb.id = ra.bill_id;`;
        const winningsQuery = `
            SELECT COALESCE(SUM(bi.payout_amount), 0)::float AS "totalWinnings"
            FROM bet_items bi 
            JOIN bill_entries be ON bi.bill_entry_id = be.id 
            JOIN bills b ON be.bill_id = b.id 
            JOIN users u ON b.user_id = u.id 
            JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
            WHERE ${winWhereClause} AND (
                -- [FIXED] 3top check for array
                (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'ตรง' AND lr.winning_numbers->'3top' @> to_jsonb(bi.bet_number::text)) OR
                
                -- [OK] 3tote check for array
                (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'โต๊ด' AND lr.winning_numbers->'3tote' @> to_jsonb(bi.bet_number::text)) OR
                
                -- [FIXED] 2top check for array
                (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'บน' AND lr.winning_numbers->'2top' @> to_jsonb(bi.bet_number::text)) OR
                
                -- [FIXED] 2bottom check for array
                (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'ล่าง' AND lr.winning_numbers->'2bottom' @> to_jsonb(bi.bet_number::text)) OR
                
                -- [OK] Run number check (adjusted for array)
                (be.bet_type = 'run' AND bi.bet_style = 'บน' AND lr.winning_numbers->>'3top' LIKE '%"' || bi.bet_number || '"%') OR
                (be.bet_type = 'run' AND bi.bet_style = 'ล่าง' AND lr.winning_numbers->>'2bottom' LIKE '%"' || bi.bet_number || '"%')
            );`;
        const byLottoTypeQuery = `
            SELECT b.bet_name as name, SUM(b.total_amount - COALESCE(ra.returned_amount, 0))::float AS "totalAmount", COUNT(b.id) AS "billCount"
            FROM bills b JOIN users u ON b.user_id = u.id JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
            LEFT JOIN (SELECT be.bill_id, SUM(bi.price) as returned_amount FROM bill_entries be JOIN bet_items bi ON be.id = bi.bill_entry_id WHERE bi.status = 'คืนเลข' GROUP BY be.bill_id) ra ON b.id = ra.bill_id
            WHERE ${betWhereClause} GROUP BY b.bet_name HAVING COUNT(b.id) > 0 ORDER BY "totalAmount" DESC;`;
        const allBetItemsSummaryQuery = `
            SELECT bi.bet_number as "number", bi.bet_style as "style", SUM(bi.price)::float as "totalAmount", COUNT(bi.id) as "count"
            FROM bet_items bi JOIN bill_entries be ON bi.bill_entry_id = be.id JOIN bills b ON be.bill_id = b.id JOIN users u ON b.user_id = u.id JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
            WHERE ${betWhereClause} AND (bi.status IS NULL OR bi.status = 'ยืนยัน') GROUP BY bi.bet_number, bi.bet_style ORDER BY "totalAmount" DESC;`;
        const usersQuery = `SELECT id, username FROM users ORDER BY username ASC`;
        const [betSummaryResult, winningsResult, byLottoTypeResult, allBetItemsSummaryResult, usersResult] = yield Promise.all([
            client.query(betSummaryQuery, betParams),
            client.query(winningsQuery, winParams), // ใช้ winParams ที่สร้างขึ้นใหม่
            client.query(byLottoTypeQuery, betParams),
            client.query(allBetItemsSummaryQuery, betParams),
            client.query(usersQuery)
        ]);
        // ... (ส่วนการประกอบผลลัพธ์เหมือนเดิม) ...
        const betSummary = betSummaryResult.rows[0];
        const winningsSummary = winningsResult.rows[0];
        const totalBetAmount = betSummary.rawTotalAmount - betSummary.totalReturnedAmount;
        const finalSummary = {
            totalBetAmount: totalBetAmount,
            totalReturnedAmount: betSummary.totalReturnedAmount,
            totalBills: Number(betSummary.totalBills),
            totalWinnings: winningsSummary.totalWinnings,
            netProfit: totalBetAmount - winningsSummary.totalWinnings
        };
        res.json({
            summary: finalSummary,
            breakdown: { byLottoType: byLottoTypeResult.rows },
            allBetItemsSummary: allBetItemsSummaryResult.rows,
            users: usersResult.rows,
        });
    }
    catch (err) {
        console.error("Error fetching financial summary (fast version):", err);
        res.status(500).json({ error: 'Error fetching financial summary', details: err.message });
    }
    finally {
        client.release();
    }
}));
app.get("/api/prize-check/all-items", isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // รับ Filter ใหม่เข้ามา
    const { startDate, endDate, status, username, lottoName, lottoDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please provide both startDate and endDate.' });
    }
    try {
        const loggedInUser = req.user;
        const queryParams = [startDate, `${endDate} 23:59:59`];
        let paramIndex = 3;
        let baseWhereClauses = 'b.created_at BETWEEN $1 AND $2';
        // User filter
        if (loggedInUser.role === 'owner' || loggedInUser.role === 'admin') {
            if (username && username !== 'all') {
                baseWhereClauses += ` AND u.username = $${paramIndex++}`;
                queryParams.push(username);
            }
        }
        else {
            baseWhereClauses += ` AND u.id = $${paramIndex++}`;
            queryParams.push(loggedInUser.id);
        }
        // Status filter
        if (status && status !== 'all') {
            baseWhereClauses += ` AND b.status = $${paramIndex++}`;
            queryParams.push(status);
        }
        // ⭐ Filter ใหม่สำหรับชื่อหวยและวันที่
        if (lottoName && lottoName !== 'all') {
            baseWhereClauses += ` AND lr.name LIKE $${paramIndex++}`;
            queryParams.push(`%${lottoName}%`);
        }
        if (lottoDate && lottoDate !== 'all') {
            baseWhereClauses += ` AND lr.cutoff_datetime::date = $${paramIndex++}`;
            queryParams.push(lottoDate);
        }
        const query = `
          SELECT
            bi.id, bi.bet_number, bi.price, bi.bet_style, bi.baht_per,
            bi.rate, bi.payout_amount AS "payoutAmount", be.bet_type, bi.status,
            b.bill_ref AS "billRef", b.note, b.created_at AS "createdAt",
            lr.name AS "lottoName", lr.cutoff_datetime AS "lottoDrawDate",
            lr.winning_numbers AS "winningNumbers", lr.status AS "lottoRoundStatus",
            lr.id AS "lottoRoundId", u.username
          FROM bet_items bi
          JOIN bill_entries be ON bi.bill_entry_id = be.id
          JOIN bills b ON be.bill_id = b.id
          JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
          JOIN users u ON b.user_id = u.id
          WHERE ${baseWhereClauses}
          ORDER BY b.created_at DESC, bi.id ASC;
        `;
        const result = yield db.query(query, queryParams);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Error fetching prize check items:`, err);
        res.status(500).json({ error: "Server error while fetching prize check items", details: err.message });
    }
}));
app.get("/api/prize-check/all-items", isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const loggedInUser = req.user;
    // --- [MODIFY] ตรวจสอบว่ามีการส่ง limit มาจาก Frontend หรือไม่ ---
    const usePagination = req.query.limit && !isNaN(parseInt(req.query.limit, 10));
    // --- ส่วนของการกรองข้อมูล (Filters) เหมือนเดิม ---
    const { startDate, endDate, status, username, lottoName, lottoDate, billRef, derivedStatus } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please provide both startDate and endDate.' });
    }
    // --- สร้างเงื่อนไข WHERE และ Parameters ---
    const queryParams = [];
    const whereConditions = [];
    let paramIndex = 1;
    whereConditions.push(`b.created_at BETWEEN $${paramIndex++} AND $${paramIndex++}`);
    queryParams.push(startDate, `${endDate} 23:59:59`);
    if (loggedInUser.role === 'owner' || loggedInUser.role === 'admin') {
        if (username && username !== 'all' && username !== '') {
            whereConditions.push(`u.username = $${paramIndex++}`);
            queryParams.push(username);
        }
    }
    else {
        whereConditions.push(`u.id = $${paramIndex++}`);
        queryParams.push(loggedInUser.id);
    }
    if (status && status !== 'all') {
        whereConditions.push(`b.status = $${paramIndex++}`);
        queryParams.push(status);
    }
    if (billRef) {
        whereConditions.push(`b.bill_ref ILIKE $${paramIndex++}`);
        queryParams.push(`%${billRef}%`);
    }
    if (lottoName && lottoName !== 'all') {
        whereConditions.push(`lr.name LIKE $${paramIndex++}`);
        queryParams.push(`%${lottoName}%`);
    }
    if (lottoDate && lottoDate !== 'all') {
        whereConditions.push(`lr.cutoff_datetime::date = $${paramIndex++}`);
        queryParams.push(lottoDate);
    }
    const winningConditions = `
        (
            (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'ตรง' AND lr.winning_numbers->>'3top' = bi.bet_number) OR
            (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'โต๊ด' AND lr.winning_numbers->'3tote' @> to_jsonb(bi.bet_number::text)) OR
            (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'บน' AND lr.winning_numbers->>'2top' = bi.bet_number) OR
            (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'ล่าง' AND lr.winning_numbers->>'2bottom' = bi.bet_number)
        )
    `;
    if (derivedStatus === 'ถูกรางวัล') {
        whereConditions.push(winningConditions);
        whereConditions.push(`lr.status IN ('closed', 'manual_closed')`);
    }
    else if (derivedStatus === 'ไม่ถูกรางวัล') {
        whereConditions.push(`NOT ${winningConditions}`);
        whereConditions.push(`lr.status IN ('closed', 'manual_closed')`);
    }
    else if (derivedStatus === 'รอประกาศผล' || derivedStatus === 'รอใส่ผลรางวัล') {
        whereConditions.push(`lr.status NOT IN ('closed', 'manual_closed')`);
    }
    const whereClause = whereConditions.join(' AND ');
    const baseQuery = `FROM bet_items bi JOIN bill_entries be ON bi.bill_entry_id = be.id JOIN bills b ON be.bill_id = b.id JOIN lotto_rounds lr ON b.lotto_round_id = lr.id JOIN users u ON b.user_id = u.id WHERE ${whereClause}`;
    try {
        if (usePagination) {
            // --- A: โหมด Pagination (เร็ว) ---
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10); // ไม่ต้องมีค่า default เพราะเราเช็คแล้ว
            const offset = (page - 1) * limit;
            const countQuery = `SELECT COUNT(bi.id) as "total" ${baseQuery}`;
            const dataQuery = `SELECT bi.id, bi.bet_number, bi.price, bi.bet_style, bi.baht_per, bi.rate, bi.payout_amount AS "payoutAmount", be.bet_type, bi.status, b.bill_ref AS "billRef", b.note, b.created_at AS "createdAt", lr.name AS "lottoName", lr.cutoff_datetime AS "lottoDrawDate", lr.winning_numbers AS "winningNumbers", lr.status AS "lottoRoundStatus", lr.id AS "lottoRoundId", u.username ${baseQuery} ORDER BY b.created_at DESC, bi.id ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++};`;
            const [countResult, dataResult] = yield Promise.all([
                db.query(countQuery, queryParams),
                db.query(dataQuery, [...queryParams, limit, offset])
            ]);
            const totalItems = parseInt(countResult.rows[0].total, 10);
            const totalPages = Math.ceil(totalItems / limit);
            res.json({
                items: dataResult.rows,
                pagination: { currentPage: page, totalPages, totalItems, limit }
            });
        }
        else {
            // --- B: โหมดดึงทั้งหมด (แบบเดิมที่คุณให้มา) ---
            const originalQuery = `
              SELECT
                bi.id, bi.bet_number, bi.price, bi.bet_style, bi.baht_per,
                bi.rate, bi.payout_amount AS "payoutAmount", be.bet_type, bi.status,
                b.bill_ref AS "billRef", b.note, b.created_at AS "createdAt",
                lr.name AS "lottoName", lr.cutoff_datetime AS "lottoDrawDate",
                lr.winning_numbers AS "winningNumbers", lr.status AS "lottoRoundStatus",
                lr.id AS "lottoRoundId", u.username
              ${baseQuery}
              ORDER BY b.created_at DESC, bi.id ASC;
            `;
            const result = yield db.query(originalQuery, queryParams);
            res.json(result.rows);
        }
    }
    catch (err) {
        console.error(`Error fetching prize check items:`, err);
        res.status(500).json({ error: "Server error while fetching prize check items", details: err.message });
    }
}));
// app.get("/api/winning-report", isAuthenticated, async (req: Request, res: Response) => {
//     const loggedInUser = req.user!;
//     const { startDate, endDate, username } = req.query;
//     if (!startDate || !endDate) {
//         return res.status(400).json({ error: 'กรุณาระบุ startDate และ endDate' });
//     }
//     const client = await db.connect();
//     try {
//         const queryParams: any[] = [startDate, `${endDate} 23:59:59`];
//         let userFilterClause = '';
//         if (loggedInUser.role === 'owner' || loggedInUser.role === 'admin') {
//             if (username && username !== 'all') {
//                 userFilterClause = `AND u.username = $${queryParams.length + 1}`;
//                 queryParams.push(username as string);
//             }
//         } else {
//             userFilterClause = `AND u.id = $${queryParams.length + 1}`;
//             queryParams.push(loggedInUser.id);
//         }
//         const winningItemsQuery = `
//             SELECT
//                 bi.id, b.bill_ref AS "billRef", u.username, lr.name AS "lottoName",
//                 lr.cutoff_datetime AS "lottoDrawDate", be.bet_type AS "betType",
//                 bi.bet_style AS "betStyle", bi.bet_number AS "betNumber",
//                 bi.payout_amount AS "payoutAmount"
//             FROM bet_items bi
//             JOIN bill_entries be ON bi.bill_entry_id = be.id
//             JOIN bills b ON be.bill_id = b.id
//             JOIN users u ON b.user_id = u.id
//             JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
//             WHERE b.created_at BETWEEN $1 AND $2 AND bi.status = 'ยืนยัน'
//               AND lr.status IN ('closed', 'manual_closed') ${userFilterClause}
//               AND (
//                     (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'ตรง' AND lr.winning_numbers->>'3top' = bi.bet_number) OR
//                     (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'โต๊ด' AND lr.winning_numbers->'3tote' @> to_jsonb(bi.bet_number::text)) OR
//                     (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'บน' AND lr.winning_numbers->>'2top' = bi.bet_number) OR
//                     (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'ล่าง' AND lr.winning_numbers->>'2bottom' = bi.bet_number)
//               )
//             ORDER BY lr.cutoff_datetime DESC, b.id DESC;
//         `;
//         const result = await client.query(winningItemsQuery, queryParams);
//         res.json({ items: result.rows });
//     } catch (err: any) {
//         console.error("Error fetching winning report:", err);
//         res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล', details: err.message });
//     } finally {
//         client.release();
//     }
// });
app.get("/api/winning-report", isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const loggedInUser = req.user;
    const client = yield db.connect();
    try {
        // --- 1. รับค่า Pagination และ Filters ทั้งหมด ---
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = (page - 1) * limit;
        const { startDate, endDate, username, status, lottoName, lottoDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Please provide both startDate and endDate' });
        }
        // --- 2. สร้างเงื่อนไข WHERE และ Parameters ---
        const conditions = [];
        const queryParams = [];
        if (lottoDate && lottoDate !== 'all') {
            conditions.push(`lr.cutoff_datetime::date = $${queryParams.length + 1}`);
            queryParams.push(lottoDate);
        }
        else {
            conditions.push(`b.created_at BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`);
            queryParams.push(startDate, `${endDate} 23:59:59`);
        }
        if (loggedInUser.role === 'owner' || loggedInUser.role === 'admin') {
            if (username && username !== 'all' && username !== '') {
                conditions.push(`u.username = $${queryParams.length + 1}`);
                queryParams.push(username);
            }
        }
        else {
            conditions.push(`u.id = $${queryParams.length + 1}`);
            queryParams.push(loggedInUser.id);
        }
        if (lottoName && lottoName !== 'all') {
            conditions.push(`b.bet_name = $${queryParams.length + 1}`);
            queryParams.push(lottoName);
        }
        if (status && status !== 'all') {
            conditions.push(`b.status = $${queryParams.length + 1}`);
            queryParams.push(status);
        }
        conditions.push(`bi.status = 'ยืนยัน'`);
        conditions.push(`lr.status IN ('closed', 'manual_closed')`);
        // ✅ [จุดแก้ไขสำคัญ] ใช้ Logic การตรวจรางวัลที่ถูกต้องกับ JSON Array
        const winningLogic = `(
          (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'ตรง' AND lr.winning_numbers->'3top' @> to_jsonb(bi.bet_number::text)) OR
          (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'โต๊ด' AND lr.winning_numbers->'3tote' @> to_jsonb(bi.bet_number::text)) OR
          (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'บน' AND lr.winning_numbers->'2top' @> to_jsonb(bi.bet_number::text)) OR
          (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'ล่าง' AND lr.winning_numbers->'2bottom' @> to_jsonb(bi.bet_number::text)) OR
          
          -- vvvvvvvvvv [ส่วนที่แก้ไข] vvvvvvvvvv
          -- เปลี่ยนจาก LIKE ที่ผิดพลาด มาใช้ STRPOS ที่ถูกต้อง
          (be.bet_type = 'run' AND bi.bet_style = 'บน' AND strpos(lr.winning_numbers->>'3top', bi.bet_number) > 0) OR
          (be.bet_type = 'run' AND bi.bet_style = 'ล่าง' AND strpos(lr.winning_numbers->>'2bottom', bi.bet_number) > 0)
          -- ^^^^^^^^^^^^ [สิ้นสุดส่วนที่แก้ไข] ^^^^^^^^^^^^
      )`;
        conditions.push(winningLogic);
        const whereClause = conditions.join(' AND ');
        // --- 3. สร้างและรัน Query ---
        const baseFrom = `FROM bet_items bi 
            JOIN bill_entries be ON bi.bill_entry_id = be.id 
            JOIN bills b ON be.bill_id = b.id 
            JOIN users u ON b.user_id = u.id 
            JOIN lotto_rounds lr ON b.lotto_round_id = lr.id 
            WHERE ${whereClause}`;
        const countQuery = `SELECT COUNT(bi.id) as "total" ${baseFrom}`;
        const dataQuery = `
            SELECT 
                bi.id, b.bill_ref AS "billRef", u.username, lr.name AS "lottoName", 
                lr.cutoff_datetime AS "lottoDrawDate", be.bet_type AS "betType", 
                bi.bet_style AS "betStyle", bi.bet_number AS "betNumber", 
                bi.payout_amount AS "payoutAmount" 
            ${baseFrom} 
            ORDER BY lr.cutoff_datetime DESC, b.id DESC, bi.id
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
        `;
        const [countResult, dataResult] = yield Promise.all([
            client.query(countQuery, queryParams),
            client.query(dataQuery, [...queryParams, limit, offset])
        ]);
        const totalItems = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(totalItems / limit);
        res.json({
            items: dataResult.rows,
            pagination: { currentPage: page, totalPages, totalItems, limit }
        });
    }
    catch (err) {
        console.error("Error fetching winning report:", err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล', details: err.message });
    }
    finally {
        client.release();
    }
}));
app.get('/api/filters/lotto-options', isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const loggedInUser = req.user;
    const { username } = req.query;
    try {
        let query = `
            SELECT DISTINCT
                b.bet_name,
                lr.id as round_id,
                lr.name as round_name,
                lr.cutoff_datetime
            FROM bills b
            JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
            JOIN users u ON b.user_id = u.id
        `;
        const queryParams = [];
        const whereClauses = [];
        // --- UPDATED: เพิ่ม Logic การกรองตามสิทธิ์ ---
        if (loggedInUser.role === 'owner' || loggedInUser.role === 'admin') {
            // ถ้าเป็น Admin หรือ Owner จะสามารถกรองตาม username ที่เลือกได้
            if (username && typeof username === 'string' && username !== 'all') {
                queryParams.push(username);
                whereClauses.push(`u.username = $${queryParams.length}`);
            }
            // ถ้าไม่ส่ง username มา หรือเป็น 'all' ก็จะแสดงของทุกคน
        }
        else {
            // ถ้าเป็น user ทั่วไป จะแสดงเฉพาะข้อมูลของตัวเองเท่านั้น
            queryParams.push(loggedInUser.id);
            whereClauses.push(`b.user_id = $${queryParams.length}`);
        }
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        // --- สิ้นสุดการแก้ไข ---
        query += ` ORDER BY b.bet_name, lr.cutoff_datetime DESC`;
        const result = yield db.query(query, queryParams);
        const options = result.rows.reduce((acc, row) => {
            if (!acc[row.bet_name]) {
                acc[row.bet_name] = [];
            }
            acc[row.bet_name].push({
                roundId: row.round_id,
                roundName: row.round_name,
                cutoff_datetime: row.cutoff_datetime
            });
            return acc;
        }, {});
        res.json(options);
    }
    catch (err) {
        console.error("Error fetching lotto options:", err);
        res.status(500).json({ error: 'Failed to fetch lotto options' });
    }
}));
// --- Server Listener ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
