import React, { useState, useEffect, useCallback, useMemo } from 'react'; 
import { ChevronDownIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { FullScreenLoader } from '../components/LoadingScreen';
import { useModal } from '../components/Modal';
import { formatDateBasicString, formatDateString } from '../services/BetService';
import api from '../api/axiosConfig'; 
 
interface WinningNumbers {
    "3top"?: string[]; 
    "2top"?: string[];
    "2bottom"?: string[];
    "3tote"?: string[];
    "3bottom"?: string[];
    "run_top"?: string[];
    "run_bottom"?: string[];
}

interface LottoRound {
    id: number;
    name: string;
    cutoff_datetime: string;
    winning_numbers: WinningNumbers | null;
    status: 'closed' | 'manual_closed';
}



// --- Helper: จัดการ Input ตัวเลขแบบ Array ---
const handleNumericArrayInputChange = (value: string, maxLength: number): string => {
    const filteredValue = value.replace(/[^0-9, ]/g, '');
    const parts = filteredValue.split(/([, ])/);
    const validatedParts = parts.map(part => {
        if (!/[, ]/.test(part) && part.length > maxLength) {
            return part.substring(0, maxLength);
        }
        return part;
    });
    return validatedParts.join('').replace(/, +/g, ', ').replace(/,+/g, ',').replace(/ +/g, ' ');
};

// --- Component: แสดงผลเลขรางวัลแบบสวยงาม (ปรับปรุงใหม่) ---
const WinningNumbersDisplay: React.FC<{ numbers: WinningNumbers | null }> = ({ numbers }) => {
    const displayOrder: (keyof WinningNumbers)[] = ['3top', '2top', '2bottom', '3tote', '3bottom', 'run_top', 'run_bottom'];
    const labels: Record<keyof WinningNumbers, string> = {
        '3top': '3 ตัวบน',
        '2top': '2 ตัวบน',
        '2bottom': '2 ตัวล่าง',
        '3tote': '3 ตัวโต๊ด',
        '3bottom': '3 ตัวล่าง',
        'run_top': 'วิ่งบน',
        'run_bottom': 'วิ่งล่าง',
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-4">
            {displayOrder.map(key => {
                const value = numbers?.[key];
                const hasValue = value && value.length > 0;

                return (
                    <div key={key}>
                        <h4 className="text-xs font-semibold text-gray-400 mb-1">{labels[key]}</h4>
                        {hasValue ? (
                            <p className="text-md font-semibold text-cyan-400 font-mono">
                                {Array.isArray(value) ? value.join(' ') : value}
                            </p>
                        ) : (
                            <p className="text-sm italic text-gray-500">ยังไม่ได้ใส่</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- Main Component ---
const LottoRoundsAddLottoryWin: React.FC = () => {
    // --- States ---
    const [allRounds, setAllRounds] = useState<LottoRound[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<number | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [editingRoundId, setEditingRoundId] = useState<number | null>(null);
    const { alert, confirm, showStatus, hideStatus } = useModal();
    const [formData, setFormData] = useState({
        '3top': '',
        '2top': '',
        '2bottom': '',
        '3tote': '',
        '3bottom': '',
        'run_top': '',
        'run_bottom': '',
    });

    const handleSync = (sourceNumbers: WinningNumbers | null) => {
    if (!sourceNumbers) {
        alert("ต้นทางไม่มีข้อมูลเลขรางวัลให้ซิงค์", "", 'light');
        return;
    }
    // Logic นี้เหมือนกับใน handleStartEdit
    setFormData({
        '3top': sourceNumbers?.['3top']?.join(', ') ?? '',
        '2top': sourceNumbers?.['2top']?.join(', ') ?? '',
        '2bottom': sourceNumbers?.['2bottom']?.join(', ') ?? '',
        '3tote': sourceNumbers?.['3tote']?.join(', ') ?? '',
        '3bottom': sourceNumbers?.['3bottom']?.join(', ') ?? '',
        'run_top': sourceNumbers?.['run_top']?.join(', ') ?? '',
        'run_bottom': sourceNumbers?.['run_bottom']?.join(', ') ?? '',
    });
    alert('ซิงค์ข้อมูลสำเร็จ!', "", 'light');
};

    // --- Data Fetching ---
 const fetchClosedRounds = useCallback(async () => {
    setIsLoading(true);
    try {
        // ใช้ api.get แทน axios.get
        const response = await api.get<LottoRound[]>('/api/admin/lotto-rounds/closed-and-manual_closed');
        setAllRounds(response.data || []);
    } catch (error: any) {
        // Interceptor จะจัดการ Error 401/403
        console.error("Failed to fetch closed rounds:", error);
        showStatus("error", "เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลงวดที่ปิดรับแล้วได้");
    } finally {
        setIsLoading(false);
    }
}, [showStatus]); // เพิ่ม showStatus ใน dependency array

    useEffect(() => {
        fetchClosedRounds();
    }, [fetchClosedRounds]);

    // --- Grouping ---
    const groupedRounds = useMemo(() => {
        return allRounds.reduce((acc, round) => {
            if (!acc[round.name]) acc[round.name] = [];
            acc[round.name].push(round);
            return acc;
        }, {} as Record<string, LottoRound[]>);
    }, [allRounds]);
    
    // --- Handlers ---
    const handleStartEdit = (round: LottoRound) => {
        setEditingRoundId(round.id);
        const wn = round.winning_numbers;
        setFormData({
            '3top': wn?.['3top']?.join(', ') ?? '', // 👈 แก้ไข
            '2top': wn?.['2top']?.join(', ') ?? '',
            '2bottom': wn?.['2bottom']?.join(', ') ?? '',
            '3tote': wn?.['3tote']?.join(', ') ?? '',
            '3bottom': wn?.['3bottom']?.join(', ') ?? '',
            'run_top': wn?.['run_top']?.join(', ') ?? '',
            'run_bottom': wn?.['run_bottom']?.join(', ') ?? '',
        });
    };

    const handleCancelEdit = () => {
        setEditingRoundId(null);
    };

    const handleFormChange = (key: keyof typeof formData, value: string) => {
        let processedValue = value;
        if (key === '3top' || key === '3tote' || key === '3bottom') { // 👈 แก้ไข
            processedValue = handleNumericArrayInputChange(value, 3);
        } else if (key === '2top' || key === '2bottom') {
            processedValue = handleNumericArrayInputChange(value, 2);
        } else if (key === 'run_top' || key === 'run_bottom') {
            processedValue = handleNumericArrayInputChange(value, 1);
        }
        setFormData(prev => ({...prev, [key]: processedValue}));
    };
    
    const handleSave = async (roundId: number) => {
    setIsSaving(roundId);
    showStatus("loading", "กำลังอัปเดต...", "");
    
    // 1. ฟังก์ชันสำหรับแปลงข้อความเป็น Array (เหมือนเดิม)
    const parseString = (str: string) => str.split(/[, ]+/).map(s => s.trim()).filter(Boolean);

    // 2. ⭐ กรองแต่ละประเภทตามจำนวนหลักที่ถูกต้อง ⭐
    const threeDigitTop = parseString(formData['3top']).filter(num => num.length === 3);
    const twoDigitTop = parseString(formData['2top']).filter(num => num.length === 2);
    const twoDigitBottom = parseString(formData['2bottom']).filter(num => num.length === 2);
    const threeDigitTote = parseString(formData['3tote']).filter(num => num.length === 3);
    const threeDigitBottom = parseString(formData['3bottom']).filter(num => num.length === 3);
    const oneDigitRunTop = parseString(formData['run_top']).filter(num => num.length === 1);
    const oneDigitRunBottom = parseString(formData['run_bottom']).filter(num => num.length === 1);
     

    const payload: WinningNumbers = {
        '3top': threeDigitTop,
        '2top': twoDigitTop,
        '2bottom': twoDigitBottom,
        '3tote': threeDigitTote,
        '3bottom': threeDigitBottom,
        'run_top': oneDigitRunTop,
        'run_bottom': oneDigitRunBottom,
    };

    // 4. ส่งข้อมูลไปบันทึก (เหมือนเดิม)
    try { 
        await api.put(`/api/lotto-rounds/winning-numbers/${roundId}`, { winning_numbers: payload }); 
        
        showStatus("success", "สำเร็จ", `บันทึกเลขรางวัลเรียบร้อยแล้ว`);
        handleCancelEdit();
        fetchClosedRounds();

    } catch (error: any) { 
        console.error("Failed to save winning numbers:", error); 
        showStatus("error", "เกิดข้อผิดพลาด", error.response?.data?.error || "ไม่สามารถบันทึกเลขรางวัลได้"); 
        
    } finally {
        setIsSaving(null);
    }
};
    
    const toggleGroup = (groupName: string) => {
        setExpandedGroup(prev => (prev === groupName ? null : groupName));
    };

    return (
        <div className="bg-gray-900 text-white rounded-2xl shadow-lg overflow-hidden border border-gray-700/50">
            <button onClick={() => setIsExpanded(prev => !prev)} className="w-full text-left p-5 flex justify-between items-center hover:bg-gray-800/50 focus:outline-none transition-colors">
                <h2 className="text-xl font-bold">จัดการเพิ่มเลขรางวัลลอตเตอรี่</h2>
                <ChevronDownIcon className={`w-6 h-6 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="p-4 border-t border-gray-700/50">
                        {isLoading ? (<>
                                <FullScreenLoader isLoading={isLoading} text="กำลังโหลดข้อมูลหวยและเลขรางวัล..."/>
                                <p className="text-center py-10">กำลังโหลด...</p></>
                        ) : Object.keys(groupedRounds).length === 0 ? (
                             <p className="text-center text-gray-400 py-10">ไม่พบงวดที่ปิดรับแล้ว</p>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(groupedRounds).map(([lottoName, rounds]) => (
                                    <div key={lottoName} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                                        <button onClick={() => toggleGroup(lottoName)} className="w-full text-left p-4 flex justify-between items-center bg-gray-800 hover:bg-gray-700/60 transition-colors">
                                            <h3 className="text-lg font-semibold text-cyan-400">{lottoName}</h3>
                                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedGroup === lottoName ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expandedGroup === lottoName ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                            <div className="overflow-hidden">
                                                <div className="p-4 space-y-4 border-t border-gray-700">
                                                    {rounds.map(round => (
                                                        <div key={round.id} className="bg-gray-900/80 p-4 rounded-lg border border-gray-600/50">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <p className="font-semibold text-gray-300">งวดวันที่ {formatDateBasicString(round.cutoff_datetime, 'long')}</p>
                                                                
                                                                <div className="flex items-center gap-4">
                                                                    {round.status === 'manual_closed' && (
                                                                        <span className="text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded-full">
                                                                            MANUAL
                                                                        </span>
                                                                    )}
                                                                    {editingRoundId !== round.id && (
                                                                        <button onClick={() => handleStartEdit(round)} className="text-sm text-cyan-400 hover:text-cyan-300">แก้ไข</button>
                                                                    )}
                                                                </div>
                                                                {/* {editingRoundId !== round.id && (
                                                                    <button onClick={() => handleStartEdit(round)} className="text-sm text-cyan-400 hover:text-cyan-300">แก้ไข</button>
                                                                )} */}
                                                            </div>
                                                            
                                                            {editingRoundId === round.id ? (
                                                                <div className="space-y-4">
                                                                                                                        
                                                                {(() => {
                                                                    // --- โค้ดชุดใหม่ที่เปรียบเทียบวันแม่นยำกว่า ---
                                                                    const currentRoundDate = new Date(round.cutoff_datetime);

                                                                    const syncSource = rounds.find(r => {
                                                                        // แปลงวันที่ของงวดอื่นในกลุ่มเพื่อเปรียบเทียบ
                                                                        const otherRoundDate = new Date(r.cutoff_datetime);

                                                                        // ✅ เปรียบเทียบ ปี, เดือน, วัน ตรงๆ
                                                                        const isSameDay = otherRoundDate.getFullYear() === currentRoundDate.getFullYear() &&
                                                                                        otherRoundDate.getMonth() === currentRoundDate.getMonth() &&
                                                                                        otherRoundDate.getDate() === currentRoundDate.getDate();
                                                                        
                                                                        return (
                                                                            r.id !== round.id && // ต้องไม่ใช่งวดเดียวกัน
                                                                            isSameDay && // ต้องเป็นวันเดียวกัน (ที่เช็คแบบใหม่)
                                                                            r.winning_numbers && // คู่ซิงค์ต้องมีเลขรางวัลอยู่แล้ว
                                                                            Object.values(r.winning_numbers).some(val => val && val.length > 0) // ตรวจสอบว่ามีค่าอย่างน้อย 1 ค่า
                                                                        );
                                                                    });

                                                                    // ถ้าเจอคู่ซิงค์ ให้แสดงปุ่ม (ส่วนนี้เหมือนเดิม)
                                                                    if (syncSource) {
                                                                        return (
                                                                            <div className="p-3 bg-cyan-900/50 border border-cyan-700 rounded-lg flex justify-between items-center">
                                                                                <span className="text-sm text-cyan-300">
                                                                                    พบข้อมูลงวดเดียวกัน ({syncSource.status === 'closed' ? 'อัตโนมัติ' : 'Manual'})
                                                                                </span>
                                                                                <button 
                                                                                    onClick={() => handleSync(syncSource.winning_numbers)}
                                                                                    className="text-sm bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1 px-3 rounded"
                                                                                >
                                                                                    ซิงค์เลขรางวัล
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}

                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                        <div>
                                                                            <label className="label-win">3 ตัวบน</label>
                                                                            <textarea value={formData['3top']} onChange={(e) => handleFormChange('3top', e.target.value)} rows={1} className="input-win-area" placeholder="คั่นด้วย , หรือเว้นวรรค"/>
                                                                        </div>
                                                                        <div>
                                                                            <label className="label-win">2 ตัวบน</label>
                                                                            <textarea value={formData['2top']} onChange={(e) => handleFormChange('2top', e.target.value)} rows={1} className="input-win-area" placeholder="คั่นด้วย , หรือเว้นวรรค"/>
                                                                        </div>
                                                                        <div>
                                                                            <label className="label-win">2 ตัวล่าง</label>
                                                                            <textarea value={formData['2bottom']} onChange={(e) => handleFormChange('2bottom', e.target.value)} rows={1} className="input-win-area" placeholder="คั่นด้วย , หรือเว้นวรรค"/>
                                                                        </div>
                                                                        <div>
                                                                             <label className="label-win">3 ตัวล่าง (ถ้ามี)</label>
                                                                             <textarea value={formData['3bottom']} onChange={(e) => handleFormChange('3bottom', e.target.value)} rows={2} className="input-win-area" placeholder="คั่นด้วย , หรือเว้นวรรค"/>
                                                                        </div>
                                                                        <div>
                                                                             <label className="label-win">3 ตัวโต๊ด</label>
                                                                             <textarea value={formData['3tote']} onChange={(e) => handleFormChange('3tote', e.target.value)} rows={2} className="input-win-area" placeholder="คั่นด้วย , หรือเว้นวรรค"/>
                                                                        </div>
                                                                        <div>
                                                                            <label className="label-win">วิ่งบน</label>
                                                                            <textarea value={formData['run_top']} onChange={(e) => handleFormChange('run_top', e.target.value)} rows={1} className="input-win-area" placeholder="คั่นด้วย , หรือเว้นวรรค"/>
                                                                        </div>
                                                                         <div>
                                                                            <label className="label-win">วิ่งล่าง</label>
                                                                            <textarea value={formData['run_bottom']} onChange={(e) => handleFormChange('run_bottom', e.target.value)} rows={1} className="input-win-area" placeholder="คั่นด้วย , หรือเว้นวรรค"/>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-end items-center space-x-3 mt-4">
                                                                        <div className='flex justify-end'>
                                                                          <button onClick={handleCancelEdit} className="mx-2 flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-sm">
                                                                            <XCircleIcon className="h-5 w-5"/>
                                                                            <span>ยกเลิก</span>
                                                                            </button>
                                                                           <button onClick={() => handleSave(round.id)} disabled={isSaving === round.id} className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-sm disabled:bg-gray-500 disabled:cursor-not-allowed">
                                                                              <CheckCircleIcon className="h-5 w-5"/>
                                                                               <span>บันทึกการเปลี่ยนแปลง</span>
                                                                             </button>
                                                                        </div>

                                                                        {/* <button onClick={handleCancelEdit} className="p-2 rounded-full hover:bg-red-500/20" title="ยกเลิก"><XCircleIcon className="h-6 w-6 text-red-400" /></button> */}
                                                                        {/* <button onClick={() => handleSave(round.id)} disabled={isSaving === round.id} className="p-2 rounded-full hover:bg-green-500/20 disabled:opacity-50" title="บันทึก"><CheckCircleIcon className="h-6 w-6 text-green-400" /></button> */}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <WinningNumbersDisplay numbers={round.winning_numbers} />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .label-win { display: block; font-size: 0.875rem; font-weight: 500; color: #9CA3AF; margin-bottom: 0.25rem; }
                .input-win { background-color: #1F2937; border: 1px solid #4B5563; border-radius: 0.5rem; padding: 0.5rem 0.75rem; color: white; width: 100%; font-size: 0.875rem; transition: border-color 0.2s; }
                .input-win:focus { outline: none; border-color: #06B6D4; }
                .input-win-area { width: 100%; padding: 0.5rem; background-color: #1F2937; border: 1px solid #4B5563; border-radius: 0.5rem; font-family: monospace; font-size: 0.875rem; color: white; transition: border-color 0.2s; resize: vertical; }
                .input-win-area:focus { outline: none; border-color: #06B6D4; }
            `}</style>
        </div>
    );
};

export default LottoRoundsAddLottoryWin;
