import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toPng } from "html-to-image"; 

import {
  generate6Glab,
  generate19Doors,
  reverseNumbers,
  getNumble,
  generateBillRef,
  generatePermutations,
  formatDateString,
} from "../services/BetService";
import CardBillForBets from "../components/CardBillForBets";
import RateDisplayCard from "../components/RateDisplayCard";
import SpecialNumbersCard from "../components/SpecialNumbersCard";
import { useAuth } from "../contexts/AuthContext";
import { FullScreenLoader } from "../components/LoadingScreen";
import PrintableReceipt from "../components/PrintAbleReceip";
import { PrinterIcon, ArrowDownTrayIcon as DownloadIcon, XMarkIcon as XIcon, EyeIcon } from '@heroicons/react/24/solid';
import { useModal } from "../components/Modal"; 
import LimitCheckCard from "../components/LimitCheckCard";
import SpentSummaryList from "../components/SpentSummaryList";
import LimitAndSpentSummaryCard from "../components/LimitAndSpentSummaryCard";
import api from "../api/axiosConfig";
 

// Interfaces
interface BetNumber {
  value: string;
  selected: boolean;
  isValid: boolean;
}
interface BillEntry {
  bets: string[];
  betTypes: string;
  bahtPer: number;
  priceTop: number;
  priceTote: number;
  priceBottom: number;
  total: number;
  addBy: string;
}
interface LottoTypeDetails {
  id: number;
  name: string;
  rate_3_top: string;
  rate_3_tote: string;
  rate_3_bottom: string;
  rate_2_top: string;
  rate_2_bottom: string;
  rate_run_top: string;
  rate_run_bottom: string;
  betting_start_time: string;
  betting_cutoff_time: string;
  generation_strategy: string;
  interval_minutes: number | null;
  monthly_fixed_days: number[] | null;
  monthly_floating_dates: any | null;
  specific_days_of_week: number[] | null;
  betting_skip_start_day: number;
}
interface LottoRoundDetails {
  name: string;
  lottoDate: string;
  lottoTime: string;
  fullCutoffTimestamp: number;
  lotto_type_id: string;
}
interface SpecialNumbers {
  closed_numbers: string[];
  half_pay_numbers: string[];
}


const LottoFormPage = () => {
  const { user } = useAuth();
  const { lottoId } = useParams();
  const navigate = useNavigate();
  
  const { alert, confirm, showStatus, hideStatus } = useModal();
  
  const [refreshKey, setRefreshKey] = useState(0);
  

  // State
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [specialNumbers, setSpecialNumbers] = useState<SpecialNumbers | null>(
    null
  );
  const [priceTote, setPriceTote] = useState("0");
  const [subTab, setSubTab] = useState("2d");
  const [note, setNote] = useState("");
  const [roundDetails, setRoundDetails] = useState<LottoRoundDetails | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [priceTop, setPriceTop] = useState("0");
  const [priceBottom, setPriceBottom] = useState("0");
  const [total, setTotal] = useState<number>(0);
  const [bets, setBets] = useState<BetNumber[]>([]);
  const [doorMode, setDoorMode] = useState("all");
  const doorOptions = [
    { value: "all", label: "19-ประตู" },
    { value: "front", label: "รูด-หน้า" },
    { value: "back", label: "รูด-หลัง" },
  ];
  const [bill, setBill] = useState<BillEntry[]>([]);
  const [lottoTypeDetails, setLottoTypeDetails] =
    useState<LottoTypeDetails | null>(null);
  const [billToPrint, setBillToPrint] = useState<any | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [loadingAddBills, setLoadingAddBills] = useState(false);

  // NEW STATE: สำหรับควบคุมการแสดงผลของ Modal โดยเฉพาะ
  const [isModalVisible, setIsModalVisible] = useState(false);

  // --- Functions for generating image (Definitive fix) ---
    const generateReceiptImage = useCallback(async () => {
    if (!receiptRef.current) {
        throw new Error("Receipt component is not available.");
    }
    const options = {
        cacheBust: true,
        backgroundColor: 'white',
        canvasWidth: receiptRef.current.scrollWidth,
        canvasHeight: receiptRef.current.scrollHeight,
        pixelRatio: window.devicePixelRatio || 2,
    };
    return await toPng(receiptRef.current, options);
  }, []);


// const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
//   e.preventDefault();
//   const pastedText = e.clipboardData.getData('text').trim();

//   // --- UPDATED: Logic ใหม่ที่รองรับการแยกด้วย . และ - ที่ติดกัน ---

//   // 1. ทำให้ตัวคั่นเป็นรูปแบบเดียวกันทั้งหมดก่อน (ใช้ space)
//   // โดยเปลี่ยน ., :, =, @, ! หรือ ? ให้เป็น space
//   const normalizedText = pastedText.replace(/[\n,:=@!?.]+/g, ' ');

//   // 2. แยก "กลุ่มข้อมูลหลัก" ด้วย space
//   const primaryGroups = normalizedText.split(/\s+/).filter(Boolean);

//   // 3. นำแต่ละกลุ่มมาแยกย่อยด้วยขีดกลาง (-) อีกครั้ง
//   const tokens = primaryGroups.flatMap(group => 
//     group.includes('-') ? group.split('-') : [group]
//   ).filter(Boolean);

//   // --- ส่วนที่เหลือของฟังก์ชันทำงานเหมือนเดิม ---
//   const newBets: BetNumber[] = tokens.map(token => {
//     let isValid = false;
//     const isNumericOnly = /^\d+$/.test(token);
    
//     if (isNumericOnly && !specialNumbers?.closed_numbers?.includes(token)) {
//       if (subTab === '2d' && token.length === 2) {
//         isValid = true;
//       } else if (subTab === '3d' && token.length === 3) {
//         isValid = true;
//       } else if (subTab === 'run' && token.length === 1) {
//         isValid = true;
//       }
//     }
    
//     return { 
//         value: token, 
//         selected: true, 
//         isValid: isValid 
//     };
//   });

//   setBets(prevBets => {
//     const existingValues = new Set(prevBets.map(b => b.value));
//     const uniqueNewBets = newBets.filter(b => !existingValues.has(b.value));
//     return [...prevBets, ...uniqueNewBets];
//   });
// };

// const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
//   e.preventDefault();
//   const pastedText = e.clipboardData.getData('text').trim();

//   // --- Logic ใหม่แบบ 2 ชั้น ---

//   // 1. แยกข้อความออกเป็น "กลุ่มข้อมูล" ด้วยสัญลักษณ์หลัก (เว้นวรรค, ขึ้นบรรทัดใหม่, :, =, @, !)
//   const betGroups = pastedText.split(/[\s\n:@=!?]+/).filter(Boolean);

//   // 2. ในแต่ละ "กลุ่มข้อมูล", ให้แยก "เลขหวย" ออกจาก "ราคา" ด้วยเครื่องหมายขีดกลาง (-)
//   // ใช้ flatMap เพื่อทำให้ผลลัพธ์แบนราบเป็น Array เดียว
//   const tokens = betGroups.flatMap(group => group.split('-')).filter(Boolean);
  
//   // --- ส่วนที่เหลือของฟังก์ชันเหมือนเดิมทุกประการ ---
//   const newBets: BetNumber[] = tokens.map(token => {
//     let isValid = false;
//     const isNumericOnly = /^\d+$/.test(token);
    
//     if (isNumericOnly && !specialNumbers?.closed_numbers?.includes(token)) {
//       if (subTab === '2d' && token.length === 2) {
//         isValid = true;
//       } else if (subTab === '3d' && token.length === 3) {
//         isValid = true;
//       } else if (subTab === 'run' && token.length === 1) {
//         isValid = true;
//       }
//     }
    
//     return { 
//         value: token, 
//         selected: true, 
//         isValid: isValid 
//     };
//   });

//   setBets(prevBets => {
//     const existingValues = new Set(prevBets.map(b => b.value));
//     const uniqueNewBets = newBets.filter(b => !existingValues.has(b.value));
//     return [...prevBets, ...uniqueNewBets];
//   });
// };

//
  
//The best
// const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
//   e.preventDefault();
//   const pastedText = e.clipboardData.getData('text').trim();
//   let tokens: string[] = [];

//   // --- Logic ใหม่: ตรวจสอบรูปแบบของข้อความที่วาง ---

//   // ตรวจสอบว่ามีสัญลักษณ์ของรูปแบบ "เลข-ราคา" หรือไม่ (เช่น :, =, @)
//   if (/[:=@]/.test(pastedText)) {
//     // ---- ใช้ Logic แบบที่ 1 (สำหรับรูปแบบซับซ้อน: เลข-ราคา) ----
//     const primaryGroups = pastedText.split(/[\s\n,:=@!?]+/).filter(Boolean);
//     tokens = primaryGroups.flatMap(group => 
//       group.includes('-') ? group.split('-', 2) : [group]
//     ).filter(Boolean);
//   } else {
//     // ---- ใช้ Logic แบบที่ 2 (สำหรับรูปแบบลิสต์ตัวเลข) ----
//     // แปลงตัวคั่นทั้งหมด (จุด, ขีดกลาง, คอมม่า, เว้นวรรค) ให้เป็น space เดียว
//     const normalizedText = pastedText.replace(/[\n,.-]+/g, ' ');
//     tokens = normalizedText.split(/\s+/).filter(Boolean);
//   }

//   // --- ส่วนการตรวจสอบและเพิ่มลง State (ทำงานเหมือนเดิมทุกประการ) ---
//   const newBets: BetNumber[] = tokens.map(token => {
//     let isValid = false;
//     const isNumericOnly = /^\d+$/.test(token);
    
//     if (isNumericOnly && !specialNumbers?.closed_numbers?.includes(token)) {
//       if (subTab === '2d' && token.length === 2) {
//         isValid = true;
//       } else if (subTab === '3d' && token.length === 3) {
//         isValid = true;
//       } else if (subTab === 'run' && token.length === 1) {
//         isValid = true;
//       }
//     }
    
//     return { 
//         value: token, 
//         selected: true, 
//         isValid: isValid 
//     };
//   });

//   setBets(prevBets => {
//     const existingValues = new Set(prevBets.map(b => b.value));
//     const uniqueNewBets = newBets.filter(b => !existingValues.has(b.value));
//     return [...prevBets, ...uniqueNewBets];
//   });
// };

//The best lastday 5/8/2568 15:20
// const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
// };


//The best lastday 5/08/2568  17:00
const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
  e.preventDefault();
  const pastedText = e.clipboardData.getData('text').trim(); 
  const normalizedText = pastedText.replace(/[\n,:=@!?.]+/g, ' ');

  // 2. แยก "กลุ่มข้อมูลหลัก" ด้วย space
  const primaryGroups = normalizedText.split(/\s+/).filter(Boolean);

  // 3. นำแต่ละกลุ่มมาแยกย่อยด้วยขีดกลาง (-) อีกครั้ง
  const tokens = primaryGroups.flatMap(group => 
    group.includes('-') ? group.split('-') : [group]
  ).filter(Boolean);

  // --- ส่วนที่เหลือของฟังก์ชันทำงานเหมือนเดิม ---
  const newBets: BetNumber[] = tokens.map(token => {
    let isValid = false;
    const isNumericOnly = /^\d+$/.test(token);
    
    if (isNumericOnly) {
      if (subTab === '2d' && token.length === 2) {
        isValid = true;
      } else if (subTab === '3d' && token.length === 3) {
        isValid = true;
      } else if (subTab === 'run' && token.length === 1) {
        isValid = true;
      }
    }
    
    return { 
        value: token, 
        selected: true, 
        isValid: isValid 
    };
  });

  setBets(prevBets => {
    const existingValues = new Set(prevBets.map(b => b.value));
    const uniqueNewBets = newBets.filter(b => !existingValues.has(b.value));
    return [...prevBets, ...uniqueNewBets];
  });
};

  useEffect(() => {
    if (billToPrint) {
      // ใช้ setTimeout เพื่อรอให้ DOM อัปเดตเสร็จสมบูรณ์
      const timer = setTimeout(() => {
        generateReceiptImage()
          .then(setReceiptImageUrl) // เมื่อสร้างรูปเสร็จ ให้ set URL
          .catch(err => console.error("Failed to generate receipt image:", err));
      }, 200); // เพิ่มเวลาเล็กน้อยเพื่อความแน่นอน
      return () => clearTimeout(timer);
    } else {
        setReceiptImageUrl(null); // เคลียร์รูปเมื่อปิดบิล
    }
  }, [billToPrint, generateReceiptImage]);
 

const fetchSpecialNumbersOnly = useCallback(async () => {
    if (!lottoId) return;
    try { 
        const response = await api.get<SpecialNumbers>(`/api/lotto-rounds/${lottoId}/number-special`);
        setSpecialNumbers(response.data);
    } catch (err: any) { 
        if (err.response && err.response.status === 404) { 
            setSpecialNumbers({ closed_numbers: [], half_pay_numbers: [] });
        } else {
            console.error("Error fetching special numbers:", err);
        }
    }
}, [lottoId]);

useEffect(() => {
    const loadInitialData = async () => {
        if (!lottoId) {
            setIsLoading(false);
            setError("ไม่พบ ID ของงวดหวยใน URL");
            return;
        }
        setIsLoading(true);
        setError(null); // เคลียร์ error เก่าก่อนเริ่มโหลด
        
        try {
            // ใช้ Promise.allSettled เพื่อให้โหลดข้อมูลต่อไปได้แม้บางส่วนจะล้มเหลว
            const results = await Promise.allSettled([
                api.get(`/api/lotto-rounds/${lottoId}`),
                fetchSpecialNumbersOnly() // เรียกฟังก์ชันเดิมของคุณที่ใช้ fetch (หรือจะแก้เป็น axios ก็ได้)
            ]);

            // --- Process Lotto Round Details ---
            const roundResult = results[0];
            if (roundResult.status === 'fulfilled') {
                const roundData = roundResult.value.data;

                const cutoffDate = new Date(roundData.round.cutoff_datetime);
                setRoundDetails({
                    name: roundData.round.name,
                    lottoDate: formatDateString(roundData.round.cutoff_datetime, 'long'),
                    lottoTime: new Date(roundData.round.cutoff_datetime).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: 'Asia/Bangkok',
                    }),
                    fullCutoffTimestamp: cutoffDate.getTime(), 
                    lotto_type_id: roundData.round.lotto_type_id,
                });
                setCurrentTime(new Date(roundData.serverTime));

                // Fetch lotto type details after getting the type_id
                try {
                    const typeResponse = await api.get(`/api/lotto-types/${roundData.round.lotto_type_id}`);
                    setLottoTypeDetails(typeResponse.data);
                } catch (typeError) {
                    console.error("Failed to fetch lotto type details:", typeError);
                    setError("ไม่พบข้อมูลประเภทหวย");
                }

            } else {
                throw new Error("ไม่พบข้อมูลงวดหวย");
            }
            
            // --- Process Special Numbers ---
            if (results[1].status === 'rejected') {
                console.error("Failed to fetch special numbers:", results[1].reason);
            }
            
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
        } finally {
            setIsLoading(false);
        }
    };
    
    loadInitialData();
}, [lottoId, fetchSpecialNumbersOnly]);

  useEffect(() => {
    const intervalId = setInterval(
      () => fetchSpecialNumbersOnly(),
      1000 * 60 * 3
    );
    return () => clearInterval(intervalId);
  }, [fetchSpecialNumbersOnly]);

  useEffect(() => {
    if (!currentTime) return;
    const interval = setInterval(
      () => setCurrentTime((prev) => new Date(prev!.getTime() + 1000)),
      1000
    );
    return () => clearInterval(interval);
  }, [currentTime]);

  useEffect(() => {
    if (currentTime && roundDetails?.fullCutoffTimestamp) {
      if (currentTime.getTime() >= roundDetails.fullCutoffTimestamp) {
        alert("หมดเวลาซื้อแล้ว","ระบบจะนำท่านกลับสู่หน้าหลัก", 'light').then(() => navigate("/"));
        navigate("/");
      }
    }
  }, [currentTime, roundDetails, navigate]);
  
  useEffect(() => {
    setTotal(bill.reduce((sum, entry) => sum + entry.total, 0));
  }, [bill]);
 
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `bill-${billToPrint?.billRef}`,
  });

  const handleSaveAsImage = useCallback(() => {
    generateReceiptImage()
        .then((dataUrl) => {
            const link = document.createElement("a");
            link.download = `bill-${billToPrint?.billRef}.png`;
            link.href = dataUrl;
            link.click();
        })
        .catch((err) => {
            console.error("Image save error:", err);
            alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกเป็นรูปภาพได้!", 'light');
        });
  }, [billToPrint, generateReceiptImage]);

  const handleSaveBill = async () => {
    if (bill.length === 0 || !roundDetails) {
      alert("กรุณาเพิ่มรายการในบิลก่อนบันทึก", "", 'light');
      return;
    }
     if (note === "") {
      alert("คุณยังไม่ได้ลงบันทึกช่วยจำ!", "กรุณาลงบันทึกช่วยจำก่อน", 'light');
      return;
    }
    const payload = {
      billRef: generateBillRef(20),
      userId: user?.id,
      lottoRoundId: Number(lottoId),
      note: note,
      totalAmount: total,
      betName: roundDetails.name,
      billLottoDraw: new Date(roundDetails.fullCutoffTimestamp).toISOString(),
      billEntries: bill,
    };
    try {
      showStatus('loading', 'กำลังบันทึก', 'กรุณารอสักครู่');
      const response = await api.post('/api/savebills', payload);
      const result = response.data; 
       

      showStatus('success', 'บันทึกเสร็จสิ้น', result.message);
      hideStatus();

      setReceiptImageUrl(null);
      setBillToPrint(payload);
      setIsModalVisible(true);
      handleClearBill(false);
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (err: any) { 
      hideStatus();
      showStatus('error', "ไม่สามารถบันทึกได้", err.message);
    }
  };
  
  const handleClearBet = () => {
    setBets([]);
    setPriceTop("0");
    setPriceBottom("0");
    setPriceTote("0");
  }

  const handleClearBill = (clearPrintedBill = true) => {
    setBets([]);
    setBill([]);
    setTotal(0);
    setPriceTop("0");
    setNote("")
    setPriceBottom("0");
    setPriceTote("0");
    if (clearPrintedBill) {
        setBillToPrint(null);
    }
  };

const handleAddBillEntry = async () => { 
    if (!user) {
        alert("ไม่พบข้อมูลผู้ใช้", "กรุณาล็อกอินใหม่อีกครั้ง", 'light');
        return;
    }
    const selectedValidBets = bets.filter(b => b.selected && b.isValid).map(b => b.value);
    if (selectedValidBets.length === 0) {
        alert("ไม่มีเลขที่ถูกเลือก", "กรุณาเลือกตัวเลขที่ถูกต้องอย่างน้อย 1 รายการ", "light");
        return;
    }
    if (!Number(priceTop) && !Number(priceTote) && !Number(priceBottom)) {
        alert("ยังไม่ได้ใส่ราคา", "กรุณาใส่ราคาอย่างน้อย 1 ช่อง", "light");
        return;
    }
    setLoadingAddBills(true);
    const pricePerNumberFromForm = Number(priceTop) + Number(priceTote) + Number(priceBottom);
  
    const countsInCurrentSubmission = selectedValidBets.reduce((acc, betNumber) => {
        acc[betNumber] = (acc[betNumber] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const uniqueBetsToCheck = Object.keys(countsInCurrentSubmission);
    const priceAlreadyInBill: { [key: string]: number } = {};
    for (const betNumber of uniqueBetsToCheck) {
        const amountInBill = bill.reduce((sum, entry) => {
            const countInEntry = entry.bets.filter(b => b === betNumber).length;
            return sum + (countInEntry * (entry.priceTop + entry.priceBottom + entry.priceTote));
        }, 0);
        priceAlreadyInBill[betNumber] = amountInBill;
    }
    const betsToCheck = uniqueBetsToCheck.map(betNumber => ({
        betNumber,
        price: (pricePerNumberFromForm * countsInCurrentSubmission[betNumber])
    }));
    
    try {
        await api.post(`/api/batch-check-bet-limits`, {
            userId: user.id,
            lottoRoundId: Number(lottoId),
            bets: betsToCheck.map(b => ({
                betNumber: b.betNumber,
                price: b.price + (priceAlreadyInBill[b.betNumber] || 0)
            }))
        });

        // --- ถ้าผ่านการตรวจสอบ ให้เพิ่มรายการลงบิล ---
        const entryTotal = selectedValidBets.length * pricePerNumberFromForm;
        setBill((prev) => [
          ...prev,
          {
            bets: selectedValidBets,
            betTypes: subTab,
            bahtPer: 0,
            priceTop: Number(priceTop),
            priceTote: Number(priceTote),
            priceBottom: Number(priceBottom),
            total: entryTotal,
            addBy: user.username,
          },
        ]);
        handleClearInputs();
        setLoadingAddBills(false);
    } catch (err: any) {
        const errorData = err.response?.data;
        if (errorData && errorData.error === 'LimitExceeded' && errorData.failedBets) {
             
            let errorMessage = '';
            
            errorData.failedBets.forEach((failedBet: any) => {
                const { details, betNumber } = failedBet;
                const limit = details.limit;
                const spentInDb = details.spent;
                const amountInCurrentBill = priceAlreadyInBill[betNumber] || 0; 
                const totalPurchased = spentInDb + amountInCurrentBill; 
                const finalRemaining = limit - totalPurchased; 
                const priceFromThisAction = pricePerNumberFromForm * (countsInCurrentSubmission[betNumber] || 0); 
                const overAmount = (totalPurchased + priceFromThisAction) - limit;
 
                errorMessage += `เลข "${betNumber}" เกินขีดจำกัดการซื้อไว้ที่ ${limit.toLocaleString()} บาท\n`;
                errorMessage += `  • คุณลงราคาเกินมา: ${overAmount > 0 ? overAmount.toLocaleString() : 0} บาท\n`;

                if (finalRemaining > 0) {
                    errorMessage += `  • คุณสามารถซื้อเพิ่มได้ไม่เกิน: ${finalRemaining.toLocaleString()} บาท`;
                } else {
                    errorMessage += `  • คุณไม่สามารถแทงเลขนี้ได้อีก`;
                }
            }); 

            alert("ไม่สามารถเพิ่มรายการได้เนื่องจากเกินวงเงินที่อณุญาติให้ซื้อ", errorMessage, "light");

        } else {
            alert("เกิดข้อผิดพลาด", errorData?.message || err.message || "ไม่สามารถตรวจสอบลิมิตได้", "light");
        }
        setLoadingAddBills(false);
    }
};


  const handleClearInputs = () => {
    setBets([]);
    setPriceTop("0");
    setPriceTote("0");
    setPriceBottom("0");
    setNumber("");
  };

  const handleEditEntry = (index: number) => {
    const entry = bill[index];
    setBets(entry.bets.map((v) => ({ value: v, selected: true ,isValid: true})));
    setSubTab(entry.betTypes);
    setPriceTop(String(entry.priceTop));
    setPriceTote(String(entry.priceTote));
    setPriceBottom(String(entry.priceBottom));
    handleRemoveEntry(index);
  };

  const handleRemoveEntry = (index: number) => {
    setBill((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleBet = (index: number) => {
    setBets((prev) =>
      prev.map((bet, i) =>
        i === index ? { ...bet, selected: !bet.selected } : bet
      )
    );
  };

  const handleChangeSubTap = (name: string) => {
    if (subTab !== name) {
      setSubTab(name);
      setBets([]);
      setPriceTop("0");
      setPriceTote("0");
      setPriceBottom("0");
      setNumber("");
    }
  };

  const handlePriceChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const numericValue = value.replace(/[^0-9]/g, "");

    if (numericValue.length > 1 && numericValue.startsWith("0")) {
      setter(numericValue.slice(1));
    } else {
      setter(numericValue);
    }
  };

  const handleNumberChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  type: string
) => {
  const value = e.target.value;
  // อนุญาตให้กรอกเฉพาะตัวเลขเท่านั้น
  if (!/^\d*$/.test(value)) return;

  setNumber(value);

  // ฟังก์ชันภายในสำหรับเพิ่มเลขเข้ารายการ
  const add = (list: string[]) => {
    // ไม่มีการกรองเลขปิด (closed_numbers) ออกจากส่วนนี้แล้ว
    if (list.length > 0) {
      setBets((prev) => [
        ...prev,
        ...list.map((v) => ({ value: v, selected: true, isValid: true })),
      ]);
    }
    // เคลียร์ช่องใส่เลขหลังเพิ่มรายการสำเร็จ
    setNumber("");
  };

  // ตรวจสอบความยาวของตัวเลขและประเภทการแทงเพื่อเรียกใช้ฟังก์ชัน 'add'
  if (type === "2d" && value.length === 2) add([value]);
  if (type === "3d" && value.length === 3) add([value]);
  if (type === "run" && value.length === 1) add([value]);
  if (type === "6d" && value.length === 3) add(generate6Glab(value));
  if (type === "19d" && value.length === 1) add(generate19Doors(value, doorMode));
};
  
// const handleClickReverseNumbers = () => {
//     // 1. กรองเอาเฉพาะรายการที่ "ถูกต้อง" และ "ถูกเลือก" เท่านั้น
//     const validSelectedBets = bets.filter(bet => bet.isValid && bet.selected);

//     // 2. สร้างลิสต์ของเลขกลับทั้งหมด โดยประมวลผลแต่ละเลขที่เลือก
//     const newReversedValues: string[] = [];
//     validSelectedBets.forEach(bet => {
//         const num = bet.value;
//         if (num.length === 2) {
//             const reversed = num.split('').reverse().join('');
//             if (num !== reversed) { // ป้องกันการกลับเลขเบิ้ล (เช่น 11 -> 11)
//                 newReversedValues.push(reversed);
//             }
//         } else if (num.length === 3) {
//             // เรียกใช้ฟังก์ชัน 6 กลับ
//             const permutations = generatePermutations(num);
//             // เพิ่มเลข 6 กลับทั้งหมด (ยกเว้นเลขเดิม) เข้าไปในลิสต์
//             permutations.forEach(p => {
//                 if (p !== num) {
//                     newReversedValues.push(p);
//                 }
//             });
//         }
//     });

//     // 3. กรองเลขซ้ำและเลขปิดรับ
//     const existingBetsSet = new Set(bets.map(b => b.value));
//     const closedNumbers = specialNumbers?.closed_numbers || [];

//     const finalBetsToAdd = newReversedValues
//         .filter(num => !existingBetsSet.has(num)) // กรองเอาเฉพาะเลขใหม่ที่ยังไม่มีในรายการ
//         .filter(num => !closedNumbers.includes(num)); // กรองเอาเลขปิดรับออก

//     const blockedBets = newReversedValues
//         .filter(num => !existingBetsSet.has(num))
//         .filter(num => closedNumbers.includes(num));

//     if (blockedBets.length > 0) {
//       alert(`เลขปิดรับ: ${[...new Set(blockedBets)].join(', ')}`,`ถูกตัดออกจากรายการ`, "light");
//     }

//     // 4. เพิ่มเลขใหม่ที่ผ่านการตรวจสอบทั้งหมดลงใน State
//     if (finalBetsToAdd.length > 0) {
//       const newBetsToAddObjects = finalBetsToAdd.map(value => ({ value, selected: true, isValid: true }));
//       setBets(prevBets => [...prevBets, ...newBetsToAddObjects]);
//     }
// };


  const handleClickReverseNumbers = () => {
    // 1. กรองเอาเฉพาะรายการที่ "ถูกต้อง" และ "ถูกเลือก" (เหมือนเดิม)
    const validSelectedBets = bets.filter(bet => bet.isValid && bet.selected);

    // 2. สร้างลิสต์ของเลขกลับทั้งหมด (เหมือนเดิม)
    const newReversedValues: string[] = [];
    validSelectedBets.forEach(bet => {
        const num = bet.value;
        if (num.length === 2) {
            const reversed = num.split('').reverse().join('');
            if (num !== reversed) {
                newReversedValues.push(reversed);
            }
        } else if (num.length === 3) {
            const permutations = generatePermutations(num);
            permutations.forEach(p => {
                if (p !== num) {
                    newReversedValues.push(p);
                }
            });
        }
    });

    // ✨ [แก้ไข] ลบ Logic การกรองเลขปิดออกทั้งหมด ✨
    const existingBetsSet = new Set(bets.map(b => b.value));
    
    // กรองเอาเฉพาะเลขที่ยังไม่มีในรายการเท่านั้น (แต่ไม่กรองเลขปิดแล้ว)
    const finalBetsToAdd = [...new Set(newReversedValues)] // ใช้ Set เพื่อกรองค่าซ้ำกันเองก่อน
                           .filter(num => !existingBetsSet.has(num)); 
 
    if (finalBetsToAdd.length > 0) {
        const newBetsToAddObjects = finalBetsToAdd.map(value => ({ value, selected: true, isValid: true }));
        setBets(prevBets => [...prevBets, ...newBetsToAddObjects]);
    }
};

  // const handleAddDoubleAndTripleNumber = (mode: string) => {
  //   const numbles = getNumble(mode);
  //   if (!specialNumbers?.closed_numbers || specialNumbers.closed_numbers.length === 0) {
  //     const newBets: BetNumber[] = numbles.map(value => ({ value, selected: true, isValid: true }));
  //     setBets(prevBets => [...prevBets, ...newBets]);
  //     return;
  //   }
  //   const closedNumbers = specialNumbers.closed_numbers;
  //   const allowedBets = numbles.filter(num => !closedNumbers.includes(num));
  //   const blockedBets = numbles.filter(num => closedNumbers.includes(num));
  //   if (blockedBets.length > 0) {
  //     alert(`เลขปิดรับ: ${blockedBets.join(', ')}`, "ถูกตัดออกจากรายการ", "light");
  //   }
  //   if (allowedBets.length > 0) {
  //     const newBets: BetNumber[] = allowedBets.map(value => ({ value, selected: true, isValid: true }));
  //     setBets(prevBets => [...prevBets, ...newBets]);
  //   }
  // };

  const handleAddDoubleAndTripleNumber = (mode: string) => {
    const numbles = getNumble(mode);
    const existingBetsSet = new Set(bets.map(b => b.value));
 
    const allowedBets = numbles.filter(num => !existingBetsSet.has(num));

    if (allowedBets.length > 0) {
        const newBets: BetNumber[] = allowedBets.map(value => ({ value, selected: true, isValid: true }));
        setBets(prevBets => [...prevBets, ...newBets]);
    }
};


  // --- UI Rendering ---
  if (isLoading) return <FullScreenLoader isLoading={isLoading} />;
  if (error)
    return (
      <div className="text-center p-10 text-red-500">
        เกิดข้อผิดพลาด: {error}
      </div>
    );
  if (!roundDetails)
    return (
      <div className="text-center p-10 text-red-500">ไม่พบข้อมูลงวดหวยนี้</div>
    );

  const isThreeDigitMode = subTab === "3d" || subTab === "6d";
  const showThreeBottomInput =
    isThreeDigitMode &&
    lottoTypeDetails &&
    Number(lottoTypeDetails.rate_3_bottom) > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg flex justify-between px-4 py-5 shadow-md items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {roundDetails.name}
          </h2>
        </div>
        <div className="text-red-400 font-bold text-xl text-center md:text-right">
          {(() => {
            if (!currentTime || !roundDetails?.fullCutoffTimestamp)
              return "กำลังซิงค์เวลา...";
            const difference =
              roundDetails.fullCutoffTimestamp - currentTime.getTime();
            if (difference <= 0) return "หมดเวลาแล้ว";
            const d = Math.floor(difference / 86400000);
            const h = Math.floor((difference % 86400000) / 3600000);
            const m = Math.floor((difference % 3600000) / 60000);
            const s = Math.floor((difference % 60000) / 1000);
            return `เหลือเวลา: ${d} วัน ${h} ชั่วโมง ${m} นาที ${s} วินาที`;
          })()}
        </div>
      </div>

      <div className="bg-white p-4 md:p-4 rounded-lg shadow">
         <div className="border-t border-b border-gray-200 py-4 mb-4">
          <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
            <button
              className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
                subTab === "2d"
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => handleChangeSubTap("2d")}
            >
              2 ตัว
            </button>
            <button
              className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
                subTab === "3d"
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => handleChangeSubTap("3d")}
            >
              3 ตัว
            </button>
            <button
              className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
                subTab === "6d"
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => handleChangeSubTap("6d")}
            >
              6 กลับ
            </button>
            <button
              className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
                subTab === "19d"
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => handleChangeSubTap("19d")}
            >
              รูด-19 ประตู
            </button>
            <button
              className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
                subTab === "run"
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => handleChangeSubTap("run")}
            >
              วิ่ง
            </button>
          </div>
        </div>

        {subTab === "19d" && (
          <div className="flex flex-wrap items-center gap-6 mb-4 p-2">
            {doorOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center space-x-2 cursor-pointer font-semibold"
              >
                <input
                  type="radio"
                  name="doorMode"
                  value={option.value}
                  checked={doorMode === option.value}
                  onChange={() => setDoorMode(option.value)}
                  className="h-5 w-5 text-blue-500 border-gray-300 focus:ring-blue-500"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )}

        {bets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
            {bets.map((bet, index) => (
              <button
                key={index}
                onClick={() => handleToggleBet(index)}
                className={`
                  font-semibold px-4 py-2 rounded-lg shadow animate-pop-in
                  ${!bet.isValid 
                    ? 'bg-red-500 text-white cursor-not-allowed' // <-- ถ้าไม่ valid จะใช้ class นี้ (สีแดง)
                    : bet.selected 
                      ? 'bg-yellow-300 text-black'                // <-- ถ้า valid และ selected (สีเหลือง)
                      : 'bg-gray-300 text-gray-500 line-through'  // <-- ถ้า valid แต่ไม่ selected (สีเทา)
                  }
                `}
              >
                {bet.value}
              </button>
            ))}
          </div>
        )}

        {(subTab === "2d" || subTab === "3d") && (
          <div>
            <button
              className="mb-2 px-4 py-2 bg-black text-white font-bold rounded-md hover:cursor-pointer hover:bg-yellow-300 hover:text-black"
              onClick={() => handleAddDoubleAndTripleNumber(subTab)}
            >
              + เพิ่มเลขเบิ้ล / เลขตอง
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-4 gap-y-2 mb-4">

          <div className="col-span-2 sm:contents">
            <label htmlFor="numberInput" className="sm:inline-block sm:mr-2 text-lg">ใส่เลข</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="border rounded-md p-2 w-full sm:w-28 mb-0"
              value={number}
              onChange={(e) => handleNumberChange(e, subTab)}
              onPaste={handlePaste}
            />
            {(subTab === "2d" || subTab === "3d") && (
              <button
                className="px-4 py-2 bg-black my-2 text-white rounded-md hover:cursor-pointer hover:bg-yellow-400 hover:text-black"
                onClick={handleClickReverseNumbers}
              >
                กลับเลข
              </button>
            )}
          </div>

          {!isThreeDigitMode && (
            <div className="contents"> 
              <div className="sm:contents">
                <label className="block text-lg font-medium text-green-600">2 ตัวบน</label>
                <input type="text" inputMode="numeric" value={priceTop} onChange={(e) => handlePriceChange(e.target.value, setPriceTop)} className="border rounded-md p-2 w-full sm:w-28"/>
              </div>
              <div className="sm:contents">
                <label className="block text-lg font-medium text-red-600">2 ตัวล่าง</label>
                <input type="text" inputMode="numeric" value={priceBottom} onChange={(e) => handlePriceChange(e.target.value, setPriceBottom)} className="border rounded-md p-2 w-full sm:w-28"/>
              </div>
            </div>
          )}

          {isThreeDigitMode && (
            <div className="contents">
              <div className="sm:contents">
                <label className="block text-lg font-medium text-green-600">3 ตัวตรง</label>
                <input type="text" inputMode="numeric" value={priceTop} onChange={(e) => handlePriceChange(e.target.value, setPriceTop)} className="border rounded-md p-2 w-full sm:w-28"/>
              </div>
              <div className="sm:contents">
                <label className="block text-lg font-medium text-orange-500">3 ตัวโต๊ด</label>
                <input type="text" inputMode="numeric" value={priceTote} onChange={(e) => handlePriceChange(e.target.value, setPriceTote)} className="border rounded-md p-2 w-full sm:w-28"/>
              </div>
              {showThreeBottomInput && (
                <div className="col-span-2 sm:contents">
                  <label className="block text-lg font-medium text-red-600">3 ตัวล่าง</label>
                  <input type="text" inputMode="numeric" value={priceBottom} onChange={(e) => handlePriceChange(e.target.value, setPriceBottom)} className="border rounded-md p-2 w-full sm:w-28"/>
                </div>
              )}
            </div>
          )}

          <div className="col-span-2 sm:contents">
            <button
              className={`w-full sm:w-auto px-4 py-2 ${loadingAddBills ? "bg-yellow-300": "bg-black"} text-white rounded-md hover:cursor-pointer hover:bg-yellow-400 hover:text-black`}
              onClick={handleAddBillEntry}
              disabled={loadingAddBills}
            >
              {loadingAddBills ? "กำลังเพิ่มบิล...":"เพิ่มบิล"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto"> 
          <div className="space-y-2 min-w-[450px]">
            {bill.map((entry, index) => (
              <CardBillForBets
                key={index}
                bets={entry.bets}
                betType={entry.betTypes}
                bahtPer={entry.bahtPer}
                priceTop={entry.priceTop}
                priceTote={entry.priceTote}
                priceBottom={entry.priceBottom}
                entryIndex={index}
                onRemove={handleRemoveEntry}
                onEdit={handleEditEntry}
                specialNumbers={specialNumbers}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <label htmlFor="memo" className="text-lg">
              บันทึกช่วยจำ
            </label>
            <input
              id="memo"
              type="text"
              className="border rounded-md p-2 w-full md:w-72"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="text-lg font-bold ml-4">
            ยอดรวม:{" "}
            <span className="text-red-500">
              {total.toLocaleString("en-US")}
            </span>{" "}
            บาท
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            className="px-6 py-2 border border-red-500 text-red-500 rounded-md font-semibold hover:bg-red-500 hover:text-white"
            onClick={() => handleClearBet()}
          >
            ล้างตัวเลข
          </button>
          <button
            className="px-6 py-2 bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600"
            onClick={handleSaveBill}
          >
            บันทึกบิล
          </button>
        </div>
      </div>

      {/* --- NEW: Result Display Area --- */}
      {/* 1. Green Success Box */}
      {billToPrint && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 mt-6 rounded-lg shadow-md animate-fade-in">
          <h3 className="font-bold text-lg">บันทึกบิลสำเร็จ!</h3>
          <p>เลขที่บิล: <span className="font-mono">{billToPrint.billRef}</span></p>
          <div className="flex flex-wrap gap-4 mt-4">
            
            <button
              onClick={() => setIsModalVisible(true)}
              disabled={!receiptImageUrl}
              className="px-4 py-2 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <EyeIcon className="h-5 w-5"/>
              {receiptImageUrl ? 'ดูบิล' : 'กำลังสร้าง...'}
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600 flex items-center gap-2"
            >
              <PrinterIcon className="h-5 w-5"/>
              พิมพ์
            </button>

            <button
              onClick={handleSaveAsImage}
              className="px-4 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 flex items-center gap-2"
            >
              <DownloadIcon className="h-5 w-5"/>
              บันทึกรูป
            </button>

            {/* <button
              onClick={() => setBillToPrint(null)}
              className="px-4 py-2 bg-red-500 text-white rounded-md font-semibold hover:bg-red-600"
            >
              ปิด
            </button> */}
          </div>
        </div>
       )}

      {/* 2. Receipt Preview Modal */}
      {isModalVisible && (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 animate-fade-in h-screen">
        <div className="p-4 w-full h-full flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col relative">
                
                {/* --- ส่วนปุ่มควบคุม (เหมือนเดิม) --- */}
                <div className="absolute top-2 right-2 flex gap-2 z-20">
                    <button 
                        onClick={handlePrint} 
                        className="p-2 bg-gray-200 rounded-full hover:bg-blue-200 transition-colors" 
                        title="พิมพ์"
                    >
                        <PrinterIcon className="h-6 w-6 text-blue-600" />
                    </button>
                    <button 
                        onClick={handleSaveAsImage} 
                        className="p-2 bg-gray-200 rounded-full hover:bg-green-200 transition-colors" 
                        title="บันทึกรูปภาพ"
                    >
                        <DownloadIcon className="h-6 w-6 text-green-600" />
                    </button>
                    <button 
                        onClick={() => setIsModalVisible(false)} 
                        className="p-2 bg-gray-200 rounded-full hover:bg-red-200 transition-colors" 
                        title="ปิดหน้าต่างนี้"
                    >
                        <XIcon className="h-6 w-6 text-red-600" />
                    </button>
                </div>
                
                {/* 🔥🔥 จุดที่แก้ไข: เพิ่มเงื่อนไขแสดงผล Loading / Image 🔥🔥 */}
                <div className="overflow-y-auto p-4 pt-12">
                    {receiptImageUrl ? (
                        // 1. ถ้ารูปภาพพร้อมแล้ว: แสดงรูป
                        <img src={receiptImageUrl} alt="ใบเสร็จ" className="w-full" />
                    ) : (
                        // 2. ถ้ารูปภาพยังไม่พร้อม: แสดงตัว Loading
                        <div className="flex flex-col justify-center items-center h-48 text-center">
                            <svg className="animate-spin h-8 w-8 text-gray-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-gray-600 font-semibold">กำลังสร้างรูปภาพใบเสร็จ...</p>
                            <p className="text-sm text-gray-500 mt-1">กรุณารอสักครู่</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    </div>
)}

      {/* Other Cards */}
      <div className="flex flex-col lg:flex-row gap-6">
  
          {/* Card 1: ความกว้างคงที่ */}
          <RateDisplayCard details={lottoTypeDetails} />
          
          {/* Card 2: ความกว้างคงที่ */}
          <SpecialNumbersCard
            lottoId={lottoId}
            specialNumbers={specialNumbers}
            onUpdate={fetchSpecialNumbersOnly}
          />
          
          {/* Card 3: ยืดเต็มพื้นที่ที่เหลือ */}
          <div className="w-full">
            {user && lottoId && (
              <LimitAndSpentSummaryCard
                lottoRoundId={lottoId}
                userId={user.id}
                currentBill={bill} 
                refreshKey={refreshKey}
              />
            )}
          </div>

        </div>

        {/* Hidden component for printing (วางไว้ข้างนอกเหมือนเดิม) */}
        <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
          <PrintableReceipt 
            ref={receiptRef} 
            bill={billToPrint}
            lottoTypeDetails={lottoTypeDetails}
            specialNumbers={specialNumbers}
          />
        </div> 
    </div>
  );
};

export default LottoFormPage;