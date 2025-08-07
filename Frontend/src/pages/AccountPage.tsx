import React, { useState, useEffect, useCallback, useMemo } from "react"; 
import type { ChartOptions } from "chart.js";
import { useAuth } from "../contexts/AuthContext";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  TicketIcon,
  ChartPieIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  TagIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PresentationChartLineIcon,
  TrophyIcon,
  TrashIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence, animate } from "framer-motion";
import { formatDateString, getBetTypeName } from "../services/BetService";
import { FullScreenLoader } from "../components/LoadingScreen";
import { useModal } from "../components/Modal";
import api from "../api/axiosConfig";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);
const API_URL =
  import.meta.env.VITE_API_URL_FRONTEND || "http://localhost:3001";

// --- Interfaces ---
interface CheckableItem {
  id: number;
  lottoRoundId: number;
  bet_number: string;
  price: number;
  bet_style: string;
  baht_per: number;
  bet_type: string;
  billRef: string;
  note: string | null;
  createdAt: string;
  lottoName: string;
  lottoDrawDate: string;
  winningNumbers: WinningNumbers | null;
  lottoRoundStatus: string;
  username: string;
  rate: number;
  payoutAmount: number;
}
interface WinningNumbers {
  "3top"?: string[];
  "2top"?: string[];
  "2bottom"?: string[];
  "3tote"?: string[];
}
interface SummaryData {
  totalBetAmount: number;
  totalWinnings: number;
  totalBills: number;
  netProfit: number;
}
interface User {
  id: number;
  username: string;
}
interface BreakdownData {
  byLottoType: { name: string; totalAmount: number; billCount: string }[];
}
interface RecentBill {
  id: number;
  billRef: string;
  username: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  lottoName: string;
  billLottoDraw: string | null;
  note: string | null;
}
// ⭐ Interface ใหม่: สรุปยอดแทงตามตัวเลข
interface AllBetItemsSummary {
  number: string;
  count: string;
  totalAmount: number;
}
// ⭐ อัปเดต Interface ของ API Response
interface SummaryApiResponse {
  summary: SummaryData;
  breakdown: BreakdownData;
  allBetItemsSummary: AllBetItemsSummary[];
  recentBills: RecentBill[];
  users: User[];
}

// --- Helper Functions (เหมือนเดิม) ---
const formatCurrency = (amount: number, decimals = 2) =>
  amount.toLocaleString("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
const getDateString = (offsetDays = 0) =>
  new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
const sortString = (str: string) => str.split("").sort().join("");
const calculatePrizeDetails = (item: CheckableItem): { isWinner: boolean } => {
  if (
    item.lottoRoundStatus !== "closed" &&
    item.lottoRoundStatus !== "manual_closed"
  ) {
    return { isWinner: false };
  }
  const winningNumbers = item.winningNumbers;
  if (!winningNumbers) {
    return { isWinner: false };
  }
  let prizeKey: keyof WinningNumbers | null = null;
  const betType = item.bet_type;
  const betStyle = item.bet_style.toLowerCase();
  if (betType.includes("3")) {
    if (betStyle === "ตรง") prizeKey = "3top";
    else if (betStyle === "โต๊ด") prizeKey = "3tote";
  } else if (betType.includes("2")) {
    if (betStyle === "บน") prizeKey = "2top";
    else if (betStyle === "ล่าง") prizeKey = "2bottom";
  }
  if (!prizeKey) {
    return { isWinner: false };
  }
  const prizeValue = winningNumbers[prizeKey];
  if (!prizeValue || prizeValue.length === 0) {
    return { isWinner: false };
  }
  let isWinner = false;
  if (prizeKey === "3tote") {
    const sortedBetNumber = sortString(item.bet_number);
    if (Array.isArray(prizeValue)) {
      isWinner = prizeValue.some(
        (winNum) => sortString(winNum) === sortedBetNumber
      );
    }
  } else {
    if (Array.isArray(prizeValue)) {
      isWinner = prizeValue.includes(item.bet_number);
    } else if (typeof prizeValue === "string") {
      isWinner = prizeValue === item.bet_number;
    }
  }
  return { isWinner };
};
const useAnimatedCounter = (to: number, isCurrency = true, decimals = 2) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(latest: number) {
        setValue(latest);
      },
    });
    return () => controls.stop();
  }, [to]);
  return isCurrency
    ? formatCurrency(value, decimals)
    : Math.round(value).toLocaleString();
};
const KpiCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  isCurrency?: boolean;
  children?: React.ReactNode;
}> = ({ title, value, icon, colorClass, isCurrency = true, children }) => {
  const animatedValue = useAnimatedCounter(value, isCurrency);
  return (
    <motion.div
      className="kpi-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {" "}
      <div className="flex justify-between items-start">
        {" "}
        <div>
          {" "}
          <h3 className="kpi-title">{title}</h3>{" "}
          <p className={`text-3xl font-bold ${colorClass}`}>{animatedValue}</p>{" "}
        </div>{" "}
        <div className={`p-3 rounded-full bg-gray-700/50 w-min ${colorClass}`}>
          {" "}
          {icon}{" "}
        </div>{" "}
      </div>{" "}
      {children && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">{children}</div>
      )}{" "}
    </motion.div>
  );
};
const MessageDisplay: React.FC<{
  icon: React.ReactNode;
  title: string;
  message: string;
}> = ({ icon, title, message }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center p-10 bg-gray-800 rounded-lg border border-gray-700/50"
  >
    {" "}
    <div className="mx-auto h-12 w-12 text-gray-500">{icon}</div>{" "}
    <h3 className="mt-2 text-lg font-medium text-white">{title}</h3>{" "}
    <p className="mt-1 text-sm text-gray-400">{message}</p>{" "}
  </motion.div>
);

// --- Main Component ---
const AccountPage: React.FC = () => {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState<SummaryApiResponse | null>(
    null
  );
  const [checkableItems, setCheckableItems] = useState<CheckableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<number | null>(null); 

  const [startDate, setStartDate] = useState(getDateString(29));
  const [endDate, setEndDate] = useState(getDateString(0));
  const [selectedUser, setSelectedUser] = useState("");
  const [status, setStatus] = useState("all");
  const [userList, setUserList] = useState<User[]>([]);
  const { alert, confirm, showStatus, hideStatus } = useModal();

  const [lottoOptions, setLottoOptions] = useState<
    Record<
      string,
      { roundId: number; roundName: string; cutoff_datetime: string }[]
    >
  >({});
  const [selectedLottoName, setSelectedLottoName] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");

  useEffect(() => {
    if (user) setSelectedUser(user.username);
  }, [user]);

  const fetchAllData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    const summaryParams = new URLSearchParams({ startDate, endDate, status });
    const prizeCheckParams = new URLSearchParams({
      startDate,
      endDate,
      status: "ยืนยันแล้ว",
    });

    if ((user.role === "owner" || user.role === 'admin') && selectedUser !== "all") {
      summaryParams.append("username", selectedUser);
      prizeCheckParams.append("username", selectedUser);
    }

    if (selectedLottoName !== "all") {
      summaryParams.append("lottoName", selectedLottoName);
      prizeCheckParams.append("lottoName", selectedLottoName);
    }
    if (selectedDate !== "all") {
      summaryParams.append("lottoDate", selectedDate);
      prizeCheckParams.append("lottoDate", selectedDate);
    }

    // ⭐ จุดที่แก้ไข: สร้าง params สำหรับ optionsRequest ⭐
    const optionsParams = new URLSearchParams();
    if ((user.role === "owner" || user.role === 'admin') && selectedUser && selectedUser !== "all") {
      optionsParams.append("username", selectedUser);
    } else if (user.role !== "owner" && user.role !== 'admin') {
      // ถ้าไม่ใช่ owner ให้ส่ง username ของตัวเองไปเสมอ
      optionsParams.append("username", user.username);
    }
    // ถ้าเป็น owner และเลือก "แสดงทั้งหมด" จะไม่ส่ง param ไป -> API จะคืนค่าทั้งหมด

    const summaryRequest = api.get<SummaryApiResponse>(`/api/financial-summary?${summaryParams.toString()}`);
    const prizeCheckRequest = api.get<CheckableItem[]>(`/api/prize-check/all-items?${prizeCheckParams.toString()}`);
    const optionsRequest = api.get(`/api/filters/lotto-options?${optionsParams.toString()}`);

    try {
      const [summaryResponse, prizeCheckResponse, optionsResponse] =
        await Promise.all([summaryRequest, prizeCheckRequest, optionsRequest]);
      setSummaryData(summaryResponse.data);
      setCheckableItems(prizeCheckResponse.data);
      setLottoOptions(optionsResponse.data);
      if (user.role === "owner" || user.role === 'admin') setUserList(summaryResponse.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "ไม่สามารถโหลดข้อมูลได้");
      setSummaryData(null);
      setCheckableItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    startDate,
    endDate,
    selectedUser,
    status,
    user,
    selectedLottoName,
    selectedDate,
  ]);

  useEffect(() => {
    if (selectedUser) fetchAllData();
  }, [fetchAllData, selectedUser]);

  const handleDeleteBill = async (billId: number, billRef: string) => {
    const isConfirm = await confirm(
      `คุณแน่ใจหรือไม่ว่าต้องการลบบิลเลขที่ "${billRef}"?`,
      "",
      "light"
    );
    if (isConfirm) {
      setDeletingBillId(billId);
      try {
        await api.delete(`/api/delete-bills/${billId}`);
        fetchAllData();
        showStatus("success",`ลบบิล "${billRef}" สำเร็จ`, "");
      } catch (err: any) {
        alert(err.response?.data?.error || "ไม่สามารถลบบิลได้", "", "light");
      } finally {
        setDeletingBillId(null);
      }
    }
  };

  const {
    winningItems,
    displayTotalWinnings,
    displayNetProfit,
    winningsByBetType,
    doughnutChartData,
    lottoNameBarChartData,
  } = useMemo(() => {
    const items = checkableItems.filter(
      (item) => calculatePrizeDetails(item).isWinner
    );
    const totalWinnings = items.reduce(
      (sum, item) => sum + parseFloat(item.payoutAmount as any),
      0
    );
    const netProfit = summaryData
      ? totalWinnings - summaryData.summary.totalBetAmount
      : 0;
    const winningsSummary = items.reduce((acc, item) => {
      const name = item.bet_type;
      acc[name] = (acc[name] || 0) + parseFloat(item.payoutAmount as any);
      return acc;
    }, {} as Record<string, number>);
    const winningsByType = Object.entries(winningsSummary)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    const doughnutData = {
      labels: (summaryData?.breakdown.byLottoType || []).map((d) => d.name),
      datasets: [
        {
          data: (summaryData?.breakdown.byLottoType || []).map(
            (d) => d.totalAmount
          ),
          backgroundColor: [
            "#16A34A",
            "#DC2626",
            "#D97706",
            "#2563EB",
            "#7C3AED",
            "#DB2777",
            "#0891B2",
            "#65A30D",
          ],
          borderColor: "#1F2937",
          borderWidth: 4,
          hoverOffset: 8,
        },
      ],
    };
    const barData = {
      labels: (summaryData?.breakdown.byLottoType || []).map((d) => d.name),
      datasets: [
        {
          label: "จำนวนบิล",
          data: (summaryData?.breakdown.byLottoType || []).map((d) =>
            Number(d.billCount)
          ),
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
      ],
    };
    return {
      winningItems: items,
      displayTotalWinnings: totalWinnings,
      displayNetProfit: netProfit,
      winningsByBetType: winningsByType,
      doughnutChartData: doughnutData,
      lottoNameBarChartData: barData,
    };
  }, [checkableItems, summaryData]);

  const groupedDateOptions = useMemo(() => {
    if (selectedLottoName === "all" || !lottoOptions[selectedLottoName])
      return [];
    const dates = new Set<string>();
    lottoOptions[selectedLottoName].forEach((round) => {
      const date = new Date(round.cutoff_datetime).toISOString().split("T")[0];
      dates.add(date);
    });
    return Array.from(dates).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [lottoOptions, selectedLottoName]);

  const topBetNumbersChartData = useMemo(() => {
    if (!summaryData || !summaryData.allBetItemsSummary) {
      return { labels: [], datasets: [] };
    }

    // 1. เรียงข้อมูลทั้งหมดตามยอดแทงรวมจากมากไปน้อย (ไม่จำกัดจำนวน)
    const allItemsSorted = [...summaryData.allBetItemsSummary].sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    // 2. สร้างชุดสีสำหรับใช้ในกราฟ
    const colorPalette = [
      "rgba(59, 130, 246, 0.7)", // Blue
      "rgba(16, 185, 129, 0.7)", // Green
      "rgba(239, 68, 68, 0.7)", // Red
      "rgba(245, 158, 11, 0.7)", // Amber
      "rgba(147, 51, 234, 0.7)", // Purple
      "rgba(219, 39, 119, 0.7)", // Pink
      "rgba(20, 184, 166, 0.7)", // Teal
    ];

    // 3. กำหนดสีให้แต่ละแท่ง โดยวนซ้ำจากชุดสีที่สร้างไว้
    const backgroundColors = allItemsSorted.map(
      (_, index) => colorPalette[index % colorPalette.length]
    );

    const borderColors = backgroundColors.map((color) =>
      color.replace("0.7", "1")
    );

    return {
      labels: allItemsSorted.map((item) => item.number),
      datasets: [
        {
          label: "ยอดแทงรวม",
          data: allItemsSorted.map((item) => item.totalAmount),
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  }, [summaryData]);

  const dataCount = topBetNumbersChartData.labels.length;
  const chartHeight = dataCount * 35;

  const chartOptions = (titleText: string, legendDisplay = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: legendDisplay,
        position: "top" as const,
        labels: { color: "#D1D5DB", font: { size: 12 } },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (c: any) =>
            `${c.label}: ${c.raw.toLocaleString()} ${
              titleText.includes("ยอดขาย") ? "บาท" : "บิล"
            }`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#9CA3AF" },
        grid: { color: "rgba(156, 163, 175, 0.1)" },
      },
      y: {
        ticks: { color: "#9CA3AF" },
        grid: { color: "rgba(156, 163, 175, 0.1)" },
      },
    },
  });
  // แก้ไขฟังก์ชันนี้ทั้งหมด
  const chartOptions2 = (
    titleText: string,
    axis: "x" | "y",
    legendDisplay = false
  ): ChartOptions<"bar"> => {
    const xPosition = axis === "y" ? "top" : "bottom";

    return {
      indexAxis: axis,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: legendDisplay,
          position: "top",
          labels: { color: "#D1D5DB", font: { size: 12 } },
        },
        title: { display: false },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleFont: { size: 14 },
          bodyFont: { size: 12 },
          callbacks: {
            label: (c: any) =>
              `${c.label}: ${c.raw.toLocaleString()} ${
                titleText.includes("ยอดขาย") ? "บาท" : "บาท"
              }`,
          },
        },
      },
      scales: {
        x: {
          position: xPosition,
          beginAtZero: true,
          ticks: { color: "#9CA3AF" },
          grid: { color: "rgba(156, 163, 175, 0.1)" },
          title: {
            display: true,
            text: axis === "y" ? "ยอดแทง (บาท)" : "ตัวเลข",
            color: "#9CA3AF",
            font: { size: 14 },
          },
        },
        y: {
          ticks: { color: "#9CA3AF" },
          grid: { display: false },
          title: {
            display: true,
            text: axis === "x" ? "ยอดแทง (บาท)" : "ตัวเลข",
            color: "#9CA3AF",
            font: { size: 14 },
          },
        },
      },
    };
  };

  const isSmallScreen = useMediaQuery("(max-width: 639px)");
  const isMediumScreenOrLarger = useMediaQuery("(min-width: 768px)");
  const chartAxis = isMediumScreenOrLarger ? "x" : "y";
  const horizontalChartHeight = topBetNumbersChartData.labels.length * 35; // แท่งละ 35px

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-3xl font-bold">สรุปภาพรวมบัญชี</h1>
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
          <div>
            <label className="filter-label">
              <CalendarDaysIcon className="h-4 w-4" /> ตั้งแต่วันที่
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-dark"
            />
          </div>
          <div>
            <label className="filter-label">
              <CalendarDaysIcon className="h-4 w-4" /> ถึงวันที่
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-dark"
            />
          </div>
          <div className="lg:col-span-2 xl:col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="filter-label">ประเภทหวย</label>
              <select
                value={selectedLottoName}
                onChange={(e) => {
                  setSelectedLottoName(e.target.value);
                  setSelectedDate("all");
                }}
                className="input-dark"
              >
                <option value="all">ทุกประเภท</option>
                {Object.keys(lottoOptions).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="filter-label">งวดวันที่</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-dark"
                disabled={selectedLottoName === "all"}
              >
                <option value="all">ทุกงวด</option>
                {groupedDateOptions?.map((date) => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="filter-label">
              <TagIcon className="h-4 w-4" /> สถานะบิล
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-dark"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="ยืนยันแล้ว">ยืนยันแล้ว</option>
              <option value="รอผล">รอผล</option>
              <option value="ยกเลิก">ยกเลิก</option>
            </select>
          </div>
          {user?.role === "owner" || user?.role === "admin" ? (
            <div className="grid grid-cols-2 gap-2 items-end">
              <div>
                <label className="filter-label">
                  <UserCircleIcon className="h-4 w-4" /> ผู้ใช้งาน
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="input-dark"
                >
                  <option value="all">แสดงทั้งหมด</option>
                  {userList.map((u) => (
                    <option key={u.id} value={u.username}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={fetchAllData}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white font-bold p-2.5 rounded-md hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {isLoading ? "กำลังโหลด..." : "แสดงรายงาน"}
                </button>
              </div>
            </div>
          ) : (
            <div className="lg:col-start-4 xl:col-start-6">
              <button
                onClick={fetchAllData}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white font-bold p-2.5 rounded-md hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                {isLoading ? "กำลังโหลด..." : "แสดงรายงาน"}
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isLoading ? (
          <FullScreenLoader isLoading={isLoading} text="กำลังโหลดข้อมูล..." />
        ) : error ? (
          <MessageDisplay
            icon={<ExclamationTriangleIcon />}
            title="เกิดข้อผิดพลาด"
            message={error}
          />
        ) : !summaryData || summaryData.summary.totalBills === 0 ? (
          <MessageDisplay
            icon={<InformationCircleIcon />}
            title="ไม่พบข้อมูล"
            message="ไม่พบรายการในช่วงเวลาที่คุณเลือก"
          />
        ) : (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* KPI Cards, Charts, and Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard
                title="ยอดแทงทั้งหมด"
                value={summaryData.summary.totalBetAmount}
                icon={<BanknotesIcon className="h-6 w-6" />}
                colorClass="text-blue-400"
              />
              <KpiCard
                title="ยอดชนะทั้งหมด"
                value={displayTotalWinnings}
                icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
                colorClass="text-green-400"
              />
              <KpiCard
                title="กำไร / ขาดทุน"
                value={displayNetProfit}
                icon={
                  displayNetProfit >= 0 ? (
                    <ArrowTrendingUpIcon className="h-6 w-6" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-6 w-6" />
                  )
                }
                colorClass={
                  displayNetProfit >= 0 ? "text-green-400" : "text-red-400"
                }
              />
              <KpiCard
                title="จำนวนบิลทั้งหมด"
                value={summaryData.summary.totalBills}
                icon={<TicketIcon className="h-6 w-6" />}
                colorClass="text-gray-300"
                isCurrency={false}
              >
                <div className="space-y-2 text-sm max-h-24 overflow-y-auto custom-scrollbar">
                  {(summaryData.breakdown.byLottoType || []).length > 0 ? (
                    summaryData.breakdown.byLottoType.map((item) => (
                      <div
                        key={item.name}
                        className="flex justify-between items-center"
                      >
                        <span className="text-gray-400">{item.name}</span>
                        <span className="font-semibold">
                          {Number(item.billCount).toLocaleString()} บิล
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">ไม่มีข้อมูล</p>
                  )}
                </div>
              </KpiCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="kpi-card lg:col-span-2 h-96 flex flex-col">
                <h3 className="chart-title">
                  <ChartPieIcon className="h-6 w-6" />
                  สัดส่วนยอดขายตามหวย
                </h3>
                <div className="relative flex-grow">
                  <Doughnut
                    data={doughnutChartData}
                    options={chartOptions("สัดส่วนยอดขาย", true)}
                  />
                </div>
              </div>
              <div className="kpi-card lg:col-span-3 h-96 flex flex-col">
                <h3 className="chart-title">
                  <PresentationChartLineIcon className="h-6 w-6" />
                  จำนวนบิลตามประเภทหวย
                </h3>
                <div className="relative flex-grow">
                  <Bar
                    data={lottoNameBarChartData}
                    options={chartOptions("จำนวนบิล")}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-900 text-white">
              <div className="kpi-card bg-gray-800 p-4 rounded-lg shadow-lg">
                <h3 className="chart-title flex items-center text-lg font-semibold mb-4">
                  <PresentationChartLineIcon className="h-6 w-6 mr-2" />
                  อันดับเลขที่มียอดแทงสูงสุด
                </h3>
                {isMediumScreenOrLarger ? (
                  <div className="relative h-[200px]">
                    <Bar
                      data={topBetNumbersChartData}
                      options={chartOptions2("ยอดแทงรวม", chartAxis)}
                    />
                  </div>
                ) : (
                  <div className="relative h-[300px] overflow-y-auto">
                    {/* Container ด้านใน: กำหนดความสูงตามจำนวนข้อมูลเพื่อให้เกิด scrollbar */}
                    <div
                      style={{
                        height: `${horizontalChartHeight}px`,
                        position: "relative",
                      }}
                    >
                      <Bar
                        data={topBetNumbersChartData}
                        options={chartOptions2("ยอดแทงรวม", chartAxis)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="kpi-card">
                <h3 className="chart-title">
                  <TableCellsIcon className="h-6 w-6" />
                  สรุปยอดแทงตามตัวเลข
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {summaryData.allBetItemsSummary.length > 0 ? (
                    summaryData.allBetItemsSummary.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm hover:bg-gray-700/50 p-2 rounded-md"
                      >
                        <div className="flex items-center">
                          <span className="font-mono text-lg text-cyan-400 mr-4 w-12 text-center">
                            {item.number}
                          </span>
                          <span className="text-gray-400">
                            {Number(item.count).toLocaleString()} ครั้ง
                          </span>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(item.totalAmount)} บาท
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-center py-4">
                      ไม่พบข้อมูล
                    </p>
                  )}
                </div>
              </div>
              <div className="kpi-card">
                <h3 className="chart-title">
                  <TrophyIcon className="h-6 w-6" />
                  ยอดชนะตามประเภทการแทง
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {winningsByBetType.length > 0 ? (
                    winningsByBetType.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-sm hover:bg-gray-700/50 p-2 rounded-md"
                      >
                        <span className="text-gray-300">
                          {getBetTypeName(item.name)}
                        </span>
                        <span className="font-semibold text-green-400">
                          {formatCurrency(item.total)} บาท
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-center py-4">
                      ไม่พบรายการที่ชนะ
                    </p>
                  )}
                </div>
              </div>
            </div>

            {winningItems.length > 0 && (
              <div className="kpi-card">
                <h2 className="text-xl font-bold mb-4">
                  รายการที่ถูกรางวัลทั้งหมด ({winningItems.length} รายการ)
                </h2>
                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-400 sticky top-0 bg-gray-900">
                      <tr className="border-b border-gray-700">
                        <th className="p-3">เลขบิล</th>
                        {(user?.role === "owner" || user?.role === 'admin') && (
                          <th className="p-3">ผู้ใช้</th>
                        )}
                        <th className="p-3">งวดหวย</th>
                        <th className="p-3">ประเภท</th>
                        <th className="p-3">เลข</th>
                        <th className="p-3 text-right">เงินรางวัล</th>
                      </tr>
                    </thead>
                    <tbody>
                      {winningItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-800 hover:bg-gray-800/50"
                        >
                          <td className="p-3 font-mono text-blue-400">
                            {item.billRef}
                          </td>
                          {(user?.role === "owner" || user?.role === 'admin') && (
                            <td className="p-3">{item.username}</td>
                          )}
                          <td className="p-3">
                            {item.lottoName}
                            <br />
                            <span className="text-xs text-gray-500">
                              {formatDateString(item.lottoDrawDate, 'short')}
                            </span>
                          </td>
                          <td className="p-3">
                            {getBetTypeName(item.bet_type)} ({item.bet_style})
                          </td>
                          <td className="p-3 font-mono">{item.bet_number}</td>
                          <td className="p-3 text-right font-semibold text-green-400">
                            {formatCurrency(item.payoutAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="kpi-card">
              <h2 className="text-xl font-bold mb-4">บิลล่าสุด</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-400">
                    <tr className="border-b border-gray-700">
                      <th className="p-3">เลขที่บิล</th>
                      {(user?.role === "owner" || user?.role === 'admin') && (
                        <th className="p-3">ผู้ใช้งาน</th>
                      )}
                      <th className="p-3">วันที่บันทึก</th>
                      <th className="p-3">ประเภทหวย</th>
                      <th className="p-3">งวดวันที่</th>
                      <th className="p-3 text-center">ยอดรวม</th>
                      <th className="p-3">บันทึกช่วยจำ</th>
                      <th className="p-3 text-center">สถานะ</th>
                      <th className="p-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.recentBills.map((bill) => (
                      <tr
                        key={bill.id}
                        className="border-b border-gray-800 hover:bg-gray-800/50"
                      >
                        <td className="p-3 font-mono text-blue-400">
                          {bill.billRef}
                        </td>
                        {(user?.role === "owner" || user?.role === 'admin') && (
                          <td className="p-3 text-gray-300">{bill.username}</td>
                        )}
                        <td className="p-3 text-gray-400">
                          {new Date(bill.createdAt).toLocaleString("th-TH")}
                        </td>
                        <td className="p-3 text-gray-300">{bill.lottoName}</td>
                        <td className="p-3 text-gray-400">
                          {bill.billLottoDraw
                            ? formatDateString(bill.billLottoDraw, 'short')
                            : "-"}
                        </td>
                        <td className="p-3 text-center font-semibold">
                          {formatCurrency(bill.totalAmount)}
                        </td>
                        <td className="p-3 text-gray-400">
                          {bill.note ?? "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 text-xs rounded-full bg-gray-700`}
                          >
                            {bill.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              handleDeleteBill(bill.id, bill.billRef)
                            }
                            disabled={deletingBillId === bill.id}
                            className="text-red-500 hover:text-red-400 disabled:text-gray-500 disabled:cursor-wait"
                            aria-label={`ลบบิล ${bill.billRef}`}
                          >
                            {deletingBillId === bill.id ? (
                              "กำลังลบ..."
                            ) : (
                              <TrashIcon className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.input-dark { width: 100%; padding: 0.625rem; background-color: #1F2937; border: 1px solid #4B5563; border-radius: 0.5rem; color: white; color-scheme: dark; transition: border-color 0.2s; } .input-dark:focus { outline: none; border-color: #3B82F6; } .filter-label { display: flex; align-items-center; gap: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #9CA3AF; margin-bottom: 0.25rem; } .kpi-card { background-color: #1F2937; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #374151; } .kpi-title { color: #9CA3AF; margin-bottom: 0.25rem; font-size: 0.875rem; } .chart-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items-center; gap: 0.5rem; color: #D1D5DB; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: #1F2937; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #4B5563; border-radius: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6B7280; }`}</style>
    </div>
  );
};

export default AccountPage;

/**
 * Custom Hook สำหรับตรวจสอบ Media Query (เช่น ขนาดหน้าจอ)
 * @param query - Media query string เช่น '(max-width: 639px)'
 * @returns boolean - คืนค่า true ถ้า query ตรงกับเงื่อนไข
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // ตรวจสอบค่าเริ่มต้นเมื่อ component โหลด
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // สร้าง Listener เพื่อคอยดักจับการเปลี่ยนแปลงขนาดหน้าจอ
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    // Cleanup function: ลบ listener ออกเมื่อ component ถูก unmount
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}
