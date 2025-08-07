import React, { useState, useEffect, useCallback } from 'react'; 
import { type User } from '../types'; 
import ConfirmationModal from '../components/ConfirmationModal';
import { FullScreenLoader } from '../components/LoadingScreen';
import { useModal } from '../components/Modal';
import api from '../api/axiosConfig';

const AddUserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}> = ({ isOpen, onClose, onSave }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('user');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { alert, confirm, showStatus, hideStatus } = useModal();

    useEffect(() => {
        if (isOpen) {
            setUsername('');
            setPassword('');
            setConfirmPassword('');
            setRole('user');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!username || !password || !confirmPassword) {
            setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
            return;
        }
        if (password !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }
        if (password.length < 6) {
            setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }
        
        setIsSaving(true);
        setError('');
        try {
            await onSave({ username, password, role });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div className="bg-gray-800 text-white rounded-xl shadow-lg p-6 w-full max-w-sm m-4">
                <h3 className="text-xl font-bold mb-4">เพิ่มผู้ใช้ใหม่</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} 
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">รหัสผ่าน</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">ยืนยันรหัสผ่าน</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                         <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg">
                            <option value="user">ผู้ใช้งานทั่วไป</option>
                            <option value="admin">แอดมิน</option>
                            <option value="owner">ผู้ดูแลสูงสุด</option>
                        </select>
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">ยกเลิก</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold disabled:bg-gray-500">
                        {isSaving ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ========================================================================
// Component: Modal สำหรับรีเซ็ตรหัสผ่าน
// ========================================================================
const ResetPasswordModal: React.FC<{
    user: User | null;
    onClose: () => void;
    onSave: (userId: number, newPassword: string) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setNewPassword('');
            setConfirmPassword('');
            setError('');
        }
    }, [user]);

    if (!user) return null;

    const handleSave = async () => {
        if (!newPassword || !confirmPassword) {
            setError('กรุณากรอกรหัสผ่านทั้งสองช่อง');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }
        if (newPassword.length < 6) {
            setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }
        
        setIsSaving(true);
        setError('');
        try {
            await onSave(user.id, newPassword);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div className="bg-gray-800 text-white rounded-xl shadow-lg p-6 w-full max-w-sm m-4">
                <h3 className="text-xl font-bold mb-4">รีเซ็ตรหัสผ่านสำหรับ "{user.username}"</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">รหัสผ่านใหม่</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">ยืนยันรหัสผ่านใหม่</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg"/>
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold">ยกเลิก</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold disabled:bg-gray-500">
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ========================================================================
// Component: ส่วนฟอร์มแก้ไขรายการผู้ใช้
// ========================================================================
const UserListItemForm: React.FC<{
    user: User;
    onSave: (id: number, data: any) => void;
    isSaving: boolean;
    onResetPassword: (user: User) => void;
    onDelete: (user: User) => void;
}> = ({ user, onSave, isSaving, onResetPassword, onDelete }) => {
    const [formData, setFormData] = useState({ username: user.username, role: user.role });
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setFormData({ username: user.username, role: user.role });
        setIsDirty(false);
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const filteredValue = name === 'username' ? value.replace(/[^a-zA-Z0-9]/g, '') : value;
        setFormData(prev => ({ ...prev, [name]: filteredValue }));
        setIsDirty(true);
    };
    
    const handleSave = () => onSave(user.id, formData);
    
    const handleReset = () => {
        setFormData({ username: user.username, role: user.role });
        setIsDirty(false);
    };
    
    return (
        <div className="bg-gray-800 rounded-xl shadow-md p-4 w-full border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-x-4 gap-y-2 items-end">
                <div className="md:col-span-1">
                    <label className="text-xs text-gray-400">Username (ID: {user.id})</label>
                    <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-900 border border-gray-600 rounded-lg"/>
                </div>
                <div className="md:col-span-1">
                    <label className="text-xs text-gray-400">Role</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-900 border border-gray-600 rounded-lg">
                        <option value="user">ผู้ใช้งานทั่วไป</option>
                        <option value="admin">แอดมิน</option>
                        <option value="owner">ผู้ดูแลสูงสุด</option>
                    </select>
                </div>
                <div className="md:col-span-1">
                    <label className="text-xs text-gray-400">Password</label>
                    <button 
                        onClick={() => onResetPassword(user)}
                        className="w-full text-center mt-1 p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm"
                    >
                        Reset Password
                    </button>
                </div>
                <div className="md:col-span-2 flex items-end justify-end h-full space-x-2">
                    { isDirty ? (
                        <>
                            <button onClick={handleReset} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-sm">ยกเลิก</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-sm disabled:bg-gray-500">
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => onDelete(user)} 
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold text-sm"
                        >
                            ลบ
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
 
const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const { alert, confirm, showStatus, hideStatus } = useModal();
    
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; data: any | null; }>({ isOpen: false, data: null });
    const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/users');
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            alert("พบข้อผิดพลาดจากเซิฟเวอร์ โปรดตรวจสอบเซิฟเวอร์", "" ,"light");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenConfirmModal = (id: number, data: any) => {
        setConfirmModal({ isOpen: true, data: { id, ...data } });
    };

    const handleConfirmSave = async () => {
    if (!confirmModal.data) return;
    setIsSaving(true);
    const { id, ...payload } = confirmModal.data;
    try {
        // ใช้ api.put แทน axios.put
        await api.put(`/api/users/${id}`, payload);
        
        await fetchUsers();
        
        showStatus('success', 'สำเร็จ', 'บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว');

    } catch (error: any) {
        console.error("Failed to save user:", error);
        alert("ผิดพลาด", error.response?.data?.error || "ไม่สามารถบันทึกข้อมูลได้", "warning");
    } finally {
        setIsSaving(false);
        setConfirmModal({ isOpen: false, data: null });
    }
};
    
    const handleConfirmResetPassword = async (userId: number, newPassword: string) => {
    try { 
        await api.put(`/api/users/${userId}/reset-password`, { newPassword });
        
        showStatus('success', 'สำเร็จ', `รีเซ็ตรหัสผ่านสำหรับ user ID: ${userId} เรียบร้อย`);
        setUserToResetPassword(null);

    } catch (error: any) {
        console.error("Failed to reset password", error);
        alert("ผิดพลาด", error.response?.data?.error || "ไม่สามารถรีเซ็ตรหัสผ่านได้", "warning");
    }
};

     const handleCreateUser = async (newUserData: any) => {
        try {
            // 5. เปลี่ยนมาใช้ api.post
            await api.post(`/api/register`, newUserData);
            await fetchUsers();
            showStatus('success', 'สำเร็จ', `สร้างผู้ใช้ "${newUserData.username}" เรียบร้อยแล้ว`);
            setIsAddUserModalOpen(false);
        } catch (error: any) {
            alert("ผิดพลาด", error.response?.data?.error || "ไม่สามารถสร้างผู้ใช้ได้", "warning");
        }
    };
    
    const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
        // ใช้ api.delete แทน axios.delete
        const response = await api.delete(`/api/users/${userToDelete.id}`);
        
        await fetchUsers(); // Re-fetch data
        
        // ใช้ message จาก API เพื่อแสดงผลที่ชัดเจนขึ้น
        alert("สำเร็จ", response.data.message || `ลบผู้ใช้ "${userToDelete.username}" สำเร็จ!`, "dark", false);

    } catch (error: any) {
        // Interceptor จะจัดการ Error 401/403
        // ส่วนนี้จะจัดการ Error อื่นๆ ที่ API อาจส่งกลับมา
        console.error("Failed to delete user:", error);
        alert("ผิดพลาด", error.response?.data?.error || "ไม่สามารถลบผู้ใช้ได้", "warning");
    } finally {
        setUserToDelete(null);
    }
};

    return (
        <div className="bg-gray-950 p-0 text-white rounded-xl"> 
            <div className="bg-gray-900 rounded-xl shadow-md overflow-hidden border border-gray-700">
                <button 
                    onClick={() => setIsExpanded(prev => !prev)} 
                    className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-700 focus:outline-none"
                >
                    <h2 className="text-xl font-bold">จัดการเกี่ยวกับบัญชี</h2>
                    <svg className={`w-6 h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                
                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                        <div className="p-4 border-t border-gray-700">
                            <div className="mb-4 flex justify-end">
                                <button
                                    onClick={() => setIsAddUserModalOpen(true)}
                                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg font-semibold"
                                >
                                    + เพิ่มผู้ใช้ใหม่
                                </button>
                            </div>
                            {isLoading ? (
                                <FullScreenLoader isLoading={isLoading} text="กำลังโหลดข้อมูลผู้ใช้งาน..."/>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {users.map(user => (
                                        <UserListItemForm
                                            key={user.id}
                                            user={user}
                                            onSave={handleOpenConfirmModal}
                                            isSaving={isSaving && confirmModal.data?.id === user.id}
                                            onResetPassword={setUserToResetPassword}
                                            onDelete={setUserToDelete}   
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Modals --- */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title="ยืนยันการบันทึก"
                message={`คุณต้องการบันทึกการเปลี่ยนแปลงสำหรับผู้ใช้ "${confirmModal.data?.username}" ใช่หรือไม่?`}
                onConfirm={handleConfirmSave}
                onCancel={() => setConfirmModal({ isOpen: false, data: null })}
                confirmButtonText="ยืนยัน"
            />
            
            <ConfirmationModal
                isOpen={!!userToDelete}
                title="ยืนยันการลบ"
                message={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${userToDelete?.username}"? การลบผู้ใช้นี้จะลบบิลทุกบิลที่ผู้ใช้คนนี้เป็นคนบันทึกทั้งหมดออกจากฐานข้อมูล การกระทำนี้ไม่สามารถย้อนกลับได้`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setUserToDelete(null)}
                confirmButtonText="ยืนยันการลบ"
                confirmButtonClassName="bg-red-600 hover:bg-red-500"
            />

            <AddUserModal 
                isOpen={isAddUserModalOpen}
                onClose={() => setIsAddUserModalOpen(false)}
                onSave={handleCreateUser}
            />
            
            <ResetPasswordModal
                user={userToResetPassword}
                onClose={() => setUserToResetPassword(null)}
                onSave={handleConfirmResetPassword}
            />
        </div>
    );
};

export default UserManagementPage;