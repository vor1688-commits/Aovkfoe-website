import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const AdminLayout: React.FC = () => {
  // Style สำหรับ NavLink ที่ Active อยู่
  const activeLinkStyle = {
    backgroundColor: '#4f46e5', // bg-indigo-600
    color: 'white',
  };

  return (
    <div className="flex flex-col md:flex-row bg-gray-100 min-h-screen">
      {/* Sidebar ของ Admin */}
      <aside className="w-full md:w-64 bg-gray-800 text-white flex-shrink-0">
        <div className="p-4 text-2xl font-bold border-b border-gray-700">
          Admin Panel
        </div>
        <nav className="p-2 space-y-1">
          <NavLink 
            to="/admin/users" 
            className="block px-4 py-2 rounded-md hover:bg-gray-700"
            style={({ isActive }) => isActive ? activeLinkStyle : undefined}
          >
            จัดการผู้ใช้งาน
          </NavLink>
          <NavLink 
            to="/admin/rounds" 
            className="block px-4 py-2 rounded-md hover:bg-gray-700"
            style={({ isActive }) => isActive ? activeLinkStyle : undefined}
          >
            จัดการงวดหวย
          </NavLink>
        </nav>
      </aside>

      {/* พื้นที่แสดงผลของแต่ละหน้า */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet /> {/* <-- หน้าลูก (Users, Rounds) จะมาแสดงผลตรงนี้ */}
      </main>
    </div>
  );
};

export default AdminLayout;