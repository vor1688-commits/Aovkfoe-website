import React from 'react';
import { getBetTypeName } from '../services/BetService';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

interface SpecialNumbers {
  closed_numbers: string[];
  half_pay_numbers: string[];
}

interface CardBillForBetProps {
  bets: string[];
  betType: string;
  bahtPer: number;
  priceTop: number;
  priceTote: number;
  priceBottom: number; 
  entryIndex: number;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  specialNumbers: SpecialNumbers | null;
}

const CardBillForBets: React.FC<CardBillForBetProps> = ({
  bets,
  betType,
  bahtPer,
  priceTop,
  priceTote,
  priceBottom,
  entryIndex,
  onRemove, 
  onEdit,
  specialNumbers
}) => {
  // --- ✅ [จุดที่แก้ไข] ---
  const closedNumbersSet = new Set(specialNumbers?.closed_numbers || []);
  const halfPayNumbersSet = new Set(specialNumbers?.half_pay_numbers || []); // 1. สร้าง Set สำหรับเลขจ่ายครึ่ง
  
  const validBets = bets.filter(bet => !closedNumbersSet.has(bet));
  const closedBets = bets.filter(bet => closedNumbersSet.has(bet));

  const halfPaidBets = bets.filter(bet => halfPayNumbersSet.has(bet));

  const pricePerBet = priceTop + priceTote + priceBottom;
  const actualCalculatedTotal = validBets.length * pricePerBet;
  // --- สิ้นสุดการแก้ไข ---

  const isThreeDigitMode = betType === '3d' || betType === '6d';
  
  const priceParts = [];
  if (priceTop > 0) {
    const label = isThreeDigitMode ? 'ตรง' : 'บน';
    priceParts.push(<span key="top" className="text-green-600">{label} {priceTop}</span>);
  }
  if (priceTote > 0) {
    priceParts.push(<span key="tote" className="text-orange-600">โต๊ด {priceTote}</span>);
  }
  if (priceBottom > 0) {
    const label = 'ล่าง';
    priceParts.push(<span key="bottom" className="text-red-600">{label} {priceBottom}</span>);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-2 border border-gray-200/80 flex items-center p-3 gap-4">
      <div className="flex-shrink-0 w-32 text-center border-r pr-4 border-gray-200">
        <span className="px-3 py-1 text-sm font-bold leading-5 text-indigo-800 bg-indigo-100 rounded-full">
          {getBetTypeName(betType)}
        </span>
        <div className="mt-2 text-sm font-semibold flex flex-wrap justify-center items-center gap-x-1">
          {priceParts.map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < priceParts.length - 1 && <span className="text-gray-400">x</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-base leading-relaxed">
          {bets.map((betNumber, index) => {
            // --- ✅ [จุดที่แก้ไข] ---
            // 2. สร้างฟังก์ชันสำหรับกำหนด Class ของตัวเลข
            const getNumberClassName = () => {
                if (closedNumbersSet.has(betNumber)) {
                    return 'text-red-500 font-bold line-through'; // เลขปิด
                }
                if (halfPayNumbersSet.has(betNumber)) {
                    return 'text-amber-300 font-bold'; // เลขจ่ายครึ่ง
                }
                return 'text-gray-800'; // เลขปกติ
            };
            
            return (
              <span key={index} className={getNumberClassName()}>
                {betNumber}
              </span>
            );
          })}
        </div>

        <div className="text-xs text-gray-500 mt-1">
          {validBets.length} ตัว x {pricePerBet} บาท = 
          <span className="font-bold text-indigo-600 ml-1">{actualCalculatedTotal.toLocaleString('en-US')} บาท</span>
        </div>

        {closedBets.length > 0 && (
          <div className="text-xs text-red-500 mt-1 italic">
            *เลขปิดจำนวน {closedBets.length} ตัว ไม่ถูกนำมาคำนวณในยอดรวมนี้
          </div>
        )}
        
        {halfPaidBets.length > 0 && (
          <div className="mt-1"> 
            <div className="text-xs text-amber-400 italic">
              *เลขจ่ายครึ่งจะแสดงเป็นสีเหลือง มีจำนวน {halfPaidBets.length} ตัว (กรุณาเช็คบิลก่อนดำเนินการบันทึก)
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1">
        <button onClick={() => onEdit(entryIndex)} className="p-2 text-gray-500 rounded-full hover:bg-yellow-100 hover:text-yellow-600"><PencilSquareIcon className="h-5 w-5" /></button>
        <button onClick={() => onRemove(entryIndex)} className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>
      </div>
    </div>
  );
};

export default CardBillForBets;