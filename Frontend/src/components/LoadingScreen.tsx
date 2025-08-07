// src/components/Loading.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interface for Props ---
interface FullScreenLoaderProps {
  isLoading: boolean;
  text?: string;
}

interface InlineLoaderProps {
  text?: string;
  className?: string;
}



const dotTransition = {
    duration: 0.4,
    repeat: Infinity,
    repeatType: "mirror" as const, // <--- เพิ่ม as const เข้าไป
    ease: "easeInOut",
};



/**
 * SVG Spinner Component - A reusable SVG animation for loading.
 */
const SpinnerIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16 text-blue-500" }) => (
  <svg 
    className={className} 
    viewBox="0 0 100 100" 
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid"
  >
    <circle 
      cx="50" 
      cy="50" 
      r="45" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="5" 
      strokeOpacity="0.3" 
    />
    <circle 
      cx="50" 
      cy="50" 
      r="45" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="5" 
      strokeDasharray="282.74" 
      strokeDashoffset="212.055"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 50 50"
        to="360 50 50"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);


/**
 * FullScreenLoader: A splash screen loader that covers the entire page.
 * เหมาะสำหรับใช้ตอนโหลดข้อมูลครั้งแรกของหน้า หรือตอนที่กำลังเปลี่ยนหน้า (page transition)
 * @param {boolean} isLoading - ใช้ state เพื่อควบคุมการแสดงผล (true = แสดง, false = ซ่อน)
 * @param {string} [text] - ข้อความที่จะแสดงใต้ animation (optional)
 * * @example
 * // In your page component:
 * const [isLoadingPage, setIsLoadingPage] = useState(true);
 * * useEffect(() => {
 * fetchData().finally(() => setIsLoadingPage(false));
 * }, []);
 * * return (
 * <>
 * <FullScreenLoader isLoading={isLoadingPage} text="กำลังเตรียมข้อมูล..." />
 * {!isLoadingPage && (
 * <div>Your page content here...</div>
 * )}
 * </>
 * );
 */


interface PulsingDotsLoaderProps {
  isLoading: boolean;
  text?: string;
  className?: string;
}
export const PulsingDotsLoader: React.FC<PulsingDotsLoaderProps> = ({ isLoading, text, className = "" }) => {
  if (!isLoading) return null;

  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -8 },
  };

const dotTransition = {
    duration: 0.4,
    repeat: Infinity,
    repeatType: "mirror" as const,
    ease: "easeInOut" as const, // <--- เพิ่ม as const เข้าไป
};

  return (
    <div className={`flex flex-col items-center justify-center p-4 text-gray-500 ${className}`}>
      <motion.div className="flex items-center justify-center space-x-2">
        <motion.span className="w-3 h-3 bg-blue-500 rounded-full" variants={dotVariants} transition={{ ...dotTransition, delay: 0 }} animate="animate" />
        <motion.span className="w-3 h-3 bg-blue-500 rounded-full" variants={dotVariants} transition={{ ...dotTransition, delay: 0.2 }} animate="animate" />
        <motion.span className="w-3 h-3 bg-blue-500 rounded-full" variants={dotVariants} transition={{ ...dotTransition, delay: 0.4 }} animate="animate" />
      </motion.div>
      {text && <p className="mt-4 text-sm font-light tracking-wider">{text}</p>}
    </div>
  );
};


export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ isLoading, text = "กำลังประมวลผล..." }) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center"
        >
          <SpinnerIcon />
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-white text-lg font-semibold"
          >
            {text}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


/**
 * InlineLoader: A smaller loader for use within a component or section.
 * เหมาะสำหรับใช้ตอนโหลดข้อมูลแค่บางส่วน เช่น ตาราง, กราฟ หรือการ์ด
 * @param {string} [text] - ข้อความที่จะแสดงข้างๆ animation (optional)
 * @param {string} [className] - สำหรับใส่ CSS classes เพิ่มเติม
 * * @example
 * // In your component:
 * const [isChartLoading, setIsChartLoading] = useState(true);
 * * useEffect(() => {
 * fetchChartData().finally(() => setIsChartLoading(false));
 * }, []);
 * * return (
 * <div className="kpi-card">
 * {isChartLoading 
 * ? <InlineLoader text="กำลังโหลดกราฟ..." /> 
 * : <Bar data={...} />
 * }
 * </div>
 * );
 */
interface InlineLoaderProps {
  text?: string;
  className?: string;
  isLoading: boolean; // <-- เพิ่ม prop นี้
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({ 
  text = "กำลังโหลด...", 
  className = "",
  isLoading // <-- รับ prop นี้เข้ามา
}) => {
  // 2. เพิ่มเงื่อนไข: ถ้า isLoading เป็น false ให้ return null (ไม่แสดงอะไรเลย)
  if (!isLoading) {
    return null;
  }

  // 3. ถ้า isLoading เป็น true ให้แสดง Loader ตามปกติ
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-gray-400 ${className}`}>
      <SpinnerIcon className="w-10 h-10 text-blue-500" />
      {text && <p className="mt-3 text-sm font-medium">{text}</p>}
    </div>
  );
};
