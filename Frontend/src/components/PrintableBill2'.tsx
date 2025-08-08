// src/components/PrintableBill2.tsx

import React, { useMemo } from 'react';
import { 
  getBetTypeName, 
  type Order, 
  type BillEntryDetail,
  type BetItem,
  formatDateBasicString
} from '../services/BetService';

interface Props {
  order: Order | null;
  details: BillEntryDetail[] | null;
}

interface ProcessedItem {
  id: string;
  number: string;
  betTypeAndStyle: string;
  amountBet: number;
  amountReceived: number;
  payoutRate: number;
  statusText: string;
  confirmation: BetItem['status'] | 'รอผล'; 
}

const PrintableBill2 = React.forwardRef<HTMLDivElement, Props>(({ order, details }, ref) => {
  
  if (!order || !details) {
    return null;
  }

  const processedItems = useMemo(() => {
    const allItems: ProcessedItem[] = [];
    details.forEach((entry, entryIndex) => {
      entry.items.forEach((item, itemIndex) => {
        const isHalfPay = item.price !== item.rate;
        const received = isHalfPay ? item.price : item.price;
        
        allItems.push({
          id: `${entryIndex}-${itemIndex}`,
          number: item.bet_number,
          betTypeAndStyle: `${getBetTypeName(entry.bet_type)} ${item.bet_style}`,
          amountBet: item.price,
          amountReceived: received,
          payoutRate: item.baht_per,
          statusText: isHalfPay ? 'จ่ายครึ่ง' : 'จ่ายเต็ม',
          confirmation: item.status ?? 'รอผล',
        });
      });
    });
    return allItems;
  }, [details]);

  const groupedBets = useMemo(() => {
    return processedItems.reduce((acc, bet) => {
      const getGroupKey = (num: string) => {
        if (num.length === 1) return 'เลขวิ่ง';
        if (num.length === 2) return 'เลข 2 ตัว';
        if (num.length === 3) return 'เลข 3 ตัว';
        return 'อื่นๆ';
      };
      const key = getGroupKey(bet.number);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(bet);
      return acc;
    }, {} as Record<string, ProcessedItem[]>);
  }, [processedItems]);

  const { totalReturnedAmount, netTotalAmount } = useMemo(() => {
    if (!details || !order) {
      return { totalReturnedAmount: 0, netTotalAmount: 0 };
    }
    const returnedAmount = details.flatMap(entry => entry.items)
      .filter(item => item.status === 'คืนเลข')
      .reduce((sum, item) => sum + Number(item.price), 0);
    const netAmount = Number(order.totalAmount) - returnedAmount;
    return { totalReturnedAmount: returnedAmount, netTotalAmount: netAmount };
  }, [details, order]);

  return (
    <div ref={ref} className="p-2 bg-gray-100 font-sans w-[650px]">
      {/* 👇 แก้ไขสีพื้นหลังตรงนี้ 👇 */}
      <div className="bg-black text-white p-2 rounded-t-md text-sm text-center whitespace-nowrap">
        <span>
          เลขที่บิล #{order.billRef} | {order.lottoName} | งวด {formatDateBasicString(order.bill_lotto_draw, 'long')}
        </span>
      </div>
      
      {Object.entries(groupedBets).map(([groupName, betsInGroup]) => (
        <div key={groupName} className="mt-1">
          {/* 👇 แก้ไขสีพื้นหลังตรงนี้ 👇 */}
          <div className="bg-black text-white font-semibold text-center py-1 px-3">
            {groupName}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border-x border-b border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภท @ หมายเลข</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดเดิมพัน</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดที่ได้รับ</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">อัตราจ่าย (บาทละ)</th> 
                  <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ยืนยัน/คืนเลข</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {betsInGroup.map((bet) => (
                  <tr key={bet.id} className="text-sm">
                    <td className="py-2 px-3 whitespace-nowrap font-semibold">
                      <span className={`font-bold ${bet.betTypeAndStyle.includes("2") ? "text-blue-600": "text-red-600"}`}>{bet.betTypeAndStyle} @ </span><span className={`font-bold ${bet.betTypeAndStyle.includes("2") ? "text-blue-600": "text-red-600"}`}>{bet.number}</span>
                    </td>
                    <td className="py-2 px-3 text-right">{bet.amountBet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className={`py-2 px-3 ${bet.statusText === 'จ่ายครึ่ง' ? 'text-center text-red-600' : 'text-right text-black'}`}>{bet.amountReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })} {bet.statusText === 'จ่ายครึ่ง' ? "(จ่ายครึ่ง)": ""}</td>
                    <td className={`py-2 px-3 text-center ${bet.statusText === 'จ่ายครึ่ง' ? 'text-red-600' : 'text-black'}`}>บาทละ {bet.statusText === 'จ่ายครึ่ง' ? (bet.payoutRate / 2).toLocaleString('en-US', {maximumFractionDigits: 2, minimumFractionDigits:2}):bet.payoutRate.toLocaleString('en-US')}</td> 
                    <td className={`py-2 px-3 text-center font-bold ${
                      bet.confirmation === 'ยืนยัน' ? 'text-green-700' :
                      bet.confirmation === 'คืนเลข' ? 'text-red-700' :
                      'text-yellow-600'
                    }`}>
                      {bet.confirmation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* 👇 แก้ไขสีพื้นหลังและเส้นคั่นตรงนี้ 👇 */}
      <div className="bg-black text-white p-3 rounded-b-md text-right mt-1 space-y-1">
        <div className="flex justify-between text-base text-white/80">
          <span>ยอดรวมเดิม:</span>
          <span>{order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
        </div>
        <div className="flex justify-between text-base text-red-400">
          <span>หักยอดคืนเลข:</span>
          <span>- {totalReturnedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t border-gray-600 pt-1 mt-1">
          <span>ยอดสุทธิ:</span>
          <span>{netTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
        </div>
      </div>
    </div>
  );
});

export default PrintableBill2;