import React, { useState, useEffect } from 'react';
import { type User } from '../../types';

// Interface User ควรจะอยู่ในไฟล์กลางที่ import มาใช้ได้ 
interface UserListItemProps {
  user: User;
  onSave: (id: number, data: { username: string; role: User['role'] }) => void;
  isSaving: boolean;
}

const UserListItem: React.FC<UserListItemProps> = ({ user, onSave, isSaving }) => {
  const [formData, setFormData] = useState({ username: user.username, role: user.role });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Reset form ถ้าข้อมูล user จากแม่เปลี่ยน
    setFormData({ username: user.username, role: user.role });
    setIsDirty(false);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true); // ตั้งค่าว่ามีการเปลี่ยนแปลงแล้ว
  };

  const handleSave = () => {
    onSave(user.id, formData);
  };

  const handleReset = () => {
    setFormData({ username: user.username, role: user.role });
    setIsDirty(false);
  };

  return (
    <div className="bg-gray-800 text-white rounded-xl shadow-md p-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* ID & Username */}
        <div className="md:col-span-1">
          <label className="text-xs text-gray-400">Username (ID: {user.id})</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-lg"
          />
        </div>
        
        {/* Role */}
        <div className="md:col-span-1">
          <label className="text-xs text-gray-400">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-lg"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
        </div>
        
        {/* Password */}
        <div className="md:col-span-1">
          <label className="text-xs text-gray-400">Password</label>
           <button className="w-full text-center mt-1 p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">
              Reset Password
            </button>
        </div>

        {/* Actions */}
        <div className="md:col-span-1 flex items-end justify-end h-full">
          {isDirty && ( // <-- ปุ่มจะแสดงก็ต่อเมื่อมีการแก้ไข (isDirty = true)
            <div className="flex space-x-2">
              <button onClick={handleReset} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-sm">
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-sm disabled:bg-gray-500">
                {isSaving ? '...' : 'บันทึก'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserListItem;