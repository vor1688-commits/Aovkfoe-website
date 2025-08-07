import React, { useState, useEffect, type JSX } from 'react';
import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext'; // 1. Import useAuth

// --- Import คอมโพเนนต์และหน้าต่างๆ ---
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import HomePage from './pages/HomePage';
import LottoList from './pages/LottoList';
import LottoFormPage from './pages/LottoFormPage';
import PrizeCheckPage from './pages/PrizeCheckPage'; 
import LoginPage from './pages/LoginPage'; // 2. Import หน้า Login 
import UserManagementPage from "./pages/UserManagementPage";
import HowtoPage from './pages/HowtoPage';
import AdminLottoTypesPage from './pages/AdminLottoPage';
import AccountPage from './pages/AccountPage';  

// --- 3. สร้างตัวป้องกันเส้นทาง (ProtectedRoute) ---

interface RequireRoleProps {
  allowedRole: 'owner' | 'admin';
  children: JSX.Element
}


const ProtectedRoute = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // ถ้ายังไม่ Login ให้กลับไปหน้า Login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  // ถ้า Login แล้ว ให้แสดงเนื้อหาข้างใน
  return <Outlet />;
};

const RequireRole: React.FC<RequireRoleProps> = ({ allowedRole, children }) => {
  const { user } = useAuth();
  const location = useLocation();

  const allowedRoles: string[] = ['owner', 'admin']; 
  // ProtectedRoute ได้กรองคนไม่มี user ออกไปแล้ว
  // ที่นี่เราจะกรองคนที่มี user แต่ "สิทธิ์ไม่ถึง"
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/home" state={{ from: location }} replace />;
  }

  // ถ้าสิทธิ์ถูกต้อง ให้แสดงผล Component ลูก
  return children;
};

// --- Layout Component: โครงสร้างหลักที่ประกอบด้วย Navbar, Sidebar ---
const AppLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // แก้ไขเล็กน้อย: เมื่อจอใหญ่ ให้ Sidebar แสดงผลถาวร (จัดการด้วย CSS)
  // State นี้จะใช้สำหรับควบคุมการเปิด/ปิดบนจอมือถือเท่านั้น
  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Navbar onMenuClick={toggleSidebar} />
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="transition-all duration-300 ease-in-out lg:ml-64">
        <div className="pt-16">
          <main className="p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

// --- App Component: ตัวกำหนด Routes ทั้งหมด ---
const App: React.FC = () => {

  const { user } = useAuth(); 

  return ( 
    <Routes>
      {/* --- 4. กำหนดเส้นทาง Public (ไม่ต้อง Login) --- */}
      <Route path="/login" element={<LoginPage />} />

      {/* --- 5. กำหนดเส้นทาง Private (ต้อง Login) --- */}
      <Route element={<ProtectedRoute />}>
        {/* ทุกหน้าที่อยู่ข้างในนี้ จะถูกครอบด้วย AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/lotto" element={<LottoList />} />
          <Route path="/lotto/:lottoId" element={<LottoFormPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="/check" element={<PrizeCheckPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="howto" element={<HowtoPage />} />
          <Route 
            path="admin-editor" 
            element={
              <RequireRole allowedRole="owner">
                <AdminLottoTypesPage />
              </RequireRole>
            } 
          />
          {/* เพิ่มหน้าอื่นๆ ที่ต้อง Login ได้ที่นี่ */}
          
          {/* Redirect จาก path หลัก "/" ไปที่ "/home" */}
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Route>
      </Route>

      {/* Route สำหรับ 404 Not Found */}
      <Route path="*" element={<div><h1>404 - ไม่พบหน้านี้</h1><p>กรุณาตรวจสอบ URL</p></div>} />
    </Routes>  
  );
};

export default App;