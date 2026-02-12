// // src/pages/PrizeCheckPage.tsx

// import React, { useState, useEffect, useCallback, useMemo } from "react"; 
// import { formatDateBasicString, formatDateString, formatTimeZoneToDate } from "../services/BetService"; 
// import { useAuth } from "../contexts/AuthContext";


// import api from "../api/axiosConfig";
// // --- Interfaces ---
// interface WinningNumbers {
//   "3top"?: string[];
//   "2top"?: string[];
//   "2bottom"?: string[];
//   "3tote"?: string[];
//   "3bottom"?: string[];
//   run_top?: string[];
//   run_bottom?: string[];
// }

// export interface PrizeCheckItem {
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
//   lottoRoundStatus: "active" | "closed" | "manual_closed" | string;
//   username: string;
//   rate: number;
//   payoutAmount: number;
//   status: 'ยืนยัน' | 'คืนเลข' | null;
// }

// // --- Helper Functions ---
// const validateNumberInput = (value: string, maxLength: number): string => {
//   const filteredValue = value.replace(/[^0-9, ]/g, "");
//   const parts = filteredValue.split(/[\s,]+/);
//   const lastPart = parts[parts.length - 1];
//   if (lastPart.length > maxLength) {
//     return filteredValue.slice(0, -1);
//   }
//   return filteredValue;
// };

// const getDateString = (offsetDays = 0) => {
//   const date = new Date();
//   date.setDate(date.getDate() + offsetDays);
//   return date.toISOString().split("T")[0];
// };
// const getBetTypeName = (betType: string) => {
//   if (betType.includes("2")) return "2 ตัว";
//   if (betType.includes("3") || betType.includes("6")) return "3 ตัว";
//   if (betType.includes("run")) return "วิ่ง";
//   return betType;
// };

// const parseMultiNumberInput = (input: string): string[] => {
//   if (!input) return [];
//   return input.split(/[\s,]+/).filter(Boolean);
// };

// const sortString = (str: string) => str.split("").sort().join("");

// const getPrizeDetails = (
//   item: PrizeCheckItem,
//   overrideNumbers: WinningNumbers | null,
//   overrideGroupKey: string
// ): { prize: number; statusText: string; isWinner: boolean } => {
//     const itemDateKey = new Date(item.lottoDrawDate).toISOString().split("T")[0];
//     const itemGroupKey = `${item.lottoName}|${itemDateKey}`;
//     const useOverride = overrideNumbers && overrideGroupKey === itemGroupKey;

//     if (!useOverride && item.lottoRoundStatus !== "closed" && item.lottoRoundStatus !== "manual_closed") {
//         return { prize: 0, statusText: "รอประกาศผล", isWinner: false };
//     }
//     const winningNumbers = useOverride ? overrideNumbers : item.winningNumbers;
//     if (!winningNumbers) {
//         return { prize: 0, statusText: "รอใส่ผลรางวัล", isWinner: false };
//     }
//     let prizeKey: keyof WinningNumbers | null = null;
//     const betType = item.bet_type;
//     const betStyle = item.bet_style.toLowerCase();

//     if (betType.includes("3")) {
//         if (betStyle === "ตรง") prizeKey = "3top";
//         else if (betStyle === "โต๊ด") prizeKey = "3tote";
//         else if (betStyle === "ล่าง") prizeKey = "3bottom";
//     } else if (betType.includes("2")) {
//         if (betStyle === "บน") prizeKey = "2top";
//         else if (betStyle === "ล่าง") prizeKey = "2bottom";
//     } else if (betType.includes("run")) {
//         if (betStyle.includes("บน")) prizeKey = "run_top";
//         else if (betStyle.includes("ล่าง")) prizeKey = "run_bottom";
//     }

//     if (!prizeKey) {
//         return { prize: 0, statusText: "ไม่สามารถตรวจได้", isWinner: false };
//     }
//     const prizeValue = winningNumbers[prizeKey];
//     if (prizeValue == null || prizeValue.length === 0) {
//         return { prize: 0, statusText: "รอใส่ผลรางวัล", isWinner: false };
//     }

//     let isWinner = false;
//     if (prizeKey === "3tote") {
//         const sortedBetNumber = sortString(item.bet_number);
//         if (Array.isArray(prizeValue)) {
//             isWinner = prizeValue.some((winNum) => sortString(winNum) === sortedBetNumber);
//         }
//     } else {
//         if (Array.isArray(prizeValue)) {
//             isWinner = prizeValue.includes(item.bet_number);
//         } else if (typeof prizeValue === "string") {
//             isWinner = prizeValue === item.bet_number;
//         }
//     }

//     if (isWinner) {
//         return { prize: item.payoutAmount, statusText: "ถูกรางวัล", isWinner: true };
//     } else {
//         return { prize: 0, statusText: "ไม่ถูกรางวัล", isWinner: false };
//     }
// };

// const getBillStatus = (
//     billItems: PrizeCheckItem[],
//     overrideNumbers: WinningNumbers | null,
//     overrideGroupKey: string
// ): 'winner' | 'loser' | 'pending' => {
//     let hasWinner = false;
//     let isPending = false;

//     const firstItem = billItems[0];
//     const itemDateKey = new Date(firstItem.lottoDrawDate).toISOString().split("T")[0];
//     const itemGroupKey = `${firstItem.lottoName}|${itemDateKey}`;
//     const isSimulatingThisGroup = overrideNumbers && overrideGroupKey === itemGroupKey;
    
//     if (!isSimulatingThisGroup && firstItem.lottoRoundStatus !== 'closed' && firstItem.lottoRoundStatus !== 'manual_closed') {
//         return 'pending';
//     }
    
//     for (const item of billItems) {
//         const details = getPrizeDetails(item, overrideNumbers, overrideGroupKey);
//         if (details.isWinner) {
//             hasWinner = true;
//             break; 
//         }
//         if (details.statusText === "รอประกาศผล" || details.statusText === "รอใส่ผลรางวัล") {
//             isPending = true;
//         }
//     }

//     if (hasWinner) return 'winner';
//     if (isPending) return 'pending';
//     return 'loser'; 
// };

// // --- Main Page Component ---
// const PrizeCheckPage: React.FC = () => {
//   const { user } = useAuth();

  

//   const [billUsers, setBillUsers] = useState<{ id: number, username: string }[]>([]);
//   const [filterUsername, setFilterUsername] = useState(user?.username);

//   const [masterItems, setMasterItems] = useState<PrizeCheckItem[]>([]);
//   const [filteredItems, setFilteredItems] = useState<PrizeCheckItem[]>([]);
//   const [lottoNamesList, setLottoNamesList] = useState<string[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [startDate, setStartDate] = useState(getDateString(-31));
//   const [endDate, setEndDate] = useState(getDateString());
//   const [status, setStatus] = useState("ยืนยันแล้ว");
//   const [lottoType, setLottoType] = useState("");
//   const [selectedLottoName, setSelectedLottoName] = useState("");
//   const [billRef, setBillRef] = useState("");
//   const [note, setNote] = useState("");
//   const [derivedStatus, setDerivedStatus] = useState("ถูกรางวัล");
//   const [expandedRow, setExpandedRow] = useState<string | null>(null);
//   const [manualLottoGroupKey, setManualLottoGroupKey] = useState<string>("");
//   const [manual3Top, setManual3Top] = useState("");
//   const [manual3Bottom, setManual3Bottom] = useState("");
//   const [manual3Tote, setManual3Tote] = useState("");
//   const [manual2Top, setManual2Top] = useState("");
//   const [manual2Bottom, setManual2Bottom] = useState("");
//   const [manualRunTop, setManualRunTop] = useState("");
//   const [manualRunBottom, setManualRunBottom] = useState("");
//   const [isManualFormVisible, setIsManualFormVisible] = useState(false);
//   const [isSimulating, setIsSimulating] = useState(false);
//   const [overrideWinningNumbers, setOverrideWinningNumbers] =
//     useState<WinningNumbers | null>(null);

// const fetchItems = useCallback(async () => {
//     setIsLoading(true);
//     // เพิ่ม limit เข้าไป (ใส่ค่าเยอะๆ ไปก่อนถ้ายังไม่ทำ Pagination แบบเปลี่ยนหน้า)
//     const params = new URLSearchParams({ 
//         startDate, 
//         endDate,
//         limit: "10000" // 👈 เพิ่มบรรทัดนี้: ดึงสัก 10,000 รายการ หรือตามที่ server ไหว
//     });
    
//     if (status) params.append("status", status);
    
//     try { 
//         const response = await api.get<any>( // เปลี่ยน Type ชั่วคราวเป็น any เพราะ backend แบบใหม่ส่ง structure ต่างออกไป
//             `/api/prize-check/all-items?${params.toString()}`
//         );
        
//         // ⚠️ ต้องเช็คว่า Backend ส่งมาเป็น Array ตรงๆ หรือ Object { items: [], pagination: {} }
//         // จากโค้ด Backend: ถ้าส่ง limit ไป มันจะ return { items: [...], pagination: {...} }
//         const data = response.data.items ? response.data.items : response.data;

//         setMasterItems(data);
        
//         const uniqueNames = [
//             ...new Set((data as PrizeCheckItem[]).map((item) => item.lottoName)),
//         ].sort();
//         setLottoNamesList(uniqueNames);
//     } catch (error) {
//         console.error("Failed to fetch items", error);
//         setMasterItems([]);
//     } finally {
//         setIsLoading(false);
//     }
// }, [startDate, endDate, status]);

// // ค้นหา useEffect ที่มี loadData
// useEffect(() => {
//     const loadData = async () => {
//         if (!user) return;
//         setIsLoading(true);

//         if (user.role === 'admin' || user.role === 'owner') {
//              // ... (ส่วนดึง user เหมือนเดิม)
//         }

//         // ดึงข้อมูลรายการแทงทั้งหมด
//         const params = new URLSearchParams();
//         params.append('startDate', startDate);
//         params.append('endDate', endDate);
//         if (status) params.append('status', status);
//         params.append('limit', '10000'); // 👈 เพิ่มบรรทัดนี้เช่นกัน

//         try { 
//             const response = await api.get<any>(`/api/prize-check/all-items?${params.toString()}`);
            
//             // ⚠️ รับค่าให้ถูกต้องตาม Format ใหม่
//             const data = response.data.items ? response.data.items : response.data;

//             setMasterItems(data);
//             const uniqueNames = [...new Set((data as PrizeCheckItem[]).map((item) => item.lottoName))].sort();
//             setLottoNamesList(uniqueNames);
//         } catch (err) { 
//             console.error("Failed to fetch initial items", err); 
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     loadData();
// }, [user, startDate, endDate, status]);


//   const handleResetManualCheck = () => {
//     setIsSimulating(false);
//     setManualLottoGroupKey("");
//     setManual3Top("");
//     setManual3Tote("");
//     setManual3Bottom("");
//     setManual2Top("");
//     setManual2Bottom("");
//     setManualRunTop("");
//     setManualRunBottom("");
//     setOverrideWinningNumbers(null);
//   };
//   const handleManualCheck = (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSimulating(true);
//     setTimeout(() => {
//       if (!manualLottoGroupKey) {
//         setIsSimulating(false);
//         return;
//       }
//       const newOverride: WinningNumbers = {
//         "3top": parseMultiNumberInput(manual3Top),
//         "3tote": parseMultiNumberInput(manual3Tote),
//         "3bottom": parseMultiNumberInput(manual3Bottom),
//         "2top": parseMultiNumberInput(manual2Top),
//         "2bottom": parseMultiNumberInput(manual2Bottom),
//         run_top: parseMultiNumberInput(manualRunTop),
//         run_bottom: parseMultiNumberInput(manualRunBottom),
//       };
//       setOverrideWinningNumbers(newOverride);
//       setIsSimulating(false);
//     }, 100);
//   };

//   const checkableRounds = useMemo(() => {
//     const groups = masterItems.reduce((acc, item) => {
//       const dateKey = new Date(item.lottoDrawDate).toISOString().split("T")[0];
//       const groupKey = `${item.lottoName}|${dateKey}`;
//       if (
//         !acc[groupKey]
//       ) {
//         acc[groupKey] = {
//           key: groupKey,
//           name: `${item.lottoName} (${formatDateBasicString(item.lottoDrawDate)})`,
//         };
//       }
//       return acc;
//     }, {} as Record<string, { key: string; name: string }>);
//     return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
//   }, [masterItems]);

//   useEffect(() => {
//     let itemsToFilter = [...masterItems];

//     if (filterUsername) {
//       itemsToFilter = itemsToFilter.filter(item => item.username === filterUsername);
//     }


//     if (lottoType) {
//       if (lottoType === "หวย")
//         itemsToFilter = itemsToFilter.filter(
//           (item) => !item.lottoName.includes("หุ้น")
//         );
//       else if (lottoType === "หุ้น")
//         itemsToFilter = itemsToFilter.filter((item) =>
//           item.lottoName.includes("หุ้น")
//         );
//     }
//     if (selectedLottoName) {
//       itemsToFilter = itemsToFilter.filter(
//         (item) => item.lottoName === selectedLottoName
//       );
//     }
//     if (billRef) {
//       itemsToFilter = itemsToFilter.filter((item) =>
//         item.billRef.toLowerCase().includes(billRef.toLowerCase())
//       );
//     }
//     if (note) {
//       itemsToFilter = itemsToFilter.filter(
//         (item) =>
//           item.note && item.note.toLowerCase().includes(note.toLowerCase())
//       );
//     }
//     if (derivedStatus) {
//       itemsToFilter = itemsToFilter.filter((item) => {
//         const { statusText } = getPrizeDetails(
//           item,
//           overrideWinningNumbers,
//           manualLottoGroupKey
//         );
//         return statusText === derivedStatus;
//       });
//     }
//     setFilteredItems(itemsToFilter);
//   }, [
//     masterItems,
//     filterUsername,
//     lottoType,
//     selectedLottoName,
//     billRef,
//     note,
//     derivedStatus,
//     overrideWinningNumbers,
//     manualLottoGroupKey,
//   ]);


//   const groupedItems = useMemo(() => {
//     return filteredItems.reduce((acc, item) => {
//       if (!acc[item.billRef]) acc[item.billRef] = [];
//       acc[item.billRef].push(item);
//       return acc;
//     }, {} as Record<string, PrizeCheckItem[]>);
//   }, [filteredItems]);

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault();
//     fetchItems();
//   };

//   const toggleRow = (billRefToToggle: string) => {
//     setExpandedRow((prev) =>
//       prev === billRefToToggle ? null : billRefToToggle
//     );
//   };


  

//   return (
//     <div className="p-4 sm:p-6 lg:p-4 bg-gray-100 min-h-screen">
//       <div className="bg-white p-6 rounded-lg shadow-md">
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-2xl font-bold text-gray-800">สรุปผลรางวัล</h1>
//         </div>

//         <form onSubmit={handleSearch}  className="space-y-4 mb-6 p-4 rounded-lg bg-gray-50" >
//           <div className="lg:col-span-2">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
      
//                 {/* --- ส่วนของวันที่สั่งซื้อ (เหมือนเดิม) --- */}
//                 <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     วันที่สั่งซื้อ
//                   </label>
//                   <div className="flex flex-wrap items-center gap-2">
//                     <input
//                       type="date"
//                       value={startDate}
//                       onChange={(e) => setStartDate(e.target.value)}
//                       className="flex-1 min-w-[150px] p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     />
//                     <span>-</span>
//                     <input
//                       type="date"
//                       value={endDate}
//                       onChange={(e) => setEndDate(e.target.value)}
//                       className="flex-1 min-w-[150px] p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     />
//                   </div>
//                 </div>

//                 {/* --- ส่วนของสถานะ (เหมือนเดิม) --- */}
//                 <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     สถานะ
//                   </label>
//                   <select
//                     value={status}
//                     onChange={(e) => setStatus(e.target.value)}
//                     className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     disabled={true}
//                   >
//                     <option value="ยืนยันแล้ว">ยืนยันแล้ว</option>
//                     {/* <option value="รอผล">รอผล</option>
//                     <option value="ยกเลิก">ยกเลิก</option>
//                     <option value="">ทั้งหมด</option> */}
//                   </select>
//                 </div>

//               </div>
//             </div>

//           <div className="col-span-full pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
//             <h3 className="col-span-full text-lg font-semibold text-gray-700 mb-0">
//               ตัวกรองข้อมูล
//             </h3>
//             <div>
//               <label className="block mb-2 text-sm font-medium text-gray-700">
//                 ประเภท (หวย/หุ้น)
//               </label>
//               <select
//                 value={lottoType}
//                 onChange={(e) => setLottoType(e.target.value)}
//                 className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
//               >
//                 <option value="">ทั้งหมด</option>
//                 <option value="หวย">หวย</option>
//                 <option value="หุ้น">หุ้น</option>
//               </select>
//             </div>
//             <div>
//               <label className="block mb-2 text-sm font-medium text-gray-700">
//                 ชื่อหวย
//               </label>
//               <select
//                 value={selectedLottoName}
//                 onChange={(e) => setSelectedLottoName(e.target.value)}
//                 className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
//               >
//                 <option value="">ทั้งหมด</option>
//                 {lottoNamesList.map((name) => (
//                   <option key={name} value={name}>
//                     {name}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="block mb-2 text-sm font-medium text-gray-700">
//                 สถานะผลลัพธ์
//               </label>
//               <select
//                 value={derivedStatus}
//                 onChange={(e) => setDerivedStatus(e.target.value)}
//                 className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
//               >
//                 <option value="">ทั้งหมด</option>
//                 <option value="ถูกรางวัล">ถูกรางวัล</option>
//                 <option value="ไม่ถูกรางวัล">ไม่ถูกรางวัล</option>
//                 <option value="รอประกาศผล">รอประกาศผล</option>
//                 <option value="รอใส่ผลรางวัล">รอใส่ผลรางวัล</option>
//               </select>
//             </div>
//             <div>
//               <label className="block mb-2 text-sm font-medium text-gray-700">
//                 เลขที่ใบสั่งซื้อ
//               </label>
//               <input
//                 type="text"
//                 value={billRef}
//                 onChange={(e) => setBillRef(e.target.value)}
//                 className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
//                 placeholder="กรองด้วยเลขบิล..."
//               />
//             </div>
//             <div>
//               <label className="block mb-2 text-sm font-medium text-gray-700">
//                 บันทึกช่วยจำ
//               </label>
//               <input
//                 type="text"
//                 value={note}
//                 onChange={(e) => setNote(e.target.value)}
//                 className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
//                 placeholder="กรองด้วยบันทึก..."
//               />
//             </div>

//               {(user?.role === 'admin' || user?.role === 'owner') && (
//               <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">ค้นหาโดย User</label>
//                   <select 
//                       value={filterUsername} 
//                       onChange={(e) => setFilterUsername(e.target.value)} 
//                       className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
//                   >
//                       <option value="">แสดงทั้งหมด</option>
//                       {user && <option value={user.username}>{user.username} (ตัวฉัน)</option>}
//                       {billUsers
//                           .filter(u => u.username !== user?.username)
//                           .map(u => (
//                               <option key={u.id} value={u.username}>{u.username}</option>
//                           ))
//                       }
//                   </select>
//               </div>
//           )}
//             <div className="flex items-end h-full">
//             <button type="submit" className="w-full bg-yellow-300 hover:cursor-pointer hover:bg-yellow-200 text-black font-bold py-2.5 px-6 rounded-lg"  >
//               ค้นหา
//             </button>
//           </div>
//           </div>
//         </form>

//         <div className="my-6">
//           <button
//             type="button"
//             onClick={() => setIsManualFormVisible(!isManualFormVisible)}
//             className="w-full p-3 text-left font-bold text-white bg-black hover:bg-gray-800 rounded-lg flex justify-between items-center"
//           >
//             <span>จำลองการตรวจผลด้วยตัวเอง (Client-Side)</span>
//             <span
//               className={`transform transition-transform duration-200 ${
//                 isManualFormVisible ? "rotate-180" : "rotate-0"
//               }`}
//             >
//               ▼
//             </span>
//           </button>

//           {isManualFormVisible && (
//             <form
//               onSubmit={handleManualCheck}
//               className="space-y-4 mt-4 p-4 rounded-b-lg bg-gray-100"
//             >
//               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
//                 <div className="lg:col-span-4">
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     เลือกงวดที่ต้องการตรวจ
//                   </label>
//                   <select
//                     value={manualLottoGroupKey}
//                     onChange={(e) => setManualLottoGroupKey(e.target.value)}
//                     className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg"
//                   >
//                     <option value="">-- กรุณาเลือก --</option>
//                     {checkableRounds.map((group) => (
//                       <option key={group.key} value={group.key}>
//                         {group.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     3 ตัวบน
//                   </label>
//                   <input
//                     type="text"
//                     value={manual3Top}
//                     onChange={(e) => {
//                       const validatedValue = validateNumberInput(
//                         e.target.value,
//                         3
//                       );
//                       setManual3Top(validatedValue);
//                     }}
//                     className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     placeholder="เช่น 123, 456"
//                   />
//                 </div>
//                 <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     3 ตัวล่าง
//                   </label>
//                   <input
//                     type="text"
//                     value={manual3Bottom}
//                     onChange={(e) => {
//                       const validatedValue = validateNumberInput(
//                         e.target.value,
//                         3
//                       );
//                       setManual3Bottom(validatedValue);
//                     }}
//                     className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     placeholder="เช่น 456, 789"
//                   />
//                 </div>
//                 <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     3 ตัวโต๊ด
//                   </label>
//                   <input
//                     type="text"
//                     value={manual3Tote}
//                     onChange={(e) => {
//                       const validatedValue = validateNumberInput(
//                         e.target.value,
//                         3
//                       );
//                       setManual3Tote(validatedValue);
//                     }}
//                     className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     placeholder="คั่นด้วย , เช่น 123,456"
//                   />
//                 </div>
//                 <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     2 ตัวบน
//                   </label>
//                   <input
//                     type="text"
//                     value={manual2Top}
//                     onChange={(e) => {
//                       const validatedValue = validateNumberInput(
//                         e.target.value,
//                         2
//                       );
//                       setManual2Top(validatedValue);
//                     }}
//                     className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     placeholder="เช่น 23, 45"
//                   />
//                 </div>
//                 <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     2 ตัวล่าง
//                   </label>
//                   <input
//                     type="text"
//                     value={manual2Bottom}
//                     onChange={(e) => {
//                       const validatedValue = validateNumberInput(
//                         e.target.value,
//                         2
//                       );
//                       setManual2Bottom(validatedValue);
//                     }}
//                     className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     placeholder="เช่น 45, 67"
//                   />
//                 </div>
//                 <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     วิ่งบน
//                   </label>
//                   <input
//                     type="text"
//                     value={manualRunTop}
//                     onChange={(e) => {
//                       const validatedValue = validateNumberInput(
//                         e.target.value,
//                         1
//                       );
//                       setManualRunTop(validatedValue);
//                     }}
//                     className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     placeholder="เช่น 7, 8"
//                   />
//                 </div>
//                 <div>
//                   <label className="block mb-2 text-sm font-medium text-gray-700">
//                     วิ่งล่าง
//                   </label>
//                   <input
//                     type="text"
//                     value={manualRunBottom}
//                     onChange={(e) => {
//                       const validatedValue = validateNumberInput(
//                         e.target.value,
//                         1
//                       );
//                       setManualRunBottom(validatedValue);
//                     }}
//                     className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg"
//                     placeholder="เช่น 8, 9"
//                   />
//                 </div>

//                 <div className="col-span-full grid grid-cols-2 gap-4">
//                   <button
//                     type="button"
//                     onClick={handleResetManualCheck}
//                     className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2.5 px-6 rounded-lg"
//                   >
//                     คืนค่า
//                   </button>
//                   <button
//                     type="submit"
//                     disabled={isSimulating || !manualLottoGroupKey}
//                     className={`w-full text-white font-bold py-2.5 px-6 rounded-lg transition-colors ${
//                       isSimulating || !manualLottoGroupKey
//                         ? "bg-gray-400 cursor-not-allowed"
//                         : "bg-blue-500 hover:bg-blue-600"
//                     }`}
//                   >
//                     {isSimulating ? "กำลังตรวจ..." : "จำลองการตรวจผล"}
//                   </button>
//                 </div>
//               </div>
//             </form>
//           )}
//         </div>

//         <div className="overflow-x-auto">
//   <table className="w-full text-sm text-left text-gray-600">
//     <thead className="text-xs text-gray-700 uppercase bg-gray-100">
//       <tr>
//         <th className="px-4 py-3 whitespace-nowrap">เลขที่ใบสั่งซื้อ</th>
//         <th className="px-4 py-3 whitespace-nowrap">ประเภทหวย</th>
//         <th className="px-4 py-3 whitespace-nowrap">งวด</th>
//         <th className="px-4 py-3 whitespace-nowrap">บันทึกโดย</th>
//         <th className="px-4 py-3 text-center whitespace-nowrap">เงินรางวัลรวม</th>
//         <th className="px-4 py-3 whitespace-nowrap">บันทึกช่วยจำ</th>
//       </tr>
//     </thead>
//     <tbody>
//       {isLoading ? (
//         <tr>
//           <td colSpan={6} className="text-center py-16">
//             <div className="flex justify-center items-center gap-2 text-gray-500">
//               <svg
//                 className="animate-spin h-5 w-5"
//                 xmlns="http://www.w3.org/2000/svg"
//                 fill="none"
//                 viewBox="0 0 24 24"
//               >
//                 <circle
//                   className="opacity-25"
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                 ></circle>
//                 <path
//                   className="opacity-75"
//                   fill="currentColor"
//                   d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                 ></path>
//               </svg>
//               <span>กำลังโหลดข้อมูล...</span>
//             </div>
//           </td>
//         </tr>
//       ) : Object.keys(groupedItems).length === 0 ? (
//         <tr>
//           <td colSpan={6} className="text-center py-16 text-gray-500">
//             ไม่พบข้อมูล หรือไม่ตรงกับตัวกรอง
//           </td>
//         </tr>
//       ) : (
//         Object.entries(groupedItems).map(([currentBillRef, billItems]) => {
//           const firstItem = billItems[0];
//           const isExpanded = expandedRow === currentBillRef;

//           const billStatus = getBillStatus(
//             billItems,
//             overrideWinningNumbers,
//             manualLottoGroupKey
//           );

//           // ✨ [แก้ไข] แปลง `prize` เป็นตัวเลขด้วย `Number()` ก่อนบวก
//           const totalPrizeForBill = billItems.reduce((total, item) => {
//             if (item.status !== "ยืนยัน") {
//               return total;
//             }
//             const { prize } = getPrizeDetails(
//               item,
//               overrideWinningNumbers,
//               manualLottoGroupKey
//             );
//             return total + Number(prize); // <--- แก้ไขจุดที่ 1
//           }, 0);

//           const rowClass =
//             {
//               winner:
//                 "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500",
//               loser:
//                 "bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500",
//               pending: "bg-white hover:bg-gray-50",
//             }[billStatus] || "bg-white hover:bg-gray-50";

//           return (
//             <React.Fragment key={currentBillRef}>
//               <tr
//                 className={`border-b cursor-pointer transition-colors duration-300 ${rowClass}`}
//                 onClick={() => toggleRow(currentBillRef)}
//               >
//                 <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
//                   {currentBillRef}
//                 </td>
//                 <td className="px-4 py-3 whitespace-nowrap">{firstItem.lottoName}</td>
//                 <td className="px-4 py-3 whitespace-nowrap">
//                   {formatDateString(firstItem.lottoDrawDate, "short")}
//                 </td>
//                 <td className="px-4 py-3 whitespace-nowrap">{firstItem.username}</td> 
//                 <td
//                   className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${
//                     totalPrizeForBill > 0 ? "text-green-700" : "text-gray-500"
//                   }`}
//                 >
//                   {totalPrizeForBill.toLocaleString("en-US", {
//                     minimumFractionDigits: 2,
//                     maximumFractionDigits: 2,
//                   })} บาท
//                 </td>
//                 <td className="px-4 py-3 whitespace-nowrap">{firstItem.note}</td>
//               </tr>
//               {isExpanded && (
//                 <tr className="bg-gray-50">
//                   <td colSpan={6} className="p-2 md:p-4">
//                     <div className="overflow-x-auto">
//                       <table className="w-full text-sm text-left text-gray-600">
//                         <thead className="text-xs text-gray-700 uppercase bg-gray-200">
//                           <tr>
//                             <th className="px-4 py-2 whitespace-nowrap">ประเภท</th>
//                             <th className="px-4 py-2 whitespace-nowrap">หมายเลข</th>
//                             <th className="px-0 py-2 text-center whitespace-nowrap">
//                               ยอดแทง
//                             </th>
//                             <th className="px-4 py-2 text-right whitespace-nowrap">
//                               เรทจ่าย
//                             </th>
//                             <th className="px-4 py-2 text-right whitespace-nowrap">บาทละ</th>
//                             <th className="px-4 py-2 text-right whitespace-nowrap">
//                               เงินรางวัล
//                             </th>
//                             <th className="px-4 py-2 text-center whitespace-nowrap">
//                               บันทึกช่วยจำ
//                             </th>
//                             <th className="px-4 py-2 text-center whitespace-nowrap">สถานะ</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {billItems
//                             .filter((item) => item.status === "ยืนยัน")
//                             .map((item) => {
//                               const { statusText, isWinner } =
//                                 getPrizeDetails(
//                                   item,
//                                   overrideWinningNumbers,
//                                   manualLottoGroupKey
//                                 );
//                               return (
//                                 <tr
//                                   key={item.id}
//                                   className={`border-b whitespace-nowrap${
//                                     isWinner
//                                       ? "bg-green-100"
//                                       : statusText === "รอใส่ผลรางวัล" ||
//                                         statusText === "รอประกาศผล"
//                                       ? "bg-white"
//                                       : "bg-red-50"
//                                   }`}
//                                 >
//                                   <td className="px-4 py-3 whitespace-nowrap">
//                                     {getBetTypeName(item.bet_type)} (
//                                     {item.bet_style})
//                                   </td>
//                                   <td className="px-4 py-3 text-left font-mono whitespace-nowrap">
//                                     {item.bet_number}
//                                   </td>
//                                   <td className="px-4 py-3 text-center whitespace-nowrap">
//                                     {item.price} บาท
//                                   </td>
//                                   <td
//                                     className={`px-4 py-3 text-right whitespace-nowrap ${
//                                       item.price * 0.5 == item.rate
//                                         ? " text-red-600"
//                                         : " text-black"
//                                     }`}
//                                   >
//                                     {item.price}{" "}
//                                     {item.price * 0.5 == item.rate
//                                       ? "(จ่ายครึ่ง)"
//                                       : ""}{" "}
//                                     บาท
//                                   </td>
//                                   <td
//                                     className={`px-4 py-3 text-right whitespace-nowrap ${
//                                       item.price * 0.5 == item.rate
//                                         ? " text-red-600"
//                                         : " text-black"
//                                     }`}
//                                   >
//                                     {item.price * 0.5 == item.rate
//                                       ? (item.baht_per / 2).toLocaleString(
//                                           "en-US",
//                                           {
//                                             maximumFractionDigits: 2,
//                                             minimumFractionDigits: 2,
//                                           }
//                                         )
//                                       : /* ✨ [แก้ไข] จัดรูปแบบตัวเลข */
//                                         Number(
//                                           item.baht_per
//                                         ).toLocaleString("en-US", { // <--- แก้ไขจุดที่ 2
//                                           maximumFractionDigits: 2,
//                                           minimumFractionDigits: 2,
//                                         })}{" "}
//                                     บาท
//                                   </td>
//                                   <td
//                                     className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
//                                       isWinner
//                                         ? "text-green-700"
//                                         : "text-gray-400"
//                                     }`}
//                                   >
//                                     {Number(
//                                       item.payoutAmount
//                                     ).toLocaleString("en-US", {
//                                       maximumFractionDigits: 2,
//                                       minimumFractionDigits: 2,
//                                     })}{" "}
//                                     บาท
//                                   </td>
//                                   <td className="px-4 py-3 text-center">
//                                     {firstItem.note}
//                                   </td>
//                                   <td className="px-4 py-3 text-center">
//                                     <span
//                                       className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
//                                         isWinner
//                                           ? "bg-green-200 text-green-800"
//                                           : statusText === "ไม่ถูกรางวัล"
//                                           ? "bg-red-100 text-red-700"
//                                           : statusText === "รอใส่ผลรางวัล"
//                                           ? "bg-gray-200 text-gray-800"
//                                           : "bg-yellow-100 text-yellow-800"
//                                       }`}
//                                     >
//                                       {statusText}
//                                     </span>
//                                   </td>
//                                 </tr>
//                               );
//                             })}
//                         </tbody>
//                       </table>
//                     </div>
//                   </td>
//                 </tr>
//               )}
//             </React.Fragment>
//           );
//         })
//       )}
//     </tbody>
//   </table>
// </div>
//       </div>
//     </div>
//   );
// };

// export default PrizeCheckPage;


import React, { useState, useEffect, useCallback, useMemo } from "react";
import { formatDateBasicString, formatDateString } from "../services/BetService";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axiosConfig";

// --- Interfaces ---
interface WinningNumbers {
  "3top"?: string[];
  "2top"?: string[];
  "2bottom"?: string[];
  "3tote"?: string[];
  "3bottom"?: string[];
  run_top?: string[];
  run_bottom?: string[];
}

export interface PrizeCheckItem {
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
  lottoRoundStatus: "active" | "closed" | "manual_closed" | string;
  username: string;
  rate: number;
  payoutAmount: number;
  status: 'ยืนยัน' | 'คืนเลข' | null;
}

// --- Helper Functions (คงเดิม) ---
const validateNumberInput = (value: string, maxLength: number): string => {
  const filteredValue = value.replace(/[^0-9, ]/g, "");
  const parts = filteredValue.split(/[\s,]+/);
  const lastPart = parts[parts.length - 1];
  if (lastPart.length > maxLength) {
    return filteredValue.slice(0, -1);
  }
  return filteredValue;
};

const getDateString = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
};

const getBetTypeName = (betType: string) => {
  if (betType.includes("2")) return "2 ตัว";
  if (betType.includes("3") || betType.includes("6")) return "3 ตัว";
  if (betType.includes("run")) return "วิ่ง";
  return betType;
};

const parseMultiNumberInput = (input: string): string[] => {
  if (!input) return [];
  return input.split(/[\s,]+/).filter(Boolean);
};

const sortString = (str: string) => str.split("").sort().join("");

const getPrizeDetails = (
  item: PrizeCheckItem,
  overrideNumbers: WinningNumbers | null,
  overrideGroupKey: string
): { prize: number; statusText: string; isWinner: boolean } => {
    const itemDateKey = new Date(item.lottoDrawDate).toISOString().split("T")[0];
    const itemGroupKey = `${item.lottoName}|${itemDateKey}`;
    const useOverride = overrideNumbers && overrideGroupKey === itemGroupKey;

    if (!useOverride && item.lottoRoundStatus !== "closed" && item.lottoRoundStatus !== "manual_closed") {
        return { prize: 0, statusText: "รอประกาศผล", isWinner: false };
    }
    const winningNumbers = useOverride ? overrideNumbers : item.winningNumbers;
    if (!winningNumbers) {
        return { prize: 0, statusText: "รอใส่ผลรางวัล", isWinner: false };
    }
    let prizeKey: keyof WinningNumbers | null = null;
    const betType = item.bet_type;
    const betStyle = item.bet_style.toLowerCase();

    if (betType.includes("3")) {
        if (betStyle === "ตรง") prizeKey = "3top";
        else if (betStyle === "โต๊ด") prizeKey = "3tote";
        else if (betStyle === "ล่าง") prizeKey = "3bottom";
    } else if (betType.includes("2")) {
        if (betStyle === "บน") prizeKey = "2top";
        else if (betStyle === "ล่าง") prizeKey = "2bottom";
    } else if (betType.includes("run")) {
        if (betStyle.includes("บน")) prizeKey = "run_top";
        else if (betStyle.includes("ล่าง")) prizeKey = "run_bottom";
    }

    if (!prizeKey) {
        return { prize: 0, statusText: "ไม่สามารถตรวจได้", isWinner: false };
    }
    const prizeValue = winningNumbers[prizeKey];
    if (prizeValue == null || prizeValue.length === 0) {
        return { prize: 0, statusText: "รอใส่ผลรางวัล", isWinner: false };
    }

    let isWinner = false;
    if (prizeKey === "3tote") {
        const sortedBetNumber = sortString(item.bet_number);
        if (Array.isArray(prizeValue)) {
            isWinner = prizeValue.some((winNum) => sortString(winNum) === sortedBetNumber);
        }
    } else {
        if (Array.isArray(prizeValue)) {
            isWinner = prizeValue.includes(item.bet_number);
        } else if (typeof prizeValue === "string") {
            isWinner = prizeValue === item.bet_number;
        }
    }

    if (isWinner) {
        return { prize: item.payoutAmount, statusText: "ถูกรางวัล", isWinner: true };
    } else {
        return { prize: 0, statusText: "ไม่ถูกรางวัล", isWinner: false };
    }
};

const getBillStatus = (
    billItems: PrizeCheckItem[],
    overrideNumbers: WinningNumbers | null,
    overrideGroupKey: string
): 'winner' | 'loser' | 'pending' => {
    let hasWinner = false;
    let isPending = false;

    const firstItem = billItems[0];
    const itemDateKey = new Date(firstItem.lottoDrawDate).toISOString().split("T")[0];
    const itemGroupKey = `${firstItem.lottoName}|${itemDateKey}`;
    const isSimulatingThisGroup = overrideNumbers && overrideGroupKey === itemGroupKey;
    
    if (!isSimulatingThisGroup && firstItem.lottoRoundStatus !== 'closed' && firstItem.lottoRoundStatus !== 'manual_closed') {
        return 'pending';
    }
    
    for (const item of billItems) {
        const details = getPrizeDetails(item, overrideNumbers, overrideGroupKey);
        if (details.isWinner) {
            hasWinner = true;
            break; 
        }
        if (details.statusText === "รอประกาศผล" || details.statusText === "รอใส่ผลรางวัล") {
            isPending = true;
        }
    }

    if (hasWinner) return 'winner';
    if (isPending) return 'pending';
    return 'loser'; 
};

// --- Main Page Component ---
const PrizeCheckPage: React.FC = () => {
  const { user } = useAuth();

  const [billUsers, setBillUsers] = useState<{ id: number, username: string }[]>([]);
  
  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(200); // กำหนดจำนวนรายการต่อหน้าตรงนี้

  const [masterItems, setMasterItems] = useState<PrizeCheckItem[]>([]);
  // const [filteredItems, setFilteredItems] = useState<PrizeCheckItem[]>([]); // ไม่ใช้แล้ว เพราะ Backend กรองมาให้แล้ว
  const [lottoNamesList, setLottoNamesList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Filter State ---
  const [filterUsername, setFilterUsername] = useState(user?.username);
  const [startDate, setStartDate] = useState(getDateString(-31));
  const [endDate, setEndDate] = useState(getDateString());
  const [status, setStatus] = useState("ยืนยันแล้ว");
  const [lottoType, setLottoType] = useState("");
  const [selectedLottoName, setSelectedLottoName] = useState("");
  const [billRef, setBillRef] = useState("");
  const [note, setNote] = useState("");
  const [derivedStatus, setDerivedStatus] = useState("ถูกรางวัล");

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // --- Manual Check State ---
  const [manualLottoGroupKey, setManualLottoGroupKey] = useState<string>("");
  const [manual3Top, setManual3Top] = useState("");
  const [manual3Bottom, setManual3Bottom] = useState("");
  const [manual3Tote, setManual3Tote] = useState("");
  const [manual2Top, setManual2Top] = useState("");
  const [manual2Bottom, setManual2Bottom] = useState("");
  const [manualRunTop, setManualRunTop] = useState("");
  const [manualRunBottom, setManualRunBottom] = useState("");
  const [isManualFormVisible, setIsManualFormVisible] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [overrideWinningNumbers, setOverrideWinningNumbers] = useState<WinningNumbers | null>(null);

  // 1. Fetch Users (Only once)
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'owner')) {
        api.get(`/api/users-with-bills`)
           .then(res => setBillUsers(res.data))
           .catch(err => console.error("Cannot load bill users:", err));
    }
  }, [user]);

  // 2. Fetch Items with Pagination
  const fetchItems = useCallback(async (page: number) => {
    setIsLoading(true);
    
    // สร้าง Params ส่งไป Backend
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    params.append('page', page.toString());
    params.append('limit', itemsPerPage.toString());

    if (status) params.append('status', status);
    
    // Filter User
    if (filterUsername && filterUsername !== 'all') {
        params.append('username', filterUsername);
    }

    // Filter อื่นๆ ที่ Backend รองรับ
    if (billRef) params.append('billRef', billRef);
    if (selectedLottoName) params.append('lottoName', selectedLottoName);
    if (derivedStatus) params.append('derivedStatus', derivedStatus);
    
    // หมายเหตุ: 'note' และ 'lottoType' Backend ยังไม่มี filter นี้ 
    // (ถ้าต้องการต้องไปเพิ่มที่ server.ts)
    // แต่ถ้าระบุชื่อหวย (selectedLottoName) ก็ช่วยกรองได้เยอะแล้ว

    try { 
        const response = await api.get(`/api/prize-check/all-items?${params.toString()}`);
        
        // ตรวจสอบรูปแบบข้อมูลที่ Backend ส่งกลับมา
        // ถ้าส่งแบบใหม่จะมี { items, pagination }
        if (response.data.items && response.data.pagination) {
            setMasterItems(response.data.items);
            setTotalPages(response.data.pagination.totalPages);
            setTotalItems(response.data.pagination.totalItems);
            setCurrentPage(response.data.pagination.currentPage);

            // อัปเดตรายชื่อหวยสำหรับ Dropdown (อาจจะไม่ครบทั้งหมดถ้ารายการเยอะ แต่ก็ดีกว่าไม่มี)
            // *ข้อแนะนำ: จริงๆ ควรมี API แยกเพื่อดึงรายชื่อหวยทั้งหมดในช่วงเวลานั้น*
            const uniqueNames = [...new Set((response.data.items as PrizeCheckItem[]).map((item) => item.lottoName))].sort();
            if (uniqueNames.length > 0) setLottoNamesList(prev => [...new Set([...prev, ...uniqueNames])].sort());

        } else if (Array.isArray(response.data)) {
            // กรณี Backend ยังเป็นแบบเก่า หรือส่ง Array ล้วน (Fallback)
            setMasterItems(response.data);
            setTotalPages(1);
            setTotalItems(response.data.length);
        }

    } catch (error) {
        console.error("Failed to fetch items", error);
        setMasterItems([]);
    } finally {
        setIsLoading(false);
    }
  }, [startDate, endDate, status, filterUsername, billRef, selectedLottoName, derivedStatus, itemsPerPage]); // เอา note, lottoType ออกจาก dependency หลักของการเรียก API ถ้า Backend ไม่รับ

  // 3. Trigger Fetch เมื่อกดค้นหา หรือเปลี่ยนหน้า
  useEffect(() => {
     // เมื่อเปลี่ยน Filter หลัก ให้ reset ไปหน้า 1
     fetchItems(1);
  }, [startDate, endDate, status, filterUsername, derivedStatus]); 
  // หมายเหตุ: billRef, selectedLottoName, note รอให้กดปุ่ม "ค้นหา" ค่อยทำงานก็ได้ หรือจะใส่ใน dependency เพื่อ Realtime ก็ได้
  // แต่ในที่นี้จะผูกกับ Form Submit เพื่อ performance

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(1); // กดค้นหา เริ่มหน้า 1 ใหม่
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
        fetchItems(newPage);
    }
  };

  // --- Client-Side Filter (ส่วนเสริม) ---
  // ใช้กรองเพิ่มเติมสำหรับสิ่งที่ Backend ยังไม่รองรับ (เช่น Note, LottoType)
  // *ข้อควรระวัง: มันจะกรองเฉพาะ 200 รายการที่แสดงอยู่เท่านั้น*
  const displayedItems = useMemo(() => {
    let items = [...masterItems];

    // Filter Note (Client Side)
    if (note) {
      items = items.filter(item => item.note && item.note.toLowerCase().includes(note.toLowerCase()));
    }

    // Filter LottoType (Client Side - หวย/หุ้น)
    if (lottoType) {
        if (lottoType === "หวย") items = items.filter(item => !item.lottoName.includes("หุ้น"));
        else if (lottoType === "หุ้น") items = items.filter(item => item.lottoName.includes("หุ้น"));
    }

    return items;
  }, [masterItems, note, lottoType]);

  const groupedItems = useMemo(() => {
    return displayedItems.reduce((acc, item) => {
      if (!acc[item.billRef]) acc[item.billRef] = [];
      acc[item.billRef].push(item);
      return acc;
    }, {} as Record<string, PrizeCheckItem[]>);
  }, [displayedItems]);


  const toggleRow = (billRefToToggle: string) => {
    setExpandedRow((prev) =>
      prev === billRefToToggle ? null : billRefToToggle
    );
  };

  const checkableRounds = useMemo(() => {
    // คำนวณจาก masterItems ที่โหลดมา (อาจจะไม่ครบทุกงวดถ้าอยู่หน้าอื่น)
    const groups = masterItems.reduce((acc, item) => {
      const dateKey = new Date(item.lottoDrawDate).toISOString().split("T")[0];
      const groupKey = `${item.lottoName}|${dateKey}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          key: groupKey,
          name: `${item.lottoName} (${formatDateBasicString(item.lottoDrawDate)})`,
        };
      }
      return acc;
    }, {} as Record<string, { key: string; name: string }>);
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [masterItems]);


  // --- Manual Check Logic (เหมือนเดิม) ---
  const handleResetManualCheck = () => {
    setIsSimulating(false);
    setManualLottoGroupKey("");
    setManual3Top("");
    setManual3Tote("");
    setManual3Bottom("");
    setManual2Top("");
    setManual2Bottom("");
    setManualRunTop("");
    setManualRunBottom("");
    setOverrideWinningNumbers(null);
  };
  const handleManualCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setTimeout(() => {
      if (!manualLottoGroupKey) {
        setIsSimulating(false);
        return;
      }
      const newOverride: WinningNumbers = {
        "3top": parseMultiNumberInput(manual3Top),
        "3tote": parseMultiNumberInput(manual3Tote),
        "3bottom": parseMultiNumberInput(manual3Bottom),
        "2top": parseMultiNumberInput(manual2Top),
        "2bottom": parseMultiNumberInput(manual2Bottom),
        run_top: parseMultiNumberInput(manualRunTop),
        run_bottom: parseMultiNumberInput(manualRunBottom),
      };
      setOverrideWinningNumbers(newOverride);
      setIsSimulating(false);
    }, 100);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-4 bg-gray-100 min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">สรุปผลรางวัล</h1>
          <div className="text-sm text-gray-500">
             พบทั้งหมด: <span className="font-bold text-blue-600">{totalItems.toLocaleString()}</span> รายการ
          </div>
        </div>

        <form onSubmit={handleSearch}  className="space-y-4 mb-6 p-4 rounded-lg bg-gray-50" >
          {/* ... (ส่วน Input Form เหมือนเดิมทุกอย่าง) ... */}
          {/* ผมละไว้เพื่อความกระชับ แต่คุณ Copy ของเดิมมาใส่ได้เลย ตั้งแต่ <div className="lg:col-span-2"> จนถึงปุ่ม ค้นหา */}
          
           <div className="lg:col-span-2">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                {/* วันที่สั่งซื้อ */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">วันที่สั่งซื้อ</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 min-w-[150px] p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg" />
                    <span>-</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 min-w-[150px] p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg" />
                  </div>
                </div>
                {/* สถานะ */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">สถานะ</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg" disabled={true}>
                    <option value="ยืนยันแล้ว">ยืนยันแล้ว</option>
                  </select>
                </div>
              </div>
            </div>

          <div className="col-span-full pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
             {/* Filter Inputs */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">ประเภท (หวย/หุ้น)</label>
              <select value={lottoType} onChange={(e) => setLottoType(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg">
                <option value="">ทั้งหมด</option>
                <option value="หวย">หวย</option>
                <option value="หุ้น">หุ้น</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">ชื่อหวย</label>
              <select value={selectedLottoName} onChange={(e) => setSelectedLottoName(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg">
                <option value="">ทั้งหมด</option>
                {lottoNamesList.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">สถานะผลลัพธ์</label>
              <select value={derivedStatus} onChange={(e) => setDerivedStatus(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg">
                <option value="">ทั้งหมด</option>
                <option value="ถูกรางวัล">ถูกรางวัล</option>
                <option value="ไม่ถูกรางวัล">ไม่ถูกรางวัล</option>
                <option value="รอประกาศผล">รอประกาศผล</option>
                <option value="รอใส่ผลรางวัล">รอใส่ผลรางวัล</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">เลขที่ใบสั่งซื้อ</label>
              <input type="text" value={billRef} onChange={(e) => setBillRef(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg" placeholder="กรองด้วยเลขบิล..." />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">บันทึกช่วยจำ (ในหน้านี้)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg" placeholder="ค้นหา note..." />
            </div>

            {(user?.role === 'admin' || user?.role === 'owner') && (
              <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">ค้นหาโดย User</label>
                  <select value={filterUsername} onChange={(e) => setFilterUsername(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg">
                      <option value="">แสดงทั้งหมด</option>
                      {user && <option value={user.username}>{user.username} (ตัวฉัน)</option>}
                      {billUsers.filter(u => u.username !== user?.username).map(u => (<option key={u.id} value={u.username}>{u.username}</option>))}
                  </select>
              </div>
            )}
            <div className="flex items-end h-full">
              <button type="submit" className="w-full bg-yellow-300 hover:cursor-pointer hover:bg-yellow-200 text-black font-bold py-2.5 px-6 rounded-lg">
                ค้นหา
              </button>
            </div>
          </div>
        </form>

        {/* --- ส่วน Manual Check Form (วางตรงนี้เหมือนเดิม) --- */}
        {/* ... Copy <div className="my-6"> ... มาใส่ได้เลย ... */}
         <div className="my-6">
          <button type="button" onClick={() => setIsManualFormVisible(!isManualFormVisible)} className="w-full p-3 text-left font-bold text-white bg-black hover:bg-gray-800 rounded-lg flex justify-between items-center">
            <span>จำลองการตรวจผลด้วยตัวเอง (Client-Side)</span>
            <span className={`transform transition-transform duration-200 ${isManualFormVisible ? "rotate-180" : "rotate-0"}`}>▼</span>
          </button>

          {isManualFormVisible && (
            <form onSubmit={handleManualCheck} className="space-y-4 mt-4 p-4 rounded-b-lg bg-gray-100">
               {/* ... ใส่ Form เดิม ... */}
               {/* ย่อ: Dropdown เลือกงวด, Input 3 ตัว, ปุ่ม Submit */}
               <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    <div className="lg:col-span-4">
                        <label className="block mb-2 text-sm font-medium text-gray-700">เลือกงวดที่ต้องการตรวจ</label>
                        <select value={manualLottoGroupKey} onChange={(e) => setManualLottoGroupKey(e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg">
                        <option value="">-- กรุณาเลือก --</option>
                        {checkableRounds.map((group) => (
                            <option key={group.key} value={group.key}>{group.name}</option>
                        ))}
                        </select>
                    </div>
                    {/* ... Input Fields (3top, 3bottom, etc) Copy มาใส่ ... */}
                     <div className="col-span-full grid grid-cols-2 gap-4">
                        <button type="button" onClick={handleResetManualCheck} className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2.5 px-6 rounded-lg">คืนค่า</button>
                        <button type="submit" disabled={isSimulating || !manualLottoGroupKey} className={`w-full text-white font-bold py-2.5 px-6 rounded-lg transition-colors ${isSimulating || !manualLottoGroupKey ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}`}>
                            {isSimulating ? "กำลังตรวจ..." : "จำลองการตรวจผล"}
                        </button>
                    </div>
               </div>
            </form>
          )}
        </div>

        {/* --- Table Section --- */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left text-gray-600">
            {/* ... Thead ... */}
             <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">เลขที่ใบสั่งซื้อ</th>
                <th className="px-4 py-3 whitespace-nowrap">ประเภทหวย</th>
                <th className="px-4 py-3 whitespace-nowrap">งวด</th>
                <th className="px-4 py-3 whitespace-nowrap">บันทึกโดย</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">เงินรางวัลรวม</th>
                <th className="px-4 py-3 whitespace-nowrap">บันทึกช่วยจำ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                     {/* ... Loading Spinner ... */}
                     <div className="flex justify-center items-center gap-2 text-gray-500">
                         <span>กำลังโหลดข้อมูล...</span>
                     </div>
                  </td>
                </tr>
              ) : Object.keys(groupedItems).length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                Object.entries(groupedItems).map(([currentBillRef, billItems]) => {
                  const firstItem = billItems[0];
                  const isExpanded = expandedRow === currentBillRef;
                  const billStatus = getBillStatus(billItems, overrideWinningNumbers, manualLottoGroupKey);
                  const totalPrizeForBill = billItems.reduce((total, item) => {
                    if (item.status !== "ยืนยัน") return total;
                    const { prize } = getPrizeDetails(item, overrideWinningNumbers, manualLottoGroupKey);
                    return total + Number(prize);
                  }, 0);

                  const rowClass = {
                    winner: "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500",
                    loser: "bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500",
                    pending: "bg-white hover:bg-gray-50",
                  }[billStatus] || "bg-white hover:bg-gray-50";

                  return (
                    <React.Fragment key={currentBillRef}>
                       <tr className={`border-b cursor-pointer transition-colors duration-300 ${rowClass}`} onClick={() => toggleRow(currentBillRef)}>
                          <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">{currentBillRef}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{firstItem.lottoName}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDateString(firstItem.lottoDrawDate, "short")}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{firstItem.username}</td>
                          <td className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${totalPrizeForBill > 0 ? "text-green-700" : "text-gray-500"}`}>
                             {totalPrizeForBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{firstItem.note}</td>
                       </tr>
                       {/* ... Expanded Details Table (เหมือนเดิม) ... */}
                        {isExpanded && (
                            <tr className="bg-gray-50">
                                <td colSpan={6} className="p-2 md:p-4">
                                {/* Copy Table รายละเอียดข้างในมาใส่ */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-600">
                                            {/* ... หัวตารางย่อย ... */}
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-200">
                                                <tr>
                                                <th className="px-4 py-2 whitespace-nowrap">ประเภท</th>
                                                <th className="px-4 py-2 whitespace-nowrap">หมายเลข</th>
                                                <th className="px-0 py-2 text-center whitespace-nowrap">ยอดแทง</th>
                                                <th className="px-4 py-2 text-right whitespace-nowrap">เรทจ่าย</th>
                                                <th className="px-4 py-2 text-right whitespace-nowrap">บาทละ</th>
                                                <th className="px-4 py-2 text-right whitespace-nowrap">เงินรางวัล</th>
                                                <th className="px-4 py-2 text-center whitespace-nowrap">สถานะ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {billItems.filter((item) => item.status === "ยืนยัน").map((item) => {
                                                    const { statusText, isWinner } = getPrizeDetails(item, overrideWinningNumbers, manualLottoGroupKey);
                                                    return (
                                                        <tr key={item.id} className={`border-b whitespace-nowrap ${isWinner ? "bg-green-100" : statusText.includes("รอ") ? "bg-white" : "bg-red-50"}`}>
                                                            <td className="px-4 py-3">{getBetTypeName(item.bet_type)} ({item.bet_style})</td>
                                                            <td className="px-4 py-3 font-mono">{item.bet_number}</td>
                                                            <td className="px-4 py-3 text-center">{item.price}</td>
                                                            <td className={`px-4 py-3 text-right ${item.price * 0.5 == item.rate ? "text-red-600" : ""}`}>{item.price} {item.price * 0.5 == item.rate ? "(จ่ายครึ่ง)" : ""}</td>
                                                            <td className={`px-4 py-3 text-right ${item.price * 0.5 == item.rate ? "text-red-600" : ""}`}>{item.price * 0.5 == item.rate ? (item.baht_per / 2).toLocaleString() : Number(item.baht_per).toLocaleString()}</td>
                                                            <td className={`px-4 py-3 text-right font-semibold ${isWinner ? "text-green-700" : "text-gray-400"}`}>{Number(item.payoutAmount).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${isWinner ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-800"}`}>{statusText}</span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* --- Pagination Controls (เพิ่มใหม่) --- */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-700 mb-4 sm:mb-0">
                แสดงหน้า <span className="font-semibold text-gray-900">{currentPage}</span> จาก <span className="font-semibold text-gray-900">{totalPages}</span> (ทั้งหมด {totalItems} รายการ)
            </span>
            <div className="inline-flex mt-2 xs:mt-0">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className={`flex items-center justify-center px-4 h-10 text-base font-medium rounded-l hover:bg-gray-900 hover:text-white ${
                        currentPage === 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-800 text-white"
                    }`}
                >
                    <svg className="w-3.5 h-3.5 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5H1m0 0 4 4M1 5l4-4"/>
                    </svg>
                    ก่อนหน้า
                </button>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className={`flex items-center justify-center px-4 h-10 text-base font-medium border-0 border-l border-gray-700 rounded-r hover:bg-gray-900 hover:text-white ${
                         currentPage === totalPages ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-800 text-white"
                    }`}
                >
                    ถัดไป
                    <svg className="w-3.5 h-3.5 ml-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5h12m0 0-4 4m4-4-4-4"/>
                    </svg>
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PrizeCheckPage;