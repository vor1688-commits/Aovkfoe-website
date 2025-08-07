// src/components/PrintableReceipt.tsx

import React from 'react';
import { formatDateBasicString, formatDateString, formatFullThaiDate } from '../services/BetService';

// --- Interfaces (คงเดิม) ---
interface BillEntry {
  bets: string[];
  betTypes: string;
  priceTop: number;
  priceTote: number;
  priceBottom: number;
}
interface PrintableBill {
  billRef: string;
  betName: string;
  billLottoDraw: string;
  totalAmount: number;
  billEntries: BillEntry[];
}
interface LottoTypeDetails {
  rate_3_top: string;
  rate_3_tote: string;
  rate_3_bottom: string;
  rate_2_top: string;
  rate_2_bottom: string;
  rate_run_top: string;
  rate_run_bottom: string;
}
interface SpecialNumbers {
  closed_numbers: string[];
  half_pay_numbers: string[];
}
interface Props {
  bill: PrintableBill | null;
  lottoTypeDetails: LottoTypeDetails | null;
  specialNumbers: SpecialNumbers | null;
}
interface ProcessedBet {
  id: string;
  type: string;
  number: string;
  betAmount: number;
  receivedAmount: number;
  payoutRate: string;
  isHalfPay: boolean;
}

const PrintableReceipt = React.forwardRef<HTMLDivElement, Props>(
  ({ bill, lottoTypeDetails, specialNumbers }, ref) => {
    
    if (!bill || !lottoTypeDetails || !specialNumbers) {
      return null; 
    }

    const processedBets = bill.billEntries.flatMap((entry, entryIndex) => {
      const rows: ProcessedBet[] = [];
      entry.bets.forEach((betNumber, betIndex) => {
        if (specialNumbers.closed_numbers.includes(betNumber)) return;
        
        const isHalfPay = specialNumbers.half_pay_numbers.includes(betNumber);
        const isThreeDigit = betNumber.length === 3;
        const isRunDigit = betNumber.length === 1;

        const createBet = (type: 'top' | 'bottom' | 'tote') => {
          let betData: Omit<ProcessedBet, 'id'> | null = null;
          if (type === 'top' && entry.priceTop > 0) {
            betData = {
              type: isRunDigit ? 'วิ่งบน' : (isThreeDigit ? '3 ตัวตรง' : '2 ตัวบน'),
              number: betNumber, betAmount: entry.priceTop,
              receivedAmount: isHalfPay ? entry.priceTop : entry.priceTop,
              payoutRate: isRunDigit ? lottoTypeDetails.rate_run_top : (isThreeDigit ? lottoTypeDetails.rate_3_top : lottoTypeDetails.rate_2_top),
              isHalfPay: isHalfPay,
            };
          } else if (type === 'bottom' && entry.priceBottom > 0) {
             betData = {
              type: isRunDigit ? 'วิ่งล่าง' : (isThreeDigit ? '3 ตัวล่าง' : '2 ตัวล่าง'),
              number: betNumber, betAmount: entry.priceBottom,
              receivedAmount: isHalfPay ? entry.priceBottom : entry.priceBottom,
              payoutRate: isRunDigit ? lottoTypeDetails.rate_run_bottom : (isThreeDigit ? lottoTypeDetails.rate_3_bottom : lottoTypeDetails.rate_2_bottom),
              isHalfPay: isHalfPay,
            };
          } else if (type === 'tote' && entry.priceTote > 0 && isThreeDigit) {
            betData = {
              type: '3 ตัวโต๊ด',
              number: betNumber, betAmount: entry.priceTote,
              receivedAmount: isHalfPay ? entry.priceTote : entry.priceTote,
              payoutRate: lottoTypeDetails.rate_3_tote,
              isHalfPay: isHalfPay,
            };
          }
          if (betData) {
            rows.push({ ...betData, id: `${entryIndex}-${betIndex}-${type}` });
          }
        };

        createBet('top');
        createBet('bottom');
        createBet('tote');
      });
      return rows;
    });

    const groupedBets = processedBets.reduce((acc, bet) => {
      const getGroupKey = (num: string) => {
        if (num.length === 1) return 'เลขวิ่ง';
        if (num.length === 2) return 'เลข 2 ตัว';
        if (num.length === 3) return 'เลข 3 ตัว';
        return 'อื่น ๆ';
      };
      const key = getGroupKey(bet.number);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(bet);
      return acc;
    }, {} as Record<string, ProcessedBet[]>);


   const formatDate = (isoString: string) => {
  // 1. ตรวจสอบว่ามีข้อมูลหรือไม่
  if (!isoString) return 'N/A';
  
  // 2. สร้าง Date object จากข้อมูลต้นฉบับที่แม่นยำที่สุด
  const date = new Date(isoString);

  // 3. กำหนดรูปแบบที่ต้องการ โดยระบุโซนเวลาของไทยให้ชัดเจน
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Bangkok', 
  };

  // 4. แปลงเป็นข้อความภาษาไทยในขั้นตอนเดียว
  return date.toLocaleDateString('th-TH', options);
};

    const totalBetAmount = processedBets.reduce((sum, bet) => sum + bet.receivedAmount, 0);

    return (
      // ✅ โครงสร้างใหม่จะวนลูปและสร้างตารางสำหรับแต่ละกลุ่ม
      <div ref={ref} className="p-2 bg-gray-100 font-sans w-[600px]">
        <div className="bg-green-600 text-white p-2 rounded-t-md text-sm text-center whitespace-nowrap">
          <span>
            เลขที่บิล #{bill.billRef} | {bill.betName} | งวด {formatDateBasicString(bill.billLottoDraw, 'long')}
          </span>
        </div>
        
        {/* วนลูปตามกลุ่มที่สร้างไว้ */}
        {Object.entries(groupedBets).map(([groupName, betsInGroup]) => (
          <div key={groupName} className="mt-1">
            {/* หัวข้อของกลุ่ม */}
            <div className="bg-green-600 text-white font-semibold text-center py-1 px-3">
              {groupName}
            </div>
            
            {/* ตารางของกลุ่มนั้นๆ */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border-x border-b border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภท @ หมายเลข</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดเดิมพัน</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดที่ได้รับ</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">เรทจ่าย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {betsInGroup.map((bet) => (
                    <tr key={bet.id} className="text-sm">
                      <td className={`py-2 px-3 whitespace-nowrap font-semibold ${bet.type.includes('บน') || bet.type.includes('ตรง') ? 'text-red-500' : 'text-blue-500'}`}>
                        {bet.type} @ {bet.number}
                      </td>
                      <td className="py-2 px-3 text-right">{bet.betAmount.toFixed(2)}</td>
                      <td className={`py-2 px-3 text-right ${bet.isHalfPay ? "text-red-600" : "text-black"}`}>
                        {bet.isHalfPay ? (
                          <span className="">
                            {bet.receivedAmount.toFixed(2)} (จ่ายครึ่ง)
                          </span>
                        ) : (
                          bet.receivedAmount.toFixed(2)
                        )}
                      </td>
                      <td className={`py-2 px-3 text-right ${bet.isHalfPay ? "text-red-600" : "text-black"}`}>{bet.isHalfPay ? (parseFloat(bet.payoutRate) / 2).toFixed(2) : parseFloat(bet.payoutRate).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* ยอดรวมท้ายบิล */}
        <div className="bg-green-600 text-white p-2 rounded-b-md text-right font-bold mt-1">
          ยอดรวม: {totalBetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
        </div>
      </div>
    );
  }
);

export default PrintableReceipt;