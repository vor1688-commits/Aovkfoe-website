import React, { useState, useMemo, useRef, useEffect } from 'react';
import { InformationCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// --- Interfaces ---
interface BillEntry {
    bets: string[];
    priceTop: number;
    priceTote: number;
    priceBottom: number;
}
interface SummaryData {
    defaultLimits: { limit_2d_amount?: string | null; limit_3d_amount?: string | null; };
    rangeLimits: { range_start: string; range_end: string; max_amount: string; number_limit_types: string; }[];
    spentSummary: { bet_number: string; bet_style: string; total_spent: string; }[];
}
interface LimitAndSpentSummaryCardProps {
    currentBill: BillEntry[];
    summaryData: SummaryData | null;
}

interface StyleDetail {
    spent: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    percent: number;
}
interface CalculatedRow {
    betNumber: string;
    top: StyleDetail;
    bottom: StyleDetail;
    tote: StyleDetail;
    total: StyleDetail;
}

// --- Main Component ---
const LimitAndSpentSummaryCard: React.FC<LimitAndSpentSummaryCardProps> = ({ currentBill, summaryData }) => {
    const [numberToCheck, setNumberToCheck] = useState<string>('');
    // ✅ 1. สร้าง Ref สำหรับ "พื้นที่ที่เลื่อนได้"
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { checkedResult, summaryRows, defaultLimitText } = useMemo(() => {
        // ... (Logic การคำนวณทั้งหมดเหมือนเดิมทุกประการ) ...
        if (!summaryData) return { checkedResult: null, summaryRows: [], defaultLimitText: "ไม่จำกัด" };
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
            if (style === 'บน' || style === 'ตรง') addToCombined(combinedTotals, item.bet_number, amount, 0, 0);
            else if (style === 'ล่าง') addToCombined(combinedTotals, item.bet_number, 0, amount, 0);
            else if (style === 'โต๊ด') addToCombined(combinedTotals, item.bet_number, 0, 0, amount);
        });
        currentBill.forEach(entry => {
            entry.bets.forEach(betNumber => {
                addToCombined(combinedTotals, betNumber, entry.priceTop || 0, entry.priceBottom || 0, entry.priceTote || 0);
            });
        });
        const getMostSpecificRule = (rules: typeof rangeLimits, type: string[]) => {
            const filteredRules = rules.filter(r => type.includes(r.number_limit_types as any));
            if (filteredRules.length === 0) return null;
            if (filteredRules.length === 1) return filteredRules[0];
            return filteredRules.sort((a, b) => (parseInt(a.range_end) - parseInt(a.range_start)) - (parseInt(b.range_end) - parseInt(b.range_start)))[0];
        };
        const calculateLimitsForNumber = (betNumber: string): CalculatedRow => {
            const combined = combinedTotals.get(betNumber) || { top: 0, bottom: 0, tote: 0 };
            const applicableRules = rangeLimits.filter(r =>
                r && r.range_start && r.range_end &&
                betNumber.length === r.range_start.length &&
                parseInt(betNumber, 10) >= parseInt(r.range_start, 10) &&
                parseInt(betNumber, 10) <= parseInt(r.range_end, 10)
            );
            const topRule = getMostSpecificRule(applicableRules, ['บน', 'ตรง']);
            const bottomRule = getMostSpecificRule(applicableRules, ['ล่าง']);
            const toteRule = getMostSpecificRule(applicableRules, ['โต๊ด']);
            const totalRule = getMostSpecificRule(applicableRules, ['ทั้งหมด']);
            const defaultLimitRaw = betNumber.length <= 2 ? defaultLimits?.limit_2d_amount : defaultLimits?.limit_3d_amount;
            const defaultLimit = defaultLimitRaw && parseFloat(defaultLimitRaw) > 0 ? parseFloat(defaultLimitRaw) : null;
            const createStyleDetail = (spent: number, rule: typeof rangeLimits[0] | null, isTotalContext: boolean = false): StyleDetail => {
                let limit: number | 'unlimited' = 'unlimited';
                if (rule) {
                    limit = parseFloat(rule.max_amount);
                } else if (isTotalContext && defaultLimit) {
                    limit = defaultLimit;
                }
                const remaining = limit !== 'unlimited' ? limit - spent : 'unlimited';
                const percent = (limit !== 'unlimited' && limit > 0) ? (spent / limit) * 100 : 0;
                return { spent, limit, remaining, percent };
            };
            const totalSpent = combined.top + combined.bottom + combined.tote;
            return {
                betNumber,
                top: createStyleDetail(combined.top, topRule),
                bottom: createStyleDetail(combined.bottom, bottomRule),
                tote: createStyleDetail(combined.tote, toteRule),
                total: createStyleDetail(totalSpent, totalRule, true),
            };
        };
        const allNumbers = new Set([...combinedTotals.keys(), ...(numberToCheck ? [numberToCheck] : [])]);
        let allRows = Array.from(allNumbers).map(calculateLimitsForNumber);
        const checkedResult = numberToCheck ? allRows.find(row => row.betNumber === numberToCheck) : null;
        let displayRows = allRows.filter(row => row.total.spent > 0);
        if (checkedResult && !displayRows.some(row => row.betNumber === checkedResult.betNumber)) {
            displayRows.unshift(checkedResult);
        }
        displayRows.sort((a, b) => b.total.spent - a.total.spent);
        let headerText = "ไม่จำกัด";
        const limit2d = defaultLimits?.limit_2d_amount ? parseFloat(defaultLimits.limit_2d_amount) : 0;
        const limit3d = defaultLimits?.limit_3d_amount ? parseFloat(defaultLimits.limit_3d_amount) : 0;
        if (limit2d > 0 && limit3d > 0) headerText = `2 ตัว ไม่เกิน ${limit2d.toLocaleString()} / 3 ตัว ไม่เกิน ${limit3d.toLocaleString()}`;
        else if (limit2d > 0) headerText = `2 ตัว ไม่เกิน ${limit2d.toLocaleString()}`;
        else if (limit3d > 0) headerText = `3 ตัว ไม่เกิน ${limit3d.toLocaleString()}`;
        return { checkedResult: checkedResult || null, summaryRows: displayRows, defaultLimitText: headerText };
    }, [summaryData, currentBill, numberToCheck]);

    // ✅ 2. แก้ไข useEffect ให้เลื่อน scrollTop ของ "พื้นที่ที่เลื่อนได้"
    useEffect(() => {
        if (checkedResult && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }, [checkedResult]);
    
    // --- UI Components (เหมือนเดิม) ---
    const ProgressBar = ({ percent, isDarkTheme = false }: { percent: number, isDarkTheme?: boolean }) => {
        const p = Math.min(percent, 100);
        const barColor = p >= 100 ? 'bg-red-500' : 'bg-yellow-400';
        const bgColor = isDarkTheme ? 'bg-gray-600' : 'bg-gray-200';
        return (
            <div className={`w-full ${bgColor} rounded-full h-2.5`}>
                <div className={`${barColor} h-2.5 rounded-full transition-all duration-300`} style={{ width: `${p}%` }}></div>
            </div>
        );
    };

    const Header = () => (
        <div className="text-center p-3 bg-black rounded-t-2xl flex-shrink-0">
            <p className="text-sm text-gray-400">สำหรับตรวจสอบวงเงิน</p>
            <p className="text-lg font-bold text-yellow-400">{defaultLimitText}</p>
        </div>
    );

    const renderDetailRow = (label: string, detail: StyleDetail, isDarkTheme: boolean = false) => {
        const isOver = detail.remaining !== 'unlimited' && detail.remaining < 0;
        const remainingColor = isOver ? 'text-red-500' : (isDarkTheme ? 'text-gray-300' : 'text-gray-500');
        const textColor = isDarkTheme ? 'text-white' : 'text-black';
        const labelColor = isDarkTheme ? 'text-yellow-400' : 'text-black';
        const subTextColor = isDarkTheme ? 'text-gray-400' : 'text-gray-500';

        return (
            <div>
                <ProgressBar percent={detail.percent} isDarkTheme={isDarkTheme} />
                <div className="flex justify-between items-baseline text-base mt-1.5">
                    <span className={`font-bold ${labelColor}`}>{label}</span>
                    <div className="text-right">
                        <p className={`font-semibold ${textColor}`}>
                            {detail.spent.toLocaleString()} / {detail.limit === 'unlimited' ? 'ไม่จำกัด' : detail.limit.toLocaleString()}
                        </p>
                        <p className={`text-sm font-bold ${remainingColor}`}>
                            {detail.remaining === 'unlimited' ? `เหลือ ไม่จำกัด` : isOver ? `เกิน ${Math.abs(detail.remaining).toLocaleString()}` : `เหลือ ${detail.remaining.toLocaleString()}`}
                        </p>
                    </div>
                </div>
            </div>
        );
    };
    
    const renderRow = (row: CalculatedRow, isCheckedResult: boolean = false) => {
        const is3Digit = row.betNumber.length >= 3;
        const topLabel = is3Digit ? '3 ตัวตรง' : '2 ตัวบน';
        const bottomLabel = is3Digit ? '3 ตัวล่าง' : '2 ตัวล่าง';
        const isDarkTheme = isCheckedResult;

        return (
            <div className={`p-4 rounded-xl ${isDarkTheme ? 'bg-black' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                    <span className={`font-mono text-4xl font-bold ${isDarkTheme ? 'text-yellow-400' : 'text-black'}`}>{row.betNumber}</span>
                </div>
                <div className="space-y-4">
                    {renderDetailRow(topLabel, row.top, isDarkTheme)}
                    {renderDetailRow(bottomLabel, row.bottom, isDarkTheme)}
                    {is3Digit && renderDetailRow('3 ตัวโต๊ด', row.tote, isDarkTheme)}
                    <hr className={`${isDarkTheme ? 'border-gray-700' : 'border-gray-200'} !my-3`}/>
                    {renderDetailRow('ยอดรวม', row.total, isDarkTheme)}
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full bg-white text-black rounded-2xl shadow-lg flex flex-col max-h-[550px]">
            <Header />
            <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-gray-50">
                <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                    <input 
                        type="text" 
                        inputMode="numeric" 
                        value={numberToCheck} 
                        onChange={(e) => setNumberToCheck(e.target.value.replace(/[^0-9]/g, ''))} 
                        placeholder="ค้นหาเลข..." 
                        className="w-full pl-10 p-2 bg-white border border-gray-300 rounded-md text-black text-center font-mono text-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                    />
                </div>
            </div>

            {/* ✅ 3. ผูก ref เข้ากับ "พื้นที่ที่เลื่อนได้" */}
            <div ref={scrollContainerRef} className="overflow-y-auto p-4 space-y-4 bg-gray-100">
                {checkedResult && (
                    <div className="animate-fade-in">
                        {renderRow(checkedResult, true)}
                    </div>
                )}
                
                <hr className={`border-gray-300 ${!checkedResult ? 'hidden' : ''}`}/>

                {summaryData === null ? (
                    <div className="text-center text-gray-500 p-4">กำลังโหลด...</div>
                ) : summaryRows.length === 0 && !checkedResult ? (
                    <div className="text-center text-gray-400 p-6 flex flex-col items-center">
                        <InformationCircleIcon className="w-8 h-8 text-gray-400 mb-2" />
                        ยังไม่มีรายการซื้อในงวดนี้
                    </div>
                ) : (
                    <div className="space-y-3">
                        {summaryRows.map(row => renderRow(row))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LimitAndSpentSummaryCard;