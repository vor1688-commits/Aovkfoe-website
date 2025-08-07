import React, { useState, useEffect } from 'react'; 
import { PencilIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from './Modal';
import api from '../api/axiosConfig';
 

// --- Interfaces ---
interface SpecialNumbers {
    closed_numbers: string[];
    half_pay_numbers: string[];
}

interface SpecialNumbersCardProps {
    lottoId: string | undefined;
    specialNumbers: SpecialNumbers | null;
    onUpdate: () => void;
}

// --- Helper Function ---
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

// --- Main Component ---
const SpecialNumbersCard: React.FC<SpecialNumbersCardProps> = ({ lottoId, specialNumbers, onUpdate }) => {
     const { alert, confirm, showStatus, hideStatus } = useModal();

    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [closedInput, setClosedInput] = useState('');
    const [halfPayInput, setHalfPayInput] = useState('');
    
    useEffect(() => {
        if (specialNumbers) {
            setClosedInput(specialNumbers.closed_numbers.join(', '));
            setHalfPayInput(specialNumbers.half_pay_numbers.join(', '));
        }
    }, [specialNumbers]);

    const handleEdit = () => setIsEditing(true);

    const handleCancel = () => {
        setIsEditing(false);
        if (specialNumbers) {
            setClosedInput(specialNumbers.closed_numbers.join(', '));
            setHalfPayInput(specialNumbers.half_pay_numbers.join(', '));
        }
    };

    const handleSave = async () => {
        showStatus("loading", "กำลังอัปเดต", '');
        if (!lottoId) return;
        const closed_numbers = closedInput.split(/[, ]+/).map(n => n.trim()).filter(Boolean);
        const half_pay_numbers = halfPayInput.split(/[, ]+/).map(n => n.trim()).filter(Boolean);
        try { 
            await api.put(`/api/lotto-rounds/update-number-special/${lottoId}`, { 
                closed_numbers, 
                half_pay_numbers 
            });
            
            setIsEditing(false);
            onUpdate();  
            showStatus("success", "สำเร็จ", "อัปเดตเลขปิดรับและจ่ายครึ่งเรียบร้อย");

        } catch (err: any) { 
            console.error("Failed to update special numbers:", err);
            showStatus("error", "เกิดข้อผิดพลาด", err.response?.data?.error || "ไม่สามารถอัปเดตข้อมูลได้");
        }
    };

    if (!specialNumbers) {
        return <div className="p-4 bg-gray-800 rounded-xl text-center text-gray-400">กำลังโหลดเลขพิเศษ...</div>;
    }

    return (
        <div className="w-full md:w-96 flex-shrink-0 bg-black text-white rounded-2xl shadow-lg border border-gray-700/50">
            {/* --- Header --- */}
            <div className="p-4 flex justify-between items-center border-b border-gray-700/50">
                <h3 className="text-lg font-bold">จัดการเลขพิเศษ</h3>
                {(user?.role === 'owner' || user?.role === 'admin') && (
                    !isEditing ? (
                        <button onClick={handleEdit} className="p-2 rounded-full hover:bg-white/10 text-gray-400" title="แก้ไข">
                            <PencilIcon className="h-5 w-5" />
                        </button>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <button onClick={handleSave} className="p-2 rounded-full text-green-400 hover:bg-green-500/20" title="บันทึก">
                                <CheckCircleIcon className="h-6 w-6" />
                            </button>
                            <button onClick={handleCancel} className="p-2 rounded-full text-red-400 hover:bg-red-500/20" title="ยกเลิก">
                                <XCircleIcon className="h-6 w-6" />
                            </button>
                        </div>
                    )
                )}
            </div>

            {/* --- Content --- */}
            <div className="p-4 space-y-4">
                <div>
                    <h4 className="font-semibold text-red-400 text-sm mb-2 tracking-wider">เลขปิดรับ</h4>
                    {isEditing ? (
                        <textarea 
                            value={closedInput}
                            onChange={(e) => setClosedInput(handleNumericArrayInputChange(e.target.value, 3))}
                            className="input-textarea"
                            rows={4}
                            placeholder="ใส่เลข คั่นด้วย , หรือเว้นวรรค"
                        />
                    ) : (
                        <div className="p-3 bg-gray-800 rounded-lg min-h-[96px] flex flex-wrap gap-x-3 gap-y-1 font-mono text-base text-cyan-300 font-bold">
                            {specialNumbers.closed_numbers.length > 0 
                                ? specialNumbers.closed_numbers.map((num, index) => <span key={`closed-${index}`}>{num}</span>) 
                                : <span className="text-gray-500 text-sm italic">ไม่มี</span>
                            }
                        </div>
                    )}
                </div>
                <div>
                    <h4 className="font-semibold text-orange-400 text-sm mb-2 tracking-wider">เลขจ่ายครึ่ง</h4>
                     {isEditing ? (
                        <textarea 
                            value={halfPayInput}
                            onChange={(e) => setHalfPayInput(handleNumericArrayInputChange(e.target.value, 3))}
                            className="input-textarea "
                            rows={4}
                            placeholder="ใส่เลข คั่นด้วย , หรือเว้นวรรค"
                        />
                    ) : (
                        <div className="p-3 bg-gray-800 rounded-lg min-h-[96px] flex flex-wrap gap-x-3 gap-y-1 font-mono text-base text-cyan-300 font-bold">
                           {specialNumbers.half_pay_numbers.length > 0 
                                ? specialNumbers.half_pay_numbers.map((num, index) => <span key={`half-${index}`}>{num}</span>) 
                                : <span className="text-gray-500 text-sm italic">ไม่มี</span>
                            }
                        </div>
                    )}
                </div>
            </div>
            {/* --- CSS-in-JS for styling input --- */}
            <style>{`
                .input-textarea { 
                    width: 100%; 
                    padding: 0.75rem; 
                    background-color: #1F2937; 
                    border: 1px solid #4B5563; 
                    border-radius: 0.5rem; 
                    font-family: monospace; 
                    font-size: 0.875rem; 
                    color: white; 
                    transition: border-color 0.2s; 
                    resize: vertical;
                }
                .input-textarea:focus { 
                    outline: none; 
                    border-color: #2563EB; 
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
                }
            `}</style>
        </div>
    );
};

export default SpecialNumbersCard;