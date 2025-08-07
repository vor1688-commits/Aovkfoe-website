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
// --- NEW ENDPOINT: สำหรับดึงงวดหวยปัจจุบันและงวดถัดไปสำหรับแต่ละประเภท ---
// app.get('/api/lotto-types/current-and-next', async (req: Request, res: Response) => {
//     try {
//         const result = await db.query(
//             `SELECT
//                 lt.id AS lotto_type_id,
//                 lt.name AS lotto_type_name,
//                 -- ดึงงวดปัจจุบัน
//                 (SELECT
//                     JSON_BUILD_OBJECT(
//                         'id', lr_current.id,
//                         'name', lr_current.name,
//                         'open_datetime', lr_current.open_datetime,
//                         'cutoff_datetime', lr_current.cutoff_datetime,
//                         'status', lr_current.status
//                     )
//                    FROM lotto_rounds lr_current
//                    WHERE lr_current.lotto_type_id = lt.id 
//                      AND lr_current.cutoff_datetime > NOW() 
//                      AND lr_current.open_datetime <= NOW()
//                      AND lr_current.status = 'active' -- ⭐ เพิ่มเงื่อนไขนี้
//                    ORDER BY lr_current.cutoff_datetime ASC
//                    LIMIT 1
//                 ) AS current_round,
//                 -- ดึงงวดถัดไป
//                 (SELECT
//                     JSON_BUILD_OBJECT(
//                         'id', lr_next.id,
//                         'name', lr_next.name,
//                         'open_datetime', lr_next.open_datetime,
//                         'cutoff_datetime', lr_next.cutoff_datetime,
//                         'status', lr_next.status
//                     )
//                    FROM lotto_rounds lr_next
//                    WHERE lr_next.lotto_type_id = lt.id 
//                      AND lr_next.open_datetime > NOW()
//                      AND lr_next.status = 'active' -- ⭐ เพิ่มเงื่อนไขนี้
//                    ORDER BY lr_next.open_datetime ASC
//                    LIMIT 1
//                 ) AS next_round
//             FROM lotto_types lt
//             ORDER BY lt.id`
//         );
//         res.json({
//             rounds: result.rows,
//             serverTime: new Date().toISOString()
//         });
//     } catch (err: any) {
//         console.error('Error fetching current and next lotto rounds:', err);
//         res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงวดปัจจุบันและถัดไป', details: err.message });
//     }
// });
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
        // ดึงข้อมูลกฎลิมิตทั้งหมด (ส่วนนี้เหมือนเดิม)
        const roundLimitsResult = yield client.query('SELECT limit_2d_amount, limit_3d_amount FROM lotto_rounds WHERE id = $1', [lottoRoundId]);
        const specificLimitsResult = yield client.query('SELECT bet_number, max_amount FROM lotto_round_number_limits WHERE lotto_round_id = $1', [lottoRoundId]);
        const rangeLimitsResult = yield client.query('SELECT range_start, range_end, max_amount FROM lotto_round_range_limits WHERE lotto_round_id = $1', [lottoRoundId]);
        const totalSpentResult = yield client.query(`SELECT bi.bet_number, SUM(bi.price) as total_spent
             FROM bet_items bi
             JOIN bill_entries be ON bi.bill_entry_id = be.id
             JOIN bills b ON be.bill_id = b.id
             WHERE b.user_id = $1 AND b.lotto_round_id = $2
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
//savebill old ใส่ราคา บา่ทละ แบบเต็ม แม้ว่าจะเป็นเลขครึ่ง
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
        const billResult = yield client.query(`INSERT INTO bills (bill_ref, user_id, lotto_round_id, note, total_amount, bet_name, status, bill_lotto_draw) 
       VALUES ($1, $2, $3, $4, $5, $6, 'รอผล', $7) RETURNING id`, [billRef, userId, lottoRoundId, note, totalAmount, lottoTypeDetails.name, billLottoDraw]);
        const newBillId = billResult.rows[0].id;
        for (const entry of billEntries) {
            let betTypeToSave = entry.betTypes;
            if (entry.betTypes === '6d')
                betTypeToSave = '3d';
            if (entry.betTypes === '19d')
                betTypeToSave = '2d';
            const entryResult = yield client.query(`INSERT INTO bill_entries (bill_id, bet_type, total) VALUES ($1, $2, $3) RETURNING id`, [newBillId, betTypeToSave, entry.total]);
            const newBillEntryId = entryResult.rows[0].id;
            const isThreeDigitMode = entry.betTypes === '3d' || entry.betTypes === '6d';
            const processBetItems = (originalPrice, style, standardRate) => __awaiter(void 0, void 0, void 0, function* () {
                if (originalPrice <= 0)
                    return;
                for (const betNumber of entry.bets) {
                    if (closedNumbers.includes(betNumber)) {
                        throw new Error(`เลข "${betNumber}" เป็นเลขปิดรับในงวดนี้`);
                    }
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
            // --- เรียกใช้ฟังก์ชันสำหรับแต่ละประเภทการแทง ---
            yield processBetItems(Number(entry.priceTop), isThreeDigitMode ? 'ตรง' : 'บน', isThreeDigitMode ? lottoTypeDetails.rate_3_top : lottoTypeDetails.rate_2_top);
            if (isThreeDigitMode) {
                yield processBetItems(Number(entry.priceTote), 'โต๊ด', lottoTypeDetails.rate_3_tote);
            }
            yield processBetItems(Number(entry.priceBottom), 'ล่าง', isThreeDigitMode ? lottoTypeDetails.rate_3_bottom : lottoTypeDetails.rate_2_bottom);
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
//saveBill ใส่ราคาบาทละ แบบจ่ายครึ่ง ถ้าเป็นเลขจ่ายครึ่ง NEW 
// app.post("/api/savebills", async (req: Request, res: Response) => {
//   const { billRef, userId, lottoRoundId, note, totalAmount, billEntries } = req.body;
//   const client = await db.connect();
//   try {
//     await client.query("BEGIN");
//     const lottoRoundResult = await client.query(
//       "SELECT cutoff_datetime, lotto_type_id, closed_numbers, half_pay_numbers FROM lotto_rounds WHERE id = $1",
//       [lottoRoundId]
//     );
//     if (lottoRoundResult.rowCount === 0) throw new Error("Lotto Round ID ไม่ถูกต้อง");
//     const { 
//         cutoff_datetime: billLottoDraw, 
//         lotto_type_id: lottoTypeId,
//         closed_numbers: closedNumbers,
//         half_pay_numbers: halfPayNumbers
//     } = lottoRoundResult.rows[0];
//     const ratesResult = await client.query("SELECT * FROM lotto_types WHERE id = $1", [lottoTypeId]);
//     if (ratesResult.rowCount === 0) throw new Error(`ไม่พบอัตราจ่ายสำหรับ Lotto Type ID: ${lottoTypeId}`);
//     const lottoTypeDetails = ratesResult.rows[0];
//     const billResult = await client.query(
//       `INSERT INTO bills (bill_ref, user_id, lotto_round_id, note, total_amount, bet_name, status, bill_lotto_draw) 
//        VALUES ($1, $2, $3, $4, $5, $6, 'รอผล', $7) RETURNING id`,
//       [billRef, userId, lottoRoundId, note, totalAmount, lottoTypeDetails.name, billLottoDraw]
//     );
//     const newBillId = billResult.rows[0].id;
//     for (const entry of billEntries) {
//       let betTypeToSave = entry.betTypes;
//       if (entry.betTypes === '6d') betTypeToSave = '3d';
//       if (entry.betTypes === '19d') betTypeToSave = '2d';
//       const entryResult = await client.query(
//         `INSERT INTO bill_entries (bill_id, bet_type, total) VALUES ($1, $2, $3) RETURNING id`,
//         [newBillId, betTypeToSave, entry.total]
//       );
//       const newBillEntryId = entryResult.rows[0].id;
//       const isThreeDigitMode = entry.betTypes === '3d' || entry.betTypes === '6d';
//       const processBetItems = async (originalPrice: number, style: string, standardRate: number) => {
//         if (originalPrice <= 0) return;
//         for (const betNumber of entry.bets) {
//           if (closedNumbers.includes(betNumber)) {
//             throw new Error(`เลข "${betNumber}" เป็นเลขปิดรับในงวดนี้`);
//           }
//           const isHalfPay = halfPayNumbers.includes(betNumber);
//           // 1. `rate` คือ "ราคาที่ใช้คำนวณจริง" (หั่นครึ่งถ้าจำเป็น)
//           const effectivePriceForPayout = isHalfPay ? originalPrice / 2 : originalPrice;
//           // 2. `baht_per` คือ "อัตราจ่าย" (หั่นครึ่งถ้าจำเป็น)
//           // ✅ นี่คือจุดที่แก้ไขตามที่คุณต้องการ
//           const payoutRate = isHalfPay ? standardRate / 2 : standardRate;
//           // 3. `payout_amount` คำนวณจาก ราคาที่ใช้คำนวณจริง * อัตราจ่ายที่ปรับแล้ว
//           const finalPayoutAmount = effectivePriceForPayout * payoutRate;
//           await client.query(
//             `INSERT INTO bet_items (bill_entry_id, bet_number, price, bet_style, rate, payout_amount, baht_per) 
//              VALUES ($1, $2, $3, $4, $5, $6, $7)`,
//             [
//               newBillEntryId, 
//               betNumber, 
//               originalPrice,     
//               style, 
//               effectivePriceForPayout,   
//               finalPayoutAmount,         
//               payoutRate                  
//             ]
//           );
//         }
//       };
//       // --- เรียกใช้ฟังก์ชันสำหรับแต่ละประเภทการแทง ---
//       await processBetItems(Number(entry.priceTop), isThreeDigitMode ? 'ตรง' : 'บน', isThreeDigitMode ? lottoTypeDetails.rate_3_top : lottoTypeDetails.rate_2_top);
//       if(isThreeDigitMode) {
//         await processBetItems(Number(entry.priceTote), 'โต๊ด', lottoTypeDetails.rate_3_tote);
//       }
//       await processBetItems(Number(entry.priceBottom), 'ล่าง', isThreeDigitMode ? lottoTypeDetails.rate_3_bottom : lottoTypeDetails.rate_2_bottom);
//     }
//     await client.query("COMMIT");
//     res.status(201).json({ message: "บันทึกสำเร็จ", billId: newBillId });
//   } catch (err: any) {
//     await client.query("ROLLBACK");
//     console.error("Error saving bill:", err);
//     res.status(500).json({ error: "ไม่สามารถบันทึกบิลได้", details: err.message });
//   } finally {
//     client.release();
//   }
// });
// app.post('/api/check-bet-limit', async (req, res) => {
//     const { userId, lottoRoundId, betNumber, price } = req.body;
//     const client = await db.connect();
//     try {
//         // --- 1. คำนวณยอดซื้อสะสมของ User สำหรับเลขนี้ ---
//         const totalSpentResult = await client.query(
//           `SELECT COALESCE(SUM(bi.price), 0) as total
//            FROM bet_items bi
//            JOIN bill_entries be ON bi.bill_entry_id = be.id
//            JOIN bills b ON be.bill_id = b.id
//            WHERE b.user_id = $1 AND b.lotto_round_id = $2 AND bi.bet_number = $3`,
//           [userId, lottoRoundId, betNumber]
//         );
//         const totalSpent = parseFloat(totalSpentResult.rows[0].total);
//         // --- 2. ค้นหาลิมิตที่เกี่ยวข้องกับเลขนี้ (ตามลำดับความสำคัญ) ---
//         let limitAmount = null;
//         let limitType = 'ไม่จำกัด';
//         // 2.1 เช็คลิมิตเลขเฉพาะ
//         const specificLimitResult = await client.query(
//             'SELECT max_amount FROM lotto_round_number_limits WHERE lotto_round_id = $1 AND bet_number = $2',
//             [lottoRoundId, betNumber]
//         );
//         if (specificLimitResult.rowCount ?? 0 > 0) {
//             limitAmount = parseFloat(specificLimitResult.rows[0].max_amount);
//             limitType = 'เลขเฉพาะ';
//         } else {
//             // 2.2 เช็คลิมิตแบบช่วง
//             const rangeLimitResult = await client.query(
//                 'SELECT max_amount FROM lotto_round_range_limits WHERE lotto_round_id = $1 AND $2::integer >= range_start::integer AND $2::integer <= range_end::integer',
//                 [lottoRoundId, betNumber]
//             );
//             if (rangeLimitResult.rowCount ?? 0 > 0) {
//                 limitAmount = parseFloat(rangeLimitResult.rows[0].max_amount);
//                 limitType = 'แบบช่วง';
//             } else {
//                 // 2.3 เช็คลิมิตเริ่มต้น (2ตัว/3ตัว)
//                 const roundDefaultLimitResult = await client.query(
//                     'SELECT limit_2d_amount, limit_3d_amount FROM lotto_rounds WHERE id = $1',
//                     [lottoRoundId]
//                 );
//                 const defaults = roundDefaultLimitResult.rows[0];
//                 if (betNumber.length <= 2 && defaults.limit_2d_amount) {
//                     limitAmount = parseFloat(defaults.limit_2d_amount);
//                     limitType = 'เริ่มต้น 2 ตัว';
//                 } else if (betNumber.length >= 3 && defaults.limit_3d_amount) {
//                     limitAmount = parseFloat(defaults.limit_3d_amount);
//                     limitType = 'เริ่มต้น 3 ตัว';
//                 }
//             }
//         }
//         // --- 3. ตรวจสอบและส่งผลลัพธ์กลับ ---
//         if (limitAmount !== null) {
//             if (totalSpent + price > limitAmount) {
//                 // ถ้าเกินลิมิต
//                 return res.status(400).json({
//                     error: 'LimitExceeded',
//                     message: `ยอดซื้อสำหรับเลข "${betNumber}" เกินลิมิตที่กำหนดไว้`,
//                     details: {
//                         limit: limitAmount,
//                         spent: totalSpent,
//                         requested: price,
//                         remaining: limitAmount - totalSpent
//                     }
//                 });
//             }
//         }
//         // ถ้าไม่เกินลิมิต หรือไม่มีลิมิตเลย
//         res.status(200).json({ 
//             message: 'สามารถซื้อได้',
//             details: {
//                 limit: limitAmount,
//                 spent: totalSpent,
//                 remaining: limitAmount !== null ? limitAmount - totalSpent : 'ไม่จำกัด'
//             }
//         });
//     } catch (err: any) {
//         console.error('Error checking bet limit:', err);
//         res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ', details: err.message });
//     } finally {
//         client.release();
//     }
// });
// POST /api/batch-check-bet-limits - สำหรับตรวจสอบลิมิตทีละหลายรายการ
// app.post('/api/batch-check-bet-limits', async (req, res) => {
//     const { userId, lottoRoundId, bets } = req.body;
//     const client = await db.connect();
//     try {
//         // --- ⬇️ 1. ตรวจสอบข้อยกเว้นก่อน ⬇️ ---
//         const userResult = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
//         if (userResult.rowCount === 0) {
//             throw new Error('User not found');
//         }
//         const userRole = userResult.rows[0].role;
//         const exemptionResult = await client.query(
//             'SELECT * FROM lotto_round_exemptions WHERE lotto_round_id = $1',
//             [lottoRoundId]
//         );
//         const isExempt = exemptionResult.rows.some(ex => 
//             (ex.exemption_type === 'user' && ex.user_id === userId) ||
//             (ex.exemption_type === 'role' && ex.user_role === userRole)
//         );
//         if (isExempt) {
//             client.release();
//             return res.status(200).json({ message: 'สามารถซื้อได้ทั้งหมด (User ได้รับการยกเว้น)' });
//         }
//         // --- ⬆️ สิ้นสุดการตรวจสอบข้อยกเว้น ⬆️ ---
//         // --- 2. ถ้าไม่ได้รับการยกเว้น ให้ตรวจสอบลิมิตตามปกติ ---
//         const failedBets = [];
//         const roundLimitsResult = await client.query('SELECT limit_2d_amount, limit_3d_amount FROM lotto_rounds WHERE id = $1', [lottoRoundId]);
//         const roundLimits = roundLimitsResult.rows[0];
//         const specificLimitsResult = await client.query('SELECT bet_number, max_amount FROM lotto_round_number_limits WHERE lotto_round_id = $1', [lottoRoundId]);
//         const specificLimits = specificLimitsResult.rows.reduce((acc, row) => {
//             acc[row.bet_number] = parseFloat(row.max_amount);
//             return acc;
//         }, {});
//         const rangeLimitsResult = await client.query('SELECT range_start, range_end, max_amount FROM lotto_round_range_limits WHERE lotto_round_id = $1', [lottoRoundId]);
//         const rangeLimits = rangeLimitsResult.rows;
//         for (const bet of bets) {
//             const { betNumber, price } = bet;
//             const totalSpentResult = await client.query(
//               `SELECT COALESCE(SUM(bi.price), 0) as total FROM bet_items bi JOIN bill_entries be ON bi.bill_entry_id = be.id JOIN bills b ON be.bill_id = b.id WHERE b.user_id = $1 AND b.lotto_round_id = $2 AND bi.bet_number = $3`,
//               [userId, lottoRoundId, betNumber]
//             );
//             const totalSpent = parseFloat(totalSpentResult.rows[0].total);
//             let limitAmount = null;
//             if (specificLimits[betNumber]) {
//                 limitAmount = specificLimits[betNumber];
//             } else {
//                 for (const range of rangeLimits) {
//                     const num = parseInt(betNumber, 10);
//                     if (num >= parseInt(range.range_start, 10) && num <= parseInt(range.range_end, 10)) {
//                         limitAmount = parseFloat(range.max_amount);
//                         break;
//                     }
//                 }
//             }
//             if (limitAmount === null) {
//                 if (betNumber.length <= 2 && roundLimits.limit_2d_amount) {
//                     limitAmount = parseFloat(roundLimits.limit_2d_amount);
//                 } else if (betNumber.length >= 3 && roundLimits.limit_3d_amount) {
//                     limitAmount = parseFloat(roundLimits.limit_3d_amount);
//                 }
//             }
//             if (limitAmount !== null && (totalSpent + price > limitAmount)) {
//                 failedBets.push({
//                     betNumber,
//                     message: `ยอดซื้อสำหรับเลข "${betNumber}" เกินลิมิต`,
//                     details: { limit: limitAmount, spent: totalSpent, remaining: limitAmount - totalSpent }
//                 });
//             }
//         }
//         if (failedBets.length > 0) {
//             return res.status(400).json({
//                 error: 'LimitExceeded',
//                 message: 'มีบางรายการเกินลิมิตที่กำหนด',
//                 failedBets: failedBets
//             });
//         }
//         res.status(200).json({ message: 'สามารถซื้อได้ทั้งหมด' });
//     } catch (err) {
//         console.error('Error batch checking bet limit:', err);
//         res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ', details: (err as Error).message });
//     } finally {
//         client.release();
//     }
// });
// app.post('/api/batch-check-bet-limits', async (req: Request, res: Response) => {
//     const { userId, lottoRoundId, bets } = req.body; // bets is an array of { betNumber: string, price: number }
//     const client = await db.connect();
//     try {
//         // --- 1. ตรวจสอบข้อยกเว้น (Exemptions) ก่อน ---
//         const userResult = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
//         if (userResult.rowCount === 0) {
//             throw new Error('User not found');
//         }
//         const userRole = userResult.rows[0].role;
//         const exemptionResult = await client.query(
//             'SELECT * FROM lotto_round_exemptions WHERE lotto_round_id = $1',
//             [lottoRoundId]
//         );
//         const isExempt = exemptionResult.rows.some(ex => 
//             (ex.exemption_type === 'user' && ex.user_id === userId) ||
//             (ex.exemption_type === 'role' && ex.user_role === userRole)
//         );
//         if (isExempt) {
//             client.release();
//             return res.status(200).json({ message: 'สามารถซื้อได้ทั้งหมด (User ได้รับการยกเว้น)' });
//         }
//         // --- 2. ถ้าไม่ได้รับการยกเว้น ให้ดึงกฎลิมิตทั้งหมดของงวดนี้มาก่อน ---
//         const failedBets = [];
//         // ดึงลิมิตเริ่มต้น
//         const roundLimitsResult = await client.query('SELECT limit_2d_amount, limit_3d_amount FROM lotto_rounds WHERE id = $1', [lottoRoundId]);
//         const roundLimits = roundLimitsResult.rows[0];
//         // ดึงลิมิตเลขเฉพาะ
//         const specificLimitsResult = await client.query('SELECT bet_number, max_amount FROM lotto_round_number_limits WHERE lotto_round_id = $1', [lottoRoundId]);
//         const specificLimits = specificLimitsResult.rows.reduce((acc, row) => {
//             acc[row.bet_number] = parseFloat(row.max_amount);
//             return acc;
//         }, {} as Record<string, number>);
//         // ดึงลิมิตแบบช่วง
//         const rangeLimitsResult = await client.query('SELECT range_start, range_end, max_amount FROM lotto_round_range_limits WHERE lotto_round_id = $1', [lottoRoundId]);
//         const rangeLimits = rangeLimitsResult.rows;
//         // --- 3. วนลูปตรวจสอบแต่ละเลขที่ส่งมา ---
//         for (const bet of bets) {
//             const { betNumber, price } = bet;
//             // 3.1 คำนวณยอดซื้อสะสมของ User สำหรับเลขนี้
//             const totalSpentResult = await client.query(
//               `SELECT COALESCE(SUM(bi.price), 0) as total FROM bet_items bi JOIN bill_entries be ON bi.bill_entry_id = be.id JOIN bills b ON be.bill_id = b.id WHERE b.user_id = $1 AND b.lotto_round_id = $2 AND bi.bet_number = $3`,
//               [userId, lottoRoundId, betNumber]
//             );
//             const totalSpent = parseFloat(totalSpentResult.rows[0].total);
//             // 3.2 หากฎลิมิตที่ต้องใช้ตามลำดับความสำคัญ
//             let limitAmount = null;
//             if (specificLimits[betNumber]) { // กฎเจาะจงตัวเลข
//                 limitAmount = specificLimits[betNumber];
//             } else {
//                 const matchingRanges = rangeLimits.filter(range => {
//                     const num = parseInt(betNumber, 10);
//                     return num >= parseInt(range.range_start, 10) && num <= parseInt(range.range_end, 10);
//                 });
//                 if (matchingRanges.length > 0) { // กฎแบบช่วง (เลือกช่วงที่แคบที่สุด)
//                     matchingRanges.sort((a, b) => (parseInt(a.range_end) - parseInt(a.range_start)) - (parseInt(b.range_end) - parseInt(b.range_start)));
//                     limitAmount = parseFloat(matchingRanges[0].max_amount);
//                 }
//             }
//             if (limitAmount === null) { // กฎเริ่มต้น
//                 if (betNumber.length <= 2 && roundLimits.limit_2d_amount) {
//                     limitAmount = parseFloat(roundLimits.limit_2d_amount);
//                 } else if (betNumber.length >= 3 && roundLimits.limit_3d_amount) {
//                     limitAmount = parseFloat(roundLimits.limit_3d_amount);
//                 }
//             }
//             // 3.3 ตรวจสอบยอดซื้อ
//             if (limitAmount !== null && (totalSpent + price > limitAmount)) {
//                 failedBets.push({
//                     betNumber,
//                     message: `ยอดซื้อสำหรับเลข "${betNumber}" เกินลิมิต`,
//                     details: { limit: limitAmount, spent: totalSpent, remaining: limitAmount - totalSpent }
//                 });
//             }
//         }
//         // --- 4. ส่งผลลัพธ์กลับ ---
//         if (failedBets.length > 0) {
//             return res.status(400).json({
//                 error: 'LimitExceeded',
//                 message: 'มีบางรายการเกินลิมิตที่กำหนด',
//                 failedBets: failedBets
//             });
//         }
//         res.status(200).json({ message: 'สามารถซื้อได้ทั้งหมด' });
//     } catch (err: any) {
//         console.error('Error batch checking bet limit:', err);
//         res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ', details: err.message });
//     } finally {
//         client.release();
//     }
// });
// app.post('/api/batch-check-bet-limits', async (req: Request, res: Response) => {
//     const { userId, lottoRoundId, bets } = req.body; // bets คือ array of { betNumber: string, price: number }
//     const client = await db.connect();
//     try {
//         // --- 1. ตรวจสอบข้อยกเว้น (Exemptions) ก่อน (ส่วนนี้ยังทำงานเหมือนเดิม) ---
//         const userResult = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
//         if (userResult.rowCount === 0) throw new Error('User not found');
//         const userRole = userResult.rows[0].role;
//         const exemptionResult = await client.query('SELECT * FROM lotto_round_exemptions WHERE lotto_round_id = $1', [lottoRoundId]);
//         const isExempt = exemptionResult.rows.some(ex => 
//             (ex.exemption_type === 'user' && ex.user_id === userId) ||
//             (ex.exemption_type === 'role' && ex.user_role === userRole)
//         );
//         if (isExempt) {
//             client.release();
//             return res.status(200).json({ message: 'สามารถซื้อได้ทั้งหมด (User ได้รับการยกเว้น)' });
//         }
//         // --- 2. ดึงกฎลิมิตทั้งหมดของงวดนี้มาเตรียมไว้ ---
//         const failedBets = [];
//         // ⭐ ดึงลิมิตเริ่มต้น (Default Limits) มาด้วย ⭐
//         const roundLimitsResult = await client.query('SELECT limit_2d_amount, limit_3d_amount FROM lotto_rounds WHERE id = $1', [lottoRoundId]);
//         const roundLimits = roundLimitsResult.rows[0];
//         // ดึงลิมิตเลขเฉพาะ
//         const specificLimitsResult = await client.query('SELECT bet_number, max_amount FROM lotto_round_number_limits WHERE lotto_round_id = $1', [lottoRoundId]);
//         const specificLimits = specificLimitsResult.rows.reduce((acc, row) => {
//             acc[row.bet_number] = parseFloat(row.max_amount);
//             return acc;
//         }, {} as Record<string, number>);
//         // ดึงลิมิตแบบช่วง
//         const rangeLimitsResult = await client.query('SELECT range_start, range_end, max_amount FROM lotto_round_range_limits WHERE lotto_round_id = $1', [lottoRoundId]);
//         const rangeLimits = rangeLimitsResult.rows;
//         // --- 3. วนลูปตรวจสอบแต่ละเลขที่ส่งมา ---
//         for (const bet of bets) {
//             const { betNumber, price } = bet;
//             const totalSpentResult = await client.query(
//               `SELECT COALESCE(SUM(bi.price), 0) as total FROM bet_items bi JOIN bill_entries be ON bi.bill_entry_id = be.id JOIN bills b ON be.bill_id = b.id WHERE b.user_id = $1 AND b.lotto_round_id = $2 AND bi.bet_number = $3`,
//               [userId, lottoRoundId, betNumber]
//             );
//             const totalSpent = parseFloat(totalSpentResult.rows[0].total);
//             let limitAmount = null;
//             // --- ⬇️ LOGIC ที่ปรับปรุงให้ครบถ้วน ⬇️ ---
//             if (specificLimits[betNumber]) { // Priority 1: กฎเจาะจงตัวเลข
//                 limitAmount = specificLimits[betNumber];
//             } else {
//                 const numInt = parseInt(betNumber, 10);
//                 const matchingRange = rangeLimits.find(range => numInt >= parseInt(range.range_start, 10) && numInt <= parseInt(range.range_end, 10));
//                 if (matchingRange) { // Priority 2: กฎแบบช่วง
//                     limitAmount = parseFloat(matchingRange.max_amount);
//                 } else {
//                     // ⭐ Priority 3: กฎเริ่มต้น (Default) สำหรับเลขนอกช่วง ⭐
//                     if (betNumber.length <= 2 && roundLimits.limit_2d_amount) {
//                         limitAmount = parseFloat(roundLimits.limit_2d_amount);
//                     } else if (betNumber.length >= 3 && roundLimits.limit_3d_amount) {
//                         limitAmount = parseFloat(roundLimits.limit_3d_amount);
//                     }
//                 }
//             }
//             // --- ⬆️ สิ้นสุด LOGIC ที่ปรับปรุง ⬆️ ---
//             if (limitAmount !== null && (totalSpent + price > limitAmount)) {
//                 failedBets.push({
//                     betNumber,
//                     message: `ยอดซื้อสำหรับเลข "${betNumber}" เกินลิมิต`,
//                     details: { limit: limitAmount, spent: totalSpent, remaining: limitAmount - totalSpent }
//                 });
//             }
//         }
//         // --- 4. ส่งผลลัพธ์กลับ ---
//         if (failedBets.length > 0) {
//             return res.status(400).json({
//                 error: 'LimitExceeded',
//                 message: 'มีบางรายการเกินลิมิตที่กำหนด',
//                 failedBets: failedBets
//             });
//         }
//         res.status(200).json({ message: 'สามารถซื้อได้ทั้งหมด' });
//     } catch (err: any) {
//         console.error('Error batch checking bet limit:', err);
//         res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ', details: err.message });
//     } finally {
//         client.release();
//     }
// });
// ในไฟล์ server.ts
app.post('/api/batch-check-bet-limits', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // ... (ส่วนการตรวจสอบ exemption เหมือนเดิม) ...
    const { userId, lottoRoundId, bets } = req.body;
    const client = yield db.connect();
    try {
        // --- (ส่วน exemption ไม่มีการเปลี่ยนแปลง) ---
        const userResult = yield client.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userResult.rowCount === 0)
            throw new Error('User not found');
        const userRole = userResult.rows[0].role;
        const exemptionResult = yield client.query('SELECT * FROM lotto_round_exemptions WHERE lotto_round_id = $1', [lottoRoundId]);
        const isExempt = exemptionResult.rows.some(ex => (ex.exemption_type === 'user' && ex.user_id === userId) ||
            (ex.exemption_type === 'role' && ex.user_role === userRole));
        if (isExempt) {
            client.release();
            return res.status(200).json({ message: 'สามารถซื้อได้ทั้งหมด (User ได้รับการยกเว้น)' });
        }
        // --- (สิ้นสุดส่วน exemption) ---
        const failedBets = [];
        const roundLimitsResult = yield client.query('SELECT limit_2d_amount, limit_3d_amount FROM lotto_rounds WHERE id = $1', [lottoRoundId]);
        const roundLimits = roundLimitsResult.rows[0];
        const specificLimitsResult = yield client.query('SELECT bet_number, max_amount FROM lotto_round_number_limits WHERE lotto_round_id = $1', [lottoRoundId]);
        const specificLimits = specificLimitsResult.rows.reduce((acc, row) => {
            acc[row.bet_number] = parseFloat(row.max_amount);
            return acc;
        }, {});
        const rangeLimitsResult = yield client.query('SELECT range_start, range_end, max_amount FROM lotto_round_range_limits WHERE lotto_round_id = $1', [lottoRoundId]);
        const rangeLimits = rangeLimitsResult.rows;
        for (const bet of bets) {
            const { betNumber, price } = bet;
            const totalSpentResult = yield client.query(`SELECT COALESCE(SUM(bi.price), 0) as total FROM bet_items bi JOIN bill_entries be ON bi.bill_entry_id = be.id JOIN bills b ON be.bill_id = b.id WHERE b.user_id = $1 AND b.lotto_round_id = $2 AND bi.bet_number = $3`, [userId, lottoRoundId, betNumber]);
            const totalSpent = parseFloat(totalSpentResult.rows[0].total);
            let limitAmount = null;
            if (specificLimits[betNumber]) {
                limitAmount = specificLimits[betNumber];
            }
            else {
                const numInt = parseInt(betNumber, 10);
                // ⭐ จุดที่แก้ไข: เพิ่มเงื่อนไข `betNumber.length === range.range_start.length`
                const matchingRange = rangeLimits.find(range => betNumber.length === range.range_start.length &&
                    numInt >= parseInt(range.range_start, 10) &&
                    numInt <= parseInt(range.range_end, 10));
                if (matchingRange) {
                    limitAmount = parseFloat(matchingRange.max_amount);
                }
                else {
                    if (betNumber.length <= 2 && roundLimits.limit_2d_amount) {
                        limitAmount = parseFloat(roundLimits.limit_2d_amount);
                    }
                    else if (betNumber.length >= 3 && roundLimits.limit_3d_amount) {
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
    const { startDate, endDate, status, billRef, noteRef, username, lottoCategory, lottoName } = req.query;
    // --- ✅ Query ฉบับสมบูรณ์ที่รวมทุกอย่างแล้ว ---
    let query = `
        SELECT 
            b.id, 
            b.bill_ref as "billRef", 
            b.created_at as "createdAt",
            b.bet_name as "lottoName", 
            b.total_amount as "totalAmount",
            b.status, 
            b.note, 
            b.bill_lotto_draw, 
            u.username,
            -- 1. itemCount ที่มีประสิทธิภาพ
            COUNT(DISTINCT bi.id) as "itemCount",
            -- 2. hasHalfRateItem สำหรับส่งไป Frontend
            CASE 
                WHEN EXISTS (
                    SELECT 1
                    FROM bet_items bi_sub
                    JOIN bill_entries be_sub ON bi_sub.bill_entry_id = be_sub.id
                    WHERE be_sub.bill_id = b.id AND (bi_sub.price * 0.5) = bi_sub.rate
                ) 
                THEN true 
                ELSE false 
            END as "hasHalfRateItem"
        FROM 
            bills b
        JOIN 
            users u ON b.user_id = u.id
        LEFT JOIN 
            bill_entries be ON be.bill_id = b.id
        LEFT JOIN 
            bet_items bi ON bi.bill_entry_id = be.id
        WHERE 1=1
    `;
    const queryParams = [];
    // --- ส่วนการกรองข้อมูลทั้งหมด (ทำงานเหมือนเดิมที่คุณเขียนมา) ---
    if (loggedInUser.role === 'user') {
        queryParams.push(loggedInUser.id);
        query += ` AND b.user_id = $${queryParams.length}`;
    }
    else if (loggedInUser.role === 'admin' || loggedInUser.role === 'owner') {
        if (username) {
            queryParams.push(username);
            query += ` AND u.username = $${queryParams.length}`;
        }
    }
    if (startDate) {
        queryParams.push(startDate);
        query += ` AND b.created_at::date >= $${queryParams.length}`;
    }
    if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        queryParams.push(nextDay.toISOString().split('T')[0]);
        query += ` AND b.created_at < $${queryParams.length}`;
    }
    if (status) {
        queryParams.push(status);
        query += ` AND b.status = $${queryParams.length}`;
    }
    if (billRef) {
        queryParams.push(`%${billRef}%`);
        query += ` AND b.bill_ref ILIKE $${queryParams.length}`;
    }
    if (noteRef) {
        queryParams.push(`%${noteRef}%`);
        query += ` AND b.note ILIKE $${queryParams.length}`;
    }
    if (lottoCategory) {
        queryParams.push(`%${lottoCategory}%`);
        query += ` AND b.bet_name ILIKE $${queryParams.length}`;
    }
    if (lottoName) {
        queryParams.push(lottoName);
        query += ` AND b.bet_name = $${queryParams.length}`;
    }
    // ----------------------------------------------------
    // --- ✅ GROUP BY และ ORDER BY ---
    query += `
        GROUP BY 
            b.id, u.username
        ORDER BY 
            b.id DESC
    `;
    try {
        const result = yield db.query(query, queryParams);
        // console.log(`result bill => ${JSON.stringify(result)}`);
        res.json(result.rows);
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
app.put('/api/bet-items/:itemId/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
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
        const checkResult = yield client.query(`SELECT COUNT(*) FROM bet_items bi
             JOIN bill_entries be ON bi.bill_entry_id = be.id
             WHERE be.bill_id = $1 AND bi.status IS NULL`, [billId]);
        const pendingCount = parseInt(checkResult.rows[0].count, 10);
        let newBillStatus = null;
        if (pendingCount === 0) {
            const billUpdateResult = yield client.query(`UPDATE bills SET status = 'ยืนยันแล้ว' WHERE id = $1 AND status = 'รอผล' RETURNING status`, [billId]);
            if (((_b = billUpdateResult.rowCount) !== null && _b !== void 0 ? _b : 0) > 0) {
                newBillStatus = billUpdateResult.rows[0].status;
            }
        }
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
                if ((_a = billUpdateResult.rowCount) !== null && _a !== void 0 ? _a : 0 > 0) {
                    newBillStatus = billUpdateResult.rows[0].status;
                }
            }
            else if (areAllItemsProcessed) {
                // ✨ ถ้าทุกรายการถูกจัดการแล้ว (ไม่มีรายการที่รอผล) -> สถานะบิลหลักจะเป็น 'ยืนยันแล้ว'
                const billUpdateResult = yield client.query(`UPDATE bills SET status = 'ยืนยันแล้ว' WHERE id = $1 AND status = 'รอผล' RETURNING status`, [billId]);
                if ((_b = billUpdateResult.rowCount) !== null && _b !== void 0 ? _b : 0 > 0) {
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
    // ตรวจสอบข้อมูลเบื้องต้น
    if (!open_datetime || !cutoff_datetime) {
        return res.status(400).json({ error: 'กรุณาระบุเวลาเปิดและปิดรับ' });
    }
    const client = yield db.connect();
    try {
        // --- 1. เริ่ม Transaction ---
        yield client.query('BEGIN');
        // --- 2. ดึงข้อมูลเก่าของงวดนี้มาเพื่อเปรียบเทียบ ---
        const oldRoundResult = yield client.query('SELECT name, cutoff_datetime FROM lotto_rounds WHERE id = $1', [id]);
        if (oldRoundResult.rows.length === 0) {
            throw new Error('ไม่พบข้อมูลงวดหวยที่ต้องการแก้ไข');
        }
        const oldRound = oldRoundResult.rows[0];
        const oldCutoffTime = new Date(oldRound.cutoff_datetime).getTime();
        const newCutoffTime = new Date(cutoff_datetime).getTime();
        const roundName = oldRound.name; // เก็บชื่อของงวดไว้
        // --- 3. อัปเดตตาราง lotto_rounds ก่อนเสมอ ---
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
            JSON.stringify(closed_numbers || []),
            JSON.stringify(half_pay_numbers || []),
            limit_2d_amount,
            limit_3d_amount,
            id
        ]);
        // --- 4. ตรวจสอบเงื่อนไข ถ้า cutoff_datetime เปลี่ยนแปลงจริง ---
        if (oldCutoffTime !== newCutoffTime) {
            console.log(`ตรวจพบการเปลี่ยนแปลงเวลาของงวด ID: ${id}, กำลังอัปเดตโพยที่เกี่ยวข้อง...`);
            // --- 5. ทำการอัปเดตโพยทั้งหมดที่ผูกกับ lotto_round_id นี้ ---
            const updateBillsQuery = `
                UPDATE bills
                SET 
                    bet_name = $1,
                    bill_lotto_draw = $2
                WHERE lotto_round_id = $3;
            `;
            const updateResult = yield client.query(updateBillsQuery, [
                roundName, // ใช้ชื่อเดิมของงวด
                cutoff_datetime, // ใช้วันที่ปิดรับใหม่
                id
            ]);
            console.log(`อัปเดตโพยจำนวน ${updateResult.rowCount} รายการสำเร็จ`);
        }
        // --- 6. ถ้าทุกอย่างสำเร็จ ให้ Commit Transaction ---
        yield client.query('COMMIT');
        res.status(200).json({ message: 'บันทึกข้อมูลงวดสำเร็จ' });
    }
    catch (error) {
        // หากเกิดข้อผิดพลาด ให้ Rollback Transaction
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
    try {
        const query = `
      SELECT 
        closed_numbers, 
        half_pay_numbers 
      FROM lotto_rounds 
      WHERE id = $1 AND status IN ('active', 'manual_active')`;
        const result = yield db.query(query, [id]);
        // ตรวจสอบว่าเจองวดที่ active หรือไม่
        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "ไม่พบข้อมูลงวดหวย",
                details: "อาจเป็นเพราะ ID ไม่ถูกต้อง หรือ งวดนี้ไม่ได้อยู่ในสถานะ 'active'"
            });
        }
        // ส่งข้อมูลกลับไปเป็น object ที่มี closed_numbers และ half_pay_numbers
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(`Error fetching limits for lotto round ${id}:`, err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์", details: err.message });
    }
}));
// PUT /api/lotto-rounds/update-number-special/:lottoId - อัปเดตเลขปิด/จ่ายครึ่งของงวดที่ระบุ
app.put("/api/lotto-rounds/update-number-special/:lottoId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lottoId } = req.params;
    const { closed_numbers, half_pay_numbers } = req.body;
    // ตรวจสอบว่าข้อมูลที่ส่งมาเป็น Array หรือไม่
    if (!Array.isArray(closed_numbers) || !Array.isArray(half_pay_numbers)) {
        return res.status(400).json({ error: "ข้อมูลที่ส่งมาต้องเป็นรูปแบบ Array" });
    }
    try {
        const query = `
      UPDATE lotto_rounds 
      SET 
        closed_numbers = $1, 
        half_pay_numbers = $2 
      WHERE id = $3
      RETURNING id, closed_numbers, half_pay_numbers;
    `;
        // แปลง Array เป็น JSON string ก่อนบันทึกลง DB
        const result = yield db.query(query, [
            JSON.stringify(closed_numbers),
            JSON.stringify(half_pay_numbers),
            lottoId
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลงวดหวยที่ต้องการอัปเดต" });
        }
        res.status(200).json({
            message: "อัปเดตข้อมูลเลขพิเศษสำเร็จ",
            updatedData: result.rows[0]
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
// GET /api/prize-check/all-items - ดึงข้อมูลรายการแทงทั้งหมดสำหรับหน้าตรวจรางวัล
// app.get("/api/prize-check/all-items", async (req: Request, res: Response) => {
//     // รับค่าจาก query string ทั้งหมด
//     const { startDate, endDate, billRef, lottoName, note, status } = req.query;
//     try {
//        let query = `
//           SELECT
//               bi.id, bi.bet_number, bi.price, bi.bet_style, bi.baht_per,
//               bi.rate,
//               bi.payout_amount AS "payoutAmount",
//               be.bet_type,
//               b.bill_ref AS "billRef", b.note, b.created_at AS "createdAt",
//               lr.name AS "lottoName", lr.cutoff_datetime AS "lottoDrawDate", 
//               lr.winning_numbers AS "winningNumbers", lr.status AS "lottoRoundStatus",
//               lr.id AS "lottoRoundId",  -- << ⭐ เพิ่มบรรทัดนี้เข้ามา ⭐
//               u.username
//           FROM bet_items bi
//           JOIN bill_entries be ON bi.bill_entry_id = be.id
//           JOIN bills b ON be.bill_id = b.id
//           JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
//           JOIN users u ON b.user_id = u.id
//           WHERE bi.status = 'ยืนยัน'
//         `;
//         const queryParams = [];
//         let paramIndex = 1;
//         // เพิ่มเงื่อนไขการกรองทั้งหมดเข้าไปใน query
//         if (startDate && endDate) {
//             query += ` AND b.created_at::date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
//             queryParams.push(startDate, endDate);
//         }
//         if (billRef) {
//             query += ` AND b.bill_ref ILIKE $${paramIndex++}`;
//             queryParams.push(`%${billRef}%`);
//         }
//         if (lottoName) {
//             query += ` AND lr.name ILIKE $${paramIndex++}`;
//             queryParams.push(`%${lottoName}%`);
//         }
//         if (note) {
//             query += ` AND b.note ILIKE $${paramIndex++}`;
//             queryParams.push(`%${note}%`);
//         }
//         if (status) {
//             query += ` AND b.status = $${paramIndex++}`;
//             queryParams.push(status);
//         }
//         query += ' ORDER BY b.created_at DESC, bi.id ASC;';
//         const result = await db.query(query, queryParams);
//         res.json(result.rows);
//     } catch (err: any) {
//         console.error(`Error fetching flat prize check list:`, err);
//         res.status(500).json({ error: "เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์", details: err.message });
//     }
// }); 
app.delete("/api/users/:id", isAuthenticated, isAdminOrOwner, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    // Get a client from the connection pool
    const client = yield db.connect();
    try {
        // 1. Start a database transaction
        yield client.query('BEGIN');
        // 2. Delete all bills associated with the user first
        // This is necessary because of the foreign key constraint.
        // The database will automatically delete related bill_entries and bet_items
        // because of the 'ON DELETE CASCADE' setting you have.
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
// ในไฟล์ server.ts
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
        const baseFromJoin = `FROM bills b JOIN users u ON b.user_id = u.id JOIN lotto_rounds lr ON b.lotto_round_id = lr.id`;
        const summaryQuery = `
            WITH winning_items AS (
                SELECT bi.payout_amount FROM bet_items bi
                JOIN bill_entries be ON bi.bill_entry_id = be.id JOIN bills b ON be.bill_id = b.id JOIN users u ON b.user_id = u.id JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
                WHERE ${baseWhereClauses} AND bi.status = 'ยืนยัน' AND lr.status IN ('closed', 'manual_closed')
                AND ((be.bet_type IN ('3d', '6d') AND bi.bet_style = 'ตรง' AND lr.winning_numbers->>'3top' = bi.bet_number) OR (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'โต๊ด' AND lr.winning_numbers->'3tote' @> to_jsonb(bi.bet_number::text)) OR (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'บน' AND lr.winning_numbers->>'2top' = bi.bet_number) OR (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'ล่าง' AND lr.winning_numbers->>'2bottom' = bi.bet_number))
            )
            SELECT
                (SELECT COALESCE(SUM(b.total_amount), 0) ${baseFromJoin} WHERE ${baseWhereClauses})::float AS "totalBetAmount",
                (SELECT COALESCE(SUM(payout_amount), 0) FROM winning_items)::float AS "totalWinnings",
                (SELECT COUNT(b.id) ${baseFromJoin} WHERE ${baseWhereClauses}) AS "totalBills"
        `;
        const byLottoTypeQuery = `SELECT b.bet_name as name, SUM(b.total_amount)::float AS "totalAmount", COUNT(b.id) AS "billCount" ${baseFromJoin} WHERE ${baseWhereClauses} GROUP BY b.bet_name HAVING COUNT(b.id) > 0 ORDER BY "totalAmount" DESC;`;
        // ⭐ จุดที่แก้ไข: ลบ AND b.status = 'ยืนยันแล้ว' ออกไป ⭐
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
            WHERE ${baseWhereClauses}
            GROUP BY bi.bet_number, bi.bet_style
            ORDER BY "totalAmount" DESC;
        `;
        const recentBillsQuery = `SELECT b.id, b.bill_ref AS "billRef", u.username, b.created_at AS "createdAt", b.total_amount AS "totalAmount", b.status, b.bet_name AS "lottoName", b.bill_lotto_draw AS "billLottoDraw", b.note, b.lotto_round_id as "lottoRoundId" ${baseFromJoin} WHERE ${baseWhereClauses} ORDER BY b.created_at DESC;`;
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
// app.get("/api/prize-check/all-items", isAuthenticated, async (req: Request, res: Response) => {
//     // รับค่า filter ใหม่
//     const { startDate, endDate, status, username, lottoName, roundId } = req.query;
//     if (!startDate || !endDate) {
//         return res.status(400).json({ error: 'Please provide both startDate and endDate.' });
//     }
//     try {
//         const loggedInUser = req.user!;
//         const queryParams: any[] = [startDate, `${endDate} 23:59:59`];
//         let paramIndex = 3;
//         let userFilterClause = '';
//         if (loggedInUser.role === 'owner') {
//             if (username && username !== 'all') {
//                 userFilterClause = `AND u.username = $${paramIndex++}`;
//                 queryParams.push(username as string);
//             }
//         } else {
//             userFilterClause = `AND u.id = $${paramIndex++}`;
//             queryParams.push(loggedInUser.id);
//         }
//         let query = `
//           SELECT
//             bi.id, bi.bet_number, bi.price, bi.bet_style, bi.baht_per,
//             bi.rate, bi.payout_amount AS "payoutAmount", be.bet_type,
//             b.bill_ref AS "billRef", b.note, b.created_at AS "createdAt",
//             lr.name AS "lottoName", lr.cutoff_datetime AS "lottoDrawDate",
//             lr.winning_numbers AS "winningNumbers", lr.status AS "lottoRoundStatus",
//             lr.id AS "lottoRoundId", u.username
//           FROM bet_items bi
//           JOIN bill_entries be ON bi.bill_entry_id = be.id
//           JOIN bills b ON be.bill_id = b.id
//           JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
//           JOIN users u ON b.user_id = u.id
//           WHERE b.created_at BETWEEN $1 AND $2
//           ${userFilterClause}
//         `;
//         if (status && status !== 'all') {
//             query += ` AND b.status = $${paramIndex++}`;
//             queryParams.push(status as string);
//         }
//         // เพิ่มเงื่อนไข filter ใหม่
//         if (lottoName) {
//             query += ` AND lr.name LIKE $${paramIndex++}`;
//             queryParams.push(`%${lottoName}%`);
//         }
//         if (roundId) {
//             query += ` AND lr.id = $${paramIndex++}`;
//             queryParams.push(roundId);
//         }
//         query += ' ORDER BY b.created_at DESC, bi.id ASC;';
//         const result = await db.query(query, queryParams);
//         res.json(result.rows);
//     } catch (err: any) {
//         console.error(`Error fetching prize check items:`, err);
//         res.status(500).json({ error: "Server error while fetching prize check items", details: err.message });
//     }
// });
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
app.get("/api/winning-report", isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const loggedInUser = req.user;
    const { startDate, endDate, username } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'กรุณาระบุ startDate และ endDate' });
    }
    const client = yield db.connect();
    try {
        const queryParams = [startDate, `${endDate} 23:59:59`];
        let userFilterClause = '';
        if (loggedInUser.role === 'owner' || loggedInUser.role === 'admin') {
            if (username && username !== 'all') {
                userFilterClause = `AND u.username = $${queryParams.length + 1}`;
                queryParams.push(username);
            }
        }
        else {
            userFilterClause = `AND u.id = $${queryParams.length + 1}`;
            queryParams.push(loggedInUser.id);
        }
        const winningItemsQuery = `
            SELECT
                bi.id, b.bill_ref AS "billRef", u.username, lr.name AS "lottoName",
                lr.cutoff_datetime AS "lottoDrawDate", be.bet_type AS "betType",
                bi.bet_style AS "betStyle", bi.bet_number AS "betNumber",
                bi.payout_amount AS "payoutAmount"
            FROM bet_items bi
            JOIN bill_entries be ON bi.bill_entry_id = be.id
            JOIN bills b ON be.bill_id = b.id
            JOIN users u ON b.user_id = u.id
            JOIN lotto_rounds lr ON b.lotto_round_id = lr.id
            WHERE b.created_at BETWEEN $1 AND $2 AND bi.status = 'ยืนยัน'
              AND lr.status IN ('closed', 'manual_closed') ${userFilterClause}
              AND (
                    (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'ตรง' AND lr.winning_numbers->>'3top' = bi.bet_number) OR
                    (be.bet_type IN ('3d', '6d') AND bi.bet_style = 'โต๊ด' AND lr.winning_numbers->'3tote' @> to_jsonb(bi.bet_number::text)) OR
                    (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'บน' AND lr.winning_numbers->>'2top' = bi.bet_number) OR
                    (be.bet_type IN ('2d', '19d') AND bi.bet_style = 'ล่าง' AND lr.winning_numbers->>'2bottom' = bi.bet_number)
              )
            ORDER BY lr.cutoff_datetime DESC, b.id DESC;
        `;
        const result = yield client.query(winningItemsQuery, queryParams);
        res.json({ items: result.rows });
    }
    catch (err) {
        console.error("Error fetching winning report:", err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล', details: err.message });
    }
    finally {
        client.release();
    }
}));
// เพิ่มใน server.ts
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
