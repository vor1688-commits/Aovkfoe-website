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
            <Link key={currentRound.id} to={`/lotto/${currentRound.id}`} state={{ lottoId: currentRound.id.toString() }}>
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