import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  formatTimeZoneToDate,
  getBetTypeName,
  getDateString,
  getPayoutRate,
  type BetDimension,
  type BetStyle,
  type Order,
  type BillEntryDetail,
  type BetItem,
  getDatePart,
  formatDateString,
} from "../services/BetService";
import { useAuth } from "../contexts/AuthContext"; 
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { FullScreenLoader } from "../components/LoadingScreen";
import { useReactToPrint } from "react-to-print";
import { toPng } from "html-to-image";
import PrintableBill2 from "../components/PrintableBill2'";
import {
  PrinterIcon,
  ArrowDownTrayIcon as DownloadIcon,
  XMarkIcon as XIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import { useModal } from "../components/Modal";
import api from "../api/axiosConfig";

const NoDataIcon = () => (
  <svg
    className="mx-auto h-12 w-12 text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    {" "}
    <path
      vectorEffect="non-scaling-stroke"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7v8a2 2 0 002 2h4a2 2 0 002-2V7m-6 0h8m-8 0a2 2 0 100 4h8a2 2 0 100-4h-3m-2 2h.01M12 19h.01"
    />{" "}
  </svg>
);

interface LottoType {
  id: number;
  name: string;
  rate_3_top: number;
  rate_3_tote: number;
  rate_3_bottom: number;
  rate_2_top: number;
  rate_2_bottom: number;
  rate_run_top: number;
  rate_run_bottom: number;
}
const getCountryFromLottoName = (name: string): string => {
  if (name.includes("ไทย")) return "หวยไทย";
  if (name.includes("ลาว")) return "หวยลาว";
  if (name.includes("ฮานอย") || name.includes("เวียดนาม")) return "หวยเวียดนาม";
  if (name.includes("มาเลย์")) return "หวยมาเลย์";
  if (name.includes("หุ้น")) return "หวยหุ้น";
  return "อื่นๆ";
};

const LottoList: React.FC = () => {
  const { user } = useAuth();
  const { alert, confirm, showStatus, hideStatus } = useModal();
  // --- State Declarations ---
  const [countryList, setCountryList] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLottoName, setSelectedLottoName] = useState("");
  const [startDate, setStartDate] = useState(getDateString({ days: -31 }));
  const [endDate, setEndDate] = useState(getDateString());
  const [lottoCategory, setLottoCategory] = useState("");
  const [status, setStatus] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orderNote, setOrderNote] = useState("");
  // const [filterUsername, setFilterUsername] = useState((user?.role === 'admin' || user?.role === 'owner') ? "" : user?.username);
  const [filterUsername, setFilterUsername] = useState(user?.username);
  const [billUsers, setBillUsers] = useState<
    { id: number; username: string }[]
  >([]);
  const [lottoTypes, setLottoTypes] = useState<LottoType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [detailEntries, setDetailEntries] = useState<BillEntryDetail[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [billToPrint, setBillToPrint] = useState<{
    order: Order;
    details: BillEntryDetail[];
  } | null>(null);
  const printableBillRef = useRef<HTMLDivElement>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [billImageUrl, setBillImageUrl] = useState<string | null>(null);
 
  const generateBillImage = useCallback(async () => {
    if (!printableBillRef.current)
      throw new Error("Printable component is not available");
    return toPng(printableBillRef.current, {
      cacheBust: true,
      backgroundColor: "white",
      pixelRatio: 2,
    });
  }, []);

  const handleViewBill = (order: Order, details: BillEntryDetail[]) => {
    setBillToPrint({ order, details }); // 1. กำหนดข้อมูลที่จะแสดง
    setIsModalVisible(true); // 2. สั่งให้ Modal แสดง
  };

  // ✅ 3. เพิ่ม useEffect สำหรับสร้างรูปภาพเมื่อ Modal ถูกสั่งให้แสดง
  useEffect(() => {
    // ทำงานเมื่อมีข้อมูลที่จะพิมพ์ และ Modal ถูกสั่งให้แสดง
    if (billToPrint && isModalVisible) {
      // หน่วงเวลาเล็กน้อยเพื่อให้ component ที่ซ่อนอยู่ render เสร็จก่อน
      setTimeout(() => {
        generateBillImage()
          .then(setBillImageUrl)
          .catch((err) => {
            console.error("Error generating bill image:", err);
            alert("ไม่สามารถสร้างรูปภาพใบเสร็จได้", "", "light");
          });
      }, 100);
    }
  }, [billToPrint, isModalVisible, generateBillImage]);

 const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (status) params.append("status", status);
    if (orderId) params.append("billRef", orderId);
    if (orderNote) params.append("noteRef", orderNote);
    
    if ((user.role === "admin" || user.role === "owner") && filterUsername) {
        params.append("username", filterUsername);
    } else if (user.role === 'user') {
        // สำหรับ user ทั่วไป ให้ใช้ username ของตัวเองเสมอ
        params.append("username", user.username);
    }

    if (lottoCategory) params.append("lottoCategory", lottoCategory);
    if (selectedLottoName) params.append("lottoName", selectedLottoName);

    try { 
        const response = await api.get<Order[]>(`/api/bills?${params.toString()}`);
        setOrders(response.data);
    } catch (err) {
        // Interceptor จะจัดการกับ Error 401/403
        // ส่วนนี้จะดักจับ Error อื่นๆ
        console.error("Failed to search bills:", err);
        alert("เกิดข้อผิดพลาด", "ไม่สามารถค้นหาข้อมูลได้", "light");
    } finally {
        setIsLoading(false);
    }
}, [user, startDate, endDate, status, orderId, orderNote, filterUsername, lottoCategory, selectedLottoName]);

  const fetchLottoTypes = useCallback(async () => {
    try { 
        const response = await api.get<LottoType[]>('/api/lotto-types');
        const data = response.data; 

        setLottoTypes(data);
        const countries = [
            ...new Set(data.map((lt) => getCountryFromLottoName(lt.name))),
        ];
        setCountryList(countries.sort());
        
    } catch (err) { 
        console.error("Failed to fetch lotto types:", err);
    }
}, []);

 const handleRowClick = async (orderId: number) => {
    if (expandedRowId === orderId) {
        setExpandedRowId(null);
    } else {
        setExpandedRowId(orderId);
        setIsDetailLoading(true);
        try { 
            const response = await api.get<BillEntryDetail[]>(`/api/bills/${orderId}/details`);
            setDetailEntries(response.data);  
        } catch (err: any) {
            console.error("Error fetching bill details:", err); 
        } finally {
            setIsDetailLoading(false);
        }
    }
};

  // --- (ฟังก์ชัน handlers อื่นๆ คงเดิม ไม่มีการเปลี่ยนแปลง) ---
  const handleConfirmBill = async (billId: number, billRef: string) => {
    const isConfirm = await confirm(
        "ยืนยันบิล",
        `คุณต้องการยืนยันบิลเลขที่ #${billRef} ใช่หรือไม่?`,
        'light',
        false
    );

    if (isConfirm) {
      try { 
        const response = await api.post(`/api/bills/${billId}/confirm`);
        
        setOrders((current) =>
          current.map((order) =>
            order.id === billId ? { ...order, status: "ยืนยันแล้ว" } : order
          )
        );
        
        alert("สำเร็จ", response.data.message, "light", false);
        setExpandedRowId(null);

      } catch (err: any) { 
        const msg = err.response?.data?.error || "เกิดข้อผิดพลาดในการยืนยันบิล";
        alert("ผิดพลาด", msg, "light");
      }
    }
};

 const handleCancelBill = async (billId: number, billRef: string) => {
    const isConfirm = await confirm(
        `ยกเลิกบิล #${billRef}`,
        "คุณแน่ใจหรือไม่? การกระทำนี้จะคืนเลขทุกรายการในบิล",
        "light"
    );

    if (!isConfirm) return; 
    try { 
        const response = await api.post(`/api/bills/${billId}/cancel`); 
        setOrders((currentOrders) =>
            currentOrders.map((order) =>
                order.id === billId ? { ...order, status: "ยกเลิก" } : order
            )
        ); 
        alert("ยกเลิกสำเร็จ", `บิล #${billRef} ถูกยกเลิกเรียบร้อยแล้ว`, "light", false);
        setExpandedRowId(null); 
    } catch (err: any) { 
        const msg = err.response?.data?.error || "เกิดข้อผิดพลาดในการยกเลิกบิล";
        alert("ผิดพลาด", msg, "light");
    }
};
  
  const handleUpdateEntryStatus = async (
  billId: number,
  itemId: number,
  newStatus: "ยืนยัน" | "คืนเลข"
) => {
  // เก็บสถานะเดิมไว้เผื่อเกิด Error (เหมือนเดิม)
  const originalEntries = JSON.parse(JSON.stringify(detailEntries));

  // อัปเดต UI ชั่วคราว (เหมือนเดิม)
  setDetailEntries((currentGroups) =>
    currentGroups.map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.id === itemId ? { ...item, status: "กำลังอัปเดต..." } : item
      ),
    }))
  );

  try { 
    const response = await api.put(`/api/bet-items/${itemId}/status`, { status: newStatus });
    const data: {
      updatedItem: BetItem;
      newBillStatus: Order["status"] | null;
    } = response.data;

    const { updatedItem, newBillStatus } = data;
    if (!updatedItem) {
      throw new Error("ข้อมูลที่ได้รับจากเซิร์ฟเวอร์ไม่ถูกต้อง");
    }

    // อัปเดต state ของ detailEntries ด้วยข้อมูลใหม่ (เหมือนเดิม)
    setDetailEntries((currentGroups) =>
      currentGroups.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        ),
      }))
    );
    
    // ✨ --- [เพิ่ม] Logic การอัปเดตยอดรวมในตารางหลักทันที --- ✨
    if (newStatus === 'คืนเลข') {
      const returnedPrice = Number(updatedItem.price);

      setOrders(currentOrders => 
        currentOrders.map(order => {
          if (order.id === billId) {
            // สร้าง object ใหม่สำหรับ order ที่มีการเปลี่ยนแปลง
            return {
              ...order,
              returnedAmount: Number(order.returnedAmount) + returnedPrice,
              netAmount: Number(order.netAmount) - returnedPrice,
            };
          }
          // คืน order เดิมถ้าไม่ใช่รายการที่ต้องการแก้ไข
          return order;
        })
      );
    }
    // ✨ --- [สิ้นสุดการเพิ่ม Logic] --- ✨

    if (newBillStatus) {
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === billId ? { ...order, status: newBillStatus } : order
        )
      );
    }

  } catch (err: any) {
    alert("เกิดข้อผิดพลาด", err.response?.data?.error || err.message || "การอัปเดตสถานะล้มเหลว", "light");
    setDetailEntries(originalEntries);
  }
};

 const handleUpdateAllEntries = async (
    billId: number,
    newStatus: "ยืนยัน" | "คืนเลข"
) => {
    const isConfirm = await confirm(
        `ยืนยันการ${newStatus}`,
        `คุณต้องการ${newStatus}ทุกรายการที่เหลือในบิลนี้ใช่หรือไม่?`,
        "light"
    );

    if (!isConfirm) return;

    try { 
        const response = await api.post(`/api/bills/${billId}/update-all-items`, {
            status: newStatus,
        });

        const result: {
            message: string;
            updatedRows: BetItem[];
            newBillStatus: Order["status"] | null;
        } = response.data; 

        alert("สำเร็จ", result.message, "light", false);

        if (result.updatedRows.length === 0) return;
 
        const updatedItemsMap = new Map(
            result.updatedRows.map((item) => [item.id, item])
        );
        setDetailEntries((currentGroups) =>
            currentGroups.map((group) => ({
                ...group,
                items: group.items.map(
                    (item) => updatedItemsMap.get(item.id) || item
                ),
            }))
        );
 
        if (result.newBillStatus) {
            const finalStatus: Order["status"] = result.newBillStatus;
            setOrders((currentOrders) =>
                currentOrders.map((order) =>
                    order.id === billId ? { ...order, status: finalStatus } : order
                )
            );
        }
    } catch (err: any) {
        // Interceptor จะจัดการกับ 401/403, ส่วนนี้จะแสดง alert สำหรับ error อื่นๆ
        alert("เกิดข้อผิดพลาด", err.response?.data?.error || err.message || "การอัปเดตสถานะล้มเหลว", "light");
    }
};
  const handlePrint = useReactToPrint({
    content: () => printableBillRef.current,
    documentTitle: `bill-${billToPrint?.order.billRef}`,
  });
  const handleSaveImage = useCallback(() => {
    if (!printableBillRef.current) return;
    toPng(printableBillRef.current, {
      cacheBust: true,
      backgroundColor: "white",
      pixelRatio: 2,
    })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `bill-${billToPrint?.order.billRef}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Image save error:", err);
        alert("Cannot save image", "", "light");
      });
  }, [billToPrint]);
  const triggerPrintActions = (order: Order, details: BillEntryDetail[]) => {
    setBillToPrint({ order, details });
  };
 
useEffect(() => {
    const loadInitialData = async () => {
        if (!user) return;
        setIsLoading(true);

        const params = new URLSearchParams(); 
        params.append("startDate", startDate);
        params.append("endDate", endDate);
        
        // กำหนด username ตามสิทธิ์ของผู้ใช้
        if (user.role === 'admin' || user.role === 'owner') { 
            if (filterUsername) {
                params.append('username', filterUsername);
            }
        } else { 
            params.append('username', user.username);
        }

        try {
            // ใช้ Promise.all เพื่อให้โหลดข้อมูลทั้งหมดพร้อมกัน
            const [ordersResponse, lottoTypesResponse, billUsersResponse] = await Promise.all([
                api.get<Order[]>(`/api/bills?${params.toString()}`),
                api.get<LottoType[]>('/api/lotto-types'),
                (user.role === "admin" || user.role === "owner") 
                    ? api.get<{ id: number; username: string }[]>('/api/users-with-bills') 
                    : Promise.resolve(null) 
            ]);

            // อัปเดต State จากข้อมูลที่ได้รับ
            setOrders(ordersResponse.data);
            
            const lottoTypesData = lottoTypesResponse.data;
            setLottoTypes(lottoTypesData);
            const countries = [...new Set(lottoTypesData.map((lt) => getCountryFromLottoName(lt.name)))];
            setCountryList(countries.sort());

            if (billUsersResponse) {
                setBillUsers(billUsersResponse.data);
            }

        } catch (err) {
            console.error("Failed to fetch initial data", err);
        } finally {
            setIsLoading(false);
        }
    };

    loadInitialData();
}, [user, startDate, endDate, filterUsername]); // Dependency array ที่ถูกต้อง

  const filteredLottoNames = useMemo(() => {
    if (!selectedCountry) return lottoTypes;
    return lottoTypes.filter(
      (lt) => getCountryFromLottoName(lt.name) === selectedCountry
    );
  }, [selectedCountry, lottoTypes]);

  useEffect(() => {
    setSelectedLottoName("");
  }, [selectedCountry]);

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">รายการคำสั่งซื้อ</h1>
        </div>

        <form
          onSubmit={handleSearch}
          className="space-y-6 bg-gray-50 p-4 rounded-lg shadow-sm"
        >
          {/* ====== แถวที่ 1: วันที่ และ สถานะ ====== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {/* --- วันที่สั่งซื้อ --- */}
            <div className="lg:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                แสดงวันที่สั่งซื้อ
              </label>
              {/* ใช้ flex-wrap เพื่อให้วันที่ขึ้นบรรทัดใหม่ในจอที่แคบมากๆ */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 min-w-[150px] bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                />
                <span>-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 min-w-[150px] bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                />
              </div>
            </div>

            {/* --- สถานะ --- */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                สถานะ
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              >
                <option value="">ทั้งหมด</option>
                <option value="ยืนยันแล้ว">ยืนยันแล้ว</option>
                <option value="รอผล">รอผล</option>
                <option value="ยกเลิก">ยกเลิก</option>
              </select>
            </div>
          </div>

          {/* ====== แถวที่ 2: ตัวกรองอื่นๆ ====== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-gray-200">
            {/* --- ประเภท (หวย/หุ้น) --- */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                ประเภท (หวย/หุ้น)
              </label>
              <select
                id="lottoCategory"
                value={lottoCategory}
                onChange={(e) => setLottoCategory(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              >
                <option value="">ทั้งหมด</option>
                <option value="หวย">หวย (ทั้งหมด)</option>
                <option value="หุ้น">หวยหุ้น (ทั้งหมด)</option>
              </select>
            </div>

            {/* --- ชื่อหวย --- */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                ชื่อหวย
              </label>
              <select
                value={selectedLottoName}
                onChange={(e) => setSelectedLottoName(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                disabled={!lottoTypes.length}
              >
                <option value="">ทั้งหมด</option>
                {filteredLottoNames.map((lt) => (
                  <option key={lt.id} value={lt.name}>
                    {lt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* --- เลขที่ใบสั่งซื้อ --- */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                เลขที่ใบสั่งซื้อ
              </label>
              <input
                type="text"
                id="order-id"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                placeholder="เลขที่ใบสั่งซื้อ"
              />
            </div>

            {/* --- บันทึกช่วยจำ --- */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                บันทึกช่วยจำ
              </label>
              <input
                type="text"
                id="order-note"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                placeholder="บันทึกช่วยจำ"
              />
            </div>
          </div> 

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-start gap-4 pt-4 border-t border-gray-200">
            {/* --- ค้นหาโดย User --- */}
            <div>
              {(user?.role === "admin" || user?.role === "owner") && (
                <>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    ค้นหาโดย User
                  </label>
                  <select
                    id="filter-username"
                    value={filterUsername}
                    onChange={(e) => setFilterUsername(e.target.value)}
                    // --- จุดที่แก้ไข ---
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-72 p-2.5"
                  >
                    <option value="">แสดงทั้งหมด</option>
                    {user && (
                      <option value={user.username}>
                        {user.username} (ตัวฉัน)
                      </option>
                    )}
                    {billUsers
                      .filter((u) => u.username !== user?.username)
                      .map((u) => (
                        <option key={u.id} value={u.username}>
                          {u.username}
                        </option>
                      ))}
                  </select>
                </>
              )}
            </div>
 
            <div className="flex items-end h-full">
              <button
                type="submit" 
                className="w-full sm:w-60 bg-yellow-300 hover:bg-yellow-400 transition-colors text-black font-bold py-2.5 px-6 rounded-lg text-center"
              >
                ค้นหา
              </button>
            </div>
          </div>
        </form>

        <div className="flex items-center my-4 text-sm text-gray-600">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />{" "}
          <span>สัญลักษณ์นี้หมายถึงในบิลนั้นๆมีเลขจ่ายครึ่งราคา</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 whitespace-nowrap">
                  No
                </th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  เลขที่ใบสั่งซื้อ
                </th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  วันที่บันทึกข้อมูล
                </th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  บันทึกโดย
                </th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  ประเภทหวย
                </th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  งวด
                </th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  จำนวนรายการ
                </th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  ยอดรวม
                </th> 
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  ยอดคืนเลข
                </th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  ยอดสุทธิ
                </th>
                <th scope="col" className="px-4 py-3 whitespace-nowrap">
                  บันทึกช่วยจำ
                </th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12}>
                    <FullScreenLoader
                      isLoading={true}
                      text="กำลังโหลดข้อมูล..."
                    />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16">
                    <NoDataIcon />
                    <p>ไม่พบข้อมูล</p>
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => (
                  <React.Fragment key={order.id}>
                    <tr
                      onClick={() => handleRowClick(order.id)}
                      className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-3 py-4">{index + 1}</td>
                      <td
                        className={`font-medium px-6 py-4 whitespace-nowrap flex items-center ${
                          order.lottoName === "หวยนี้ถูกนำออกจากระบบแล้ว"
                            ? " text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {order.billRef}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleString("th-TH")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.username}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap flex items-center ${
                          order.lottoName === "หวยนี้ถูกนำออกจากระบบแล้ว"
                            ? " text-red-600"
                            : ""
                        }`}
                      >
                        {order.lottoName}{" "}
                        {order.hasHalfRateItem && (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 ml-2" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          {order.bill_lotto_draw
                            ? formatDateString(order.bill_lotto_draw, 'short')
                            : "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {order.itemCount}
                      </td>
                       <td className="px-6 py-4 text-green-600 whitespace-nowrap"> 
                        {Number(order.totalAmount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </td> 
                      <td className="px-6 py-4 text-orange-600 whitespace-nowrap">
                        {Number(order.returnedAmount) > 0 ? Number(order.returnedAmount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        }) : "0.00"} บาท
                      </td> 
                      <td className="px-6 py-4 font-bold text-green-600 whitespace-nowrap">
                        {Number(order.netAmount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4">{order.note || "-"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-semibold ${
                            order.status === "ยืนยันแล้ว"
                              ? "bg-green-100 text-green-800"
                              : order.status === "ยกเลิก"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>

                    {expandedRowId === order.id && (
                      <tr>
                        <td colSpan={12} className="p-4 bg-gray-50">
                          {isDetailLoading ? (
                            <p className="text-center py-4">
                              กำลังโหลดรายการ...
                            </p>
                          ) : (
                            <div className="border border-gray-200 rounded-lg p-2">
                              <table className="w-full text-sm text-center">
                                <thead className="bg-yellow-300">
                                  <tr className="text-black text-md">
                                    <th className="p-2">ประเภท</th>
                                    <th className="p-2">หมายเลข</th>
                                    <th className="p-2">ยอดเงินที่ลง</th>
                                    <th className="p-2">ยอดที่ได้รับ</th>
                                    <th className="p-2">อัตราจ่าย</th>
                                    <th className="p-2">เงินรางวัล</th>
                                    <th className="p-2 w-40">
                                      {order.status !== "ยืนยันแล้ว" &&
                                        order.status !== "ยกเลิก" && (
                                          <div className="flex flex-row gap-2">
                                            <button
                                              onClick={() =>
                                                handleUpdateAllEntries(
                                                  order.id,
                                                  "ยืนยัน"
                                                )
                                              }
                                              className="whitespace-nowrap text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                                            >
                                              ยืนยันทั้งหมด
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleUpdateAllEntries(
                                                  order.id,
                                                  "คืนเลข"
                                                )
                                              }
                                              className="whitespace-nowrap px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                            >
                                              คืนเลขทั้งหมด
                                            </button>
                                          </div>
                                        )}
                                      {(order.status === "ยืนยันแล้ว" ||
                                        order.status === "ยกเลิก") && (
                                        <>สถานะ</>
                                      )}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailEntries.flatMap((entryGroup) =>
                                    entryGroup.items.map((item) => (
                                      <tr
                                        key={item.id}
                                        className={`border-b ${
                                          item.price * 0.5 === item.rate
                                            ? "bg-red-50"
                                            : ""
                                        }`}
                                      >
                                        <td className="p-2 text-sm">
                                          {getBetTypeName(
                                            entryGroup.bet_type as BetDimension
                                          )}{" "}
                                          ({item.bet_style})
                                        </td>
                                        <td className="p-2 font-mono">
                                          {item.bet_number}
                                        </td>
                                        <td className="p-2 text-sm">
                                          {Number(item.price).toLocaleString(
                                            "en-US",
                                            { minimumFractionDigits: 2 }
                                          )}{" "}
                                          บาท
                                        </td>
                                        <td
                                          className={`p-2 text-sm ${
                                            item.price !== item.rate
                                              ? "text-red-600"
                                              : ""
                                          }`}
                                        >
                                          {`${item.price !== item.rate ? Number(item.rate) * 2 : item.rate} ${
                                            item.price !== item.rate
                                              ? "(จ่ายครึ่ง)"
                                              : ""
                                          }`}{" "}
                                          บาท
                                        </td>
                                        <td
                                          className={`p-2 text-sm ${
                                            item.price !== item.rate
                                              ? "text-red-600"
                                              : ""
                                          }`}
                                        >
                                          บาทละ {item.price !== item.rate ? Number(item.baht_per / 2).toLocaleString("th-TH", {maximumFractionDigits: 2, minimumFractionDigits: 2}) :  Number(item.baht_per).toLocaleString("th-TH", {maximumFractionDigits: 2, minimumFractionDigits: 2})}
                                        </td>
                                        <td className="p-2 text-sm">
                                          {Number(
                                            item.payout_amount
                                          ).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}{" "}
                                          บาท
                                        </td>
                                        <td className="p-2">
                                          {item.status === null ? (
                                            <div className="flex justify-center gap-2">
                                              <button
                                                onClick={() =>
                                                  handleUpdateEntryStatus(
                                                    order.id,
                                                    item.id,
                                                    "ยืนยัน"
                                                  )
                                                }
                                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                              >
                                                ยืนยัน
                                              </button>
                                              <button
                                                onClick={() =>
                                                  handleUpdateEntryStatus(
                                                    order.id,
                                                    item.id,
                                                    "คืนเลข"
                                                  )
                                                }
                                                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                              >
                                                คืนเลข
                                              </button>
                                            </div>
                                          ) : (
                                            <span
                                              className={`font-semibold ${
                                                item.status === "ยืนยัน"
                                                  ? "text-green-600"
                                                  : "text-red-600"
                                              }`}
                                            >
                                              {item.status}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                              <div className="flex justify-between items-center gap-2 mt-4">
                                <div>
                                  {order.status === "รอผล" && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConfirmBill(
                                            order.id,
                                            order.billRef
                                          );
                                        }}
                                        className="px-3 py-1 mr-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                      >
                                        ยืนยันบิล
                                      </button>
                                    </>
                                  )}
                                  {(order.status === "ยืนยันแล้ว" ||
                                    order.status === "รอผล") && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelBill(
                                            order.id,
                                            order.billRef
                                          );
                                        }}
                                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                      >
                                        ยกเลิกบิล
                                      </button>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewBill(order, detailEntries);
                                    }}
                                    className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                                  >
                                    ดูบิล
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerPrintActions(order, detailEntries);
                                      setTimeout(handlePrint, 100);
                                    }}
                                    className="px-3 py-1 bg-black text-white rounded hover:bg-gray-900 text-sm"
                                  >
                                    พิมพ์บิลใบเสร็จ
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerPrintActions(order, detailEntries);
                                      setTimeout(handleSaveImage, 100);
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                  >
                                    บันทึกเป็นรูป
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
        <PrintableBill2
          ref={printableBillRef}
          order={billToPrint ? billToPrint.order : null}
          details={billToPrint ? billToPrint.details : null}
        />
      </div>

      <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
        <PrintableBill2
          ref={printableBillRef}
          order={billToPrint ? billToPrint.order : null}
          details={billToPrint ? billToPrint.details : null}
        />
      </div>




      {isModalVisible && ( 
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col relative">
            {/* กลุ่มปุ่มควบคุมมุมขวาบน */}
            <div className="absolute top-2 right-2 flex gap-2 z-20">
              <button
                onClick={handlePrint}
                className="p-2 bg-gray-200 rounded-full hover:bg-blue-200 transition-colors"
                title="พิมพ์"
              >
                <PrinterIcon className="h-6 w-6 text-blue-600" />
              </button>
              <button
                onClick={() => {
                  triggerPrintActions(billToPrint!.order, billToPrint!.details);
                  setTimeout(handleSaveImage, 100);
                }}
                className="p-2 bg-gray-200 rounded-full hover:bg-green-200 transition-colors"
                title="บันทึกรูปภาพ"
              >
                <DownloadIcon className="h-6 w-6 text-green-600" />
              </button>
              <button
                onClick={() => setIsModalVisible(false)}
                className="p-2 bg-gray-200 rounded-full hover:bg-red-200 transition-colors z-10"
                title="ปิด"
              >
                <XMarkIcon className="h-6 w-6 text-red-600" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 pt-12">
              {billImageUrl ? (
                <img src={billImageUrl} alt="ใบเสร็จ" className="w-full" />
              ) : (
                <div className="text-center py-10">
                  <FullScreenLoader
                    isLoading={true}
                    text="กำลังสร้างรูปภาพใบเสร็จ..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LottoList;
