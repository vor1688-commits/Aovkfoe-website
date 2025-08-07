import React, { useState, useEffect, useCallback } from 'react'; 
import { ChevronDownIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { FullScreenLoader } from '../components/LoadingScreen';
import { useModal } from '../components/Modal';
import api from '../api/axiosConfig';

// กำหนด URL หลักของ API 

// --- Interfaces (ควรอยู่ในไฟล์ types.ts) ---
interface LottoType {
    id: number;
    name: string;
}

// --- Helper Functions ---
const toDateInputString = (date: Date) => date.toISOString().split('T')[0];
const toTimeInputString = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

// --- Main Component ---
const ManualLottoAddForm: React.FC = () => {
    // --- States ---
    const [lottoTypes, setLottoTypes] = useState<LottoType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<number | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedLottoId, setExpandedLottoId] = useState<number | null>(null);
    const { alert, confirm, showStatus, hideStatus } = useModal();
    
    const [formData, setFormData] = useState({
        open_date: '',
        open_time: '',
        cutoff_date: '',
        cutoff_time: '',
        closed_numbers_input: '', // <-- State ใหม่สำหรับเลขปิดรับ
        half_pay_numbers_input: '', // <-- State ใหม่สำหรับเลขจ่ายครึ่ง
    });

    // --- Data Fetching ---
    const fetchLottoTypes = useCallback(async () => {
    setIsLoading(true);
        try { 
            const response = await api.get<LottoType[]>('/api/lotto-types');
            setLottoTypes(response.data || []);
        } catch (error) {
            // Interceptor จะจัดการ Error 401/403
            console.error("Failed to fetch lotto types:", error);
            alert("ผิดพลาด", "ไม่สามารถดึงข้อมูลประเภทหวยได้", "warning");
        } finally {
            setIsLoading(false);
        }
    }, [alert]);

    useEffect(() => {
        fetchLottoTypes();
    }, [fetchLottoTypes]);

    // --- Handlers ---
    const toggleLottoType = (lottoTypeId: number) => {
        if (expandedLottoId === lottoTypeId) {
            setExpandedLottoId(null);
        } else {
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
            
            setFormData({
                open_date: toDateInputString(now),
                open_time: toTimeInputString(now),
                cutoff_date: toDateInputString(oneHourLater),
                cutoff_time: toTimeInputString(oneHourLater),
                closed_numbers_input: '', // <-- Reset ค่าเมื่อเปิด
                half_pay_numbers_input: '', // <-- Reset ค่าเมื่อเปิด
            });
            setExpandedLottoId(lottoTypeId);
        }
    };

    const handleFormChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // --- ฟังก์ชันจัดการ Input ที่มีการกรอง ---
    const handleSpecialNumberChange = (
        value: string, 
        setter: (val: string) => void
    ) => {
        const filteredValue = value.replace(/[^0-9, ]/g, '');
        const parts = filteredValue.split(/([, ])/);
        const validatedParts = parts.map(part => {
            if (!/[, ]/.test(part) && part.length > 3) {
                return part.substring(0, 3);
            }
            return part;
        });
        let finalValue = validatedParts.join('');
        finalValue = finalValue.replace(/ +/g, ' ').replace(/,+/g, ',').replace(/, /g, ',').replace(/ ,/g, ',');
        setter(finalValue);
    };

      const handleSubmit = async (lottoType: LottoType) => {
        setIsSaving(lottoType.id); 
        const openDateTimeUTCString = `${formData.open_date}T${formData.open_time}:00.000Z`;
        const cutoffDateTimeUTCString = `${formData.cutoff_date}T${formData.cutoff_time}:00.000Z`;

        // --- ตรวจสอบความถูกต้องของเวลา (ควรทำก่อนส่ง) ---
        if (new Date(cutoffDateTimeUTCString) <= new Date(openDateTimeUTCString)) {
            alert("เวลาปิดรับต้องอยู่หลังเวลาเปิดรับ", "", "light");
            setIsSaving(null);
            return;
        }

        const closed_numbers = formData.closed_numbers_input.split(/[, ]+/).map(n => n.trim()).filter(Boolean);
        const half_pay_numbers = formData.half_pay_numbers_input.split(/[, ]+/).map(n => n.trim()).filter(Boolean);

        const payload = {
            name: lottoType.name,
            lotto_type_id: lottoType.id,
            // ✅ ใช้ String ที่สร้างขึ้นใหม่ส่งไปใน payload
            open_datetime: openDateTimeUTCString,
            cutoff_datetime: cutoffDateTimeUTCString,
            status: 'manual_active',
            closed_numbers,
            half_pay_numbers,
        };

        try {
            showStatus("loading", "กำลังเพิ่มงวดหวย", "");
            await api.post('/api/admin/lotto-rounds/manual', payload);
            showStatus("success", `เพิ่มงวดสำหรับ "${lottoType.name}" สำเร็จ`, ""); 
            setExpandedLottoId(null);
        } catch (error) {
            console.error("Failed to create manual lotto round:", error); 
            showStatus("error", `ไม่สามารถสร้างงวดได้ "${lottoType.name}" สำเร็จ`, ""); 
        } finally {
            setIsSaving(null);
        }
    };

    return (
        <div className="bg-gray-900 text-white rounded-2xl shadow-lg overflow-hidden border border-gray-700/50">
            <button onClick={() => setIsExpanded(prev => !prev)} className="w-full text-left p-5 flex justify-between items-center hover:bg-gray-800/50 focus:outline-none transition-colors">
                <h2 className="text-xl font-bold">เพิ่มหวย/หุ้น ด้วยตนเอง</h2>
                <ChevronDownIcon className={`w-6 h-6 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="p-4 border-t border-gray-700/50">
                        {isLoading ? (
                            <>  <FullScreenLoader isLoading={isLoading} text="กำลังโหลดข้อมูลหวย..."/>    <p className="text-center py-10">กำลังโหลด...</p>  </>
                        ) : (
                            <div className="space-y-2">
                                {lottoTypes.map(lottoType => (
                                    <div key={lottoType.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                                        <button onClick={() => toggleLottoType(lottoType.id)} className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-700/60 transition-colors">
                                            <h3 className="text-lg font-semibold text-cyan-400">{lottoType.name}</h3>
                                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedLottoId === lottoType.id ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${expandedLottoId === lottoType.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                            <div className="overflow-hidden">
                                                <div className="p-4 border-t border-gray-700">
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="label-form">เวลาเปิดให้ซื้อ</label>
                                                                <div className="flex gap-2">
                                                                    <input type="date" value={formData.open_date} onChange={e => handleFormChange('open_date', e.target.value)} className="input-form"/>
                                                                    <input type="time" value={formData.open_time} onChange={e => handleFormChange('open_time', e.target.value)} className="input-form"/>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="label-form">เวลาปิดให้ซื้อ</label>
                                                                <div className="flex gap-2">
                                                                    <input type="date" value={formData.cutoff_date} onChange={e => handleFormChange('cutoff_date', e.target.value)} className="input-form"/>
                                                                    <input type="time" value={formData.cutoff_time} onChange={e => handleFormChange('cutoff_time', e.target.value)} className="input-form"/>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* --- ✅ เพิ่มช่องกรอกใหม่ --- */}
                                                        <div>
                                                            <label className="label-form">เลขปิดรับ (คั่นด้วย , หรือ เว้นวรรค)</label>
                                                            <textarea 
                                                                value={formData.closed_numbers_input} 
                                                                onChange={(e) => handleSpecialNumberChange(e.target.value, (val) => handleFormChange('closed_numbers_input', val))}
                                                                rows={3}
                                                                className="input-form font-mono"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="label-form">เลขจ่ายครึ่ง (คั่นด้วย , หรือ เว้นวรรค)</label>
                                                            <textarea 
                                                                value={formData.half_pay_numbers_input} 
                                                                onChange={(e) => handleSpecialNumberChange(e.target.value, (val) => handleFormChange('half_pay_numbers_input', val))}
                                                                rows={3}
                                                                className="input-form font-mono"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <button onClick={() => handleSubmit(lottoType)} disabled={isSaving === lottoType.id} className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-sm disabled:bg-gray-500 disabled:cursor-not-allowed">
                                                                <CheckCircleIcon className="h-5 w-5"/>
                                                                <span>{isSaving === lottoType.id ? 'กำลังสร้าง...' : 'สร้างงวด'}</span>
                                                            </button>
                                                        </div>
                                                    </div>
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
                .label-form { display: block; font-size: 0.875rem; font-weight: 500; color: #9CA3AF; margin-bottom: 0.25rem; text-transform: capitalize; }
                .input-form { background-color: #1F2937; border: 1px solid #4B5563; border-radius: 0.5rem; padding: 0.5rem 0.75rem; color: white; width: 100%; font-size: 0.875rem; transition: border-color 0.2s; color-scheme: dark; }
                .input-form:focus { outline: none; border-color: #06B6D4; }
            `}</style>
        </div>
    );
};

export default ManualLottoAddForm;
