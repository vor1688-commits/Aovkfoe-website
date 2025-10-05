import React from 'react';
import { getBetTypeName } from '../services/BetService';
import { PencilSquareIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
// ✨ [จุดที่แก้ไข] 1: import Type ที่สร้างขึ้นใหม่เข้ามา
// ✨ [จุดที่แก้ไข] 1: import Type ที่สร้างขึ้นใหม่เข้ามา
import type { OverLimitDetails } from '../pages/LottoFormPage';

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
  // ✨ [จุดที่แก้ไข] 2: เปลี่ยนชื่อและ Type ของ prop จาก overLimitNumbersSet เป็น overLimitDetails
  overLimitDetails: OverLimitDetails;
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
  specialNumbers,
  overLimitDetails
}) => {
  const closedNumbersSet = new Set(specialNumbers?.closed_numbers || []);
  const halfPayNumbersSet = new Set(specialNumbers?.half_pay_numbers || []);

  const validBets = bets.filter(bet => !closedNumbersSet.has(bet));
  const closedBets = bets.filter(bet => closedNumbersSet.has(bet));

  const halfPaidBets = validBets.filter(bet => halfPayNumbersSet.has(bet));

  const pricePerBet = priceTop + priceTote + priceBottom;
  const actualCalculatedTotal = validBets.length * pricePerBet;

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
  
  // ✨ [จุดที่แก้ไข] 3: สร้าง Logic ใหม่เพื่อเช็คว่า "รายการนี้" เกินลิมิตจริงหรือไม่
  const isEntryOverLimit = bets.some(bet => {
    const limitStyles = overLimitDetails.get(bet);
    if (!limitStyles) return false;

    if (limitStyles.has('ทั้งหมด')) return true;
    if (priceTop > 0 && limitStyles.has('บน')) return true;
    if (priceBottom > 0 && limitStyles.has('ล่าง')) return true;
    if (priceTote > 0 && limitStyles.has('โต๊ด')) return true;

    return false;
  });
  
  const overLimitBetsInThisEntry = bets.filter(bet => overLimitDetails.has(bet));

  return (
    // ใช้ isEntryOverLimit ในการตัดสินใจแสดง border สีฟ้า
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-2 border flex items-center p-3 gap-4 ${isEntryOverLimit && !bets.every(b => closedNumbersSet.has(b)) ? 'border-blue-500 border-2' : 'border-gray-200/80'}`}>
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
            const getNumberClassName = () => {
              if (closedNumbersSet.has(betNumber)) {
                return 'text-red-500 font-bold line-through';
              }
              // ✨ [จุดที่แก้ไข] 4: เพิ่มการตรวจสอบที่ละเอียดขึ้นก่อนไฮไลท์สีฟ้า
              const limitStyles = overLimitDetails.get(betNumber);
              if (limitStyles) {
                if (
                    limitStyles.has('ทั้งหมด') ||
                    (priceTop > 0 && limitStyles.has('บน')) ||
                    (priceBottom > 0 && limitStyles.has('ล่าง')) ||
                    (priceTote > 0 && limitStyles.has('โต๊ด'))
                ) {
                    return 'text-blue-500 font-bold';
                }
              }
              if (halfPayNumbersSet.has(betNumber)) {
                return 'text-amber-500 font-bold';
              }
              return 'text-gray-800';
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
            *เลขปิด {closedBets.length} ตัว ไม่ถูกนำมาคำนวณยอด
          </div>
        )}
        
        {halfPaidBets.length > 0 && !closedBets.some(cb => halfPaidBets.includes(cb)) && (
          <div className="text-xs text-amber-600 mt-1 italic">
            *เลขจ่ายครึ่ง {halfPaidBets.length} ตัว (จ่ายรางวัลครึ่งเดียวเมื่อถูก)
          </div>
        )}

        {/* ใช้ isEntryOverLimit ในการตัดสินใจแสดงข้อความเตือน */}
        {isEntryOverLimit && !bets.every(b => closedNumbersSet.has(b)) && (
            <div className="text-xs text-blue-600 mt-1 italic flex items-center gap-1 font-semibold">
               <ExclamationTriangleIcon className="h-4 w-4" />
               เลขสีฟ้า ({overLimitBetsInThisEntry.filter(b => !closedNumbersSet.has(b)).join(', ')}) อาจเต็มวงเงินแล้ว
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