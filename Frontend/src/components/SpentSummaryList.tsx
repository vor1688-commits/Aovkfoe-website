import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

// Interfaces
interface SpentSummaryListProps {
  lottoRoundId: string;
  userId: number;
}

interface LimitSummary {
  defaultLimits: { limit_2d_amount?: string; limit_3d_amount?: string; };
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
 
const SpentSummaryList: React.FC<SpentSummaryListProps> = ({ lottoRoundId, userId }) => {
  const [summaryRows, setSummaryRows] = useState<CalculatedRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
    const fetchAndCalculateSummary = async () => {
        setIsLoading(true);
        setError(null);
        try { 
            const response = await api.get<LimitSummary>(`/api/round-limit-summary/${lottoRoundId}/user/${userId}`);
            const data = response.data;  
 
            const calculatedData = data.spentSummary.map(spentItem => {
                const num = spentItem.bet_number;
                let limitAmount: number | null = null;
 
                const specificLimit = data.specificLimits.find(l => l.bet_number === num);
                if (specificLimit) {
                    limitAmount = parseFloat(specificLimit.max_amount);
                } else {
                    // Priority 2: Range limit
                    const numInt = parseInt(num, 10);
                    const rangeLimit = data.rangeLimits.find(l => 
                        num.length === l.range_start.length &&
                        numInt >= parseInt(l.range_start, 10) && 
                        numInt <= parseInt(l.range_end, 10)
                    );
                    if (rangeLimit) {
                        limitAmount = parseFloat(rangeLimit.max_amount);
                    } else {
                        // Priority 3: Default limit
                        if (num.length <= 2 && data.defaultLimits.limit_2d_amount) {
                            limitAmount = parseFloat(data.defaultLimits.limit_2d_amount);
                        } else if (num.length >= 3 && data.defaultLimits.limit_3d_amount) {
                            limitAmount = parseFloat(data.defaultLimits.limit_3d_amount);
                        }
                    }
                }

                const spentAmount = parseFloat(spentItem.total_spent);
                const remainingAmount = limitAmount !== null ? limitAmount - spentAmount : null;

                return {
                    betNumber: num,
                    spent: spentAmount,
                    limit: limitAmount,
                    remaining: remainingAmount,
                };
            });
 
            calculatedData.sort((a, b) => {
                const aRatio = a.limit ? a.spent / a.limit : -1;
                const bRatio = b.limit ? b.spent / b.limit : -1;
                return bRatio - aRatio;
            });

            setSummaryRows(calculatedData);

        } catch (err: any) { 
            console.error("Failed to fetch and calculate summary:", err);
            setError(err.response?.data?.error || 'ไม่สามารถดึงข้อมูลสรุปยอดซื้อได้');
        } finally {
            setIsLoading(false);
        }
    };

    if (lottoRoundId && userId) {
        fetchAndCalculateSummary();
    }
}, [lottoRoundId, userId]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center text-gray-400 p-4">กำลังโหลดข้อมูล...</div>;
    }
    if (error) {
      return <div className="text-center text-red-400 p-4">{error}</div>;
    }
    if (summaryRows.length === 0) {
      return <div className="text-center text-gray-500 p-4">ยังไม่มีรายการซื้อในงวดนี้</div>;
    }

    return (
      <div className="space-y-1">
        {summaryRows.map((row) => (
          <div key={row.betNumber} className="grid grid-cols-4 gap-2 items-center bg-gray-900/50 p-2 rounded-md text-sm">
            {/* Bet Number */}
            <div className="col-span-1 font-mono text-lg text-center text-white bg-black/30 rounded py-1">
              {row.betNumber}
            </div>
            
            {/* Details */}
            <div className="col-span-3 space-y-1">
              {/* Spent */}
              <div className="flex justify-between">
                <span className="text-gray-400">ซื้อไป:</span>
                <span className="font-semibold font-mono text-yellow-300">{row.spent.toLocaleString()}</span>
              </div>
              {/* Remaining */}
              <div className="flex justify-between">
                <span className="text-gray-400">เหลือ:</span>
                {row.limit === null ? (
                   <span className="font-semibold text-green-400">ไม่จำกัด</span>
                ) : row.remaining !== null && row.remaining > 0 ? (
                  <span className="font-semibold font-mono text-green-400">{row.remaining.toLocaleString()}</span>
                ) : (
                  <span className="font-semibold text-red-500">เต็ม</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full bg-black text-white rounded-2xl shadow-lg border border-gray-700/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <h3 className="text-lg font-bold text-center">สรุปยอดซื้อตามตัวเลข</h3>
      </div>
      
      {/* Body */}
      <div className="p-2 max-h-96 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default SpentSummaryList;