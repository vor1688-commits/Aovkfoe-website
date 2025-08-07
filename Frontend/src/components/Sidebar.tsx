import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import LogoMaharuay from '../assets/media/logos/Logo-Maharuay-gold.png';
import { useAuth } from '../contexts/AuthContext';

// --- ไอคอน SVG (เหมือนเดิม) ---
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 22 21"><path d="M16.975 11H10V4.025a1 1 0 0 0-1.066-.998 8.5 8.5 0 1 0 9.039 9.039.999.999 0 0 0-1-1.066h.002Z" /><path d="M12.5 0c-.157 0-.311.01-.565.027A1 1 0 0 0 11 1.026V10h8.975a1 1 0 0 0 1-.935c.013-.188.028-.374.028-.565A8.51 8.51 0 0 0 12.5 0Z" /></svg>
);
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18"><path d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-2a6.957 6.957 0 0 1 1.264-3H1a1 1 0 0 1 0-2h1v-2a4 4 0 0 1 4-4h2.536A4 4 0 0 1 12 2V0h.032a1 1 0 0 1 .992.875C13.49 2.165 14 3.25 14 4.5V8h1a1 1 0 0 1 0 2Z" /></svg>
);
const ProductsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 20"><path d="M17 5.923A1 1 0 0 0 16 5h-3V4a4 4 0 1 0-8 0v1H2a1 1 0 0 0-1 .923L.086 17.846A2 2 0 0 0 2.08 20h13.84a2 2 0 0 0 1.994-2.154L17 5.923ZM7 9a1 1 0 0 1-2 0V7h2v2Zm4 0a1 1 0 0 1-2 0V7h2v2Zm4 0a1 1 0 0 1-2 0V7h2v2Z"/></svg>
);
const BrandLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path></svg>
);

const SettingIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.48.398.668 1.03.26 1.431l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.333.183-.582.495-.645.87l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 0 1-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.37-.49l-1.296-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 0 1-.26-1.431l1.296-2.247a1.125 1.125 0 0 1 1.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.87l.213-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);

const BanknoteIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign-icon lucide-dollar-sign"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);

const TrophyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy-icon lucide-trophy"><path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/></svg>
);

const BookOpenIcon = (props: React.SVGProps<SVGSVGElement>) => (
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open-icon lucide-book-open"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>
);

const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
);



interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => { 

    const {user} = useAuth();

    const location = useLocation(); // Hook เพื่อดู path ปัจจุบัน

    const baseLinkClass = "flex items-center p-2 rounded-lg text-white hover:bg-yellow-300 group";
    const activeLinkClass = "bg-yellow-300"; // Class สำหรับเมนูที่ถูกเลือก

    // ฟังก์ชันสำหรับสร้าง Link เพื่อลดการเขียนโค้ดซ้ำ
    const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
        <li>
            <Link
                to={to}
                onClick={onClose} // เมื่อคลิกให้ปิด Sidebar (สำหรับ mobile)
                className={`${baseLinkClass} ${location.pathname === to ? activeLinkClass : ''}`}
            >
                {icon}
                <span className="ms-3">{label}</span>
            </Link>
        </li>
    );

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={` fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 w-64 h-screen shadow-lg bg-black transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
                aria-label="Sidebar"
            >
                <div className="h-full px-3 py-4 overflow-y-auto">
                    
                    <div className="flex items-center justify-between mb-6">
                        <Link to="/home" className="flex justify-center w-full items-center">
                             <img src={LogoMaharuay} alt="Logo" className='w-60' />
                            {/* <BrandLogo className="w-8 h-8 text-blue-500" />
                            <span className="self-center text-2xl font-semibold whitespace-nowrap text-white">แบรนด์</span> */}
                        </Link>
                        <button onClick={onClose} className="p-2 text-gray-400 rounded-lg lg:hidden hover:bg-amber-300">
                            <span className="sr-only">Close sidebar</span>
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <ul className="space-y-2 font-medium"> 
                        <NavLink
                            to="/home"
                            label="หน้าหลัก"
                            icon={<HomeIcon className="w-5 h-5 text-gray-400 transition duration-75 group-hover:text-white" />}
                        />
                         <NavLink
                            to="/lotto"
                            label="รายการแทงหวย"
                            icon={<DashboardIcon className="w-5 h-5 text-gray-400 transition duration-75 group-hover:text-white" />}
                        />
                        <NavLink
                            to="/check"
                            label="ตรวจรางวัล"
                            icon={<TrophyIcon className="flex-shrink-0 w-5 h-5 text-gray-400 transition duration-75 group-hover:text-white" />}
                        />
                        <NavLink
                            to="/account"
                            label="บัญชีการเงิน"
                            icon={<BanknoteIcon className="flex-shrink-0 w-5 h-5 text-gray-400 transition duration-75 group-hover:text-white" />}
                        />
                        
                         {(user?.role === 'owner' || user?.role === 'admin') &&  
                         <NavLink
                            to="/admin-editor"
                            label={user.role === 'owner'? "จัดการข้อมูลทั้งหมด": "จัดการข้อมูลสำหรับแอดมิน"}
                            icon={<SettingIcon className="flex-shrink-0 w-5 h-5 text-gray-400 transition duration-75 group-hover:text-white" />}
                        />} 
                        <NavLink
                            to="/howto"
                            label="คู่มือการใช้งาน"
                            icon={<BookOpenIcon className="flex-shrink-0 w-5 h-5 text-gray-400 transition duration-75 group-hover:text-white" />}
                        />
                         {/* <NavLink
                            to="/users"
                            label="ทดสอบดึงข้อมูล"
                            icon={<ProductsIcon className="flex-shrink-0 w-5 h-5 text-gray-400 transition duration-75 group-hover:text-white" />}
                        />
                         <NavLink
                            to="/testlotto"
                            label="ทดสอบดึงข้อมูล 2"
                            icon={<ProductsIcon className="flex-shrink-0 w-5 h-5 text-gray-400 transition duration-75 group-hover:text-white" />}
                        /> */}
                    </ul>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;