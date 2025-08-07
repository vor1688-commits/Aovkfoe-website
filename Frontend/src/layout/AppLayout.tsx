import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // 1. Import useAuth

// --- Navbar Component ---
const Navbar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { user, logout } = useAuth(); // ดึงข้อมูล user และฟังก์ชัน logout

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 bg-white dark:bg-gray-800 shadow-md h-16 z-20">
      <div className="flex items-center justify-between h-full px-4">
        {/* Hamburger Menu for Mobile */}
        <button onClick={onMenuClick} className="lg:hidden text-gray-600 dark:text-gray-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
        </button>
        <div className="hidden lg:block"></div> {/* Spacer */}
        
        {/* แสดงข้อมูล User และปุ่ม Logout */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-gray-800 dark:text-white">
                สวัสดี, <strong>{user.username}</strong>
              </span>
              <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-3 rounded-lg">
                ออกจากระบบ
              </button>
            </>
          ) : (
            <span className="text-gray-800 dark:text-white">...</span>
          )}
        </div>
      </div>
    </header>
  );
};

// --- Sidebar Component ---
const Sidebar: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuth(); // ดึงข้อมูล user
  const location = useLocation();

  const navLinkClass = "flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors";
  const activeLinkClass = "bg-gray-700 font-bold text-white";
  
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
    `${navLinkClass} ${isActive ? activeLinkClass : ''}`;

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black opacity-50 z-30 lg:hidden"></div>}
      <aside className={`fixed top-0 left-0 w-64 h-full bg-gray-800 dark:bg-gray-900 text-white z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4">
          <h1 className="text-2xl font-bold">Maharuay</h1>
        </div>
        <nav className="p-4 space-y-2">
          <NavLink to="/home" className={getNavLinkClass} onClick={onClose}>หน้าหลัก</NavLink>
          <NavLink to="/lotto" className={getNavLinkClass} onClick={onClose}>รายการหวย</NavLink>
          <NavLink to="/account" className={getNavLinkClass} onClick={onClose}>บัญชีการเงิน</NavLink>
          <NavLink to="/check" className={getNavLinkClass} onClick={onClose}>ตรวจรางวัล</NavLink>
          <NavLink to="/howto" className={getNavLinkClass} onClick={onClose}>คู่มือ</NavLink>
          
          {/* แสดงเมนู Admin เฉพาะ role ที่กำหนด */}
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <NavLink to="/admin/users" className={getNavLinkClass} onClick={onClose}>
              จัดการข้อมูล (Admin)
            </NavLink>
          )}
        </nav>
      </aside>
    </>
  );
};

// --- Main AppLayout Component ---
const AppLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Navbar onMenuClick={toggleSidebar} />
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      
      <div className="transition-all duration-300 ease-in-out lg:ml-64">
        <div className="pt-16">
          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;