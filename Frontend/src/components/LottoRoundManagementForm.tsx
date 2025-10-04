import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'; 
import { ChevronDownIcon, CheckCircleIcon, XCircleIcon, PencilSquareIcon, InformationCircleIcon, PlusIcon, UserCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { FullScreenLoader } from './LoadingScreen';
import { useModal } from './Modal';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

// --- Interfaces ---
interface User {
    id: number;
    username: string;
    role: 'user' | 'admin' | 'owner';
}

interface Exemption {
    id?: number;
    exemption_type: 'user' | 'role';
    user_id: number | null;
    user_role: 'user' | 'admin' | 'owner' | null;
}

interface LottoRound {
    id: number;
    name: string;
    status: 'active' | 'manual_active' | string;
    open_datetime: string;
    cutoff_datetime: string;
    closed_numbers: string[] | null;
    half_pay_numbers: string[] | null;
    limit_2d_amount?: string | null;
    limit_3d_amount?: string | null;
    range_limits?: RangeLimitRule[];
    exemptions?: Exemption[];
}

interface RangeLimitRule {
    id?: number;
    range_start: string;
    range_end: string;
    max_amount: string;
    number_limit_types: string;
}

// --- Helper Functions ---
const toUTCDateInputString = (date: Date) => date.toISOString().split('T')[0];
const toUTCTimeInputString = (date: Date) => {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getNumberTypeLabel = (rangeStart: string): string => {
    if (rangeStart.length === 1) return 'วิ่ง';
    if (rangeStart.length === 2) return '2 ตัว';
    if (rangeStart.length === 3) return '3 ตัว';
    return '';
};

// --- Main Component ---
const ManagementLottoRoundsPage: React.FC = () => {

    const { user } = useAuth();

    const token = localStorage.getItem('token');
    const [allRounds, setAllRounds] = useState<LottoRound[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<number | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [editingRoundId, setEditingRoundId] = useState<number | null>(null);
    const { alert, confirm, showStatus, hideStatus } = useModal();
    
    const [formData, setFormData] = useState({
        open_date: '', open_time: '', cutoff_date: '', cutoff_time: '',
        closed_numbers: '', half_pay_numbers: '',
    });
    const [rangeLimits, setRangeLimits] = useState<RangeLimitRule[]>([]);
    const [exemptions, setExemptions] = useState<Exemption[]>([]);
    const [defaultLimit, setDefaultLimit] = useState('0');

    const authHeader = useMemo(() => ({ 
        headers: { Authorization: `Bearer ${token}` } 
    }), [token]);

    const isOwner = user?.role === 'owner';

    const fetchInitialData = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try { 
            const [roundsRes, usersRes] = await Promise.all([
                api.get<{ rounds: LottoRound[] }>('/api/lotto-rounds-fetch-all-manual-auto'),
                api.get<User[]>('/api/users')
            ]);
            setAllRounds(roundsRes.data.rounds || []);
            setAllUsers(usersRes.data || []);
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [token]); 

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // ✨ --- [จุดที่แก้ไข] --- ✨
    // กรองเอาเฉพาะงวดที่มีสถานะ 'active' หรือ 'manual_active' ก่อนนำไปจัดกลุ่ม
    const groupedRounds = useMemo(() => 
        allRounds
            .filter(round => round.status === 'active' || round.status === 'manual_active')
            .reduce((acc, round) => {
                if (!acc[round.name]) acc[round.name] = [];
                acc[round.name].push(round);
                return acc;
            }, {} as Record<string, LottoRound[]>)
    , [allRounds]);
    // ✨ --- [สิ้นสุดการแก้ไข] --- ✨

    const handleStartEdit = async (round: LottoRound) => {
        setEditingRoundId(round.id);
        try {
            const res = await api.get<LottoRound>(`/api/admin/lotto-rounds/${round.id}`);
            const fullRoundData = res.data;
            
            setRangeLimits(fullRoundData.range_limits?.map(r => ({ ...r, max_amount: String(r.max_amount) })) ?? []);
            setExemptions(fullRoundData.exemptions ?? []);
            setDefaultLimit(String(fullRoundData.limit_2d_amount ?? '0'));
            
            const openDate = new Date(fullRoundData.open_datetime);
            const cutoffDate = new Date(fullRoundData.cutoff_datetime);
            setFormData({
                closed_numbers: fullRoundData.closed_numbers?.join(' ') ?? '',
                half_pay_numbers: fullRoundData.half_pay_numbers?.join(' ') ?? '',
                open_date: toUTCDateInputString(openDate),
                open_time: toUTCTimeInputString(openDate),
                cutoff_date: toUTCDateInputString(cutoffDate),
                cutoff_time: toUTCTimeInputString(cutoffDate),
            });
        } catch (error) {
            console.error("Failed to fetch full round details:", error);
            handleCancelEdit();
        }
    };
    
    const handleCancelEdit = () => {
        setEditingRoundId(null);
        setRangeLimits([]);
        setExemptions([]);
    };

   const handleFormChange = (fieldName: keyof typeof formData, value: string) => {
    let processedValue = value;

    // ตรวจสอบว่าเป็น field ที่ต้องการจัดการตัวเลขหรือไม่
    if (fieldName === 'closed_numbers' || fieldName === 'half_pay_numbers') {
        
        // --- ส่วนที่นำ Concept ของคุณมาใช้ ---
        // 1. แปลงตัวคั่นทุกชนิด (คอมม่า, เว้นวรรค, ขึ้นบรรทัดใหม่) ให้เป็นเว้นวรรคเดียว
        const normalized = value.replace(/[, \t\n\r]+/g, ' ');

        // 2. อนุญาตให้มีแค่ตัวเลขและเว้นวรรคเท่านั้น
        const filtered = normalized.replace(/[^0-9 ]/g, '');
        
        // 3. ตรวจสอบความยาวของแต่ละตัวเลข
        const parts = filtered.split(' ');
        const validatedParts = parts.map(part => 
            part.length > 3 ? part.substring(0, 3) : part
        );

        // 4. รวมกลับเป็นข้อความเดียว และกรองช่องว่างที่อาจเกิดขึ้นตอนท้ายออก
        processedValue = validatedParts.join(' ');
        // --- สิ้นสุดส่วนที่แก้ไข ---

    }

    setFormData(prev => ({ ...prev, [fieldName]: processedValue }));
};

    const handleAddRangeLimit = () => setRangeLimits([...rangeLimits, { range_start: '', range_end: '', max_amount: '' , number_limit_types: 'ทั้งหมด'}]);
    const handleRemoveRangeLimit = (index: number) => setRangeLimits(rangeLimits.filter((_, i) => i !== index));
    
    const handleAddExemption = () => setExemptions([...exemptions, { exemption_type: 'user', user_id: null, user_role: null }]);
    const handleRemoveExemption = (index: number) => setExemptions(exemptions.filter((_, i) => i !== index));

    const handleRangeLimitChange = (index: number, field: keyof RangeLimitRule, value: string) => {
        const updatedLimits = [...rangeLimits];
        const currentRule = { ...updatedLimits[index] };

        // ตรวจสอบว่าเป็น field ของ dropdown หรือไม่
        if (field === 'number_limit_types') {
            currentRule.number_limit_types = value;
        } else {
            // Logic เดิมสำหรับ input ที่เป็นตัวเลข
            let processedValue = value.replace(/[^0-9]/g, '');
            if (field === 'max_amount') {
                if (processedValue.length > 7) processedValue = processedValue.slice(0, 7);
            } else {
                if (processedValue.length > 3) processedValue = processedValue.slice(0, 3);
            }

            if (field === 'range_end') {
                const startLen = currentRule.range_start.length;
                if (startLen > 0 && processedValue.length > startLen) {
                    processedValue = processedValue.slice(0, startLen);
                }
            }
             (currentRule as any)[field] = processedValue;
        }
        
        updatedLimits[index] = currentRule;
        setRangeLimits(updatedLimits);
    };

    const handleIntegerInputChange = (
        value: string,
        setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
        const onlyDigits = value.replace(/[^0-9]/g, '');
        if (onlyDigits === '') {
            setter('0');
            return;
        }
        setter(String(Number(onlyDigits)));
    };

    const handleExemptionChange = (index: number, field: keyof Exemption, value: string) => {
        const updatedExemptions = [...exemptions];
        const currentExemption = { ...updatedExemptions[index] };
        
        if (field === 'exemption_type') {
            currentExemption.exemption_type = value as 'user' | 'role';
            currentExemption.user_id = null;
            currentExemption.user_role = null;
        } else if (field === 'user_id') {
            currentExemption.user_id = Number(value);
        } else if (field === 'user_role') {
            currentExemption.user_role = value as 'user' | 'admin' | 'owner';
        }
        
        updatedExemptions[index] = currentExemption;
        setExemptions(updatedExemptions);
    };

    const handleSave = async (roundId: number) => {
        showStatus("loading", "กำลังบันทึกข้อมูล...", "");
        for (const limit of rangeLimits) {
            if (limit.range_start && limit.range_end && parseInt(limit.range_end, 10) < parseInt(limit.range_start, 10)) {
                hideStatus();
                alert(`Error: ช่วงตัวเลขไม่ถูกต้อง (${limit.range_start} - ${limit.range_end}) เลขสิ้นสุดต้องมากกว่าหรือเท่ากับเลขเริ่มต้น`, "", "light");
                return;
            }
        }
        setIsSaving(roundId);
        try {
            const mainPayload = {
                closed_numbers: formData.closed_numbers.split(' ').filter(Boolean),
                half_pay_numbers: formData.half_pay_numbers.split(' ').filter(Boolean),
                open_datetime: new Date(`${formData.open_date}T${formData.open_time}:00.000Z`).toISOString(),
                cutoff_datetime: new Date(`${formData.cutoff_date}T${formData.cutoff_time}:00.000Z`).toISOString(),
                limit_2d_amount: defaultLimit === '0' ? null : Number(defaultLimit),
                limit_3d_amount: defaultLimit === '0' ? null : Number(defaultLimit),
            };
            const rangeLimitsPayload = rangeLimits
                .filter(l => l.range_start && l.range_end && l.max_amount)
                .map(l => ({ ...l, max_amount: Number(l.max_amount) }));
            const exemptionsPayload = exemptions.filter(ex => (ex.exemption_type === 'user' && ex.user_id) || (ex.exemption_type === 'role' && ex.user_role));

            await Promise.all([
                api.put(`/api/lotto-rounds/update-all/${roundId}`, mainPayload),
                api.put(`/api/lotto-rounds/${roundId}/save-range-limits`, rangeLimitsPayload),
                api.put(`/api/lotto-rounds/${roundId}/exemptions`, exemptionsPayload)
            ]);
            hideStatus();
            showStatus("success", "อัปเดตข้อมูลสำเร็จ!", ""); 
            setEditingRoundId(null);
            await fetchInitialData();
        } catch (error) {
            console.error("Failed to save round data:", error);
            hideStatus();
            showStatus("error", "ไม่สามารถอัปเดตข้อมูลได้", `${error}`); 
        } finally {
            setIsSaving(null);
        }
    };

    const toggleGroup = (groupName: string) => setExpandedGroup(prev => (prev === groupName ? null : groupName));

    const renderLimitDisplay = (round: LottoRound) => {
        const defaultLimitDisplay = round.limit_2d_amount ? `${Number(round.limit_2d_amount).toLocaleString()} บาท` : 'ไม่จำกัด';
        return (
            <div className="mt-4 pt-4 border-t border-gray-700/60 text-sm space-y-3">
                <div>
                    <h4 className="font-semibold text-gray-400 mb-2">กฎการจำกัดยอดซื้อ</h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-300 font-semibold w-24 shrink-0">จำกัดการซื้อ</span>
                            <span className="font-bold text-white px-2 py-1 rounded-md bg-gray-700 text-xs">
                                {defaultLimitDisplay}
                            </span>
                        </div>
                        {round.range_limits && round.range_limits.length > 0 && (
                            <div className="flex items-start gap-3">
                                <span className="text-gray-300 font-semibold pt-1 w-24 shrink-0">ลิมิตพิเศษ:</span>
                                <div className="flex flex-wrap gap-2">
                                    {round.range_limits.map((limit, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-cyan-900/50 border border-cyan-700/50 rounded-md px-2 py-1">
                                            <span className='text-cyan-400 text-xs font-bold'>{getNumberTypeLabel(limit.range_start)}</span>
                                            <span className="font-mono text-white text-xs">{limit.range_start}-{limit.range_end}:</span> 
                                            <span className="font-semibold text-cyan-300 text-xs">{Number(limit.max_amount).toLocaleString()}</span>
                                            <span className="font-bold text-yellow-400 text-xs">&lt;{limit.number_limit_types}&gt;</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {round.exemptions && round.exemptions.length > 0 && (
                    <div className="pt-3 border-t border-gray-700/60">
                        <h4 className="font-semibold text-gray-400 mb-2">ข้อยกเว้นลิมิต</h4>
                        <div className="flex flex-wrap gap-2">
                            {round.exemptions.map((ex, i) => (
                                <div key={i} className="flex items-center gap-2 bg-purple-900/50 border border-purple-700/50 rounded-md px-2 py-1 text-xs">
                                    {ex.exemption_type === 'user' ? (
                                        <UserCircleIcon className="h-4 w-4 text-purple-400"/>
                                    ) : (
                                        <ShieldCheckIcon className="h-4 w-4 text-purple-400"/>
                                    )}
                                    <span className="font-semibold text-purple-300">
                                        {ex.exemption_type === 'user' ? allUsers.find(u => u.id === ex.user_id)?.username : ex.user_role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    return (
        <div className="bg-gray-900 text-white rounded-2xl shadow-lg overflow-hidden border border-gray-700/50">
            <button onClick={() => setIsExpanded(prev => !prev)} className="w-full text-left p-4 flex justify-between items-center bg-gray-900/50 hover:bg-gray-700/30 focus:outline-none transition-colors">
                <h2 className="text-xl font-bold">จัดการงวดหวยและวงเงินที่อนุญาตให้ซื้อ</h2>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="p-4 border-t border-gray-700">
                        {isLoading ? <FullScreenLoader isLoading={isLoading} /> : Object.keys(groupedRounds).map(lottoName => (
                            <div key={lottoName} className="bg-gray-800/80 rounded-md overflow-hidden border border-gray-700 mb-3">
                                <button onClick={() => toggleGroup(lottoName)} className="w-full text-left p-4 flex justify-between items-center bg-gray-800 hover:bg-gray-700/60 transition-colors">
                                    <h3 className="text-lg font-bold text-cyan-400">{lottoName}</h3>
                                    <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedGroup === lottoName ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expandedGroup === lottoName ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                    <div className="overflow-hidden">
                                        <div className="p-4 space-y-3">
                                            {groupedRounds[lottoName].map(round => (
                                                <div key={round.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/80">
                                                    {editingRoundId === round.id ? (
                                                        <div className="space-y-6">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="input-label">เวลาเปิดรับ (UTC)</label>
                                                                    <div className="flex gap-2"><input type="date" value={formData.open_date} onChange={e => handleFormChange('open_date', e.target.value)} className="input-field" disabled={!isOwner}/><input type="time" value={formData.open_time} onChange={e => handleFormChange('open_time', e.target.value)} className="input-field" disabled={!isOwner}/></div>
                                                                </div>
                                                                <div>
                                                                    <label className="input-label">เวลาปิดรับ (UTC)</label>
                                                                    <div className="flex gap-2"><input type="date" value={formData.cutoff_date} onChange={e => handleFormChange('cutoff_date', e.target.value)} className="input-field" disabled={!isOwner}/><input type="time" value={formData.cutoff_time} onChange={e => handleFormChange('cutoff_time', e.target.value)} className="input-field" disabled={!isOwner}/></div>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div><label className="input-label text-red-400">เลขปิดรับ</label><textarea value={formData.closed_numbers} onChange={e => handleFormChange('closed_numbers', e.target.value)} rows={2} className="input-textarea" placeholder="คั่นด้วยเว้นวรรค"/></div>
                                                                <div><label className="input-label text-orange-400">เลขจ่ายครึ่ง</label><textarea value={formData.half_pay_numbers} onChange={e => handleFormChange('half_pay_numbers', e.target.value)} rows={2} className="input-textarea" placeholder="คั่นด้วยเว้นวรรค"/></div>
                                                            </div>
                                                            <div className="pt-4 border-t border-gray-700"><h4 className="font-semibold text-cyan-400 mb-3">ตั้งค่าลิมิตการซื้อ</h4>
                                                                <div className="mb-4 p-3 bg-gray-800/60 rounded-lg"><label className="block text-sm font-medium text-gray-300 mb-1">ยอดซื้อสูงสุดของเลขที่ไม่ได้ระบุ</label>
                                                                    <div className="flex items-center gap-4">
                                                                        <input 
                                                                            type="text" 
                                                                            inputMode="numeric"
                                                                            value={defaultLimit} 
                                                                            onChange={e => handleIntegerInputChange(e.target.value, setDefaultLimit)} 
                                                                            className="input-field w-40"
                                                                            disabled={!isOwner}
                                                                        />
                                                                        {defaultLimit === '0' && <span className="text-green-400 font-bold italic">"ไม่จำกัด"</span>}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 mt-1">ใส่ 0 เพื่อไม่จำกัดยอดซื้อสำหรับเลขทั่วไป</p>
                                                                </div> 
                                                                <div className="space-y-2">
                                                                <label className="block text-sm font-medium text-gray-300">ยอดซื้อสูงสุดสำหรับช่วงตัวเลข (กฎพิเศษ)</label>
                                                                {rangeLimits.map((limit, index) => {
                                                                    const startLen = limit.range_start.length;
                                                                    const isEndDisabled = !startLen;
                                                                    const isInvalidRange = startLen > 0 && limit.range_end.length > 0 && parseInt(limit.range_end) < parseInt(limit.range_start);
                                                                    return (
                                                                    <div key={index} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-gray-800/60 rounded-md transition-all ${isInvalidRange ? 'ring-2 ring-red-500' : 'ring-1 ring-gray-700'}`}>
                                                                        <div className="flex w-full items-center gap-2">
                                                                        <input 
                                                                            type="text" 
                                                                            placeholder="ตั้งแต่เลข" 
                                                                            value={limit.range_start} 
                                                                            onChange={e => handleRangeLimitChange(index, 'range_start', e.target.value)} 
                                                                            className="input-field w-full"
                                                                            disabled={!isOwner}
                                                                        />
                                                                        <span className="text-gray-500">-</span>
                                                                        <input 
                                                                            type="text" 
                                                                            placeholder="ถึงเลขที่" 
                                                                            value={limit.range_end} 
                                                                            onChange={e => handleRangeLimitChange(index, 'range_end', e.target.value)} 
                                                                            className="input-field w-full" 
                                                                            disabled={!isOwner || isEndDisabled}
                                                                        />
                                                                        </div>
                                                                        <input 
                                                                        type="text" 
                                                                        placeholder="ยอดสูงสุด (บาท)" 
                                                                        value={limit.max_amount} 
                                                                        onChange={e => handleRangeLimitChange(index, 'max_amount', e.target.value)} 
                                                                        className="input-field w-full sm:w-auto"
                                                                        disabled={!isOwner}
                                                                        />

                                                                         <select
                                                                            value={limit.number_limit_types}
                                                                            onChange={e => handleRangeLimitChange(index, 'number_limit_types', e.target.value)}
                                                                            className="input-field w-full sm:w-auto"
                                                                            disabled={!isOwner}
                                                                        >
                                                                            <option value="ทั้งหมด">ทั้งหมด</option>
                                                                            {startLen >= 3 ? (
                                                                                <>
                                                                                    <option value="ตรง">ตรง</option>
                                                                                    <option value="โต๊ด">โต๊ด</option>
                                                                                    <option value="ล่าง">ล่าง</option>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <option value="บน">บน</option>
                                                                                    <option value="ล่าง">ล่าง</option>
                                                                                </>
                                                                            )}
                                                                        </select>

                                                                        <div className="flex w-full items-center sm:w-auto">
                                                                        {startLen > 0 && <span className="text-xs text-gray-400 whitespace-nowrap">{getNumberTypeLabel(limit.range_start)}</span>}
                                                                        <button onClick={() => handleRemoveRangeLimit(index)} className="btn-icon-danger ml-auto">
                                                                            <XCircleIcon className="h-5 w-5"/>
                                                                        </button>
                                                                        </div>
                                                                    </div>
                                                                    )
                                                                })}
                                                                </div>
                                                                {rangeLimits.some(l => l.range_start && l.range_end && parseInt(l.range_end) < parseInt(l.range_start)) && <p className="text-xs text-red-400 mt-2">ตรวจพบช่วงตัวเลขไม่ถูกต้อง</p>}
                                                                {rangeLimits.some(l => !l.range_start) && <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><InformationCircleIcon className="h-4 w-4"/>ช่อง 'ถึงเลขที่' จะเปิดให้กรอกเมื่อใส่ 'ตั้งแต่เลข'</p>}
                                                                <button onClick={handleAddRangeLimit} className="btn-add-rule mt-3" disabled={!isOwner}><PlusIcon className="h-4 w-4 mr-1"/> เพิ่มกฎแบบช่วง</button>
                                                            </div>
                                                            
                                                            <div className="pt-4 border-t border-gray-700">
                                                            <h4 className="font-semibold text-cyan-400 mb-3">ตั้งค่าข้อยกเว้น (ไม่ต้องตรวจสอบลิมิต)</h4>
                                                            <div className="space-y-3">
                                                                {exemptions.map((ex, index) => (
                                                                    <div key={index} className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center gap-3 p-2 bg-gray-800/60 rounded-md border border-gray-700">
                                                                        <select 
                                                                            value={ex.exemption_type} 
                                                                            onChange={e => handleExemptionChange(index, 'exemption_type', e.target.value)} 
                                                                            className="input-field w-full sm:w-32 py-1.5"
                                                                            disabled={!isOwner}
                                                                        >
                                                                            <option value="user">รายบุคคล</option>
                                                                            <option value="role">ทั้งยศ</option>
                                                                        </select>
                                                                        
                                                                        {ex.exemption_type === 'user' ? (
                                                                            <select 
                                                                                value={ex.user_id ?? ''} 
                                                                                onChange={e => handleExemptionChange(index, 'user_id', e.target.value)} 
                                                                                className="input-field w-full py-1.5"
                                                                                disabled={!isOwner}
                                                                            >
                                                                                <option value="" disabled>-- เลือกผู้ใช้ --</option>
                                                                                {allUsers
                                                                                    .filter(user => user.id === ex.user_id || !exemptions.some(e => e.user_id === user.id))
                                                                                    .map(user => <option key={user.id} value={user.id}>{user.username}</option>)
                                                                                }
                                                                            </select>
                                                                        ) : (
                                                                            <select 
                                                                                value={ex.user_role ?? ''} 
                                                                                onChange={e => handleExemptionChange(index, 'user_role', e.target.value)} 
                                                                                className="input-field w-full py-1.5"
                                                                            >
                                                                                <option value="" disabled>-- เลือกยศ --</option>
                                                                                <option value="user">User</option>
                                                                                <option value="admin">Admin</option>
                                                                                <option value="owner">Owner</option>
                                                                            </select>
                                                                        )}
                                                                        <button onClick={() => handleRemoveExemption(index)} className="btn-icon-danger self-end sm:self-center">
                                                                            <XCircleIcon className="h-5 w-5"/>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <button onClick={handleAddExemption} className="btn-add-rule mt-4" disabled={!isOwner}>
                                                                <PlusIcon className="h-4 w-4 mr-1"/> เพิ่มข้อยกเว้น
                                                            </button>
                                                            </div>
                                                            <div className='flex justify-end gap-2'><button onClick={handleCancelEdit} className="btn-secondary"><XCircleIcon className="h-5 w-5"/><span>ยกเลิก</span></button><button onClick={() => handleSave(round.id)} disabled={isSaving === round.id} className="btn-primary"><CheckCircleIcon className="h-5 w-5"/><span>{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</span></button></div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="flex justify-between items-start">
                                                                <div><p className="font-semibold text-gray-300">งวดวันที่: {new Date(round.cutoff_datetime).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })} น. (UTC)</p></div>
                                                                <div className="flex items-center gap-2">{round.status === 'manual_active' && <span className="badge-yellow">MANUAL</span>}<button onClick={() => handleStartEdit(round)} className="btn-icon-edit"><PencilSquareIcon className="h-5 w-5" /></button></div>
                                                            </div>
                                                            <div className="mt-4 pt-4 border-t border-gray-700/60">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">เลขปิดรับ</h3>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {(round.closed_numbers?.length ?? 0) > 0 ? round.closed_numbers?.map(n => <span key={n} className="badge-red">{n}</span>) : <span className="text-sm text-gray-500 italic">ไม่มี</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">เลขจ่ายครึ่ง</h3>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {(round.half_pay_numbers?.length ?? 0) > 0 ? round.half_pay_numbers?.map(n => <span key={n} className="badge-orange">{n}</span>) : <span className="text-sm text-gray-500 italic">ไม่มี</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {renderLimitDisplay(round)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style>{`
                .input-label { display: block; font-size: 0.75rem; font-weight: 500; color: #9CA3AF; margin-bottom: 0.25rem; }
                .input-field { background-color: #1F2937; border: 1px solid #4B5563; border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: white; width: 100%; color-scheme: dark; font-size: 0.875rem; }
                .input-field:focus, .input-textarea:focus { outline: none; border-color: #06B6D4; box-shadow: 0 0 0 1px #06B6D4; }
                .input-field:disabled { background-color: #374151; cursor: not-allowed; opacity: 0.5; }
                .input-textarea { width: 100%; padding: 0.5rem 0.75rem; background-color: #1F2937; border: 1px solid #4B5563; border-radius: 0.375rem; font-family: monospace; font-size: 0.875rem; color: white; }
                .btn-primary, .btn-secondary, .btn-add-rule, .btn-icon-danger, .btn-icon-edit { display: inline-flex; align-items: center; justify-content: center; border-radius: 0.375rem; font-weight: 600; font-size: 0.875rem; transition: all 0.2s; }
                .btn-primary { padding: 0.5rem 1rem; background-color: #0891B2; color: white; }
                .btn-primary:hover { background-color: #06B6D4; }
                .btn-primary:disabled { background-color: #4B5563; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #4B5563; color: white; }
                .btn-secondary:hover { background-color: #6B7280; }
                .btn-add-rule { padding: 0.25rem 0.75rem; background-color: #164E63; color: #67E8F9; }
                .btn-add-rule:hover { background-color: #155E75; }
                .btn-icon-danger { padding: 0.5rem; background-color: transparent; color: #9CA3AF; }
                .btn-icon-danger:hover { background-color: #4B5563; color: #F87171; }
                .btn-icon-edit { padding: 0.5rem; background-color: transparent; color: #9CA3AF; }
                .btn-icon-edit:hover { background-color: #4B5563; color: #FBBF24; }
                .badge-yellow, .badge-red, .badge-orange { font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 9999px; }
                .badge-yellow { color: #FBBF24; background-color: rgba(251, 191, 36, 0.1); }
                .badge-red { color: #F87171; background-color: rgba(248, 113, 113, 0.1); }
                .badge-orange { color: #FB923C; background-color: rgba(251, 146, 60, 0.1); }
            `}</style>
        </div>
    );
};

export default ManagementLottoRoundsPage;




