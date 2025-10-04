import React, { useState, useEffect, useMemo } from 'react';
// --- [จุดที่แก้ไข] --- api ไม่ได้ถูกใช้งานแล้ว สามารถลบออกได้
// import api from '../api/axiosConfig';

// --- Interfaces ---
interface BillEntry {
  bets: string[];
  priceTop: number;
  priceTote: number;
  priceBottom: number;
}

// --- [จุดที่แก้ไข] --- Interface ที่จะรับข้อมูลเข้ามาทาง Props
interface SummaryData {
  defaultLimits: { limit_2d_amount?: string | null; limit_3d_amount?: string | null; };
  specificLimits: { bet_number: string; max_amount: string; }[];
  rangeLimits: { range_start: string; range_end: string; max_amount: string; }[];
  spentSummary: { bet_number: string; total_spent: string; }[];
}

// --- [จุดที่แก้ไข] --- อัปเดต Props ของ Component
interface LimitAndSpentSummaryCardProps {
  currentBill: BillEntry[]; 
  summaryData: SummaryData | null; // รับข้อมูลสรุปที่ดึงมาแล้ว
}

interface CalculatedRow {
  betNumber: string;
  spent: number;
  limit: number | null;
  remaining: number | null;
}

// --- Main Component ---
const LimitAndSpentSummaryCard: React.FC<LimitAndSpentSummaryCardProps> = ({ currentBill, summaryData }) => {
  // --- [จุดที่แก้ไข] --- State สำหรับการค้นหาเลขยังคงอยู่ แต่ State ที่เกี่ยวกับการดึงข้อมูลถูกลบออก
  const [numberToCheck, setNumberToCheck] = useState<string>('');
  
  // --- [จุดที่แก้ไข] --- ลบ useEffect ที่ใช้ในการดึงข้อมูลทั้งหมดออก ---
  // Data Fetching logic has been moved to the parent component (LottoFormPage.tsx)

  // Reusable Calculation Logic (ยังทำงานเหมือนเดิม)
  const calculateLimitForRow = (betNumber: string, summary: SummaryData): Omit<CalculatedRow, 'spent' | 'remaining'> => {
    let limitAmount: number | null = null;
    const numInt = parseInt(betNumber, 10);
    const specificLimit = summary.specificLimits.find(l => l.bet_number === betNumber);
    if (specificLimit) {
      limitAmount = parseFloat(specificLimit.max_amount);
    } else {
      const rangeLimit = summary.rangeLimits.find(range => betNumber.length === range.range_start.length && numInt >= parseInt(range.range_start, 10) && numInt <= parseInt(range.range_end, 10));
      if (rangeLimit) {
        limitAmount = parseFloat(rangeLimit.max_amount);
      } else {
        if (betNumber.length <= 2 && summary.defaultLimits.limit_2d_amount) {
          limitAmount = parseFloat(summary.defaultLimits.limit_2d_amount);
        } else if (betNumber.length >= 3 && summary.defaultLimits.limit_3d_amount) {
          limitAmount = parseFloat(summary.defaultLimits.limit_3d_amount);
        }
      }
    }
    return { betNumber, limit: limitAmount };
  };

  // --- [จุดที่แก้ไข] --- ปรับปรุง useMemo ให้ทำงานกับ props 'summaryData' แทน state
  const { checkedResult, summaryRows } = useMemo(() => {
    if (!summaryData) return { checkedResult: null, summaryRows: [] };

    const spentInCurrentBill = new Map<string, number>();
    currentBill.forEach(entry => {
      const pricePerNumber = entry.priceTop + entry.priceTote + entry.priceBottom;
      entry.bets.forEach(betNumber => {
        spentInCurrentBill.set(betNumber, (spentInCurrentBill.get(betNumber) || 0) + pricePerNumber);
      });
    });

    const allNumbers = new Set([
      ...summaryData.spentSummary.map(s => s.bet_number),
      ...Array.from(spentInCurrentBill.keys())
    ]);
    
    let allRows: CalculatedRow[] = Array.from(allNumbers).map(betNumber => {
      const { limit } = calculateLimitForRow(betNumber, summaryData);
      const spentInDb = parseFloat(summaryData.spentSummary.find(s => s.bet_number === betNumber)?.total_spent || '0');
      const spentNow = spentInCurrentBill.get(betNumber) || 0;
      const totalSpent = spentInDb + spentNow;
      const remaining = limit !== null ? limit - totalSpent : null;
      
      return { betNumber, spent: totalSpent, limit, remaining };
    });

    allRows.sort((a, b) => {
      const limitA = a.limit ?? Infinity;
      const limitB = b.limit ?? Infinity;
      const remainingA = a.remaining ?? Infinity;
      const remainingB = b.remaining ?? Infinity;

      // ถ้าตัวเลขใดตัวหนึ่งเต็มวงเงิน ให้นำมาไว้ข้างบน
      if (remainingA <= 0 && remainingB > 0) return -1;
      if (remainingB <= 0 && remainingA > 0) return 1;
      
      // เรียงตามยอดคงเหลือน้อยไปมาก
      if (remainingA !== remainingB) return remainingA - remainingB;
      
      // ถ้าเท่ากัน ให้เรียงตามยอดซื้อมากไปน้อย
      return b.spent - a.spent;
    });

    let finalCheckedResult: CalculatedRow | null = null;
    if (numberToCheck) {
        const foundRow = allRows.find(r => r.betNumber === numberToCheck);
        if (foundRow) {
            finalCheckedResult = foundRow;
        } else {
            const { limit } = calculateLimitForRow(numberToCheck, summaryData);
            finalCheckedResult = { betNumber: numberToCheck, spent: 0, limit, remaining: limit };
        }
    }
    
    return { checkedResult: finalCheckedResult, summaryRows: allRows };

  }, [summaryData, currentBill, numberToCheck]);


  // --- UI Rendering ---
  const renderCheckedResult = (result: CalculatedRow | null) => {
    if (!result) return null;
    const { spent, limit, remaining } = result;
    return (
      <div className="bg-gray-900/50 p-3 rounded-lg animate-fade-in text-sm w-full">
        <div className="space-y-2">
          <div className="flex justify-between items-baseline"><span className="text-gray-400">ซื้อไปแล้ว:</span><span className="font-bold font-mono text-yellow-300">{spent.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท</span></div>
          <div className="flex justify-between items-baseline"><span className="text-gray-400">วงเงินสูงสุด:</span>{limit === null ? <span className="font-bold text-green-400">🟢 ไม่จำกัด</span> : <span className="font-bold font-mono text-white">{limit.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท</span>}</div>
          {limit !== null && (<div className="flex justify-between items-baseline"><span className="text-gray-400">คงเหลือ:</span>{remaining !== null && remaining > 0 ? <span className="font-bold font-mono text-green-400">{remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท</span> : <span className="font-bold text-red-500">🔴 เต็มวงเงิน</span>}</div>)}
        </div>
      </div>
    );
  };

  const renderSummaryList = () => {
    // --- [จุดที่แก้ไข] --- เปลี่ยนเงื่อนไขการโหลดข้อมูล
    if (summaryData === null) return <div className="text-center text-gray-400 p-4">กำลังโหลดข้อมูล...</div>;
    if (summaryRows.length === 0) return <div className="text-center text-gray-500 p-4">ยังไม่มีรายการซื้อในงวดนี้</div>;

    return (
      <div className="space-y-1">
        {summaryRows.map((row) => (
          <div key={row.betNumber} className="grid grid-cols-4 gap-2 items-center bg-gray-900/50 p-2 rounded-md text-sm">
            <div className="col-span-1 font-mono text-lg text-center text-white bg-black/30 rounded py-1">{row.betNumber}</div>
            <div className="col-span-3 space-y-1">
              <div className="flex justify-between"><span className="text-gray-400">ซื้อไป:</span><span className="font-semibold font-mono text-yellow-300">{row.spent.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">เหลือ:</span>{row.limit === null ? <span className="font-semibold text-green-400">ไม่จำกัด</span> : row.remaining !== null && row.remaining > 0 ? <span className="font-semibold font-mono text-green-400">{row.remaining.toLocaleString()}</span> : <span className="font-semibold text-red-500">เต็ม</span>}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full bg-black text-white rounded-2xl shadow-lg border border-gray-700/50 flex flex-col max-h-100">
      <div className="p-4 border-b border-gray-700/50 flex-shrink-0">
        <h3 className="text-lg font-bold text-center">ตรวจสอบและสรุปยอดซื้อ</h3>
      </div>
      <div className="p-4 space-y-4 flex flex-col flex-grow min-h-0">
        <div className="flex-shrink-0">
          <label htmlFor="number-check-input" className="block text-sm font-medium text-gray-400 mb-1">ใส่เลขที่ต้องการเช็ค</label>
          <input id="number-check-input" type="text" inputMode="numeric" value={numberToCheck} onChange={(e) => setNumberToCheck(e.target.value.replace(/[^0-9]/g, ''))} placeholder="เช่น 1, 25, 123" className="w-full p-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-center font-mono text-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"/>
        </div>
        {numberToCheck && renderCheckedResult(checkedResult)}
        <hr className="border-gray-700/50 flex-shrink-0"/>
        <div className="flex flex-col flex-grow min-h-0">
          <h4 className="text-sm font-bold text-gray-400 mb-2 flex-shrink-0">สรุปเลขที่ซื้อแล้ว</h4>
          <div className="overflow-y-auto pr-2 flex-grow scrollbar-hide">
            {renderSummaryList()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimitAndSpentSummaryCard;