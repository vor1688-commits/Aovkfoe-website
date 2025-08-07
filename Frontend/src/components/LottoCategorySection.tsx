// import React, { useState, useEffect, useRef } from "react";
// import { Link } from "react-router-dom";

// // --- 1. ส่วนของ Card Components (นำมารวมไว้ในไฟล์เดียว) ---

// interface CardProps {
//   iconSrc: string;
//   title: string;
//   timer: string;
//   status: string;
//   drawDate: string;
//   closeDate: string;
//   closeTime: string;
// }

// const ClockIcon = () => (
//   <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
//   </svg>
// );

// export const CardLotto: React.FC<CardProps> = ({ iconSrc, title, timer, status, drawDate, closeDate, closeTime }) => {
//   return (
//     <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
//       <div className="flex items-center p-1.5 bg-gradient-to-b from-orange-400 to-orange-300">
//         <div className="flex-shrink-0 p-1 bg-white rounded-full">
//           <img className="w-12 h-12" src={iconSrc} alt="Lotto Icon" />
//         </div>
//         <div className="flex-grow ml-2 p-2 bg-white text-center rounded-md shadow-inner">
//           <h1 className="text-xl font-bold text-gray-800">{title}</h1>
//         </div>
//       </div>
//       <div className="p-4 space-y-4">
//         <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
//           <div className="flex items-center space-x-2">
//             <ClockIcon />
//             <span className="font-mono text-lg font-semibold text-red-500">{timer}</span>
//           </div>
//           <div className="text-md">
//             <span>งวด </span>
//             <span className="font-semibold">{drawDate}</span>
//           </div>
//         </div>
//         <div className="text-center p-3 bg-white rounded-lg border dark:bg-gray-700 dark:border-gray-600">
//           <p className="text-gray-500 dark:text-gray-400">{status}</p>
//           <p className="text-green-600 dark:text-green-400 font-bold text-lg">
//             <span>{closeDate}</span>
//             <span className='px-1'> เวลา </span>
//             <span>{closeTime} น.</span>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export const CardLottoUnknow: React.FC<Omit<CardProps, 'status' | 'closeDate'>> = ({ iconSrc, title, timer, drawDate, closeTime }) => {
//   return (
//     <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
//       <div className="flex items-center p-1.5 bg-gradient-to-b from-orange-400 to-orange-300">
//         <div className="flex-shrink-0 p-1 bg-white rounded-full">
//           <img className="w-12 h-12" src={iconSrc} alt="Lotto Icon" />
//         </div>
//         <div className="flex-grow ml-2 p-2 bg-white text-center rounded-md shadow-inner">
//           <h1 className="text-xl font-bold text-gray-800">{title}</h1>
//         </div>
//       </div>
//       <div className="p-4 space-y-4">
//         <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
//           <div className="flex items-center space-x-2">
//             <ClockIcon />
//             <span className="font-mono text-lg font-semibold text-red-500">{timer}</span>
//           </div>
//           <div className="text-md">
//             <span>งวด </span>
//             <span className="font-semibold">{drawDate}</span>
//           </div>
//         </div>
//         <div className="text-center p-3 bg-white rounded-lg border dark:bg-gray-700 dark:border-gray-600">
//           <p className="text-gray-500 dark:text-gray-400">{title}</p>
//           <p className="text-green-600 dark:text-green-400 font-bold text-lg">
//             <span> ปิดตลาดแล้ว</span>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };


// // --- 2. ส่วนของ ICON LOGIC ---
// const iconModules = import.meta.glob('../assets/media/country/*.png', { eager: true });
// const icons: Record<string, string> = {};
// for (const path in iconModules) {
//     const fileName = path.split('/').pop()?.replace('.png', '');
//     if (fileName) {
//         icons[fileName] = (iconModules[path] as any).default;
//     }
// }
// const getLottoIcon = (title: string): string => {
//     const nameMap: Record<string, string> = { 'รัสเซีย': 'RUS', 'เยอรมัน': 'GER', 'อังกฤษ': 'ENG', 'อินเดีย': 'IND', 'นิเคอิ': 'NHK1', 'จีน': 'CHA', 'ฮั่งเส็ง': 'HSC', 'ไต้หวัน': 'TW', 'เกาหลี': 'HKR', 'สิงคโปร์': 'HSG', 'ฮานอย': 'VN', 'ลาว': 'LA', 'ไทย': 'TH' };
//     const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="black"/></svg>';
//     for (const keyword in nameMap) {
//         if (title.includes(keyword)) { return icons[nameMap[keyword]] || defaultIcon; }
//     }
//     return defaultIcon;
// };

// // --- 3. ส่วนของ TIMER LOGIC (Hook ที่ทำงานได้แน่นอน) ---
// const SEVEN_HOURS_IN_MS = 7 * 60 * 60 * 1000;
// interface TimeLeft { total: number; hours: number; minutes: number; seconds: number; }

// const useCountdown = (targetDateString?: string, serverNowString?: string): TimeLeft => {
//   const intervalRef = useRef<number | null>(null);
//   const calculateState = (): TimeLeft => {
//     if (!targetDateString || !serverNowString) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
//     const serverTimeOnLoad = new Date(serverNowString).getTime();
//     const clientTimeOnLoad = Date.now();
//     const serverTimeOffset = serverTimeOnLoad - clientTimeOnLoad;
//     const targetTime = new Date(targetDateString).getTime() - SEVEN_HOURS_IN_MS;
//     const syncedNow = Date.now() + serverTimeOffset;
//     const difference = targetTime - syncedNow;
//     if (difference <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
//     const hours = Math.floor(difference / (1000 * 60 * 60));
//     const minutes = Math.floor((difference / 1000 / 60) % 60);
//     const seconds = Math.floor((difference / 1000) % 60);
//     return { total: difference, hours, minutes, seconds };
//   };
//   const [timeLeft, setTimeLeft] = useState(calculateState);
//   useEffect(() => {
//     if (intervalRef.current) clearInterval(intervalRef.current);
//     if (!targetDateString || !serverNowString) { setTimeLeft({ total: 0, hours: 0, minutes: 0, seconds: 0 }); return; };
//     intervalRef.current = window.setInterval(() => { setTimeLeft(calculateState()); }, 1000);
//     return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
//   }, [targetDateString, serverNowString]);
//   useEffect(() => { if (timeLeft.total <= 0 && intervalRef.current) clearInterval(intervalRef.current); }, [timeLeft]);
//   return timeLeft;
// };

// // --- 4. ส่วนของ Component หลักที่รวม Logic ทั้งหมด ---
// interface RoundData { id: number; name: string; open_datetime: string; cutoff_datetime: string; }
// interface LottoCategorySectionProps { title: string; currentRound: RoundData | null; nextRound: RoundData | null; serverTime: string; }

// const LottoCategorySection: React.FC<LottoCategorySectionProps> = ({ title, currentRound, nextRound, serverTime }) => {
//     const iconSrc = getLottoIcon(title);
    
//     // ใช้ Hook นับถอยหลังสำหรับงวดปัจจุบันและงวดถัดไป
//     const currentCountdown = useCountdown(currentRound?.cutoff_datetime, serverTime);
//     const nextCountdown = useCountdown(nextRound?.open_datetime, serverTime);

//     const isCurrentActive = currentRound && currentCountdown.total > 0;
//     const isNextUpcoming = !isCurrentActive && nextRound && nextCountdown.total > 0;

//     const formatTimer = (time: TimeLeft, suffix = "") => {
//         if (time.total <= 0) return "ปิดรับแล้ว";
//         const pad = (num: number) => num.toString().padStart(2, "0");
//         return `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}${suffix}`;
//     };

//     const getFormattedRoundTimes = (round: RoundData) => {
//         const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' };
//         const cutoffDate = new Date(round.cutoff_datetime);
//         const openDate = new Date(round.open_datetime);
//         const drawDate = cutoffDate.toLocaleDateString("th-TH", { timeZone: 'UTC' });
//         const closeTime = cutoffDate.toLocaleTimeString("th-TH", timeOptions);
//         const openDateStr = openDate.toLocaleDateString("th-TH", { timeZone: 'UTC' });
//         const openTime = openDate.toLocaleTimeString("th-TH", timeOptions);
//         return { drawDate, closeDate: drawDate, closeTime, openDate: openDateStr, openTime };
//     };

//     const currentRoundFormattedTimes = currentRound ? getFormattedRoundTimes(currentRound) : null;
//     const nextRoundFormattedTimes = nextRound ? getFormattedRoundTimes(nextRound) : null;

//     if (!currentRound && !nextRound) {
//         return (
//             <div className="block group pointer-events-none grayscale opacity-60">
//                 <CardLottoUnknow iconSrc={iconSrc} title={title} timer="ไม่มีข้อมูลงวด" drawDate="" closeTime="" />
//             </div>
//         );
//     }
    
//     // --- Logic การแสดงผล 3 สถานะ ---
//     if (isCurrentActive && currentRound) {
//         return (
//             <Link key={currentRound.id} to={`/lotto/${currentRound.id}`} state={{ lottoId: currentRound.id.toString(), lottoName: currentRound.name, lottoDate: currentRoundFormattedTimes?.drawDate, lottoTime: currentRoundFormattedTimes?.closeTime, lotto_full_cutoff_datetime: currentRound.cutoff_datetime, lotto_open_datetime: currentRound.open_datetime }}>
//                 <CardLotto
//                     iconSrc={iconSrc}
//                     title={currentRound.name}
//                     timer={formatTimer(currentCountdown)}
//                     status="เปิดรับแทงถึง"
//                     drawDate={currentRoundFormattedTimes?.drawDate || ""}
//                     closeDate={currentRoundFormattedTimes?.closeDate || ""}
//                     closeTime={currentRoundFormattedTimes?.closeTime || ""}
//                 />
//             </Link>
//         );
//     }

//     if (isNextUpcoming && nextRound) {
//         return (
//             <div className="block group pointer-events-none grayscale opacity-60">
//                 <CardLotto
//                     iconSrc={iconSrc}
//                     title={nextRound.name + " (งวดถัดไป)"}
//                     timer={formatTimer(nextCountdown, " (เปิดรับใน)")}
//                     status="ตลาดปิด จะเปิดอีกครั้ง"
//                     drawDate={nextRoundFormattedTimes?.drawDate || ""}
//                     closeDate={nextRoundFormattedTimes?.openDate || ""}
//                     closeTime={nextRoundFormattedTimes?.openTime || ""}
//                 />
//             </div>
//         );
//     }

//     return (
//         <div className="block group pointer-events-none grayscale opacity-60">
//             <CardLottoUnknow
//                 iconSrc={iconSrc}
//                 title={title}
//                 timer="ปิดรับแล้ว"
//                 drawDate={currentRoundFormattedTimes?.drawDate || ""}
//                 closeTime={currentRoundFormattedTimes?.closeTime || ""}
//             />
//         </div>
//     );
// };

// export default LottoCategorySection;

import React from "react";
import { Link } from "react-router-dom";
// ✅ สมมติว่า CardLotto, CardLottoUnknow ถูก import มาอย่างถูกต้อง
import { CardLotto, CardLottoUnknow } from "./CardLotto"; 

// --- ICON LOGIC ---
const iconModules = import.meta.glob('../assets/media/country/*.png', { eager: true });
const icons: Record<string, string> = {};
for (const path in iconModules) {
    const fileName = path.split('/').pop()?.replace('.png', '');
    if (fileName) {
        icons[fileName] = (iconModules[path] as any).default;
    }
}
const getLottoIcon = (title: string): string => {
    const nameMap: Record<string, string> = { 'รัสเซีย': 'RUS', 'เยอรมัน': 'GER', 'อังกฤษ': 'ENG', 'อินเดีย': 'IND', 'นิเคอิ': 'NHK1', 'จีน': 'CHA', 'ฮั่งเส็ง': 'HSC', 'ไต้หวัน': 'TW', 'เกาหลี': 'HKR', 'สิงคโปร์': 'HSG', 'ฮานอย': 'VN', 'ลาว': 'LA', 'ไทย': 'TH', 'ดาวโจนส์': 'DJ', 'หุ้นอียิปต์': 'EGY'};
    const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="black"/></svg>';
    for (const keyword in nameMap) {
        if (title.includes(keyword)) { return icons[nameMap[keyword]] || defaultIcon; }
    }
    return defaultIcon;
};

// --- Interfaces ---
interface RoundData { id: number; name: string; open_datetime: string; cutoff_datetime: string; }
interface LottoCategorySectionProps { 
    title: string; 
    currentRound: RoundData | null; 
    nextRound: RoundData | null; 
    currentTime: Date; 
}

// ✅ 1. เพิ่มค่า Offset 7 ชั่วโมงเข้ามา
const SEVEN_HOURS_IN_MS = 7 * 60 * 60 * 1000;

// --- Component หลัก ---
const LottoCategorySection: React.FC<LottoCategorySectionProps> = ({ title, currentRound, nextRound, currentTime }) => {
    
    const iconSrc = getLottoIcon(title);

    const formatTimer = (difference: number, suffix = "") => {
        if (difference <= 0) return "ปิดรับแล้ว";
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        const pad = (num: number) => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${suffix}`;
    };

    let timerString = "ปิดรับแล้ว";
    let statusString = "";
    let isActive = false;
    let isUpcoming = false;
    
    // --- คำนวณเวลาและสถานะใหม่ทุกครั้งที่ re-render ---
    if (currentRound) {
        // ✅ 2. หัก 7 ชั่วโมงออกก่อนคำนวณหาผลต่าง
        const adjustedCutoffTimestamp = new Date(currentRound.cutoff_datetime).getTime() - SEVEN_HOURS_IN_MS;
        const difference = adjustedCutoffTimestamp - currentTime.getTime();

        if (difference > 0) {
            isActive = true;
            timerString = formatTimer(difference);
            statusString = "เปิดรับแทงถึง";
        }
    }
    
    if (!isActive && nextRound) {
        // ✅ 2. หัก 7 ชั่วโมงออกก่อนคำนวณหาผลต่าง
        const adjustedOpenTimestamp = new Date(nextRound.open_datetime).getTime() - SEVEN_HOURS_IN_MS;
        const difference = adjustedOpenTimestamp - currentTime.getTime();

        if (difference > 0) {
            isUpcoming = true;
            timerString = formatTimer(difference, " (เปิดรับใน)");
            statusString = "ตลาดปิด จะเปิดอีกครั้ง";
        }
    }

    const getFormattedRoundTimes = (round: RoundData) => {
        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' };
        const cutoffDate = new Date(round.cutoff_datetime);
        const openDate = new Date(round.open_datetime);
        const drawDate = cutoffDate.toLocaleDateString("th-TH", { timeZone: 'UTC' });
        const closeTime = cutoffDate.toLocaleTimeString("th-TH", timeOptions);
        const openDateStr = openDate.toLocaleDateString("th-TH", { timeZone: 'UTC' });
        const openTime = openDate.toLocaleTimeString("th-TH", timeOptions);
        return { drawDate, closeDate: drawDate, closeTime, openDate: openDateStr, openTime };
    };
    
    const currentRoundFormattedTimes = currentRound ? getFormattedRoundTimes(currentRound) : null;
    const nextRoundFormattedTimes = nextRound ? getFormattedRoundTimes(nextRound) : null;

    if (!currentRound && !nextRound) {
        return (
            <div className="block group pointer-events-none grayscale opacity-60">
                <CardLottoUnknow iconSrc={iconSrc} title={title} timer="รอติดตาม" drawDate="" closeTime="" closeDate="" />
            </div>
        );
    }

    if (isActive && currentRound) {
        return (
            <Link key={currentRound.id} to={`/lotto/${currentRound.id}`} state={{ lottoId: currentRound.id.toString(), lottoName: currentRound.name, lottoDate: currentRoundFormattedTimes?.drawDate, lottoTime: currentRoundFormattedTimes?.closeTime, lotto_full_cutoff_datetime: currentRound.cutoff_datetime, lotto_open_datetime: currentRound.open_datetime }}>
                <CardLotto
                    iconSrc={iconSrc}
                    title={currentRound.name}
                    timer={timerString}
                    status={statusString}
                    drawDate={currentRoundFormattedTimes?.drawDate || ""}
                    closeDate={currentRoundFormattedTimes?.closeDate || ""}
                    closeTime={currentRoundFormattedTimes?.closeTime || ""}
                />
            </Link>
        );
    }

    if (isUpcoming && nextRound) {
        return (
            <div className="block group pointer-events-none grayscale opacity-60">
                <CardLotto
                    iconSrc={iconSrc}
                    title={nextRound.name + " (งวดถัดไป)"}
                    timer={timerString}
                    status={statusString}
                    drawDate={nextRoundFormattedTimes?.drawDate || ""}
                    closeDate={nextRoundFormattedTimes?.openDate || ""}
                    closeTime={nextRoundFormattedTimes?.openTime || ""}
                />
            </div>
        );
    }

    return (
        <div className="block group pointer-events-none grayscale opacity-60">
            <CardLottoUnknow
                iconSrc={iconSrc}
                title={title}
                timer="ปิดรับแล้ว"
                drawDate={currentRoundFormattedTimes?.drawDate || ""}
                closeTime={currentRoundFormattedTimes?.closeTime || ""}
                closeDate={currentRoundFormattedTimes?.closeDate || ""}
            />
        </div>
    );
};

export default LottoCategorySection;