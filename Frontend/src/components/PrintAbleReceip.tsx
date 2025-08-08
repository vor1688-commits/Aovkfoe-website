import React from 'react';
import { formatDateBasicString } from '../services/BetService';

// --- Interfaces ---
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
  note?: string;
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
  isClosed: boolean;
}

const PrintableReceipt = React.forwardRef<HTMLDivElement, Props>(
  ({ bill, lottoTypeDetails, specialNumbers }, ref) => {
    
    if (!bill || !lottoTypeDetails || !specialNumbers) {
      return null; 
    }

    const processedBets = bill.billEntries.flatMap((entry, entryIndex) => {
      const rows: ProcessedBet[] = [];
      entry.bets.forEach((betNumber, betIndex) => {
        const isClosed = specialNumbers.closed_numbers.includes(betNumber);
        const isHalfPay = !isClosed && specialNumbers.half_pay_numbers.includes(betNumber);
        const isThreeDigit = betNumber.length === 3;
        const isRunDigit = betNumber.length === 1;

        const createBet = (type: 'top' | 'bottom' | 'tote') => {
          let betData: Omit<ProcessedBet, 'id'> | null = null;
          if (type === 'top' && entry.priceTop > 0) {
            betData = {
              type: isRunDigit ? 'วิ่งบน' : (isThreeDigit ? '3 ตัวตรง' : '2 ตัวบน'),
              number: betNumber,
              betAmount: isClosed ? 0 : entry.priceTop,
              receivedAmount: isClosed ? 0 : entry.priceTop,
              payoutRate: isClosed ? '0' : (isRunDigit ? lottoTypeDetails.rate_run_top : (isThreeDigit ? lottoTypeDetails.rate_3_top : lottoTypeDetails.rate_2_top)),
              isHalfPay: isHalfPay,
              isClosed: isClosed,
            };
          } else if (type === 'bottom' && entry.priceBottom > 0) {
            betData = {
              type: isRunDigit ? 'วิ่งล่าง' : (isThreeDigit ? '3 ตัวล่าง' : '2 ตัวล่าง'),
              number: betNumber,
              betAmount: isClosed ? 0 : entry.priceBottom,
              receivedAmount: isClosed ? 0 : entry.priceBottom,
              payoutRate: isClosed ? '0' : (isRunDigit ? lottoTypeDetails.rate_run_bottom : (isThreeDigit ? lottoTypeDetails.rate_3_bottom : lottoTypeDetails.rate_2_bottom)),
              isHalfPay: isHalfPay,
              isClosed: isClosed,
            };
          } else if (type === 'tote' && entry.priceTote > 0 && isThreeDigit) {
            betData = {
              type: '3 ตัวโต๊ด',
              number: betNumber,
              betAmount: isClosed ? 0 : entry.priceTote,
              receivedAmount: isClosed ? 0 : entry.priceTote,
              payoutRate: isClosed ? '0' : lottoTypeDetails.rate_3_tote,
              isHalfPay: isHalfPay,
              isClosed: isClosed,
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

    // จัดเรียงให้เลขปิดไปอยู่ท้ายสุดของแต่ละกลุ่ม
    Object.values(groupedBets).forEach(group => {
      group.sort((a, b) => {
        return (a.isClosed ? 1 : 0) - (b.isClosed ? 1 : 0);
      });
    });

    const totalBetAmount = processedBets.reduce((sum, bet) => sum + bet.betAmount, 0);

    return (
      <div ref={ref} className="p-2 bg-white font-sans w-[600px]">
        <div className="bg-green-600 text-white p-2 rounded-t-md text-sm text-center whitespace-nowrap">
          <span>
            เลขที่บิล #{bill.billRef} | {bill.betName} | งวด {formatDateBasicString(bill.billLottoDraw, 'long')}
          </span>
        </div>
        
        {Object.entries(groupedBets).map(([groupName, betsInGroup]) => (
          <div key={groupName} className="mt-1">
            <div className="bg-green-600 text-white font-semibold text-center py-1 px-3">
              {groupName}
            </div>
            
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
                    <tr key={bet.id} className={`text-sm ${bet.isClosed ? 'bg-gray-100 text-gray-400' : ''}`}>
                      <td className={`py-2 px-3 whitespace-nowrap font-semibold ${bet.isClosed ? '' : (bet.type.includes('บน') || bet.type.includes('ตรง') ? 'text-red-500' : 'text-blue-500')}`}>
                        {bet.type} @ {bet.number} 
                        {bet.isClosed && <span className="ml-2 font-normal italic">(เลขปิด)</span>}
                      </td>
                      <td className="py-2 px-3 text-right">{bet.betAmount.toFixed(2)}</td>
                      <td className={`py-2 px-3 text-right ${!bet.isClosed && bet.isHalfPay ? "text-red-600" : ""}`}>
                        {!bet.isClosed && bet.isHalfPay ? (
                          <span>{bet.receivedAmount.toFixed(2)} (จ่ายครึ่ง)</span>
                        ) : (
                          bet.receivedAmount.toFixed(2)
                        )}
                      </td>
                      <td className={`py-2 px-3 text-right ${!bet.isClosed && bet.isHalfPay ? "text-red-600" : ""}`}>
                        {bet.isClosed ? '0.00' : (bet.isHalfPay ? (parseFloat(bet.payoutRate) / 2).toFixed(2) : parseFloat(bet.payoutRate).toFixed(2))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="bg-green-600 text-white p-2 rounded-b-md text-right font-bold mt-1">
          ยอดรวม: {totalBetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
        </div>
      </div>
    );
  }
);

export default PrintableReceipt;