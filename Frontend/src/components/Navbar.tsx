import React, { useState, useEffect, useRef } from 'react';
import { Link} from 'react-router-dom';

import LogoMaharuay from '../assets/media/logos/Logo-Maharuay-gold.png';
import { useAuth } from '../contexts/AuthContext';

// --- ไอคอน SVG ที่ใช้ใน Navbar ---
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
);


// --- คอมโพเนนต์ Navbar ---
interface NavbarProps {
    onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {

    const { user, logout } = useAuth();
    // 1. สร้าง State เพื่อเก็บสถานะการเปิด/ปิดของ Dropdown
    const [isDropdownOpen, setDropdownOpen] = useState(false);

    // 2. สร้าง Ref สำหรับอ้างอิงถึง Element ของ Dropdown
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 3. ฟังก์ชันสำหรับสลับสถานะ (เปิด/ปิด)
    const toggleDropdown = () => {
        setDropdownOpen(!isDropdownOpen);
    };

    const handleLogout = () => {
        logout();
    }

    // 4. ใช้ useEffect เพื่อจัดการการคลิกนอก Dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // ถ้าคลิกนอกพื้นที่ของ dropdownRef ให้ปิด Dropdown
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        // เพิ่ม Event Listener เมื่อ Dropdown เปิด
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Cleanup: ลบ Event Listener ออกเมื่อ component ถูก unmount หรือ dropdown ปิด
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]); // ให้ Effect นี้ทำงานใหม่ทุกครั้งที่ isDropdownOpen เปลี่ยน

    return (
        <nav className="fixed top-0 z-20 w-full bg-black border-b dark:border-gray-700">
            <div className="px-3 py-3 lg:px-5 lg:pl-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center justify-start rtl:justify-end">
                        <button onClick={onMenuClick} aria-controls="sidebar" type="button" className="inline-flex items-center p-2 text-sm text-gray-400 rounded-lg lg:hidden hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600">
                            <span className="sr-only">Open sidebar</span>
                            <MenuIcon className="w-6 h-6" />
                        </button>
                        <Link to="/home" className="flex justify-center w-full items-center">
                                <img src={LogoMaharuay} alt="Logo" className='w-30' />
                                {/* <BrandLogo className="w-8 h-8 text-blue-500" />
                                <span className="self-center text-2xl font-semibold whitespace-nowrap text-white">แบรนด์</span> */}
                        </Link>
                        <a href="#" className="flex ms-2 md:me-24">
                            {/* You can put a logo here for mobile view if needed */}
                        </a> 
                    </div>
                    {/* --- Dropdown Section --- */}
                    <div className="relative" ref={dropdownRef}>
                        {/* 5. เพิ่ม onClick ให้กับปุ่ม */}
                        <button
                            onClick={toggleDropdown}
                            className="text-white bg-yellow-400 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-yellow-400 dark:hover:bg-amber-400  "
                            type="button"
                        >
                            {user?.username || "ยังไม่ได้ล็อคอิน"}
                            <svg className="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                            </svg>
                        </button>

                        {/* 6. เปลี่ยน class 'hidden' ให้ขึ้นอยู่กับ State */}
                        <div
                            id="dropdownInformation"
                            className={`absolute right-0 mt-2 z-10 w-44 bg-white divide-y divide-gray-100 rounded-lg shadow-lg dark:bg-gray-700 dark:divide-gray-600 ${isDropdownOpen ? 'block' : 'hidden'}`}
                        >
                            <div className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                <div>ผู้ใช้งาน {user?.username}</div>
                                <div className="font-medium truncate">ตำแหน่ง {user?.role}</div>
                            </div>
                            {/* <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownInformationButton">
                                <li><a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Dashboard</a></li>
                                <li><a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Settings</a></li>
                                <li><a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Earnings</a></li>
                            </ul> */}
                            <div className="py-2 bg-red-500 dark:hover:bg-red-700 rounded-lg">
                                <a href="#" className="block px-4 py-2 text-sm text-gray-700  dark:text-gray-200 dark:hover:text-white " onClick={handleLogout}>Sign out</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;