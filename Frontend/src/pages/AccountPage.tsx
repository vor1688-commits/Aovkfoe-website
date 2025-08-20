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
import { formatDateString, getBetTypeName, formatDateBasicString } from "../services/BetService";
import { FullScreenLoader } from "../components/LoadingScreen";
import { useModal } from "../components/Modal";
import api from "../api/axiosConfig";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// --- Interfaces ---
interface GroupedWinningItem { id: string; billRef: string; username: string; lottoName: string; lottoDrawDate: string; bet_number: string; totalPayout: number; details: { bet_type: string; bet_style: string; payoutAmount: number; }[]; }
interface WinningItem { id: number; billRef: string; username: string; lottoName: string; lottoDrawDate: string; betType: string; betStyle: string; betNumber: string; payoutAmount: number; }
interface WinningNumbers { "3top"?: string[]; "2top"?: string[]; "2bottom"?: string[]; "3tote"?: string[]; }
interface SummaryData { totalBetAmount: number; totalWinnings: number; totalBills: number; netProfit: number; totalReturnedAmount: number; }
interface User { id: number; username: string; }
interface BreakdownData { byLottoType: { name: string; totalAmount: number; billCount: string }[]; }
interface RecentBill { id: number; billRef: string; username: string; createdAt: string; totalAmount: number; returnedAmount: number; status: string; lottoName: string; billLottoDraw: string | null; note: string | null; lottoRoundId: number; }
interface AllBetItemsSummary { number: string; style: string; count: string; totalAmount: number; }
interface SummaryApiResponse { summary: SummaryData; breakdown: BreakdownData; allBetItemsSummary: AllBetItemsSummary[]; users: User[]; }

// --- Helper Functions ---
const formatCurrency = (amount: number, decimals = 2) => amount.toLocaleString("th-TH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, });
const getDateString = (offsetDays = 0) => new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
const useAnimatedCounter = (to: number, isCurrency = true, decimals = 2) => { const [value, setValue] = useState(0); useEffect(() => { const controls = animate(0, to, { duration: 1.2, ease: "easeOut", onUpdate(latest: number) { setValue(latest); }, }); return () => controls.stop(); }, [to]); return isCurrency ? formatCurrency(value, decimals) : Math.round(value).toLocaleString(); };
const KpiCard: React.FC<{ title: string; value: number; icon: React.ReactNode; colorClass: string; isCurrency?: boolean; children?: React.ReactNode; }> = ({ title, value, icon, colorClass, isCurrency = true, children }) => { const animatedValue = useAnimatedCounter(value, isCurrency); return ( <motion.div className="kpi-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} > <div className="flex justify-between items-start"> <div> <h3 className="kpi-title">{title}</h3> <p className={`text-3xl font-bold ${colorClass}`}>{animatedValue}</p> </div> <div className={`p-3 rounded-full bg-gray-700/50 w-min ${colorClass}`}> {icon} </div> </div> {children && ( <div className="mt-4 pt-4 border-t border-gray-700/50">{children}</div> )} </motion.div> ); };
const MessageDisplay: React.FC<{ icon: React.ReactNode; title: string; message: string; }> = ({ icon, title, message }) => ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-10 bg-gray-800 rounded-lg border border-gray-700/50" > <div className="mx-auto h-12 w-12 text-gray-500">{icon}</div> <h3 className="mt-2 text-lg font-medium text-white">{title}</h3> <p className="mt-1 text-sm text-gray-400">{message}</p> </motion.div> );
export function useMediaQuery(query: string): boolean { const [matches, setMatches] = useState(false); useEffect(() => { const media = window.matchMedia(query); if (media.matches !== matches) { setMatches(media.matches); } const listener = () => setMatches(media.matches); window.addEventListener("resize", listener); return () => window.removeEventListener("resize", listener); }, [matches, query]); return matches; }


// --- Main Component ---
const AccountPage: React.FC = () => {
    const { user } = useAuth();
    const { alert, confirm, showStatus, hideStatus } = useModal();
    
    // --- States for Filters ---
    const [startDate, setStartDate] = useState(getDateString(29));
    const [endDate, setEndDate] = useState(getDateString(0));
    const [selectedUser, setSelectedUser] = useState("all");
    const [status, setStatus] = useState("all");
    const [userList, setUserList] = useState<User[]>([]);
    const [lottoOptions, setLottoOptions] = useState<Record<string, { roundId: number; roundName: string; cutoff_datetime: string }[]>>({});
    const [selectedLottoName, setSelectedLottoName] = useState("all");
    const [selectedDate, setSelectedDate] = useState("all");
    const [betSummarySearch, setBetSummarySearch] = useState('');
  
    // --- States for Data ---
    const [summaryData, setSummaryData] = useState<SummaryApiResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Pagination State for "Recent Bills"
    const [recentBills, setRecentBills] = useState<RecentBill[]>([]);
    const [recentBillsPage, setRecentBillsPage] = useState(1);
    const [recentBillsTotalPages, setRecentBillsTotalPages] = useState(0);
    const [deletingBillId, setDeletingBillId] = useState<number | null>(null);
    const [selectedBillIds, setSelectedBillIds] = useState<number[]>([]);
  
    // Pagination State for "Winning Items"
    const [winningItems, setWinningItems] = useState<GroupedWinningItem[]>([]);
    const [winningItemsPage, setWinningItemsPage] = useState(1);
    const [winningItemsTotalPages, setWinningItemsTotalPages] = useState(0);
    
    // States for Charts and Legends
    const [chartKey, setChartKey] = useState(0);
    const [hiddenLegends, setHiddenLegends] = useState<string[]>([]);
  
    useEffect(() => {
        if (user && user.role !== 'admin' && user.role !== 'owner') {
            setSelectedUser(user.username);
        } else if (user) {
            setSelectedUser("all");
        }
    }, [user]);
  
    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);
        setWinningItemsPage(1);
        setRecentBillsPage(1);
  
        const usernameParam = selectedUser === "all" ? "" : selectedUser;
        const commonParams = { 
            startDate, 
            endDate, 
            status, 
            username: usernameParam, 
            lottoName: selectedLottoName === "all" ? "" : selectedLottoName, 
            lottoDate: selectedDate === "all" ? "" : selectedDate 
        };
        
        const summaryRequest = api.get<SummaryApiResponse>(`/api/financial-summary`, { params: commonParams });
        const recentBillsRequest = api.get(`/api/bills`, { params: { ...commonParams, page: '1', limit: '20' } });
        const winningReportRequest = api.get(`/api/winning-report`, { params: { ...commonParams, page: '1', limit: '50' } });
        const optionsRequest = api.get(`/api/filters/lotto-options`, { params: { username: usernameParam } });
  
        try {
            const [summaryResponse, recentBillsResponse, winningReportResponse, optionsResponse] = await Promise.all([
              summaryRequest,
              recentBillsRequest,
              winningReportRequest,
              optionsRequest,
            ]);
    
            // Set Summary Data
            setSummaryData(summaryResponse.data);
            if (user.role === "owner" || user.role === 'admin') setUserList(summaryResponse.data.users || []);
            setLottoOptions(optionsResponse.data);
    
            // Set Recent Bills Data & Pagination
            setRecentBills(recentBillsResponse.data.bills || []);
            setRecentBillsPage(recentBillsResponse.data.pagination?.currentPage || 1);
            setRecentBillsTotalPages(recentBillsResponse.data.pagination?.totalPages || 0);
            
            // Set Winning Items Data & Pagination
            const rawWinningItems: WinningItem[] = winningReportResponse.data.items || [];
            const grouped = rawWinningItems.reduce((acc: Record<string, GroupedWinningItem>, item: WinningItem) => {
                const key = `${item.billRef}-${item.betNumber}`;
                if (!acc[key]) {
                    acc[key] = { id: key, billRef: item.billRef, username: item.username, lottoName: item.lottoName, lottoDrawDate: item.lottoDrawDate, bet_number: item.betNumber, totalPayout: 0, details: [] };
                }
                acc[key].totalPayout += parseFloat(item.payoutAmount as any);
                acc[key].details.push({ bet_type: item.betType, bet_style: item.betStyle, payoutAmount: parseFloat(item.payoutAmount as any) });
                return acc;
            }, {});
            const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.lottoDrawDate).getTime() - new Date(a.lottoDrawDate).getTime());
            
            setWinningItems(groupedArray);
            setWinningItemsPage(winningReportResponse.data.pagination?.currentPage || 1);
            setWinningItemsTotalPages(winningReportResponse.data.pagination?.totalPages || 0);
  
        } catch (err: any) {
            setError(err.response?.data?.error || "ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, selectedUser, status, user, selectedLottoName, selectedDate]);
  
    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [fetchDashboardData, user]);
  
    const handleRecentBillsPageChange = async (newPage: number) => {
      const params = { startDate, endDate, status, username: selectedUser === "all" ? "" : selectedUser, page: newPage.toString(), limit: '20' };
      const res = await api.get(`/api/bills`, { params });
      setRecentBills(res.data.bills || []);
      setRecentBillsPage(res.data.pagination?.currentPage || 1);
    };
    
    const handleWinningItemsPageChange = async (newPage: number) => {
      const params = { startDate, endDate, username: selectedUser === "all" ? "" : selectedUser, page: newPage.toString(), limit: '50' };
      const res = await api.get(`/api/winning-report`, { params });
      const rawWinningItems: WinningItem[] = res.data.items || [];
      const grouped = rawWinningItems.reduce((acc: Record<string, GroupedWinningItem>, item: WinningItem) => {
          const key = `${item.billRef}-${item.betNumber}`;
          if (!acc[key]) {
              acc[key] = { id: key, billRef: item.billRef, username: item.username, lottoName: item.lottoName, lottoDrawDate: item.lottoDrawDate, bet_number: item.betNumber, totalPayout: 0, details: [] };
          }
          acc[key].totalPayout += parseFloat(item.payoutAmount as any);
          acc[key].details.push({ bet_type: item.betType, bet_style: item.betStyle, payoutAmount: parseFloat(item.payoutAmount as any) });
          return acc;
      }, {});
      const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.lottoDrawDate).getTime() - new Date(a.lottoDrawDate).getTime());
      setWinningItems(groupedArray);
      setWinningItemsPage(res.data.pagination?.currentPage || 1);
    };
    
    const handleDeleteBill = async (billId: number, billRef: string) => {
        const isConfirm = await confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบิลเลขที่ "${billRef}"?`, "", "light");
        if (isConfirm) {
            setDeletingBillId(billId);
            try {
                await api.delete(`/api/delete-bills/${billId}`);
                await fetchDashboardData();
                showStatus("success", `ลบบิล "${billRef}" สำเร็จ`, "");
            } catch (err: any) {
                alert(err.response?.data?.error || "ไม่สามารถลบบิลได้", "", "light");
            } finally {
                setDeletingBillId(null);
            }
        }
    };
  
    const handleSelectOne = (billId: number) => {
        setSelectedBillIds(prevSelected => {
            if (prevSelected.includes(billId)) {
                return prevSelected.filter(id => id !== billId);
            } else {
                return [...prevSelected, billId];
            }
        });
    };
  
    const handleSelectAll = () => {
        if (selectedBillIds.length === recentBills.length) {
            setSelectedBillIds([]);
        } else {
            const allBillIds = recentBills.map(bill => bill.id);
            setSelectedBillIds(allBillIds);
        }
    };
  
    const handleDeleteSelected = async () => {
        if (selectedBillIds.length === 0) return;
        const isConfirmed = await confirm("ยืนยันการลบ", `คุณต้องการลบ ${selectedBillIds.length} บิลที่เลือกใช่หรือไม่?`, 'light');
        if (isConfirmed) {
            showStatus("loading", "กำลังลบ...", "");
            try {
                await api.post('/api/bills/batch-delete', { billIds: selectedBillIds });
                await fetchDashboardData();
                setSelectedBillIds([]);
                hideStatus();
                showStatus("success", `ลบ ${selectedBillIds.length} บิลเรียบร้อยแล้ว`, "");
            } catch (error) {
                hideStatus();
                console.error("Failed to delete selected bills:", error);
                showStatus("error", "เกิดข้อผิดพลาด", "ไม่สามารถลบรายการที่เลือกได้");
            }
        }
    }; 
  
    const handleLegendClick = (label: string) => {
        setHiddenLegends(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
    };
  
    const { displayTotalWinnings, displayNetProfit } = useMemo(() => {
      if (!summaryData?.summary) return { displayTotalWinnings: 0, displayNetProfit: 0 };
      return {
          displayTotalWinnings: summaryData.summary.totalWinnings,
          displayNetProfit: summaryData.summary.netProfit,
      };
    }, [summaryData]);

    const billWinnings = useMemo(() => {
        const winningsMap = new Map<string, number>();
        winningItems.forEach(group => {
            const currentWinnings = winningsMap.get(group.billRef) || 0;
            winningsMap.set(group.billRef, currentWinnings + group.totalPayout);
        });
        return winningsMap;
    }, [winningItems]);
  
    const { doughnutChartData, lottoNameBarChartData, groupedBetSummary, topBetNumbersChartData } = useMemo(() => {
        if (!summaryData) {
            return { doughnutChartData: { labels: [], datasets: [] }, lottoNameBarChartData: { labels: [], datasets: [] }, groupedBetSummary: {}, topBetNumbersChartData: { labels: [], datasets: [] } };
        }
        const originalData = summaryData.breakdown.byLottoType || [];
        const filteredData = originalData.filter(d => !hiddenLegends.includes(d.name));
        const doughnutData = {
            labels: filteredData.map((d) => d.name),
            datasets: [{
                data: filteredData.map((d) => d.totalAmount),
                backgroundColor: originalData.map(d => {
                    const originalIndex = summaryData.breakdown.byLottoType.findIndex(od => od.name === d.name) ?? 0;
                    const colors = ["#16A34A", "#DC2626", "#D97706", "#2563EB", "#7C3AED", "#DB2777", "#0891B2", "#65A30D"];
                    return colors[originalIndex % colors.length];
                }),
                borderColor: "#1F2937",
                borderWidth: 4,
                hoverOffset: 8,
            }],
        };
        const barData = {
            labels: originalData.map((d) => d.name),
            datasets: [{
                label: "จำนวนบิล",
                data: originalData.map((d) => Number(d.billCount)),
                backgroundColor: "rgba(59, 130, 246, 0.7)",
                borderColor: "rgba(59, 130, 246, 1)",
                borderWidth: 1,
            }],
        };
        const groupedSummary = summaryData.allBetItemsSummary.reduce((acc: Record<string, { totalAmount: number, totalCount: number, styles: any[] }>, item) => {
            if (!acc[item.number]) {
                acc[item.number] = { totalAmount: 0, totalCount: 0, styles: [] };
            }
            acc[item.number].totalAmount += item.totalAmount;
            acc[item.number].totalCount += Number(item.count);
            acc[item.number].styles.push({ style: item.style, count: Number(item.count), totalAmount: item.totalAmount });
            return acc;
        }, {});
        const sortedGroupedSummary = Object.entries(groupedSummary)
            .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
            .reduce((acc: Record<string, any>, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});
        const sortedNumbers = Object.entries(sortedGroupedSummary);
        const topData = {
            labels: sortedNumbers.map(([number]) => number),
            datasets: [{
                label: 'ยอดแทงรวม',
                data: sortedNumbers.map(([, data]) => data.totalAmount),
                backgroundColor: sortedNumbers.map((_, index) => ["rgba(59, 130, 246, 0.7)", "rgba(16, 185, 129, 0.7)", "rgba(239, 68, 68, 0.7)"][index % 3]),
                borderColor: sortedNumbers.map((_, index) => ["rgba(59, 130, 246, 1)", "rgba(16, 185, 129, 1)", "rgba(239, 68, 68, 1)"][index % 3]),
                borderWidth: 1,
            }],
        };
        return { doughnutChartData: doughnutData, lottoNameBarChartData: barData, groupedBetSummary: sortedGroupedSummary, topBetNumbersChartData: topData };
      }, [summaryData, hiddenLegends]);
  
    useEffect(() => { 
        setChartKey(prevKey => prevKey + 1);
    }, [topBetNumbersChartData]);
  
    const chartOptions = (titleText: string, legendDisplay = false): ChartOptions<'bar' | 'doughnut'> => ({
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: legendDisplay, position: "top" as const, labels: { color: "#D1D5DB", font: { size: 12 } }, }, title: { display: false }, tooltip: { backgroundColor: "rgba(0, 0, 0, 0.8)", titleFont: { size: 14 }, bodyFont: { size: 12 }, callbacks: { label: (c: any) => `${c.label}: ${c.raw.toLocaleString()} ${ titleText.includes("ยอดขาย") ? "บาท" : "บิล" }`, }, }, }, scales: { x: { ticks: { color: "#9CA3AF" }, grid: { color: "rgba(156, 163, 175, 0.1)" }, }, y: { ticks: { color: "#9CA3AF" }, grid: { color: "rgba(156, 163, 175, 0.1)" }, }, },
    });
  
    const chartOptions2 = (titleText: string, axis: "x" | "y", legendDisplay = false): ChartOptions<"bar"> => {
        const xPosition = axis === "y" ? "top" : "bottom";
        return {
            indexAxis: axis, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: legendDisplay, position: "top", labels: { color: "#D1D5DB", font: { size: 12 } }, }, title: { display: false }, tooltip: { backgroundColor: "rgba(0, 0, 0, 0.8)", titleFont: { size: 14 }, bodyFont: { size: 12 }, callbacks: { label: (c: any) => `${c.label}: ${c.raw.toLocaleString()} ${ titleText.includes("ยอดขาย") ? "บาท" : "บาท" }`, }, }, }, scales: { x: { position: xPosition, beginAtZero: true, ticks: { color: "#9CA3AF" }, grid: { color: "rgba(156, 163, 175, 0.1)" }, title: { display: true, text: axis === "y" ? "ยอดแทง (บาท)" : "ตัวเลข", color: "#9CA3AF", font: { size: 14 }, }, }, y: { ticks: { color: "#9CA3AF" }, grid: { display: false }, title: { display: true, text: axis === "x" ? "ยอดแทง (บาท)" : "ตัวเลข", color: "#9CA3AF", font: { size: 14 }, }, }, },
        };
    };
  
    const getStatusPill = (status: string) => {
        switch (status) {
            case 'รอผล': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">{status}</span>;
            case 'ยืนยันแล้ว': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">{status}</span>;
            case 'ยกเลิก': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">{status}</span>;
            default: return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">{status}</span>;
        }
    };
  
    const filteredAndSortedSummary = Object.entries(groupedBetSummary)
        .filter(([number]) => number.includes(betSummarySearch))
        .sort(([, dataA]: [string, any], [, dataB]: [string, any]) => dataB.totalAmount - dataA.totalAmount);
  
    const isMediumScreenOrLarger = useMediaQuery("(min-width: 768px)");
    const chartAxis = isMediumScreenOrLarger ? "x" : "y";
    const horizontalChartHeight = topBetNumbersChartData.labels.length * 35;
    
    const groupedDateOptions = useMemo(() => {
        if (selectedLottoName === "all" || !lottoOptions[selectedLottoName]) return [];
        const dates = new Set<string>();
        lottoOptions[selectedLottoName].forEach((round) => {
            const date = new Date(round.cutoff_datetime).toISOString().split("T")[0];
            dates.add(date);
        });
        return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [lottoOptions, selectedLottoName]);

    return (
        <div className="space-y-6 text-white">
            <h1 className="text-3xl font-bold">สรุปภาพรวมบัญชี</h1>
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
                    <div>
                        <label className="filter-label"><CalendarDaysIcon className="h-4 w-4" /> ตั้งแต่วันที่</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-dark"/>
                    </div>
                    <div>
                        <label className="filter-label"><CalendarDaysIcon className="h-4 w-4" /> ถึงวันที่</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-dark" />
                    </div>
                    <div className="lg:col-span-2 xl:col-span-2 grid grid-cols-2 gap-2">
                        <div>
                            <label className="filter-label">ประเภทหวย</label>
                            <select value={selectedLottoName} onChange={(e) => {setSelectedLottoName(e.target.value); setSelectedDate("all");}} className="input-dark">
                                <option value="all">ทุกประเภท</option>
                                {Object.keys(lottoOptions).map((name) => (<option key={name} value={name}>{name}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="filter-label">งวดวันที่</label>
                            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-dark" disabled={selectedLottoName === "all"}>
                                <option value="all">ทุกงวด</option>
                                {groupedDateOptions?.map((date) => (
                                    <option key={date} value={date}>
                                        {new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="filter-label"><TagIcon className="h-4 w-4" /> สถานะบิล</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-dark">
                            <option value="all">ทุกสถานะ</option><option value="ยืนยันแล้ว">ยืนยันแล้ว</option><option value="รอผล">รอผล</option><option value="ยกเลิก">ยกเลิก</option>
                        </select>
                    </div>
                    {user?.role === "owner" || user?.role === "admin" ? (
                        <div className="grid grid-cols-2 gap-2 items-end">
                        <div>
                            <label className="filter-label"><UserCircleIcon className="h-4 w-4" /> ผู้ใช้งาน</label>
                            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="input-dark">
                                <option value="all">แสดงทั้งหมด</option>
                                {userList.map((u) => (<option key={u.id} value={u.username}>{u.username}</option>))}
                            </select>
                        </div>
                        <div>
                            <button onClick={fetchDashboardData} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold p-2.5 rounded-md hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed">{isLoading ? "กำลังโหลด..." : "แสดงรายงาน"}</button>
                        </div>
                        </div>
                    ) : (
                        <div className="lg:col-start-4 xl:col-start-6">
                        <button onClick={fetchDashboardData} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold p-2.5 rounded-md hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed">{isLoading ? "กำลังโหลด..." : "แสดงรายงาน"}</button>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isLoading ? ( <FullScreenLoader isLoading={true} text="กำลังโหลดข้อมูล..." /> ) 
                : error ? ( <MessageDisplay icon={<ExclamationTriangleIcon />} title="เกิดข้อผิดพลาด" message={error} /> ) 
                : !summaryData || summaryData.summary.totalBills === 0 ? ( <MessageDisplay icon={<InformationCircleIcon />} title="ไม่พบข้อมูล" message="ไม่พบรายการในช่วงเวลาที่คุณเลือก" /> ) 
                : (
                <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <KpiCard title="ยอดแทงทั้งหมด (สุทธิ)" value={summaryData.summary.totalBetAmount} icon={<BanknotesIcon className="h-6 w-6" />} colorClass="text-blue-400" />
                        <KpiCard title="ยอดคืนเลขทั้งหมด" value={summaryData.summary.totalReturnedAmount} icon={<TrashIcon className="h-6 w-6" />} colorClass="text-gray-400" />
                        <KpiCard title="ยอดถูกรางวัลทั้งหมด" value={displayTotalWinnings} icon={<TrophyIcon className="h-6 w-6" />} colorClass="text-green-400" />
                        <KpiCard title="กำไร / ขาดทุน" value={displayNetProfit} icon={displayNetProfit >= 0 ? (<ArrowTrendingUpIcon className="h-6 w-6" />) : (<ArrowTrendingDownIcon className="h-6 w-6" />)} colorClass={displayNetProfit >= 0 ? "text-green-400" : "text-red-400"} />
                        <KpiCard title="จำนวนบิลทั้งหมด" value={summaryData.summary.totalBills} icon={<TicketIcon className="h-6 w-6" />} colorClass="text-gray-300" isCurrency={false}>
                            <div className="space-y-2 text-sm max-h-24 overflow-y-auto custom-scrollbar">
                                {(summaryData.breakdown.byLottoType || []).length > 0 ? (
                                    summaryData.breakdown.byLottoType.map((item) => (
                                        <div key={item.name} className="flex justify-between items-center">
                                            <span className="text-gray-400">{item.name}</span>
                                            <span className="font-semibold">{Number(item.billCount).toLocaleString()} บิล</span>
                                        </div>
                                    ))
                                ) : ( <p className="text-gray-500 italic">ไม่มีข้อมูล</p> )}
                            </div>
                        </KpiCard>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="kpi-card lg:col-span-2 h-96 flex flex-col">
                            <h3 className="chart-title">
                                <ChartPieIcon className="h-6 w-6" /> สัดส่วนยอดขายตามหวย
                            </h3>
                            <div className="flex-grow flex flex-row items-center gap-4 overflow-hidden">
                                <div className="relative w-1/2 h-full">
                                    <Doughnut data={doughnutChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: "rgba(0, 0, 0, 0.8)", callbacks: { label: (c: any) => `${c.label}: ${c.raw.toLocaleString()} บาท`, }, }, }, }}/>
                                </div>
                                <div className="w-1/2 h-full overflow-y-auto custom-scrollbar pr-2">
                                    <ul className="space-y-2">
                                        {(summaryData?.breakdown.byLottoType || []).map((item) => {
                                            const originalIndex = summaryData?.breakdown.byLottoType.findIndex(od => od.name === item.name) ?? 0;
                                            const colors = ["#16A34A", "#DC2626", "#D97706", "#2563EB", "#7C3AED", "#DB2777", "#0891B2", "#65A30D"];
                                            const backgroundColor = colors[originalIndex % colors.length];
                                            const totalAmount = summaryData?.summary.totalBetAmount || 1;
                                            const percentage = (item.totalAmount / totalAmount) * 100;
                                            const isHidden = hiddenLegends.includes(item.name);
                                            return (
                                                <li key={item.name} className={`flex items-center text-sm justify-between cursor-pointer p-1 rounded-md transition-colors ${isHidden ? 'opacity-50 hover:bg-gray-700/50' : 'hover:bg-gray-700/50'}`} onClick={() => handleLegendClick(item.name)}>
                                                    <div className="flex items-center">
                                                        <span className="w-3 h-3 rounded-full mr-3 shrink-0" style={{ backgroundColor: isHidden ? '#6B7280' : backgroundColor }}></span>
                                                        <span className={`${isHidden ? 'line-through text-gray-500' : 'text-gray-300'}`} title={item.name}>{item.name}</span>
                                                    </div>
                                                    <span className={`font-semibold ml-2 shrink-0 ${isHidden ? 'line-through text-gray-500' : 'text-white'}`}>{percentage.toFixed(1)}%</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="kpi-card lg:col-span-3 h-96 flex flex-col">
                            <h3 className="chart-title">
                                <PresentationChartLineIcon className="h-6 w-6" /> จำนวนบิลตามประเภทหวย
                            </h3>
                            <div className="relative flex-grow">
                                <Bar data={lottoNameBarChartData} options={chartOptions("จำนวนบิล")}/>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="kpi-card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="chart-title mb-0"><TableCellsIcon className="h-6 w-6" />สรุปยอดแทงตามตัวเลข</h3>
                                <div className="relative">
                                    <input type="text" value={betSummarySearch} onChange={e => setBetSummarySearch(e.target.value.replace(/[^0-9]/g, ''))} maxLength={3} placeholder="ค้นหาเลข..." className="input-dark w-32 !pl-8" />
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 absolute top-1/2 left-2 -translate-y-1/2"/>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                                {filteredAndSortedSummary.length > 0 ? (
                                    filteredAndSortedSummary.map(([number, data]) => (
                                        <div key={number} className="bg-gray-800/50 p-3 rounded-lg">
                                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xl text-cyan-400">{number}</span>
                                                    <span className="text-sm font-semibold text-white">{data.totalCount.toLocaleString()} ชุด</span>
                                                </div>
                                                <div className="font-bold text-base text-white text-right">
                                                    {formatCurrency(data.totalAmount)}
                                                    <span className="text-xs text-gray-500 ml-1">บาท</span>
                                                </div>
                                            </div> 
                                            <div className="space-y-1">
                                                {data.styles.map((styleItem: any, styleIndex: number) => (
                                                    <div key={styleIndex} className="flex justify-between items-center text-sm pl-2"> 
                                                        <span className="text-gray-300 capitalize"> 
                                                            <span className={`font-semibold ${(styleItem.style ==='บน' || styleItem.style ==='ตรง') ? "text-green-500" : (styleItem.style ==='ล่าง') ? "text-red-500" : "text-orange-400"}`}>
                                                                {styleItem.style}
                                                            </span> 
                                                            <span className="text-gray-500 ml-2"> ({styleItem.count} ชุด)</span>
                                                        </span>
                                                        <span className="font-semibold font-mono text-gray-300">{formatCurrency(styleItem.totalAmount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                ) : ( <p className="text-gray-500 italic text-center py-4">{betSummarySearch ? `ไม่พบข้อมูลเลข "${betSummarySearch}"` : "ไม่พบข้อมูล"}</p> )}
                            </div>
                        </div>
                        <div className="kpi-card">
                            <h2 className="text-xl font-bold mb-4 text-green-600">รายการที่ถูกรางวัล</h2>
                            {winningItems.length > 0 ? (
                                <>
                                    <p className="text-sm text-gray-400 -mt-3 mb-4">แสดง {winningItems.length} รายการสรุป (จากทั้งหมด)</p>
                                    <div className="overflow-x-auto max-h-96 custom-scrollbar">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-gray-400 sticky top-0 bg-gray-900">
                                                <tr className="border-b border-gray-700">
                                                    <th className="p-3 whitespace-nowrap">เลขบิล</th>
                                                    {(user?.role === "owner" || user?.role === 'admin') && (<th className="p-3 whitespace-nowrap">ผู้ใช้</th>)}
                                                    <th className="p-3 whitespace-nowrap">งวดหวย</th>
                                                    <th className="p-3 whitespace-nowrap">ประเภท</th>
                                                    <th className="p-3 whitespace-nowrap">เลข</th>
                                                    <th className="p-3 text-right whitespace-nowrap">เงินรางวัลรวม</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {winningItems.map((group) => (
                                                    <tr key={group.id} className="border-b border-gray-800 hover:bg-gray-800/50 whitespace-nowrap">
                                                        <td className="p-3 font-mono text-blue-400 whitespace-nowrap">{group.billRef}</td>
                                                        {(user?.role === "owner" || user?.role === 'admin') && (<td className="p-3 whitespace-nowrap">{group.username}</td>)}
                                                        <td className="p-3 whitespace-nowrap">{group.lottoName}<br /><span className="text-xs text-gray-500 whitespace-nowrap">{formatDateString(group.lottoDrawDate, 'short')}</span></td>
                                                        <td className="p-3 whitespace-nowrap text-xs">{group.details.map((detail, index) => (<div key={index}>{getBetTypeName(detail.bet_type)} ({detail.bet_style})</div>))}</td>
                                                        <td className="p-3 font-mono whitespace-nowrap">{group.bet_number}</td>
                                                        <td className="p-3 text-right font-semibold text-green-400 whitespace-nowrap">{formatCurrency(group.totalPayout)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {winningItemsTotalPages > 1 && (
                                        <div className="flex items-center justify-end mt-4">
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => handleWinningItemsPageChange(winningItemsPage - 1)} disabled={winningItemsPage === 1} className="px-3 py-1 text-xs text-white bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50">ก่อนหน้า</button>
                                                <span className="text-sm text-gray-400">หน้า {winningItemsPage} จาก {winningItemsTotalPages}</span>
                                                <button onClick={() => handleWinningItemsPageChange(winningItemsPage + 1)} disabled={winningItemsPage === winningItemsTotalPages} className="px-3 py-1 text-xs text-white bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50">ถัดไป</button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : ( <div className="text-center py-16"><TrophyIcon className="mx-auto h-12 w-12 text-gray-600" /><p className="mt-2 text-gray-500 italic">ยังไม่มีรายการที่ถูกรางวัล</p></div> )}
                        </div>
                    </div>
                    
                    <div className="kpi-card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">บิลล่าสุด</h2>
                            {selectedBillIds.length > 0 && (<button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-500 transition-colors text-sm font-bold flex items-center gap-2"><TrashIcon className="h-4 w-4" /> ลบ {selectedBillIds.length} รายการที่เลือก</button>)}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-400">
                                    <tr className="border-b border-gray-700">
                                        <th className="p-3">
                                            <label htmlFor="select-all-checkbox" className="relative flex items-center justify-center cursor-pointer p-2">
                                                <input id="select-all-checkbox" type="checkbox" className="peer sr-only" checked={recentBills.length > 0 && selectedBillIds.length === recentBills.length} onChange={handleSelectAll} disabled={recentBills.length === 0}/>
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-500 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all duration-200"></div>
                                                <div className="absolute w-2 h-2 rounded-full bg-gray-900 opacity-0 peer-checked:opacity-100 transition-opacity duration-200"></div>
                                            </label>
                                        </th>
                                        <th className="p-3 whitespace-nowrap">เลขที่บิล</th>
                                        {(user?.role === "owner" || user?.role === 'admin') && (<th className="p-3 whitespace-nowrap">ผู้ใช้งาน</th>)}
                                        <th className="p-3 whitespace-nowrap">วันที่บันทึก</th>
                                        <th className="p-3 whitespace-nowrap">ประเภทหวย</th>
                                        <th className="p-3 whitespace-nowrap">งวดวันที่</th>
                                        <th className="p-3 text-center whitespace-nowrap">ยอดรวม (สุทธิ)</th>
                                        <th className="p-3 whitespace-nowrap">บันทึกช่วยจำ</th>
                                        <th className="p-3 text-center whitespace-nowrap">สถานะ</th>
                                        <th className="p-3 text-right whitespace-nowrap">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentBills.length > 0 ? recentBills.map((bill) => (
                                        <tr key={bill.id} className={`border-b border-gray-800 transition-colors ${selectedBillIds.includes(bill.id) ? 'bg-blue-900/50' : 'hover:bg-gray-800/50'}`}>
                                            <td className="p-3">
                                                <label htmlFor={`select-bill-${bill.id}`} className="relative flex items-center justify-center cursor-pointer p-2">
                                                    <input id={`select-bill-${bill.id}`} type="checkbox" className="peer sr-only" checked={selectedBillIds.includes(bill.id)} onChange={() => handleSelectOne(bill.id)} />
                                                    <div className="w-5 h-5 rounded-full border-2 border-gray-500 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all duration-200"></div>
                                                    <div className="absolute w-2 h-2 rounded-full bg-gray-900 opacity-0 peer-checked:opacity-100 transition-opacity duration-200"></div>
                                                </label>
                                            </td>
                                            <td className="p-3 font-mono text-blue-400 whitespace-nowrap">{bill.billRef}</td>
                                            {(user?.role === "owner" || user?.role === 'admin') && (<td className="p-3 text-gray-300">{bill.username}</td>)}
                                            <td className="p-3 text-gray-400 whitespace-nowrap">{new Date(bill.createdAt).toLocaleString("th-TH")}</td>
                                            <td className="p-3 text-gray-300 whitespace-nowrap">{bill.lottoName}</td>
                                            <td className="p-3 text-gray-400 whitespace-nowrap">{bill.billLottoDraw ? formatDateString(bill.billLottoDraw, 'short') : "-"}</td>
                                            <td className="p-3 text-center font-semibold whitespace-nowrap">{formatCurrency(bill.totalAmount)}</td>
                                            <td className="p-3 text-gray-400 whitespace-nowrap">{bill.note ?? "-"}</td>
                                            <td className="p-3 text-center whitespace-nowrap">{getStatusPill(bill.status)}</td>
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <button onClick={() => handleDeleteBill(bill.id, bill.billRef)} disabled={deletingBillId === bill.id} className="text-red-500 hover:text-red-400 disabled:text-gray-500 disabled:cursor-wait">
                                                    {deletingBillId === bill.id ? "กำลังลบ..." : <TrashIcon className="h-5 w-5" />}
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={user?.role === 'admin' || user?.role === 'owner' ? 10 : 9} className="text-center py-10 text-gray-500 italic">ไม่มีบิลล่าสุด</td></tr>
                                    )}
                                </tbody>
                </table>
                </div>
                {recentBillsTotalPages > 1 && (
                    <div className="flex items-center justify-end mt-4">
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleRecentBillsPageChange(recentBillsPage - 1)} disabled={recentBillsPage === 1} className="px-3 py-1 text-xs text-white bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50">ก่อนหน้า</button>
                            <span className="text-sm text-gray-400">หน้า {recentBillsPage} จาก {recentBillsTotalPages}</span>
                            <button onClick={() => handleRecentBillsPageChange(recentBillsPage + 1)} disabled={recentBillsPage === recentBillsTotalPages} className="px-3 py-1 text-xs text-white bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50">ถัดไป</button>
                        </div>
                    </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.input-dark { width: 100%; padding: 0.625rem; background-color: #1F2937; border: 1px solid #4B5563; border-radius: 0.5rem; color: white; color-scheme: dark; transition: border-color 0.2s; } .input-dark:focus { outline: none; border-color: #3B82F6; } .filter-label { display: flex; align-items-center; gap: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #9CA3AF; margin-bottom: 0.25rem; } .kpi-card { background-color: #1F2937; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #374151; } .kpi-title { color: #9CA3AF; margin-bottom: 0.25rem; font-size: 0.875rem; } .chart-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items-center; gap: 0.5rem; color: #D1D5DB; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: #1F2937; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #4B5563; border-radius: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6B7280; }`}</style>
    </div>
  );
};

export default AccountPage;

// import React, { useState, useEffect, useCallback, useMemo } from "react"; 
// import type { ChartOptions } from "chart.js";
// import { useAuth } from "../contexts/AuthContext";
// import { Bar, Doughnut } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement,
// } from "chart.js";
// import {
//   ArrowTrendingUpIcon,
//   ArrowTrendingDownIcon,
//   BanknotesIcon,
//   TicketIcon,
//   ChartPieIcon,
//   CalendarDaysIcon,
//   UserCircleIcon,
//   TagIcon,
//   ExclamationTriangleIcon,
//   InformationCircleIcon,
//   PresentationChartLineIcon,
//   TrophyIcon,
//   TrashIcon,
//   TableCellsIcon,
// } from "@heroicons/react/24/outline";
// import { motion, AnimatePresence, animate } from "framer-motion";
// import { formatDateString, getBetTypeName } from "../services/BetService";
// import { FullScreenLoader } from "../components/LoadingScreen";
// import { useModal } from "../components/Modal";
// import api from "../api/axiosConfig";
// import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement
// );

// // --- Interfaces ---
// interface GroupedWinningItem {
//   id: string;
//   billRef: string;
//   username: string;
//   lottoName: string;
//   lottoDrawDate: string;
//   bet_number: string;
//   totalPayout: number;
//   details: {
//     bet_type: string;
//     bet_style: string;
//     payoutAmount: number;
//   }[];
// }

// interface CheckableItem {
//   id: number;
//   lottoRoundId: number;
//   bet_number: string;
//   price: number;
//   bet_style: string;
//   baht_per: number;
//   bet_type: string;
//   billRef: string;
//   note: string | null;
//   createdAt: string;
//   lottoName: string;
//   lottoDrawDate: string;
//   winningNumbers: WinningNumbers | null;
//   lottoRoundStatus: string;
//   username: string;
//   rate: number;
//   payoutAmount: number;
// }

// interface WinningNumbers {
//   "3top"?: string[];
//   "2top"?: string[];
//   "2bottom"?: string[];
//   "3tote"?: string[];
// }

// interface SummaryData {
//   totalBetAmount: number;
//   totalWinnings: number;
//   totalBills: number;
//   netProfit: number;
//   totalReturnedAmount: number;
// }

// interface User {
//   id: number;
//   username: string;
// }

// interface BreakdownData {
//   byLottoType: { name: string; totalAmount: number; billCount: string }[];
// }

// interface RecentBill {
//   id: number;
//   billRef: string;
//   username: string;
//   createdAt: string;
//   totalAmount: number;
//   returnedAmount: number;
//   status: string;
//   lottoName: string;
//   billLottoDraw: string | null;
//   note: string | null;
//   lottoRoundId: number;
// }

// interface AllBetItemsSummary {
//   number: string;
//   style: string;
//   count: string;
//   totalAmount: number;
// }

// interface SummaryApiResponse {
//   summary: SummaryData;
//   breakdown: BreakdownData;
//   allBetItemsSummary: AllBetItemsSummary[];
//   recentBills: RecentBill[];
//   users: User[];
// }

// // --- Helper Functions ---
// const formatCurrency = (amount: number, decimals = 2) =>
//   amount.toLocaleString("th-TH", {
//     minimumFractionDigits: decimals,
//     maximumFractionDigits: decimals,
//   });

// const getDateString = (offsetDays = 0) =>
//   new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000)
//     .toISOString()
//     .split("T")[0];

// const sortString = (str: string) => str.split("").sort().join("");

// const calculatePrizeDetails = (item: CheckableItem): { isWinner: boolean } => {
//   if (
//     item.lottoRoundStatus !== "closed" &&
//     item.lottoRoundStatus !== "manual_closed"
//   ) {
//     return { isWinner: false };
//   }
//   const winningNumbers = item.winningNumbers;
//   if (!winningNumbers) {
//     return { isWinner: false };
//   }
//   let prizeKey: keyof WinningNumbers | null = null;
//   const betType = item.bet_type;
//   const betStyle = item.bet_style.toLowerCase();
//   if (betType.includes("3")) {
//     if (betStyle === "ตรง") prizeKey = "3top";
//     else if (betStyle === "โต๊ด") prizeKey = "3tote";
//   } else if (betType.includes("2")) {
//     if (betStyle === "บน") prizeKey = "2top";
//     else if (betStyle === "ล่าง") prizeKey = "2bottom";
//   }
//   if (!prizeKey) {
//     return { isWinner: false };
//   }
//   const prizeValue = winningNumbers[prizeKey];
//   if (!prizeValue || prizeValue.length === 0) {
//     return { isWinner: false };
//   }
//   let isWinner = false;
//   if (prizeKey === "3tote") {
//     const sortedBetNumber = sortString(item.bet_number);
//     if (Array.isArray(prizeValue)) {
//       isWinner = prizeValue.some(
//         (winNum) => sortString(winNum) === sortedBetNumber
//       );
//     }
//   } else {
//     if (Array.isArray(prizeValue)) {
//       isWinner = prizeValue.includes(item.bet_number);
//     } else if (typeof prizeValue === "string") {
//       isWinner = prizeValue === item.bet_number;
//     }
//   }
//   return { isWinner };
// };

// const useAnimatedCounter = (to: number, isCurrency = true, decimals = 2) => {
//   const [value, setValue] = useState(0);
//   useEffect(() => {
//     const controls = animate(0, to, {
//       duration: 1.2,
//       ease: "easeOut",
//       onUpdate(latest: number) {
//         setValue(latest);
//       },
//     });
//     return () => controls.stop();
//   }, [to]);
//   return isCurrency
//     ? formatCurrency(value, decimals)
//     : Math.round(value).toLocaleString();
// };

// const KpiCard: React.FC<{
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   colorClass: string;
//   isCurrency?: boolean;
//   children?: React.ReactNode;
// }> = ({ title, value, icon, colorClass, isCurrency = true, children }) => {
//   const animatedValue = useAnimatedCounter(value, isCurrency);
//   return (
//     <motion.div
//       className="kpi-card"
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.5 }}
//     >
//       <div className="flex justify-between items-start">
//         <div>
//           <h3 className="kpi-title">{title}</h3>
//           <p className={`text-3xl font-bold ${colorClass}`}>{animatedValue}</p>
//         </div>
//         <div className={`p-3 rounded-full bg-gray-700/50 w-min ${colorClass}`}>
//           {icon}
//         </div>
//       </div>
//       {children && (
//         <div className="mt-4 pt-4 border-t border-gray-700/50">{children}</div>
//       )}
//     </motion.div>
//   );
// };

// const MessageDisplay: React.FC<{
//   icon: React.ReactNode;
//   title: string;
//   message: string;
// }> = ({ icon, title, message }) => (
//   <motion.div
//     initial={{ opacity: 0 }}
//     animate={{ opacity: 1 }}
//     className="text-center p-10 bg-gray-800 rounded-lg border border-gray-700/50"
//   >
//     <div className="mx-auto h-12 w-12 text-gray-500">{icon}</div>
//     <h3 className="mt-2 text-lg font-medium text-white">{title}</h3>
//     <p className="mt-1 text-sm text-gray-400">{message}</p>
//   </motion.div>
// );

// // --- Main Component ---
// const AccountPage: React.FC = () => {
//   const { user } = useAuth();
//   const [summaryData, setSummaryData] = useState<SummaryApiResponse | null>(null);
//   const [checkableItems, setCheckableItems] = useState<CheckableItem[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [deletingBillId, setDeletingBillId] = useState<number | null>(null);

//   const [startDate, setStartDate] = useState(getDateString(29));
//   const [endDate, setEndDate] = useState(getDateString(0));
//   const [selectedUser, setSelectedUser] = useState("");
//   const [status, setStatus] = useState("all");
//   const [userList, setUserList] = useState<User[]>([]);
//   const { alert, confirm, showStatus, hideStatus } = useModal();
//   const [betSummarySearch, setBetSummarySearch] = useState('');

//   const [selectedBillIds, setSelectedBillIds] = useState<number[]>([]);

//   const [lottoOptions, setLottoOptions] = useState<Record<string, { roundId: number; roundName: string; cutoff_datetime: string }[]>>({});
//   const [selectedLottoName, setSelectedLottoName] = useState("all");
//   const [selectedDate, setSelectedDate] = useState("all");

//   const [chartKey, setChartKey] = useState(0);

//   // ✨ --- [เพิ่ม] State สำหรับจัดการ Legend --- ✨
//   const [hiddenLegends, setHiddenLegends] = useState<string[]>([]);

//   useEffect(() => {
//     if (user) setSelectedUser(user.username);
//   }, [user]);

//   const fetchAllData = useCallback(async () => {
//     if (!user) return;
//     setIsLoading(true);
//     setError(null);

//     const summaryParams = new URLSearchParams({ startDate, endDate, status });
//     const prizeCheckParams = new URLSearchParams({
//       startDate,
//       endDate,
//       status: "ยืนยันแล้ว",
//     });

//     if ((user.role === "owner" || user.role === 'admin') && selectedUser !== "all") {
//       summaryParams.append("username", selectedUser);
//       prizeCheckParams.append("username", selectedUser);
//     }

//     if (selectedLottoName !== "all") {
//       summaryParams.append("lottoName", selectedLottoName);
//       prizeCheckParams.append("lottoName", selectedLottoName);
//     }
//     if (selectedDate !== "all") {
//       summaryParams.append("lottoDate", selectedDate);
//       prizeCheckParams.append("lottoDate", selectedDate);
//     }

//     const optionsParams = new URLSearchParams();
//     if ((user.role === "owner" || user.role === 'admin') && selectedUser && selectedUser !== "all") {
//       optionsParams.append("username", selectedUser);
//     } else if (user.role !== "owner" && user.role !== 'admin') {
//       optionsParams.append("username", user.username);
//     }

//     const summaryRequest = api.get<SummaryApiResponse>(`/api/financial-summary?${summaryParams.toString()}`);
//     const prizeCheckRequest = api.get<CheckableItem[]>(`/api/prize-check/all-items?${prizeCheckParams.toString()}`);
//     const optionsRequest = api.get(`/api/filters/lotto-options?${optionsParams.toString()}`);

//     try {
//       const [summaryResponse, prizeCheckResponse, optionsResponse] =
//         await Promise.all([summaryRequest, prizeCheckRequest, optionsRequest]);
//       setSummaryData(summaryResponse.data);
//       setCheckableItems(prizeCheckResponse.data);
//       setLottoOptions(optionsResponse.data);
//       if (user.role === "owner" || user.role === 'admin') setUserList(summaryResponse.data.users || []);
//     } catch (err: any) {
//       setError(err.response?.data?.error || "ไม่สามารถโหลดข้อมูลได้");
//       setSummaryData(null);
//       setCheckableItems([]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [startDate, endDate, selectedUser, status, user, selectedLottoName, selectedDate]);

//   useEffect(() => {
//     if (selectedUser) fetchAllData();
//   }, [fetchAllData, selectedUser]);

//   const handleDeleteBill = async (billId: number, billRef: string) => {
//     const isConfirm = await confirm(
//       `คุณแน่ใจหรือไม่ว่าต้องการลบบิลเลขที่ "${billRef}"?`,
//       "",
//       "light"
//     );
//     if (isConfirm) {
//       setDeletingBillId(billId);
//       try {
//         await api.delete(`/api/delete-bills/${billId}`);
//         await fetchAllData();
//         showStatus("success", `ลบบิล "${billRef}" สำเร็จ`, "");
//       } catch (err: any) {
//         alert(err.response?.data?.error || "ไม่สามารถลบบิลได้", "", "light");
//       } finally {
//         setDeletingBillId(null);
//       }
//     }
//   };

//   const handleSelectOne = (billId: number) => {
//     setSelectedBillIds(prevSelected => {
//       if (prevSelected.includes(billId)) {
//         return prevSelected.filter(id => id !== billId);
//       } else {
//         return [...prevSelected, billId];
//       }
//     });
//   };

//   const handleSelectAll = () => {
//     const recentBills = summaryData?.recentBills ?? [];
//     if (selectedBillIds.length === recentBills.length) {
//       setSelectedBillIds([]);
//     } else {
//       const allBillIds = recentBills.map(bill => bill.id);
//       setSelectedBillIds(allBillIds);
//     }
//   };

//   const handleDeleteSelected = async () => {
//     if (selectedBillIds.length === 0) return;

//     const isConfirmed = await confirm(
//       "ยืนยันการลบ",
//       `คุณต้องการลบ ${selectedBillIds.length} บิลที่เลือกใช่หรือไม่?`,
//       'light'
//     );

//     if (isConfirmed) {
//       showStatus("loading", "กำลังลบ...", "");
//       try {
//         await api.post('/api/bills/batch-delete', { billIds: selectedBillIds });
//         await fetchAllData();
//         setSelectedBillIds([]);
//         hideStatus();
//         showStatus("success", `ลบ ${selectedBillIds.length} บิลเรียบร้อยแล้ว`, "");
//       } catch (error) {
//         hideStatus();
//         console.error("Failed to delete selected bills:", error);
//         showStatus("error", "เกิดข้อผิดพลาด", "ไม่สามารถลบรายการที่เลือกได้");
//       }
//     }
//   }; 

//   // ✨ --- [เพิ่ม] ฟังก์ชันสำหรับจัดการการคลิก Legend --- ✨
//   const handleLegendClick = (label: string) => {
//     setHiddenLegends(prev => 
//       prev.includes(label)
//         ? prev.filter(l => l !== label)
//         : [...prev, label]
//     );
//   };

// const {
//     winningItems,
//     displayTotalWinnings,
//     displayNetProfit,
//     winningsByBetType,
//     doughnutChartData,
//     lottoNameBarChartData,
//     groupedWinningItems,
//   } = useMemo(() => {
//     const items = checkableItems.filter(
//       (item) => calculatePrizeDetails(item).isWinner
//     );
//     const totalWinnings = items.reduce(
//       (sum, item) => sum + parseFloat(item.payoutAmount as any),
//       0
//     );

//     // --- ✅ [จุดที่แก้ไข] ---
//     // สลับที่ระหว่าง totalBetAmount และ totalWinnings
//     const netProfit = summaryData
//       ? summaryData.summary.totalBetAmount - totalWinnings 
//       : 0;
//     // --- สิ้นสุดการแก้ไข ---

//     const winningsSummary = items.reduce((acc, item) => {
//       const name = item.bet_type;
//       acc[name] = (acc[name] || 0) + parseFloat(item.payoutAmount as any);
//       return acc;
//     }, {} as Record<string, number>);
//     const winningsByType = Object.entries(winningsSummary)
//       .map(([name, total]) => ({ name, total }))
//       .sort((a, b) => b.total - a.total);
//     
//     const originalData = summaryData?.breakdown.byLottoType || [];
//     const filteredData = originalData.filter(d => !hiddenLegends.includes(d.name));
//     
//     const doughnutData = {
//       labels: filteredData.map((d) => d.name),
//       datasets: [
//         {
//           data: filteredData.map((d) => d.totalAmount),
//           backgroundColor: originalData.map(d => {
//             const originalIndex = summaryData?.breakdown.byLottoType.findIndex(od => od.name === d.name) ?? 0;
//             const colors = ["#16A34A", "#DC2626", "#D97706", "#2563EB", "#7C3AED", "#DB2777", "#0891B2", "#65A30D"];
//             return colors[originalIndex % colors.length];
//           }),
//           borderColor: "#1F2937",
//           borderWidth: 4,
//           hoverOffset: 8,
//         },
//       ],
//     };

//     const barData = {
//       labels: (summaryData?.breakdown.byLottoType || []).map((d) => d.name),
//       datasets: [
//         {
//           label: "จำนวนบิล",
//           data: (summaryData?.breakdown.byLottoType || []).map((d) =>
//             Number(d.billCount)
//           ),
//           backgroundColor: "rgba(59, 130, 246, 0.7)",
//           borderColor: "rgba(59, 130, 246, 1)",
//           borderWidth: 1,
//         },
//       ],
//     };

//     const grouped = items.reduce((acc, item) => {
//       const key = `${item.billRef}-${item.bet_number}`;
//       if (!acc[key]) {
//         acc[key] = {
//           id: key,
//           billRef: item.billRef,
//           username: item.username,
//           lottoName: item.lottoName,
//           lottoDrawDate: item.lottoDrawDate,
//           bet_number: item.bet_number,
//           totalPayout: 0,
//           details: [],
//         };
//       }
//       acc[key].totalPayout += parseFloat(item.payoutAmount as any);
//       const existingDetail = acc[key].details.find(
//         d => d.bet_type === item.bet_type && d.bet_style === item.bet_style
//       );
//       if (existingDetail) {
//         existingDetail.payoutAmount += parseFloat(item.payoutAmount as any);
//       } else {
//         acc[key].details.push({
//           bet_type: item.bet_type,
//           bet_style: item.bet_style,
//           payoutAmount: parseFloat(item.payoutAmount as any),
//         });
//       }
//       return acc;
//     }, {} as Record<string, GroupedWinningItem>);

//     const groupedArray = Object.values(grouped).sort((a, b) => 
//         new Date(b.lottoDrawDate).getTime() - new Date(a.lottoDrawDate).getTime()
//     ); 

//     return {
//       winningItems: items,
//       displayTotalWinnings: totalWinnings,
//       displayNetProfit: netProfit,
//       winningsByBetType: winningsByType,
//       doughnutChartData: doughnutData,
//       lottoNameBarChartData: barData,
//       groupedWinningItems: groupedArray,
//     };
//   }, [checkableItems, summaryData, hiddenLegends]);

//   const billWinnings = useMemo(() => {
//     const winningsMap = new Map<string, number>();
//     winningItems.forEach(item => {
//         const currentWinnings = winningsMap.get(item.billRef) || 0;
//         winningsMap.set(item.billRef, currentWinnings + parseFloat(item.payoutAmount as any));
//     });
//     return winningsMap;
//   }, [winningItems]);

//   const groupedDateOptions = useMemo(() => {
//     if (selectedLottoName === "all" || !lottoOptions[selectedLottoName])
//       return [];
//     const dates = new Set<string>();
//     lottoOptions[selectedLottoName].forEach((round) => {
//       const date = new Date(round.cutoff_datetime).toISOString().split("T")[0];
//       dates.add(date);
//     });
//     return Array.from(dates).sort(
//       (a, b) => new Date(b).getTime() - new Date(a).getTime()
//     );
//   }, [lottoOptions, selectedLottoName]);

//   const groupedBetSummary = useMemo(() => {
//     if (!summaryData || !summaryData.allBetItemsSummary) {
//       return {};
//     }
//     const grouped = summaryData.allBetItemsSummary.reduce((acc, item) => {
//       if (!acc[item.number]) {
//         acc[item.number] = {
//           totalAmount: 0,
//           totalCount: 0,
//           styles: []
//         };
//       }
//       acc[item.number].totalAmount += item.totalAmount;
//       acc[item.number].totalCount += Number(item.count);
//       acc[item.number].styles.push({
//         style: item.style,
//         count: Number(item.count),
//         totalAmount: item.totalAmount
//       });
//       return acc;
//     }, {} as Record<string, { totalAmount: number, totalCount: number, styles: { style: string, count: number, totalAmount: number }[] }>);
    
//     return Object.entries(grouped)
//       .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
//       .reduce((acc, [key, value]) => {
//         acc[key] = value;
//         return acc;
//       }, {} as Record<string, any>);
//   }, [summaryData]);

//   const topBetNumbersChartData = useMemo(() => {
//     if (!summaryData || !summaryData.allBetItemsSummary) {
//         return { labels: [], datasets: [] };
//     }
//     const sortedNumbers = Object.entries(groupedBetSummary);
//     if (sortedNumbers.length === 0) {
//       return { labels: [], datasets: [] };
//     }
//     const colorPalette = [ 'rgba(59, 130, 246, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(147, 51, 234, 0.7)', 'rgba(219, 39, 119, 0.7)', 'rgba(20, 184, 166, 0.7)' ];
//     const backgroundColors = sortedNumbers.map((_, index) => colorPalette[index % colorPalette.length]);
//     const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));
//     return {
//       labels: sortedNumbers.map(([number]) => number),
//       datasets: [{
//         label: 'ยอดแทงรวม',
//         data: sortedNumbers.map(([, data]) => data.totalAmount),
//         backgroundColor: backgroundColors,
//         borderColor: borderColors,
//         borderWidth: 1,
//       }],
//     };
//   }, [groupedBetSummary, summaryData]);

//   useEffect(() => { 
//     setChartKey(prevKey => prevKey + 1);
//   }, [topBetNumbersChartData]);

//   const chartOptions = (titleText: string, legendDisplay = false): ChartOptions<'bar' | 'doughnut'> => ({
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: {
//         display: legendDisplay,
//         position: "top" as const,
//         labels: { color: "#D1D5DB", font: { size: 12 } },
//       },
//       title: { display: false },
//       tooltip: {
//         backgroundColor: "rgba(0, 0, 0, 0.8)",
//         titleFont: { size: 14 },
//         bodyFont: { size: 12 },
//         callbacks: {
//           label: (c: any) =>
//             `${c.label}: ${c.raw.toLocaleString()} ${
//               titleText.includes("ยอดขาย") ? "บาท" : "บิล"
//             }`,
//         },
//       },
//     },
//     scales: {
//       x: {
//         ticks: { color: "#9CA3AF" },
//         grid: { color: "rgba(156, 163, 175, 0.1)" },
//       },
//       y: {
//         ticks: { color: "#9CA3AF" },
//         grid: { color: "rgba(156, 163, 175, 0.1)" },
//       },
//     },
//   });

//   const chartOptions2 = (
//     titleText: string,
//     axis: "x" | "y",
//     legendDisplay = false
//   ): ChartOptions<"bar"> => {
//     const xPosition = axis === "y" ? "top" : "bottom";
//     return {
//       indexAxis: axis,
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: {
//         legend: {
//           display: legendDisplay,
//           position: "top",
//           labels: { color: "#D1D5DB", font: { size: 12 } },
//         },
//         title: { display: false },
//         tooltip: {
//           backgroundColor: "rgba(0, 0, 0, 0.8)",
//           titleFont: { size: 14 },
//           bodyFont: { size: 12 },
//           callbacks: {
//             label: (c: any) =>
//               `${c.label}: ${c.raw.toLocaleString()} ${
//                 titleText.includes("ยอดขาย") ? "บาท" : "บาท"
//               }`,
//           },
//         },
//       },
//       scales: {
//         x: {
//           position: xPosition,
//           beginAtZero: true,
//           ticks: { color: "#9CA3AF" },
//           grid: { color: "rgba(156, 163, 175, 0.1)" },
//           title: {
//             display: true,
//             text: axis === "y" ? "ยอดแทง (บาท)" : "ตัวเลข",
//             color: "#9CA3AF",
//             font: { size: 14 },
//           },
//         },
//         y: {
//           ticks: { color: "#9CA3AF" },
//           grid: { display: false },
//           title: {
//             display: true,
//             text: axis === "x" ? "ยอดแทง (บาท)" : "ตัวเลข",
//             color: "#9CA3AF",
//             font: { size: 14 },
//           },
//         },
//       },
//     };
//   };

//   const getStatusPill = (status: string) => {
//     switch (status) {
//       case 'รอผล':
//         return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">{status}</span>;
//       case 'ยืนยันแล้ว':
//         return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">{status}</span>;
//       case 'ยกเลิก':
//         return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">{status}</span>;
//       default:
//         return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">{status}</span>;
//     }
//   };

//   const filteredAndSortedSummary = Object.entries(groupedBetSummary)
//     .filter(([number]) => number.includes(betSummarySearch))
//     .sort(([, dataA], [, dataB]) => dataB.totalAmount - dataA.totalAmount);

//   const isMediumScreenOrLarger = useMediaQuery("(min-width: 768px)");
//   const chartAxis = isMediumScreenOrLarger ? "x" : "y";
//   const horizontalChartHeight = topBetNumbersChartData.labels.length * 35;

//   return (
//     <div className="space-y-6 text-white">
//       <h1 className="text-3xl font-bold">สรุปภาพรวมบัญชี</h1>
//       <div className="p-4 bg-gray-800 rounded-lg border border-gray-700/50">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
//           <div>
//             <label className="filter-label">
//               <CalendarDaysIcon className="h-4 w-4" /> ตั้งแต่วันที่
//             </label>
//             <input
//               type="date"
//               value={startDate}
//               onChange={(e) => setStartDate(e.target.value)}
//               className="input-dark"
//             />
//           </div>
//           <div>
//             <label className="filter-label">
//               <CalendarDaysIcon className="h-4 w-4" /> ถึงวันที่
//             </label>
//             <input
//               type="date"
//               value={endDate}
//               onChange={(e) => setEndDate(e.target.value)}
//               className="input-dark"
//             />
//           </div>
//           <div className="lg:col-span-2 xl:col-span-2 grid grid-cols-2 gap-2">
//             <div>
//               <label className="filter-label">ประเภทหวย</label>
//               <select
//                 value={selectedLottoName}
//                 onChange={(e) => {
//                   setSelectedLottoName(e.target.value);
//                   setSelectedDate("all");
//                 }}
//                 className="input-dark"
//               >
//                 <option value="all">ทุกประเภท</option>
//                 {Object.keys(lottoOptions).map((name) => (
//                   <option key={name} value={name}>
//                     {name}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="filter-label">งวดวันที่</label>
//               <select
//                 value={selectedDate}
//                 onChange={(e) => setSelectedDate(e.target.value)}
//                 className="input-dark"
//                 disabled={selectedLottoName === "all"}
//               >
//                 <option value="all">ทุกงวด</option>
//                 {groupedDateOptions?.map((date) => (
//                   <option key={date} value={date}>
//                     {new Date(date).toLocaleDateString("th-TH", {
//                       year: "numeric",
//                       month: "short",
//                       day: "numeric",
//                       timeZone: "UTC",
//                     })}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </div>
//           <div>
//             <label className="filter-label">
//               <TagIcon className="h-4 w-4" /> สถานะบิล
//             </label>
//             <select
//               value={status}
//               onChange={(e) => setStatus(e.target.value)}
//               className="input-dark"
//             >
//               <option value="all">ทุกสถานะ</option>
//               <option value="ยืนยันแล้ว">ยืนยันแล้ว</option>
//               <option value="รอผล">รอผล</option>
//               <option value="ยกเลิก">ยกเลิก</option>
//             </select>
//           </div>
//           {user?.role === "owner" || user?.role === "admin" ? (
//             <div className="grid grid-cols-2 gap-2 items-end">
//               <div>
//                 <label className="filter-label">
//                   <UserCircleIcon className="h-4 w-4" /> ผู้ใช้งาน
//                 </label>
//                 <select
//                   value={selectedUser}
//                   onChange={(e) => setSelectedUser(e.target.value)}
//                   className="input-dark"
//                 >
//                   <option value="all">แสดงทั้งหมด</option>
//                   {userList.map((u) => (
//                     <option key={u.id} value={u.username}>
//                       {u.username}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <button
//                   onClick={fetchAllData}
//                   disabled={isLoading}
//                   className="w-full bg-blue-600 text-white font-bold p-2.5 rounded-md hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
//                 >
//                   {isLoading ? "กำลังโหลด..." : "แสดงรายงาน"}
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <div className="lg:col-start-4 xl:col-start-6">
//               <button
//                 onClick={fetchAllData}
//                 disabled={isLoading}
//                 className="w-full bg-blue-600 text-white font-bold p-2.5 rounded-md hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
//               >
//                 {isLoading ? "กำลังโหลด..." : "แสดงรายงาน"}
//               </button>
//             </div>
//           )}
//         </div>
//       </div>

//       <AnimatePresence>
//         {isLoading ? (
//           <FullScreenLoader isLoading={isLoading} text="กำลังโหลดข้อมูล..." />
//         ) : error ? (
//           <MessageDisplay
//             icon={<ExclamationTriangleIcon />}
//             title="เกิดข้อผิดพลาด"
//             message={error}
//           />
//         ) : !summaryData || summaryData.summary.totalBills === 0 ? (
//           <MessageDisplay
//             icon={<InformationCircleIcon />}
//             title="ไม่พบข้อมูล"
//             message="ไม่พบรายการในช่วงเวลาที่คุณเลือก"
//           />
//         ) : (
//           <motion.div
//             className="space-y-6"
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//           >
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
//               <KpiCard
//                 title="ยอดแทงทั้งหมด (สุทธิ)"
//                 value={summaryData.summary.totalBetAmount}
//                 icon={<BanknotesIcon className="h-6 w-6" />}
//                 colorClass="text-blue-400"
//               />
//               <KpiCard
//                 title="ยอดคืนเลขทั้งหมด"
//                 value={summaryData.summary.totalReturnedAmount}
//                 icon={<TrashIcon className="h-6 w-6" />}
//                 colorClass="text-gray-400"
//               />
//               <KpiCard
//                 title="ยอดถูกรางวัลทั้งหมด"
//                 value={displayTotalWinnings}
//                 icon={<TrophyIcon className="h-6 w-6" />}
//                 colorClass="text-green-400"
//               />
//               <KpiCard
//                 title="กำไร / ขาดทุน"
//                 value={displayNetProfit}
//                 icon={
//                   displayNetProfit >= 0 ? (
//                     <ArrowTrendingUpIcon className="h-6 w-6" />
//                   ) : (
//                     <ArrowTrendingDownIcon className="h-6 w-6" />
//                   )
//                 }
//                 colorClass={
//                   displayNetProfit >= 0 ? "text-green-400" : "text-red-400"
//                 }
//               />
//               <KpiCard
//                 title="จำนวนบิลทั้งหมด"
//                 value={summaryData.summary.totalBills}
//                 icon={<TicketIcon className="h-6 w-6" />}
//                 colorClass="text-gray-300"
//                 isCurrency={false}
//               >
//                 <div className="space-y-2 text-sm max-h-24 overflow-y-auto custom-scrollbar">
//                   {(summaryData.breakdown.byLottoType || []).length > 0 ? (
//                     summaryData.breakdown.byLottoType.map((item) => (
//                       <div
//                         key={item.name}
//                         className="flex justify-between items-center"
//                       >
//                         <span className="text-gray-400">{item.name}</span>
//                         <span className="font-semibold">
//                           {Number(item.billCount).toLocaleString()} บิล
//                         </span>
//                       </div>
//                     ))
//                   ) : (
//                     <p className="text-gray-500 italic">ไม่มีข้อมูล</p>
//                   )}
//                 </div>
//               </KpiCard>
//             </div>
//             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
//              <div className="kpi-card lg:col-span-2 h-96 flex flex-col">
//   <h3 className="chart-title">
//     <ChartPieIcon className="h-6 w-6" />
//     สัดส่วนยอดขายตามหวย
//   </h3>
//   <div className="flex-grow flex flex-row items-center gap-4 overflow-hidden">
//     <div className="relative w-1/2 h-full">
//       <Doughnut
//         data={doughnutChartData}
//         options={{
//           responsive: true,
//           maintainAspectRatio: false,
//           plugins: {
//             legend: { display: false },
//             tooltip: {
//               backgroundColor: "rgba(0, 0, 0, 0.8)",
//               callbacks: {
//                 label: (c: any) =>
//                   `${c.label}: ${c.raw.toLocaleString()} บาท`,
//               },
//             },
//           },
//         }}
//       />
//     </div>
//     <div className="w-1/2 h-full overflow-y-auto custom-scrollbar pr-2">
//       <ul className="space-y-2">
//         {(summaryData?.breakdown.byLottoType || []).map((item, index) => {
//           const originalIndex = summaryData?.breakdown.byLottoType.findIndex(od => od.name === item.name) ?? 0;
//           const colors = ["#16A34A", "#DC2626", "#D97706", "#2563EB", "#7C3AED", "#DB2777", "#0891B2", "#65A30D"];
//           const backgroundColor = colors[originalIndex % colors.length];
//           const totalAmount = summaryData?.summary.totalBetAmount || 1;
//           const percentage = (item.totalAmount / totalAmount) * 100;
//           const isHidden = hiddenLegends.includes(item.name);

//           return (
//             <li 
//               key={item.name} 
//               className={`flex items-center text-sm justify-between cursor-pointer p-1 rounded-md transition-colors ${isHidden ? 'opacity-50 hover:bg-gray-700/50' : 'hover:bg-gray-700/50'}`}
//               onClick={() => handleLegendClick(item.name)}
//             >
//               {/* --- [จุดที่แก้ไข] --- */}
//               {/* 1. ลบ overflow-hidden ออก */}
//               <div className="flex items-center">
//                 <span 
//                   className="w-3 h-3 rounded-full mr-3 shrink-0" 
//                   style={{ backgroundColor: isHidden ? '#6B7280' : backgroundColor }}
//                 ></span>
//                 {/* 2. ลบ class 'truncate' ออก */}
//                 <span className={`${isHidden ? 'line-through text-gray-500' : 'text-gray-300'}`} title={item.name}>
//                   {item.name}
//                 </span>
//               </div>
//               <span className={`font-semibold ml-2 shrink-0 ${isHidden ? 'line-through text-gray-500' : 'text-white'}`}>{percentage.toFixed(1)}%</span>
//             </li>
//           );
//         })}
//       </ul>
//     </div>
//   </div>
// </div>
//               <div className="kpi-card lg:col-span-3 h-96 flex flex-col">
//                 <h3 className="chart-title">
//                   <PresentationChartLineIcon className="h-6 w-6" />
//                   จำนวนบิลตามประเภทหวย
//                 </h3>
//                 <div className="relative flex-grow">
//                   <Bar
//                     data={lottoNameBarChartData}
//                     options={chartOptions("จำนวนบิล")}
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//               <div className="kpi-card">
//         <div className="flex justify-between items-center mb-4">
//             <h3 className="chart-title mb-0"><TableCellsIcon className="h-6 w-6" />สรุปยอดแทงตามตัวเลข</h3>
//             <div className="relative">
//                 <input 
//                     type="text"
//                     value={betSummarySearch}
//                     onChange={e => setBetSummarySearch(e.target.value.replace(/[^0-9]/g, ''))}
//                     maxLength={3}
//                     placeholder="ค้นหาเลข..."
//                     className="input-dark w-32 !pl-8"
//                 />
//                 <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 absolute top-1/2 left-2 -translate-y-1/2"/>
//             </div>
//         </div>
//         <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
//             {filteredAndSortedSummary.length > 0 ? (
//                 filteredAndSortedSummary.map(([number, data]) => (
//                     <div key={number} className="bg-gray-800/50 p-3 rounded-lg">
//                         <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
//                             <div className="flex items-center gap-3">
//                                 <span className="font-mono text-xl text-cyan-400">{number}</span>
//                                 <span className="text-sm font-semibold text-white">{data.totalCount.toLocaleString()} ชุด</span>
//                             </div>
//                             <div className="font-bold text-base text-white text-right">
//                                 {formatCurrency(data.totalAmount)}
//                                 <span className="text-xs text-gray-500 ml-1">บาท</span>
//                             </div>
//                         </div> 
//                         <div className="space-y-1">
//                             {data.styles.map((styleItem: any, styleIndex: number) => (
//                                 <div key={styleIndex} className="flex justify-between items-center text-sm pl-2"> 
//                                     <span className="text-gray-300 capitalize"> 
//                                         <span className={`font-semibold ${(styleItem.style ==='บน' || styleItem.style ==='ตรง') ? "text-green-500" : (styleItem.style ==='ล่าง') ? "text-red-500" : "text-orange-400"}`}>
//                                             {styleItem.style}
//                                         </span> 
//                                         <span className="text-gray-500 ml-2"> ({styleItem.count} ชุด)</span>
//                                     </span>
//                                     <span className="font-semibold font-mono text-gray-300">{formatCurrency(styleItem.totalAmount)}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 ))
//             ) : ( 
//                 <p className="text-gray-500 italic text-center py-4">
//                     {betSummarySearch ? `ไม่พบข้อมูลเลข "${betSummarySearch}"` : "ไม่พบข้อมูล"}
//                 </p> 
//             )}
//         </div>
//     </div> 
//             <div className="kpi-card">
//               <h2 className="text-xl font-bold mb-4 text-green-600">
//                 รายการที่ถูกรางวัล
//               </h2>
//               {groupedWinningItems.length > 0 ? (
//                 <>
//                   <p className="text-sm text-gray-400 -mt-3 mb-4">
//                     พบ {groupedWinningItems.length} รายการสรุป
//                   </p>
//                   <div className="overflow-x-auto max-h-96 custom-scrollbar">
//                     <table className="w-full text-sm text-left">
//                       <thead className="text-gray-400 sticky top-0 bg-gray-900">
//                         <tr className="border-b border-gray-700">
//                           <th className="p-3 whitespace-nowrap">เลขบิล</th>
//                           {(user?.role === "owner" || user?.role === 'admin') && (
//                             <th className="p-3 whitespace-nowrap">ผู้ใช้</th>
//                           )}
//                           <th className="p-3 whitespace-nowrap">งวดหวย</th>
//                           <th className="p-3 whitespace-nowrap">ประเภท</th>
//                           <th className="p-3 whitespace-nowrap">เลข</th>
//                           <th className="p-3 text-right whitespace-nowrap">เงินรางวัลรวม</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                           {groupedWinningItems.map((group) => (
//                               <tr
//                               key={group.id}
//                               className="border-b border-gray-800 hover:bg-gray-800/50 whitespace-nowrap"
//                               >
//                               <td className="p-3 font-mono text-blue-400 whitespace-nowrap">
//                                   {group.billRef}
//                               </td>
//                               {(user?.role === "owner" || user?.role === 'admin') && (
//                                   <td className="p-3 whitespace-nowrap">{group.username}</td>
//                               )}
//                               <td className="p-3 whitespace-nowrap">
//                                   {group.lottoName}
//                                   <br />
//                                   <span className="text-xs text-gray-500 whitespace-nowrap">
//                                   {formatDateString(group.lottoDrawDate, 'short')}
//                                   </span>
//                               </td>
//                               <td className="p-3 whitespace-nowrap text-xs">
//                                   {group.details.map((detail, index) => (
//                                   <div key={index}>
//                                       {getBetTypeName(detail.bet_type)} ({detail.bet_style})
//                                   </div>
//                                   ))}
//                               </td>
//                               <td className="p-3 font-mono whitespace-nowrap">{group.bet_number}</td>
//                               <td className="p-3 text-right font-semibold text-green-400 whitespace-nowrap">
//                                   {formatCurrency(group.totalPayout)}
//                               </td>
//                               </tr>
//                           ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </>
//               ) : (
//                 <div className="text-center py-16">
//                   <TrophyIcon className="mx-auto h-12 w-12 text-gray-600" />
//                   <p className="mt-2 text-gray-500 italic">ยังไม่มีรายการที่ถูกรางวัล</p>
//                 </div>
//               )}
//             </div>
//       </div>
            
         
            
//             <div className="kpi-card">
//               <div className="flex justify-between items-center mb-4">
//                 <h2 className="text-xl font-bold">บิลล่าสุด</h2>
//                 {selectedBillIds.length > 0 && (
//                   <button
//                     onClick={handleDeleteSelected}
//                     className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-500 transition-colors text-sm font-bold flex items-center gap-2"
//                   >
//                     <TrashIcon className="h-4 w-4" />
//                     ลบ {selectedBillIds.length} รายการที่เลือก
//                   </button>
//                 )}
//               </div>
//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm text-left">
//                   <thead className="text-gray-400">
//                     <tr className="border-b border-gray-700">
//                       <th className="p-3">
//                         <label htmlFor="select-all-checkbox" className="relative flex items-center justify-center cursor-pointer p-2">
//                           <input
//                             id="select-all-checkbox"
//                             type="checkbox"
//                             className="peer sr-only"
//                             checked={(summaryData?.recentBills.length ?? 0) > 0 && selectedBillIds.length === summaryData?.recentBills.length}
//                             onChange={handleSelectAll}
//                             disabled={(summaryData?.recentBills.length ?? 0) === 0}
//                           />
//                           <div className="w-5 h-5 rounded-full border-2 border-gray-500 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all duration-200"></div>
//                           <div className="absolute w-2 h-2 rounded-full bg-gray-900 opacity-0 peer-checked:opacity-100 transition-opacity duration-200"></div>
//                         </label>
//                       </th>
//                       <th className="p-3 whitespace-nowrap">เลขที่บิล</th>
//                       {(user?.role === "owner" || user?.role === 'admin') && (
//                         <th className="p-3 whitespace-nowrap">ผู้ใช้งาน</th>
//                       )}
//                       <th className="p-3 whitespace-nowrap">วันที่บันทึก</th>
//                       <th className="p-3 whitespace-nowrap">ประเภทหวย</th>
//                       <th className="p-3 whitespace-nowrap">งวดวันที่</th>
//                       <th className="p-3 text-center whitespace-nowrap">ยอดรวม (สุทธิ)</th>
//                       {/* <th className="p-3 text-center whitespace-nowrap">ผลลัพธ์/รางวัล</th> */}
//                       <th className="p-3 whitespace-nowrap">บันทึกช่วยจำ</th>
//                       <th className="p-3 text-center whitespace-nowrap">สถานะ</th>
//                       <th className="p-3 text-right whitespace-nowrap">จัดการ</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {summaryData?.recentBills.map((bill) => {
//                       const winnings = billWinnings.get(bill.billRef) || 0;
//                       return (
//                         <tr
//                           key={bill.id}
//                           className={`border-b border-gray-800 transition-colors ${selectedBillIds.includes(bill.id) ? 'bg-blue-900/50' : 'hover:bg-gray-800/50'}`}
//                         >
//                           <td className="p-3">
//                             <label htmlFor={`select-bill-${bill.id}`} className="relative flex items-center justify-center cursor-pointer p-2">
//                               <input
//                                 id={`select-bill-${bill.id}`}
//                                 type="checkbox"
//                                 className="peer sr-only"
//                                 checked={selectedBillIds.includes(bill.id)}
//                                 onChange={() => handleSelectOne(bill.id)}
//                               />
//                               <div className="w-5 h-5 rounded-full border-2 border-gray-500 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all duration-200"></div>
//                               <div className="absolute w-2 h-2 rounded-full bg-gray-900 opacity-0 peer-checked:opacity-100 transition-opacity duration-200"></div>
//                             </label>
//                           </td>
//                           <td className="p-3 font-mono text-blue-400 whitespace-nowrap">
//                             {bill.billRef}
//                           </td>
//                           {(user?.role === "owner" || user?.role === 'admin') && (
//                             <td className="p-3 text-gray-300">{bill.username}</td>
//                           )}
//                           <td className="p-3 text-gray-400 whitespace-nowrap">
//                             {new Date(bill.createdAt).toLocaleString("th-TH")}
//                           </td>
//                           <td className="p-3 text-gray-300 whitespace-nowrap">{bill.lottoName}</td>
//                           <td className="p-3 text-gray-400 whitespace-nowrap">
//                             {bill.billLottoDraw
//                               ? formatDateString(bill.billLottoDraw, 'short')
//                               : "-"}
//                           </td>
//                           <td className="p-3 text-center font-semibold whitespace-nowrap">
//                             {formatCurrency(bill.totalAmount)}
//                           </td>
//                           {/* <td className="p-3 text-right font-semibold whitespace-nowrap">
//                             {bill.status === 'รอผล' && <span className="text-gray-500">-</span>}
//                             {bill.status === 'ยกเลิก' && <span className="text-red-500">ยกเลิก</span>}
//                             {bill.status === 'ยืนยันแล้ว' && (
//                                 winnings > 0 
//                                 ? <span className="text-green-400">+{formatCurrency(winnings)}</span>
//                                 : <span className="text-gray-400">{formatCurrency(0)}</span>
//                             )}
//                           </td> */}
//                           <td className="p-3 text-gray-400 whitespace-nowrap">
//                             {bill.note ?? "-"}
//                           </td>
//                           <td className="p-3 text-center whitespace-nowrap">
//                             {getStatusPill(bill.status)}
//                           </td>
//                           <td className="p-3 text-right whitespace-nowrap">
//                             <button
//                               onClick={() =>
//                                 handleDeleteBill(bill.id, bill.billRef)
//                               }
//                               disabled={deletingBillId === bill.id}
//                               className="text-red-500 hover:text-red-400 disabled:text-gray-500 disabled:cursor-wait"
//                               aria-label={`ลบบิล ${bill.billRef}`}
//                             >
//                               {deletingBillId === bill.id ? (
//                                 "กำลังลบ..."
//                               ) : (
//                                 <TrashIcon className="h-5 w-5" />
//                               )}
//                             </button>
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </div>

            
//           </motion.div>
//         )}
//       </AnimatePresence>
//       <style>{`.input-dark { width: 100%; padding: 0.625rem; background-color: #1F2937; border: 1px solid #4B5563; border-radius: 0.5rem; color: white; color-scheme: dark; transition: border-color 0.2s; } .input-dark:focus { outline: none; border-color: #3B82F6; } .filter-label { display: flex; align-items-center; gap: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #9CA3AF; margin-bottom: 0.25rem; } .kpi-card { background-color: #1F2937; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #374151; } .kpi-title { color: #9CA3AF; margin-bottom: 0.25rem; font-size: 0.875rem; } .chart-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items-center; gap: 0.5rem; color: #D1D5DB; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: #1F2937; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #4B5563; border-radius: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6B7280; }`}</style>
//     </div>
//   );
// };

// export default AccountPage;

// /**
//  * Custom Hook สำหรับตรวจสอบ Media Query (เช่น ขนาดหน้าจอ)
//  * @param query - Media query string เช่น '(max-width: 639px)'
//  * @returns boolean - คืนค่า true ถ้า query ตรงกับเงื่อนไข
//  */
// export function useMediaQuery(query: string): boolean {
//   const [matches, setMatches] = useState(false);

//   useEffect(() => {
//     // ตรวจสอบค่าเริ่มต้นเมื่อ component โหลด
//     const media = window.matchMedia(query);
//     if (media.matches !== matches) {
//       setMatches(media.matches);
//     }

//     // สร้าง Listener เพื่อคอยดักจับการเปลี่ยนแปลงขนาดหน้าจอ
//     const listener = () => setMatches(media.matches);
//     media.addEventListener("change", listener);

//     // Cleanup function: ลบ listener ออกเมื่อ component ถูก unmount
//     return () => media.removeEventListener("change", listener);
//   }, [matches, query]);

//   return matches;
// }

