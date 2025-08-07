import React from 'react';

// ✅ 1. ดึงข้อมูลรูปภาพมาในรูปแบบ Object { 'ชื่อไฟล์': module }
const imageModules = import.meta.glob('../assets/media/manual/*.png', { eager: true });

// ✅ 2. แปลง Object เป็น Array, ทำการจัดเรียง (sort), แล้วค่อยดึงเฉพาะ URL ของรูปภาพ
const images = Object.entries(imageModules)
  .sort(([pathA], [pathB]) => {
    // ดึงตัวเลขออกจากชื่อไฟล์ด้วย Regular Expression
    const numA = parseInt(pathA.match(/(\d+)\.png$/)?.[1] || '0');
    const numB = parseInt(pathB.match(/(\d+)\.png$/)?.[1] || '0');
    return numA - numB; // เปรียบเทียบตัวเลขเพื่อจัดเรียง
  })
  .map(([, module]: [string, any]) => module.default);


const HowtoPage: React.FC = () => {
    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-white dark:border-gray-700">
            <h1 className="text-3xl font-bold text-black dark:text-black">หน้าแสดงคู่มือการใช้งาน</h1> 

            <div className="mt-6 space-y-4 rounded-2x">
                {/* ส่วนนี้ไม่ต้องแก้ไข เพราะ images ถูกเรียงลำดับมาเรียบร้อยแล้ว */}
                {images.map((imageSrc, index) => (
                    <div key={imageSrc} className="text-center ">
                        <img
                            src={imageSrc}
                            alt={`คู่มือขั้นตอนที่ ${index + 1}`}
                            className="w-full max-w-7xl mx-auto border-2 rounded-lg shadow-md bg-white"
                        />
                    </div>
                ))}
            </div>
            
        </div>
    );
};
export default HowtoPage;