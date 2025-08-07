import React from "react";
import { getBetTypeName } from "../services/BetService";
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

interface CardBillForBetProps {
  bets: string[];
  betType: string;
  bahtPer: number;
  priceTop: number;
  priceTote: number; // เพิ่ม prop ใหม่
  priceBottom: number; 
  entryIndex: number;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
}

const CardBillForBets: React.FC<CardBillForBetProps> = ({
  bets,
  betType,
  priceTop,
  priceTote,
  priceBottom,
  entryIndex,
  onRemove, 
  onEdit,
}) => {
  const calculatedTotal = (priceTop + priceTote + priceBottom) * bets.length;

  const isThreeDigitMode = betType === '3d' || betType === '6d';

  // สร้าง Array สำหรับเก็บส่วนของราคาที่จะแสดงผล
  const priceParts = [];
  if (priceTop > 0) {
    const label = isThreeDigitMode ? 'ตรง' : 'บน';
    priceParts.push(<span key="top" className="text-green-600">{label} {priceTop}</span>);
  }
  if (priceTote > 0) {
    priceParts.push(<span key="tote" className="text-orange-600">โต๊ด {priceTote}</span>);
  }
  if (priceBottom > 0) {
    const label = isThreeDigitMode ? 'ล่าง' : 'ล่าง';
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
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-gray-800 font-mono text-base leading-relaxed">
          {bets.map((betNumber, index) => (<span key={index}>{betNumber}</span>))}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {bets.length} ตัว x {priceTop + priceTote + priceBottom} บาท = 
          <span className="font-bold text-indigo-600 ml-1">{calculatedTotal.toLocaleString('en-US')} บาท</span>
        </div>
      </div>

      <div className="flex items-center space-x-1">
          <button onClick={() => onEdit(entryIndex)} className="p-2 text-gray-500 rounded-full hover:bg-yellow-100 hover:text-yellow-600"><PencilSquareIcon className="h-5 w-5" /></button>
          <button onClick={() => onRemove(entryIndex)} className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>
      </div>
    </div>
  );
};

export default CardBillForBets;
