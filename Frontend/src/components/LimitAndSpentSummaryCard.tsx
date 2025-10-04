import React, { useState, useMemo } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// --- Interfaces ---
interface BillEntry {
  bets: string[];
  priceTop: number;
  priceTote: number;
  priceBottom: number;
}

interface SummaryData {
  defaultLimits: { limit_2d_amount?: string | null; limit_3d_amount?: string | null; };
  specificLimits: { bet_number: string; max_amount: string; }[];
  rangeLimits: { range_start: string; range_end: string; max_amount: string; number_limit_types: string; }[];
  spentSummary: { bet_number: string; bet_style: string; total_spent: string; }[];
}

interface LimitAndSpentSummaryCardProps {
  currentBill: BillEntry[]; 
  summaryData: SummaryData | null;
}

interface StyleDetail {
    spent: number;
    limit: number | null;
    remaining: number | null;
}
interface CalculatedRow {
    betNumber: string;
    styles: {
        top: StyleDetail;
        bottom: StyleDetail;
        tote: StyleDetail;
    };
    totalSpent: number;
    totalLimit: number | null;
    totalRemaining: number | null;
    hasSpecificRules: boolean;
}

// --- Main Component ---
const LimitAndSpentSummaryCard: React.FC<LimitAndSpentSummaryCardProps> = ({ currentBill, summaryData }) => {
  const [numberToCheck, setNumberToCheck] = useState<string>('');
  
  const { checkedResult, summaryRows } = useMemo(() => {
    if (!summaryData) return { checkedResult: null, summaryRows: [] };

    const { defaultLimits, rangeLimits, spentSummary } = summaryData;

    const combinedTotals = new Map<string, { top: number; bottom: number; tote: number }>();

    const addToCombined = (map: Map<string, { top: number; bottom: number; tote: number }>, betNumber: string, top: number, bottom: number, tote: number) => {
        if (!map.has(betNumber)) map.set(betNumber, { top: 0, bottom: 0, tote: 0 });
        const current = map.get(betNumber)!;
        current.top += top;
        current.bottom += bottom;
        current.tote += tote;
    };

    spentSummary.forEach(item => {
        if (!item || !item.bet_number) return;
        const amount = parseFloat(item.total_spent || '0');
        const style = (item.bet_style || '').trim();
        let top = 0, bottom = 0, tote = 0;
        
        if (style === 'บน' || style === 'ตรง') top = amount;
        else if (style === 'ล่าง') bottom = amount;
        else if (style === 'โต๊ด') tote = amount;
        
        addToCombined(combinedTotals, item.bet_number, top, bottom, tote);
    });

    currentBill.forEach(entry => {
        entry.bets.forEach(betNumber => {
            addToCombined(combinedTotals, betNumber, entry.priceTop || 0, entry.priceBottom || 0, entry.priceTote || 0);
        });
    });

    const allRows: CalculatedRow[] = [];
    const allNumbers = new Set([...combinedTotals.keys()]);

    for (const betNumber of allNumbers) {
        const combined = combinedTotals.get(betNumber) || { top: 0, bottom: 0, tote: 0 };
        
        const applicableRules = rangeLimits.filter(r =>
            r && r.range_start && r.range_end &&
            betNumber.length === r.range_start.length &&
            parseInt(betNumber, 10) >= parseInt(r.range_start, 10) &&
            parseInt(betNumber, 10) <= parseInt(r.range_end, 10)
        );

        const topRule = applicableRules.find(r => r.number_limit_types === 'บน' || r.number_limit_types === 'ตรง');
        const bottomRule = applicableRules.find(r => r.number_limit_types === 'ล่าง');
        const toteRule = applicableRules.find(r => r.number_limit_types === 'โต๊ด');
        const totalRule = applicableRules.find(r => r.number_limit_types === 'ทั้งหมด');
        
        let defaultLimit: number | null = null;
        if (applicableRules.length === 0) {
            const defaultLimitRaw = betNumber.length <= 2 ? defaultLimits?.limit_2d_amount : defaultLimits?.limit_3d_amount;
            if (defaultLimitRaw) {
                defaultLimit = parseFloat(defaultLimitRaw);
            }
        }

        const topLimit = topRule ? parseFloat(topRule.max_amount) : null;
        const bottomLimit = bottomRule ? parseFloat(bottomRule.max_amount) : null;
        const toteLimit = toteRule ? parseFloat(toteRule.max_amount) : null;
        const totalLimit = totalRule ? parseFloat(totalRule.max_amount) : defaultLimit;

        const totalSpent = combined.top + combined.bottom + combined.tote;

        allRows.push({
            betNumber,
            styles: {
                top: { spent: combined.top, limit: topLimit, remaining: topLimit !== null ? topLimit - combined.top : null },
                bottom: { spent: combined.bottom, limit: bottomLimit, remaining: bottomLimit !== null ? bottomLimit - combined.bottom : null },
                tote: { spent: combined.tote, limit: toteLimit, remaining: toteLimit !== null ? toteLimit - combined.tote : null },
            },
            totalSpent: totalSpent,
            totalLimit: totalLimit,
            totalRemaining: totalLimit !== null ? totalLimit - totalSpent : null,
            hasSpecificRules: !!(topRule || bottomRule || toteRule),
        });
    }

    allRows.sort((a, b) => {
        const remainingA = a.hasSpecificRules ? Math.min(a.styles.top.remaining ?? Infinity, a.styles.bottom.remaining ?? Infinity, a.styles.tote.remaining ?? Infinity) : a.totalRemaining;
        const remainingB = b.hasSpecificRules ? Math.min(b.styles.top.remaining ?? Infinity, b.styles.bottom.remaining ?? Infinity, b.styles.tote.remaining ?? Infinity) : b.totalRemaining;
        
        const finalRemainingA = remainingA ?? Infinity;
        const finalRemainingB = remainingB ?? Infinity;

        if (finalRemainingA <= 0 && finalRemainingB > 0) return -1;
        if (finalRemainingB <= 0 && finalRemainingA > 0) return 1;
        if (finalRemainingA !== finalRemainingB) return finalRemainingA - finalRemainingB;
        return b.totalSpent - a.totalSpent;
    });

    let finalCheckedResult: CalculatedRow | null = null;
    if (numberToCheck) {
        finalCheckedResult = allRows.find(r => r.betNumber === numberToCheck) || null;
        if (!finalCheckedResult) {
            const applicableRules = rangeLimits.filter(r => r && r.range_start && numberToCheck.length === r.range_start.length && parseInt(numberToCheck) >= parseInt(r.range_start) && parseInt(numberToCheck) <= parseInt(r.range_end));
            const topRule = applicableRules.find(r => r.number_limit_types === 'บน' || r.number_limit_types === 'ตรง');
            const bottomRule = applicableRules.find(r => r.number_limit_types === 'ล่าง');
            const toteRule = applicableRules.find(r => r.number_limit_types === 'โต๊ด');
            const totalRule = applicableRules.find(r => r.number_limit_types === 'ทั้งหมด');
            let defaultLimit: number | null = null;
            if (applicableRules.length === 0) {
                const defaultLimitRaw = numberToCheck.length <= 2 ? defaultLimits?.limit_2d_amount : defaultLimits?.limit_3d_amount;
                if (defaultLimitRaw) defaultLimit = parseFloat(defaultLimitRaw);
            }
            const topLimit = topRule ? parseFloat(topRule.max_amount) : null;
            const bottomLimit = bottomRule ? parseFloat(bottomRule.max_amount) : null;
            const toteLimit = toteRule ? parseFloat(toteRule.max_amount) : null;
            const totalLimit = totalRule ? parseFloat(totalRule.max_amount) : defaultLimit;

            finalCheckedResult = {
                betNumber: numberToCheck,
                styles: { top: { spent: 0, limit: topLimit, remaining: topLimit }, bottom: { spent: 0, limit: bottomLimit, remaining: bottomLimit }, tote: { spent: 0, limit: toteLimit, remaining: toteLimit }, },
                totalSpent: 0, totalLimit: totalLimit, totalRemaining: totalLimit,
                hasSpecificRules: !!(topRule || bottomRule || toteRule),
            };
        }
    }
    
    return { checkedResult: finalCheckedResult, summaryRows: allRows };
  }, [summaryData, currentBill, numberToCheck]);

  const renderDetailRow = (label: string, detail: StyleDetail) => {
    if (detail.spent === 0 && detail.limit === null) return null;
    const isOver = detail.limit !== null && detail.remaining! < 0;
    
    let remainingColor = 'text-green-400';
    if (detail.limit !== null) {
      if (isOver) remainingColor = 'text-red-400';
      else if (detail.remaining! === 0) remainingColor = 'text-red-400';
    }

    return (
        <div className="bg-gray-700/50 p-3 rounded-lg">
            <div className="flex justify-between items-center text-sm mb-2">
                <span className="font-bold text-gray-200">{label}</span>
                <span className="font-mono text-xs text-gray-400">
                    วงเงิน: {detail.limit ? detail.limit.toLocaleString() : 'ไม่จำกัด'}
                </span>
            </div>
            <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-baseline">
                    <span className="text-gray-400">ซื้อไปแล้ว:</span>
                    <span className="font-semibold font-mono text-white">{detail.spent.toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-gray-400">ซื้อได้อีก:</span>
                    {detail.limit === null ? (
                         <span className="font-semibold text-green-400">ไม่จำกัด</span>
                    ) : (
                        <span className={`font-bold font-mono ${remainingColor}`}>
                            {isOver ? `เกิน ${Math.abs(detail.remaining!).toLocaleString()}` : detail.remaining!.toLocaleString()} บาท
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
  };
  
  const renderRow = (row: CalculatedRow, isCheckedResult: boolean = false) => {
    const is3Digit = row.betNumber.length >= 3;
    const topLabel = is3Digit ? 'ตรง' : 'บน';

    let statusText: React.ReactNode;
    let finalRemaining = row.hasSpecificRules ? Math.min(row.styles.top.remaining ?? Infinity, row.styles.bottom.remaining ?? Infinity, row.styles.tote.remaining ?? Infinity) : row.totalRemaining;
    if (finalRemaining === null) {
        statusText = <span className="px-2 py-1 text-xs font-bold text-green-800 bg-green-200 rounded-full">ซื้อได้</span>;
    } else if (finalRemaining <= 0) {
        statusText = <span className="px-2 py-1 text-xs font-bold text-red-800 bg-red-200 rounded-full">เต็มแล้ว</span>;
    } else {
        statusText = <span className="px-2 py-1 text-xs font-bold text-green-800 bg-green-200 rounded-full">ยังซื้อได้</span>;
    }

    return (
      <div key={row.betNumber} className={`bg-gray-800 p-4 rounded-lg border transition-all ${isCheckedResult ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-gray-700/70'}`}>
        <div className="flex justify-between items-center mb-3">
            <div className="font-mono text-xl font-bold text-white">{row.betNumber}</div>
            <div className="text-right">
                {statusText}
            </div>
        </div>

        {row.hasSpecificRules ? (
            <div className="space-y-2">
                {renderDetailRow(topLabel, row.styles.top)}
                {renderDetailRow('ล่าง', row.styles.bottom)}
                {is3Digit && renderDetailRow('โต๊ด', row.styles.tote)}
            </div>
        ) : (
            <div className="bg-gray-700/50 p-3 rounded-lg">
                <div className="flex justify-between items-center text-sm mb-2">
                    <span className="font-bold text-gray-200">ยอดซื้อรวม</span>
                     <span className="font-mono text-xs text-gray-400">
                        วงเงิน: {row.totalLimit ? row.totalLimit.toLocaleString() : 'ไม่จำกัด'}
                    </span>
                </div>
                 <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-400">ซื้อไปแล้ว:</span>
                        <span className="font-semibold font-mono text-white">{row.totalSpent.toLocaleString()} บาท</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-400">ซื้อได้อีก:</span>
                        {row.totalLimit === null ? (
                            <span className="font-semibold text-green-400">ไม่จำกัด</span>
                        ) : row.totalRemaining! < 0 ? (
                            <span className={`font-bold font-mono text-red-400`}>เกิน {Math.abs(row.totalRemaining!).toLocaleString()} บาท</span>
                        ) : (
                            <span className={`font-bold font-mono ${row.totalRemaining === 0 ? 'text-red-400' : 'text-green-400'}`}>{row.totalRemaining!.toLocaleString()} บาท</span>
                        )}
                    </div>
                 </div>
            </div>
        )}
      </div>
    );
  }

  const renderCheckedResult = (result: CalculatedRow | null) => {
    if (!result) return null;
    return renderRow(result, true);
  };

  const renderSummaryList = () => {
    if (summaryData === null) return <div className="text-center text-gray-400 p-4">กำลังโหลดข้อมูล...</div>;
    if (summaryRows.length === 0) return <div className="text-center text-gray-500 p-4 flex flex-col items-center"><InformationCircleIcon className="w-8 h-8 text-gray-600 mb-2" />ยังไม่มีรายการซื้อในงวดนี้</div>;

    return (
      <div className="space-y-2">
        {summaryRows.map((row) => renderRow(row))}
      </div>
    );
  };

  return (
    <div className="w-full bg-black text-white rounded-2xl shadow-lg border border-gray-700/50 flex flex-col">
      <div className="p-4 border-b border-gray-700/50 flex-shrink-0">
        <h3 className="text-lg font-bold text-center">ตรวจสอบและสรุปยอดซื้อ</h3>
      </div>
      <div className="p-4 space-y-4 flex flex-col flex-grow min-h-0">
        <div className="flex-shrink-0">
          <label htmlFor="number-check-input" className="block text-sm font-medium text-gray-400 mb-1">ใส่เลขที่ต้องการเช็ค</label>
          <input id="number-check-input" type="text" inputMode="numeric" value={numberToCheck} onChange={(e) => setNumberToCheck(e.target.value.replace(/[^0-9]/g, ''))} placeholder="เช่น 01, 123" className="w-full p-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-center font-mono text-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"/>
        </div>
        
        {numberToCheck && (
          <div className="animate-fade-in pt-4">
            {renderCheckedResult(checkedResult)}
          </div>
        )}
        
        <hr className="border-gray-700/50 flex-shrink-0"/>
        
        <div className="flex flex-col flex-grow min-h-0">
          <h4 className="text-sm font-bold text-gray-400 mb-2 flex-shrink-0">สรุปเลขที่ซื้อแล้ว</h4>
          <div className="overflow-y-auto pr-2 flex-grow scrollbar-hide" style={{ maxHeight: '400px' }}>
            {renderSummaryList()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimitAndSpentSummaryCard;

