import React from 'react';
import { Link } from 'react-router-dom';
// import lottoIcon from "../assets/media/country/HSG.png"; // ไอคอนตัวอย่าง

// --- Interfaces ---
interface RoundData {
  id: number;
  name: string;
  open_datetime: string;
  cutoff_datetime: string;
}

interface ManualLottoCategorySectionProps {
  title: string;
  currentRound: RoundData | null;
  currentTime: Date;
}

interface CardLottoManualProps {
  iconSrc: string;
  title: string;
  timer: string;
  status: string;
  drawDate: string;
  closeTime: string;
  // ✅ 1. เพิ่ม Prop ใหม่สำหรับเปลี่ยนข้อความ "ปิดรับเวลา"
  timeLabel: string; 
}

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


const SEVEN_HOURS_IN_MS = 7 * 60 * 60 * 1000;

// --- Helper Functions ---
const ClockIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
);

const formatTimeLeft = (ms: number) => {
  if (ms < 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

// --- Card Component for Manual Rounds ---
export const CardLottoManual: React.FC<CardLottoManualProps> = ({ iconSrc, title, timer, status, drawDate, closeTime, timeLabel }) => {
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center p-1.5 bg-gradient-to-b from-blue-400 to-blue-300">
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
          <p className="text-gray-500 dark:text-gray-400">{status}</p>
          <p className="text-green-600 dark:text-green-400 font-bold text-lg">
            {/* ✅ 2. ใช้ Prop ใหม่ที่รับเข้ามา */}
            <span>{timeLabel} </span>
            <span>{closeTime} น.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Section Component for Manual Rounds (Updated) ---
const ManualLottoCategorySection: React.FC<ManualLottoCategorySectionProps> = ({
  title,
  currentRound,
  currentTime,
}) => {
  if (!currentRound) {
    return null;
  }

  // ✅ 3. คำนวณเวลาเปิดและปิดที่ปรับแก้แล้ว
  const adjustedOpenTimestamp = new Date(currentRound.open_datetime).getTime() - SEVEN_HOURS_IN_MS;
  const adjustedCutoffTimestamp = new Date(currentRound.cutoff_datetime).getTime() - SEVEN_HOURS_IN_MS;

  // ✅ 4. เช็คสถานะทั้งสองอย่าง: เปิดหรือยัง? และ ปิดไปหรือยัง?
  const isRoundOpen = currentTime.getTime() >= adjustedOpenTimestamp;
  const isRoundActive = currentTime.getTime() < adjustedCutoffTimestamp;

  const formattedTimes = {
    drawDate: new Date(currentRound.cutoff_datetime).toLocaleDateString("th-TH", { timeZone: 'UTC' }),
    openTime: new Date(currentRound.open_datetime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: 'UTC' }),
    closeTime: new Date(currentRound.cutoff_datetime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: 'UTC' }),
  };


  
  const iconSrc = getLottoIcon(title);
  // --- Logic การแสดงผล 3 สถานะ ---

  // สถานะ 1: กำลังเปิดรับแทง (ถึงเวลาเปิดแล้ว แต่ยังไม่ถึงเวลาปิด)
  if (isRoundOpen && isRoundActive) {
    const timerString = formatTimeLeft(adjustedCutoffTimestamp - currentTime.getTime());
    return (
      <Link
        key={currentRound.id}
        to={`/lotto/${currentRound.id}`}
        state={{
          lottoId: currentRound.id.toString(),
          lottoName: currentRound.name,
          lottoDate: formattedTimes.drawDate,
          lottoTime: formattedTimes.closeTime,
          lotto_full_cutoff_datetime: currentRound.cutoff_datetime,
          lotto_open_datetime: currentRound.open_datetime,
        }}
      >
        <CardLottoManual
          iconSrc={iconSrc}
          title={title}
          timer={timerString}
          status="เปิดรับแทง (งวดพิเศษ)"
          drawDate={formattedTimes.drawDate}
          closeTime={formattedTimes.closeTime}
          timeLabel="ปิดรับเวลา"
        />
      </Link>
    );
  }

  // สถานะ 2: ยังไม่ถึงเวลาเปิด
  if (!isRoundOpen) {
    const timerString = formatTimeLeft(adjustedOpenTimestamp - currentTime.getTime());
    return (
      <div className="block group pointer-events-none grayscale opacity-60">
        <CardLottoManual
          iconSrc={iconSrc}
          title={title}
          timer={timerString}
          status="จะเปิดรับแทงในอีก"
          drawDate={formattedTimes.drawDate}
          closeTime={formattedTimes.openTime} // แสดงเวลาเปิดแทน
          timeLabel="จะเปิดเวลา"
        />
      </div>
    );
  }

  // สถานะ 3: หมดเวลาแล้ว (เลยเวลาปิดรับ)
  return (
    <div className="block group pointer-events-none grayscale opacity-60">
      <CardLottoManual
        iconSrc={iconSrc}
        title={title}
        timer="ปิดรับแล้ว"
        status="ปิดรับแทงแล้ว"
        drawDate={formattedTimes.drawDate}
        closeTime={formattedTimes.closeTime}
        timeLabel="ปิดรับเวลา"
      />
    </div>
  );
};

export default ManualLottoCategorySection;
