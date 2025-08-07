import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axiosConfig';

// --- Interfaces ---
// 1. เพิ่ม Interface สำหรับ BillEntry ที่รับมาจาก Prop
interface BillEntry {
  bets: string[];
  priceTop: number;
  priceTote: number;
  priceBottom: number;
}

interface LimitAndSpentSummaryCardProps {
  lottoRoundId: string;
  userId: number;
  currentBill: BillEntry[]; 
  refreshKey: number;
}

interface LimitSummary {
  defaultLimits: { limit_2d_amount?: string | null; limit_3d_amount?: string | null; };
  specificLimits: { bet_number: string; max_amount: string; }[];
  rangeLimits: { range_start: string; range_end: string; max_amount: string; }[];
  spentSummary: { bet_number: string; total_spent: string; }[];
}

interface CalculatedRow {
  betNumber: string;
  spent: number;
  limit: number | null;
  remaining: number | null;
}
 

// --- Main Component ---
// 2. รับ currentBill เข้ามาใน Component
const LimitAndSpentSummaryCard: React.FC<LimitAndSpentSummaryCardProps> = ({ lottoRoundId, userId, currentBill, refreshKey }) => {
  const [limitSummary, setLimitSummary] = useState<LimitSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [numberToCheck, setNumberToCheck] = useState<string>('');
  
  // Data Fetching (ยังทำงานเหมือนเดิม)
  useEffect(() => {
    const fetchLimitData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/round-limit-summary/${lottoRoundId}/user/${userId}`);
        setLimitSummary(response.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (lottoRoundId && userId) fetchLimitData();
  }, [lottoRoundId, userId, refreshKey]);

  // Reusable Calculation Logic (ปรับปรุงเล็กน้อย)
  const calculateLimitForRow = (betNumber: string, summary: LimitSummary): Omit<CalculatedRow, 'spent' | 'remaining'> => {
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

  // --- 3. ปรับปรุง Logic การคำนวณทั้งหมดให้รวมยอดจาก currentBill ---
  const { checkedResult, summaryRows } = useMemo(() => {
    if (!limitSummary) return { checkedResult: null, summaryRows: [] };

    // Step 1: คำนวณยอดซื้อที่ค้างอยู่ในตะกร้า (currentBill)
    const spentInCurrentBill = new Map<string, number>();
    currentBill.forEach(entry => {
      const pricePerNumber = entry.priceTop + entry.priceTote + entry.priceBottom;
      entry.bets.forEach(betNumber => {
        spentInCurrentBill.set(betNumber, (spentInCurrentBill.get(betNumber) || 0) + pricePerNumber);
      });
    });

    // Step 2: สร้างรายการสรุปทั้งหมด (รวมยอดจาก DB และยอดในตะกร้า)
    const allNumbers = new Set([
      ...limitSummary.spentSummary.map(s => s.bet_number),
      ...Array.from(spentInCurrentBill.keys())
    ]);
    
    let allRows: CalculatedRow[] = Array.from(allNumbers).map(betNumber => {
      const { limit } = calculateLimitForRow(betNumber, limitSummary);
      const spentInDb = parseFloat(limitSummary.spentSummary.find(s => s.bet_number === betNumber)?.total_spent || '0');
      const spentNow = spentInCurrentBill.get(betNumber) || 0;
      const totalSpent = spentInDb + spentNow;
      const remaining = limit !== null ? limit - totalSpent : null;
      
      return { betNumber, spent: totalSpent, limit, remaining };
    });

    // Step 3: เรียงข้อมูลจากน้อยไปมาก
    allRows.sort((a, b) => parseInt(a.betNumber, 10) - parseInt(b.betNumber, 10));

    // Step 4: หาผลลัพธ์สำหรับเลขที่กำลังตรวจสอบ
    let finalCheckedResult: CalculatedRow | null = null;
    if (numberToCheck) {
        const foundRow = allRows.find(r => r.betNumber === numberToCheck);
        if (foundRow) {
            finalCheckedResult = foundRow;
        } else {
            // ถ้าเลขที่ค้นหายังไม่เคยซื้อเลย ให้คำนวณใหม่โดยมียอดซื้อเป็น 0
            const { limit } = calculateLimitForRow(numberToCheck, limitSummary);
            finalCheckedResult = { betNumber: numberToCheck, spent: 0, limit, remaining: limit };
        }
    }
    
    return { checkedResult: finalCheckedResult, summaryRows: allRows };

  }, [limitSummary, currentBill, numberToCheck]); // เพิ่ม currentBill และ numberToCheck ใน dependency


  // --- UI Rendering ---
  // (ส่วน render ทั้งหมดเหมือนเดิม ไม่ต้องแก้ไข)
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
    if (isLoading) return <div className="text-center text-gray-400 p-4">กำลังโหลดข้อมูล...</div>;
    if (error) return <div className="text-center text-red-400 p-4">{error}</div>;
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