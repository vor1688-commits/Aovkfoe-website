import React from 'react';

// Interface LottoTypeDetails (เหมือนเดิม)
interface LottoTypeDetails {
    id: number;
    name: string;
    rate_3_top: string;
    rate_3_tote: string;
    rate_3_bottom: string;
    rate_2_top: string;
    rate_2_bottom: string;
    rate_run_top: string;
    rate_run_bottom: string;
    // ... other fields
}

interface RateDisplayCardProps {
    details: LottoTypeDetails | null;
}

const RateDisplayCard: React.FC<RateDisplayCardProps> = ({ details }) => {
    // สถานะ Loading แบบ Dark Mode
    if (!details) {
        return (
            <div className="w-full md:w-72 flex-shrink-0 p-4 bg-black rounded-2xl border border-gray-700/50 text-center text-gray-400">
                กำลังโหลดอัตราจ่าย...
            </div>
        );
    }

    // Logic การสร้าง Array (เหมือนเดิม)
    const rates: { label: string; value: string; }[] = [
        { label: '3 ตัวบน', value: details.rate_3_top },
        { label: '3 ตัวโต๊ด', value: details.rate_3_tote },
        { label: '2 ตัวบน', value: details.rate_2_top },
        { label: '2 ตัวล่าง', value: details.rate_2_bottom },
        { label: 'วิ่งบน', value: details.rate_run_top },
        { label: 'วิ่งล่าง', value: details.rate_run_bottom },
    ];

    if (Number(details.rate_3_bottom) > 0) {
        rates.splice(2, 0, { label: '3 ตัวล่าง', value: details.rate_3_bottom });
    }

    return (
        <div className="w-full md:w-72 flex-shrink-0 bg-black text-white rounded-2xl shadow-lg border border-gray-700/50">
            {/* Header */}
            <div className="p-4 border-b border-gray-700/50">
                <h3 className="text-lg font-bold text-center">อัตราจ่าย</h3>
            </div>

            {/* Body - ใช้ Flexbox divs แทนตาราง */}
            <div className="p-4 space-y-3">
                {rates.map((rate, index) => (
                    <div key={index} className="flex justify-between items-baseline">
                        <span className="text-sm text-white font-bold">{rate.label}</span>
                        <span className="font-semibold text-gray-200 font-mono">
                            <span className="text-xs text-gray-500 font-sans mr-1.5">บาทละ</span>
                            {Number(rate.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RateDisplayCard;