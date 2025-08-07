import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// =================================================================================
// 1. CHILD COMPONENTS (CardLotto, CardLottoUnknow)
// คอมโพเนนต์สำหรับแสดงผล UI ของการ์ดแต่ละใบ
// =================================================================================

const ClockIcon = () => (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);

interface CardLottoProps {
    iconSrc: string;
    title: string;
    timer: string;
    status: string;
    drawDate: string;
    closeDate: string;
    closeTime: string;
}

export const CardLotto: React.FC<CardLottoProps> = ({ iconSrc, title, timer, status, drawDate, closeDate, closeTime }) => {
    return (
        <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center p-1.5 bg-gradient-to-b from-orange-400 to-orange-300">
                <div className="flex-shrink-0 p-1 bg-white rounded-full">
                    <img className="w-12 h-12" src={iconSrc} alt="Lotto Icon" />
                </div>
                <div className="flex-grow ml-2 p-2 bg-white text-center rounded-md shadow-inner">
                    <h1 className="text-xl font-bold text-gray-800">{title}</h1>
                </div>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                        <ClockIcon />
                        <span className="font-mono text-lg font-semibold text-red-500">{timer}</span>
                    </div>
                    <div className="text-md">
                        <span> </span>
                        <span className="font-semibold">{drawDate}</span>
                    </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border dark:bg-gray-700 dark:border-gray-600">
                    <p className="text-gray-500 dark:text-gray-400">{status}</p>
                    <p className="text-green-600 dark:text-green-400 font-bold text-lg">
                        <span>{closeDate}</span>
                        <span className='px-1'> เวลา </span>
                        <span>{closeTime} น.</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

interface CardLottoUnknowProps {
    iconSrc: string;
    title: string;
    timer: string;
    drawDate: string;
    closeDate: string;
    closeTime: string;
}

export const CardLottoUnknow: React.FC<CardLottoUnknowProps> = ({ iconSrc, title, timer, drawDate, closeDate, closeTime }) => {
    return (
        <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center p-1.5 bg-gradient-to-b from-orange-400 to-orange-300">
                <div className="flex-shrink-0 p-1 bg-white rounded-full">
                    <img className="w-12 h-12" src={iconSrc} alt="Lotto Icon" />
                </div>
                <div className="flex-grow ml-2 p-2 bg-white text-center rounded-md shadow-inner">
                    <h1 className="text-xl font-bold text-gray-800">{title}</h1>
                </div>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                        <ClockIcon />
                        <span className="font-mono text-lg font-semibold text-red-500">{timer}</span>
                    </div>
                    <div className="text-md">
                        <span>งวด </span>
                        <span className="font-semibold">{drawDate}</span>
                    </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border dark:bg-gray-700 dark:border-gray-600">
                    <p className="text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-green-600 dark:text-green-400 font-bold text-lg">
                        <span></span>
                        <span className='px-0'></span>
                        <span> ปิดตลาดแล้ว</span>
                    </p>
                </div>
            </div>
        </div>
    );
};


// =================================================================================
// 2. IMAGE HELPERS & CONSTANTS
// ฟังก์ชันสำหรับจัดการรูปภาพและค่าคงที่
// =================================================================================

const iconModules = import.meta.glob('../assets/media/country/*.png', { eager: true });
const icons: Record<string, string> = {};
for (const path in iconModules) {
    const fileName = path.split('/').pop()?.replace('.png', '');
    if (fileName) {
        icons[fileName] = (iconModules[path] as any).default;
    }
}

const getLottoIcon = (title: string): string => {
    const nameMap: Record<string, string> = {
        'รัสเซีย': 'RUS', 'เยอรมัน': 'GER', 'อังกฤษ': 'ENG', 'อินเดีย': 'IND',
        'นิเคอิ': 'NHK1', 'จีน': 'CHA', 'ฮั่งเส็ง': 'HSC', 'ไต้หวัน': 'TW',
        'เกาหลี': 'HKR', 'สิงคโปร์': 'HSG', 'ฮานอย': 'VN', 'ลาว': 'LA', 'ไทย': 'TH',
    };
    const defaultIcon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="black"/></svg>';
    for (const keyword in nameMap) {
        if (title.includes(keyword)) {
            return icons[nameMap[keyword]] || defaultIcon;
        }
    }
    return defaultIcon;
};

const SEVEN_HOURS_IN_MS = 7 * 60 * 60 * 1000;


// =================================================================================
// 3. CUSTOM HOOK FOR PRECISE COUNTDOWN
// Hook สำหรับนับเวลาถอยหลังที่แม่นยำโดยอิงเวลาจาก Server
// =================================================================================

interface CountdownTime {
    total: number; hours: number; minutes: number; seconds: number;
}

const usePreciseCountdown = (targetDateString?: string, serverNowString?: string): CountdownTime => {
    const intervalRef = useRef<number | null>(null);

    const calculateInitialState = (): CountdownTime => {
        if (!targetDateString) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
        const serverTimeOnLoad = serverNowString ? new Date(serverNowString).getTime() : Date.now();
        const clientTimeOnLoad = Date.now();
        const serverTimeOffset = serverTimeOnLoad - clientTimeOnLoad;
        const targetTime = new Date(targetDateString).getTime() - SEVEN_HOURS_IN_MS;
        const syncedNow = Date.now() + serverTimeOffset;
        const difference = targetTime - syncedNow;

        if (difference <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        return { total: difference, hours, minutes, seconds };
    };

    const [timeLeft, setTimeLeft] = useState(calculateInitialState);

    useEffect(() => {
        if (!targetDateString) return;

        const serverTimeOnLoad = serverNowString ? new Date(serverNowString).getTime() : Date.now();
        const clientTimeOnLoad = Date.now();
        const serverTimeOffset = serverTimeOnLoad - clientTimeOnLoad;
        const targetTime = new Date(targetDateString).getTime() - SEVEN_HOURS_IN_MS;

        const updateCountdown = () => {
            const syncedNow = Date.now() + serverTimeOffset;
            const difference = targetTime - syncedNow;

            if (difference <= 0) {
                setTimeLeft({ total: 0, hours: 0, minutes: 0, seconds: 0 });
                if (intervalRef.current) clearInterval(intervalRef.current);
            } else {
                const hours = Math.floor(difference / (1000 * 60 * 60));
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft({ total: difference, hours, minutes, seconds });
            }
        };

        intervalRef.current = window.setInterval(updateCountdown, 1000);

        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
        };
    }, [targetDateString, serverNowString]);

    return timeLeft;
};


// =================================================================================
// 4. MAIN COMPONENT (LottoCategorySection)
// คอมโพเนนต์หลักที่รวบรวมทุกอย่างเข้าด้วยกัน
// =================================================================================

interface RoundData {
    id: number; name: string; open_datetime: string; cutoff_datetime: string;
}
interface LottoCategorySectionProps {
    title: string; currentRound: RoundData | null; nextRound: RoundData | null; serverTime: string;
}

const LottoCategorySection: React.FC<LottoCategorySectionProps> = ({ title, currentRound, nextRound, serverTime }) => {
    const currentCountdown = usePreciseCountdown(currentRound?.cutoff_datetime, serverTime);
    const nextRoundCountdown = usePreciseCountdown(nextRound?.open_datetime, serverTime);
    const iconSrc = getLottoIcon(title);

    const formatTimer = (time: CountdownTime) => {
        if (time.total <= 0) return "ปิดรับแทง";
        const pad = (num: number) => num.toString().padStart(2, "0");
        return `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
    };

    const isCurrentRoundReadyForBetting = currentRound && currentCountdown.total > 0;
    const isNextRoundUpcoming = nextRound && nextRoundCountdown.total > 0;

    const getFormattedRoundTimes = (round: RoundData) => {
        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' };
        const adjustedCutoffDate = new Date(round.cutoff_datetime);
        const adjustedOpenDate = new Date(round.open_datetime);
        const drawDate = adjustedCutoffDate.toLocaleDateString("th-TH", { timeZone: 'UTC' });
        const closeTime = adjustedCutoffDate.toLocaleTimeString("th-TH", timeOptions);
        const openDateStr = adjustedOpenDate.toLocaleDateString("th-TH", { timeZone: 'UTC' });
        const openTime = adjustedOpenDate.toLocaleTimeString("th-TH", timeOptions);
        return { drawDate, closeDate: drawDate, closeTime, openDate: openDateStr, openTime };
    };

    const currentRoundFormattedTimes = currentRound ? getFormattedRoundTimes(currentRound) : null;
    const nextRoundFormattedTimes = nextRound ? getFormattedRoundTimes(nextRound) : null;

    if (!currentRound && !nextRound) {
        return (
            <div className={`block group pointer-events-none grayscale opacity-60`}>
                <CardLottoUnknow
                    iconSrc={iconSrc} title={title} timer="ปิดแล้ว"
                    drawDate="" closeDate="" closeTime=""
                />
            </div>
        );
    }

    return (
        <>
            {isCurrentRoundReadyForBetting && currentRound && (
                <Link
                    key={currentRound.id}
                    to={`/lotto/${currentRound.id}`}
                    state={{
                        lottoId: currentRound.id.toString(), lottoName: currentRound.name,
                        lottoDate: currentRoundFormattedTimes?.drawDate, lottoTime: currentRoundFormattedTimes?.closeTime,
                        lotto_full_cutoff_datetime: currentRound.cutoff_datetime, lotto_open_datetime: currentRound.open_datetime,
                    }}
                >
                    <CardLotto
                        iconSrc={iconSrc} title={currentRound.name} timer={formatTimer(currentCountdown)}
                        status="เปิดรับแทงถึง"
                        drawDate={currentRoundFormattedTimes?.drawDate || ""}
                        closeDate={currentRoundFormattedTimes?.closeDate || ""}
                        closeTime={currentRoundFormattedTimes?.closeTime || ""}
                    />
                </Link>
            )}

            {!isCurrentRoundReadyForBetting && isNextRoundUpcoming && nextRound && (
                <div className={`block group pointer-events-none grayscale opacity-60`}>
                    <CardLotto
                        iconSrc={iconSrc}
                        title={nextRound.name}
                        timer={formatTimer(nextRoundCountdown)}
                        status={`เปิดรับในอีก`}
                        drawDate={nextRoundFormattedTimes?.drawDate || ""}
                        closeDate={nextRoundFormattedTimes?.openDate || ""}
                        closeTime={nextRoundFormattedTimes?.openTime || ""}
                    />
                </div>
            )}

            {!isCurrentRoundReadyForBetting && !isNextRoundUpcoming && (
                <div className={`block group pointer-events-none grayscale opacity-60`}>
                    <CardLottoUnknow
                        iconSrc={iconSrc}
                        title={currentRound?.name || title}
                        timer="ปิดรับแทงแล้ว"
                        drawDate={currentRoundFormattedTimes?.drawDate || ""}
                        closeDate={currentRoundFormattedTimes?.closeDate || ""}
                        closeTime={currentRoundFormattedTimes?.closeTime || ""}
                    />
                </div>
            )}
        </>
    );
};

export default LottoCategorySection;