--- ระบบเวลา ----
ติดตั้งใน Terminal ที่อยู่ในโฟลเดอร์ Backend ของคุณ ให้รันคำสั่ง คอมไพล์
npx tsc

รันเซิร์ฟเวอร์ใหม่อีกครั้ง โดยชี้ไปที่ไฟล์ JavaScript ที่เพิ่งคอมไพล์เสร็จ
node dist/server.js

เพื่อที่คุณจะได้ไม่ต้องมาคอยคอมไพล์และรีสตาร์ทเองทุกครั้งที่แก้ไขโค้ด แนะนำให้ติดตั้งเครื่องมือช่วยครับ
npm install -D ts-node-dev

เพิ่ม Script ใน package.json:
เปิดไฟล์ package.json ในโฟลเดอร์ Backend แล้วเพิ่มบรรทัด "dev" เข้าไปในส่วน "scripts"

"scripts": {
  "dev": "ts-node-dev --respawn src/server.ts",
  "start": "node dist/server.js",
  "build": "tsc"
},

npm run dev


DATABASE_URL=postgres://your_db_user:your_db_password@localhost:5432/your_db_name












===================================================
  บันทึกช่วยจำ: การ Deploy Backend (Node.js/TypeScript) ขึ้น Render.com
===================================================

สรุปขั้นตอนที่ต้องทำเมื่อย้ายโปรเจกต์จากเครื่อง Local ไปยังเซิร์ฟเวอร์จริงของ Render

--- [ 1. การตั้งค่าบน Dashboard ของ Render ] ---

เข้าไปที่ Service ของคุณบน Render แล้วไปที่เมนู "Environment"

1.1) ตั้งค่า Environment Variables:
    - เพิ่มตัวแปรทั้งหมดจากไฟล์ .env ของคุณ (ยกเว้นตัวแปร Database)
    - NODE_ENV: ตั้งค่าเป็น "production"
    - DATABASE_URL: ใช้ค่า "Internal Database URL" ที่ Render เตรียมให้จากการสร้าง PostgreSQL Service

1.2) ตั้งค่า Build & Start Commands:
    - Build Command:  npm install && npm run build
    - Start Command:   node dist/server.js


--- [ 2. การแก้ไขโค้ด Backend (server.ts) ] ---

2.1) การเชื่อมต่อฐานข้อมูล (Database Connection):
    - แก้ไขการสร้าง Pool ให้ใช้ DATABASE_URL จาก Render เป็นหลัก
    
      const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: {
              rejectUnauthorized: false
          }
      });

2.2) การผูก Port (Port Binding):
    - แก้ไขการกำหนด Port ให้รับค่าจาก Render
    
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
          console.log(`Server is running on port ${port}`);
      });

2.3) การตั้งค่า CORS:
    - ระบุ Domain ของ Frontend ที่ Deploy แล้ว เพื่อความปลอดภัย
    
      const corsOptions = {
        origin: 'https://your-frontend-app-name.onrender.com'
      };
      app.use(cors(corsOptions));


--- [ 3. การเตรียมไฟล์ package.json (ฝั่ง Backend) ] ---

ตรวจสอบให้แน่ใจว่าในส่วน "scripts" มีคำสั่ง "build" และ "start" อยู่

    "scripts": {
      "dev": "ts-node-dev --respawn src/server.ts",
      "build": "tsc",
      "start": "node dist/server.js"
    },


--- [ 4. การแก้ไขโค้ด Frontend ] ---

4.1) เปลี่ยน URL ของ API:
    - ในโค้ดฝั่ง React, แก้ไข URL ที่ใช้ fetch ข้อมูล จาก "http://localhost:3000"
      ไปเป็น URL ของ Backend บน Render (เช่น "https://your-backend-app-name.onrender.com")

4.2) (แนะนำ) ใช้ Environment Variable ใน Frontend:
    - สร้างไฟล์ .env.production ในโปรเจกต์ React
    - ใส่ VITE_API_URL=https://your-backend-app-name.onrender.com
    - เรียกใช้ในโค้ดด้วย import.meta.env.VITE_API_URL











ในไฟล์ .env ฝั่ง frontend

VITE_API_URL_FRONTEND= "path/เซิฟเวอร์.com"




ในไฟล์ .env ฝั่ง backend

DATABASE_URL= "path/ฐานข้อมูล.com"