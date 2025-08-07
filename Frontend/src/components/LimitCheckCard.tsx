import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

// Interfaces for data structures from the API
interface LimitCheckCardProps {
  lottoRoundId: string;
  userId: number;
}

interface LimitSummary {
  defaultLimits: { limit_2d_amount?: string; limit_3d_amount?: string; };
  specificLimits: { bet_number: string; max_amount: string; }[];
  rangeLimits: { range_start: string; range_end: string; max_amount: string; }[];
  spentSummary: { bet_number: string; total_spent: string; }[];
}

// Interface for the calculated result to be displayed
interface CalculatedResult {
  spent: number;
  limit: number | null; // Using null to represent an "unlimited" value
  remaining: number | null;
}

// Helper to define the API URL 

const LimitCheckCard: React.FC<LimitCheckCardProps> = ({ lottoRoundId, userId }) => {
  // --- STATE MANAGEMENT ---
  const [numberToCheck, setNumberToCheck] = useState<string>('');
  const [limitSummary, setLimitSummary] = useState<LimitSummary | null>(null);
  const [result, setResult] = useState<CalculatedResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); 

  
 useEffect(() => {
    const fetchLimitData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // ใช้ api.get แทน fetch
            const response = await api.get<LimitSummary>(`/api/round-limit-summary/${lottoRoundId}/user/${userId}`);
            setLimitSummary(response.data); // ข้อมูลอยู่ใน .data โดยตรง
        } catch (err: any) {
            // Interceptor จะจัดการ Error 401/403
            // ส่วนนี้จะดักจับ Error อื่นๆ
            console.error("Failed to fetch limit summary:", err);
            setError(err.response?.data?.error || 'ไม่สามารถดึงข้อมูลสรุปได้');
        } finally {
            setIsLoading(false);
        }
    };

    if (lottoRoundId && userId) {
        fetchLimitData();
    }
}, [lottoRoundId, userId]);

  // --- CORE LOGIC ---
  // 2. This effect runs to calculate the result whenever the input number or the summary data changes.
  useEffect(() => {
    // Clear the result if there's no number to check or no summary data available.
    if (!numberToCheck || !limitSummary) {
      setResult(null);
      return;
    }

    const num = numberToCheck;

    // We start with `limitAmount = null`. This is the key to handling unlimited numbers.
    // If we check all rules and none apply, this value will remain `null`.
    let limitAmount: number | null = null;

    // Priority 1: Check for a specific number limit (most important).
    const specificLimit = limitSummary.specificLimits.find(l => l.bet_number === num);
    if (specificLimit) {
      limitAmount = parseFloat(specificLimit.max_amount);
    } else {
      // Priority 2: If no specific limit, check for a range limit.
      const numInt = parseInt(num, 10);
      const rangeLimit = limitSummary.rangeLimits.find(l => 
        numInt >= parseInt(l.range_start, 10) && numInt <= parseInt(l.range_end, 10)
      );
      if (rangeLimit) {
        limitAmount = parseFloat(rangeLimit.max_amount);
      } else {
        // Priority 3: If still no limit, check for the default 2D/3D limit for the round.
        if (num.length <= 2 && limitSummary.defaultLimits.limit_2d_amount) {
          limitAmount = parseFloat(limitSummary.defaultLimits.limit_2d_amount);
        } else if (num.length >= 3 && limitSummary.defaultLimits.limit_3d_amount) {
          limitAmount = parseFloat(limitSummary.defaultLimits.limit_3d_amount);
        }
      }
    }
    // If we've gone through all checks and `limitAmount` is still `null`,
    // it means this number is truly unlimited.

    // Find how much has already been spent on this number.
    const spentData = limitSummary.spentSummary.find(s => s.bet_number === num);
    const spentAmount = spentData ? parseFloat(spentData.total_spent) : 0;

    // Calculate the remaining amount. This will also be `null` if the limit is unlimited.
    const remainingAmount = limitAmount !== null ? limitAmount - spentAmount : null;
    
    // Set the final result object to be used for rendering.
    setResult({
      spent: spentAmount,
      limit: limitAmount,
      remaining: remainingAmount,
    });

  }, [numberToCheck, limitSummary]);

  // --- UI RENDERING ---
  const renderResult = () => {
    if (isLoading) {
      return <p className="text-center text-gray-400">กำลังโหลดข้อมูล...</p>;
    }
    if (error) {
      return <p className="text-center text-red-400">{error}</p>;
    }
    if (!numberToCheck) {
      return <p className="text-center text-gray-500">กรุณาใส่ตัวเลขที่ต้องการตรวจสอบ</p>;
    }
    if (!result) {
      return null; // Should not happen if numberToCheck exists, but good for safety.
    }

    const { spent, limit, remaining } = result;

    return (
      <div className="space-y-3 animate-fade-in text-sm w-full">
        {/* Spent Amount */}
        <div className="flex justify-between items-baseline">
          <span className="text-gray-400">ซื้อไปแล้ว:</span>
          <span className="font-bold font-mono text-yellow-300">
            {spent.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-sans text-gray-500">บาท</span>
          </span>
        </div>

        {/* Limit Amount */}
        <div className="flex justify-between items-baseline">
          <span className="text-gray-400">วงเงินสูงสุด:</span>
          {/* Here we check if `limit` is null, and render "Unlimited" if it is. */}
          {limit === null ? (
            <span className="font-bold text-green-400">🟢 ไม่จำกัด</span>
          ) : (
            <span className="font-bold font-mono text-white">
              {limit.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-sans text-gray-500">บาท</span>
            </span>
          )}
        </div>

        {/* Remaining Amount (only shown if there is a limit) */}
        {limit !== null && (
          <div className="flex justify-between items-baseline">
            <span className="text-gray-400">คงเหลือ:</span>
            {remaining !== null && remaining > 0 ? (
              <span className="font-bold font-mono text-green-400">
                {remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-sans text-gray-500">บาท</span>
              </span>
            ) : (
              <span className="font-bold text-red-500">🔴 เต็มวงเงิน</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full md:w-72 flex-shrink-0 bg-black text-white rounded-2xl shadow-lg border border-gray-700/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <h3 className="text-lg font-bold text-center">ตรวจสอบวงเงิน</h3>
      </div>
      
      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Input */}
        <div>
          <label htmlFor="number-check-input" className="block text-sm font-medium text-gray-400 mb-1">
            ใส่เลขที่ต้องการเช็ค
          </label>
          <input
            id="number-check-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={numberToCheck}
            onChange={(e) => setNumberToCheck(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="เช่น 25, 123"
            className="w-full p-2 bg-gray-900/50 border border-gray-600 rounded-md text-white text-center font-mono text-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
          />
        </div>

        {/* Result Display */}
        <div className="bg-gray-900/50 p-3 rounded-lg min-h-[100px] flex items-center justify-center">
          {renderResult()}
        </div>
      </div>
    </div>
  );
};

export default LimitCheckCard;