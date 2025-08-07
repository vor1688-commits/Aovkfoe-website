// src/components/ConfirmationModal.tsx

import React from 'react';

// ✨ 1. อัปเดต Interface ให้รับ props เพิ่ม
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string; // ทำให้เป็น optional
  confirmButtonClassName?: string; // ทำให้เป็น optional
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmButtonText, // ✨ 2. รับค่า prop
  confirmButtonClassName, // ✨ 2. รับค่า prop
}) => {
  if (!isOpen) return null;

  // ✨ 3. กำหนดค่า default สำหรับ class ของปุ่ม
  const buttonClasses = confirmButtonClassName 
    ? confirmButtonClassName 
    : 'bg-cyan-600 hover:bg-cyan-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-800 text-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            // ✨ 4. ใช้ค่า props ที่รับมา
            className={`px-4 py-2 rounded-lg font-semibold disabled:bg-gray-500 ${buttonClasses}`}
          >
            {/* ✨ 5. ใช้ข้อความปุ่มที่รับมา หรือใช้ค่า default */}
            {confirmButtonText || 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;