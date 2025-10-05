import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toPng } from "html-to-image";

import {
  generate6Glab,
  generate19Doors,
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
import { PrinterIcon, ArrowDownTrayIcon as DownloadIcon, XMarkIcon as XIcon, EyeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { useModal } from "../components/Modal";
import LimitAndSpentSummaryCard from "../components/LimitAndSpentSummaryCard";
import api from "../api/axiosConfig";

// --- Interfaces ---
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
interface RawLimitSummary {
  defaultLimits: { limit_2d_amount?: string | null; limit_3d_amount?: string | null; };
  specificLimits: { bet_number: string; max_amount: string; }[];
  rangeLimits: { range_start: string; range_end: string; max_amount: string; number_limit_types: string; }[];
  spentSummary: { bet_number: string; bet_style: string; total_spent: string; }[];
}

// ✨ [จุดที่แก้ไข] 1: สร้าง Type ใหม่สำหรับเก็บข้อมูลลิมิตที่ละเอียดขึ้น
export type OverLimitStyle = 'บน' | 'ล่าง' | 'โต๊ด' | 'ทั้งหมด';
export type OverLimitDetails = Map<string, Set<OverLimitStyle>>;


const LottoFormPage = () => {
  const { user } = useAuth();
  const { lottoId } = useParams();
  const navigate = useNavigate();
  const { alert, confirm, showStatus, hideStatus } = useModal();

  // State
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [specialNumbers, setSpecialNumbers] = useState<SpecialNumbers | null>(null);
  const [priceTote, setPriceTote] = useState("0");
  const [subTab, setSubTab] = useState("2d");
  const [note, setNote] = useState("");
  const [roundDetails, setRoundDetails] = useState<LottoRoundDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
  const [lottoTypeDetails, setLottoTypeDetails] = useState<LottoTypeDetails | null>(null);
  const [billToPrint, setBillToPrint] = useState<any | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [loadingAddBills, setLoadingAddBills] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBillInvalid, setIsBillInvalid] = useState(false);
  const [rawLimitData, setRawLimitData] = useState<RawLimitSummary | null>(null);

  const isThreeDigitMode = subTab === "3d" || subTab === "6d";
  const showThreeBottomInput =
    isThreeDigitMode &&
    lottoTypeDetails &&
    Number(lottoTypeDetails.rate_3_bottom) > 0;

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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim(); 
    const normalizedText = pastedText.replace(/[\n,:=@!?.]+/g, ' ');
    const primaryGroups = normalizedText.split(/\s+/).filter(Boolean);
    const tokens = primaryGroups.flatMap(group => 
      group.includes('-') ? group.split('-') : [group]
    ).filter(Boolean);

    const newBets: BetNumber[] = tokens.map(token => {
      let isValid = false;
      const isNumericOnly = /^\d+$/.test(token);
      
      if (isNumericOnly) {
        if (subTab === '2d' && token.length === 2) isValid = true;
        else if (subTab === '3d' && token.length === 3) isValid = true;
        else if (subTab === 'run' && token.length === 1) isValid = true;
      }
      
      return { value: token, selected: true, isValid: isValid };
    });

    setBets(prevBets => {
      const existingValues = new Set(prevBets.map(b => b.value));
      const uniqueNewBets = newBets.filter(b => !existingValues.has(b.value));
      return [...prevBets, ...uniqueNewBets];
    });
  };

  useEffect(() => {
    if (billToPrint) {
      const timer = setTimeout(() => {
        generateReceiptImage()
          .then(setReceiptImageUrl)
          .catch(err => console.error("Failed to generate receipt image:", err));
      }, 200);
      return () => clearTimeout(timer);
    } else {
        setReceiptImageUrl(null);
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

  const loadInitialData = useCallback(async () => {
    if (!lottoId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    
    try {
        const results = await Promise.allSettled([
            api.get(`/api/lotto-rounds/${lottoId}`),
            fetchSpecialNumbersOnly()
        ]);

        const roundResult = results[0];
        if (roundResult.status === 'fulfilled') {
                    const roundData = roundResult.value.data;
                    const cutoffDate = new Date(roundData.round.cutoff_datetime);
                    cutoffDate.setHours(cutoffDate.getHours() - 7);
                    const serverDate = new Date(roundData.serverTime);

                    setRoundDetails({
                        name: roundData.round.name,
                        lottoDate: formatDateString(cutoffDate.toISOString(), 'long'),
                        lottoTime: cutoffDate.toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Bangkok"
                        }),
                        fullCutoffTimestamp: cutoffDate.getTime(),
                        lotto_type_id: roundData.round.lotto_type_id,
                    });
                    
                    setCurrentTime(serverDate);

                    const typeResponse = await api.get(`/api/lotto-types/${roundData.round.lotto_type_id}`);
                    setLottoTypeDetails(typeResponse.data);
                } else {
                    throw new Error("ไม่พบข้อมูลงวดหวย");
                }
        
        if (results[1].status === 'rejected') {
            console.error("Failed to fetch special numbers:", results[1].reason);
        }
    } catch (err: any) {
        console.error("Error loading initial data:", err);
    } finally {
        setIsLoading(false);
    }
  }, [lottoId, fetchSpecialNumbersOnly]);
  
  useEffect(() => { loadInitialData(); }, [loadInitialData]);
  
  useEffect(() => {
    const intervalId = setInterval(fetchSpecialNumbersOnly, 100); 
    return () => clearInterval(intervalId);
  }, [fetchSpecialNumbersOnly]);

  useEffect(() => {
    if (!currentTime) return;
    const interval = setInterval(() => setCurrentTime((prev) => prev ? new Date(prev.getTime() + 1000) : null), 1000);
    return () => clearInterval(interval);
  }, [currentTime]);

  useEffect(() => {
    if (currentTime && roundDetails?.fullCutoffTimestamp) {
      if (currentTime.getTime() >= roundDetails.fullCutoffTimestamp) {
        alert("หมดเวลาซื้อแล้ว","ระบบจะนำท่านกลับสู่หน้าหลัก", 'light').then(() => navigate("/"));
      }
    }
  }, [currentTime, roundDetails, navigate, alert]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadInitialData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, [loadInitialData]);

  useEffect(() => {
    const closedNumbers = specialNumbers?.closed_numbers || [];
    
    const newTotal = bill.reduce((sum, entry) => {
        const pricePerBet = (entry.priceTop || 0) + (entry.priceTote || 0) + (entry.priceBottom || 0);
        const validBetsInEntry = entry.bets.filter(bet => !closedNumbers.includes(bet));
        return sum + (validBetsInEntry.length * pricePerBet);
    }, 0);
    
    setTotal(newTotal);

    if (bill.length > 0) {
        const allNumbersAreClosed = bill.every(entry => 
            entry.bets.every(betNumber => closedNumbers.includes(betNumber))
        );
        setIsBillInvalid(allNumbersAreClosed);
    } else {
        setIsBillInvalid(false);
    }
  }, [bill, specialNumbers]);

  const handlePrint = useReactToPrint({ content: () => receiptRef.current, documentTitle: `bill-${billToPrint?.billRef}` });

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
  }, [billToPrint, generateReceiptImage, alert]);

  const handleSaveBill = async () => {
    if (!roundDetails) {
        alert("ข้อมูลยังไม่พร้อม", "กรุณารอสักครู่แล้วลองอีกครั้ง", 'light');
        return;
    }
    if (bill.length === 0) {
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
    } catch (err: any) { 
      hideStatus();
      const errorDetails = err.response?.data?.details || "";

      if (errorDetails.includes('LIMIT_EXCEEDED_ON_SAVE')) {
          alert( "บันทึกไม่สำเร็จ", "วงเงินบางเลขมีการเปลี่ยนแปลง โปรดตรวจสอบและลองอีกครั้ง", 'light' );
          fetchLimitAndSpentSummary();
      } else {
          showStatus('error', "ไม่สามารถบันทึกได้", errorDetails || err.message);
      }
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
    const numPriceTop = Number(priceTop);
    const numPriceBottom = Number(priceBottom);
    const numPriceTote = Number(priceTote);

    if (numPriceTop === 0 && numPriceTote === 0 && numPriceBottom === 0) {
        alert("ยังไม่ได้ใส่ราคา", "กรุณาใส่ราคาอย่างน้อย 1 ช่อง", "light");
        return;
    }
    setLoadingAddBills(true);

    const betsForApi = selectedValidBets.map(betNumber => ({
        betNumber,
        priceTop: numPriceTop,
        priceBottom: numPriceBottom,
        priceTote: numPriceTote,
    }));

    try {
        await api.post('/api/batch-check-bet-limits', {
            userId: user.id,
            lottoRoundId: Number(lottoId),
            bets: betsForApi,
            pendingBets: bill,
        });

        const pricePerNumberFromForm = numPriceTop + numPriceTote + numPriceBottom;
        const entryTotal = selectedValidBets.length * pricePerNumberFromForm;
        setBill((prev) => [
            ...prev,
            {
                bets: selectedValidBets,
                betTypes: subTab,
                bahtPer: 0,
                priceTop: numPriceTop,
                priceTote: numPriceTote,
                priceBottom: numPriceBottom,
                total: entryTotal,
                addBy: user.username,
            },
        ]);
        handleClearInputs();
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData && errorData.error === 'LimitExceeded' && errorData.failedBets) {
          
          const errorMessages = errorData.failedBets.map((failedBet: any) => {
              const { betNumber, style, limit, currentSpent, incomingAmount } = failedBet;
              const remaining = limit - currentSpent;

              if (remaining <= 0) {
                  return `- เลข ${betNumber} (${style==='บน' ?"บน หรือ ตรง": style}): วงเงินเต็มแล้ว`;
              } else {
                  return `- เลข ${betNumber} (${style==='ทั้งหมด' ? "ยอดรวมทั้งหมดที่ลง" : style}): เกินวงเงิน! (ยอดรวมที่ลงจะซื้อได้อีกไม่เกิน ${remaining.toLocaleString()} บาท)`;
              }
          }).join('\n');

          alert( "มีบางรายการเกินวงเงินที่กำหนด", errorMessages, "light" );

      } else {
          alert( "เกิดข้อผิดพลาด", errorData?.message || err.message || "ไม่สามารถตรวจสอบลิมิตได้", "light" );
      }
  } finally {
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

  const handlePriceChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const numericValue = value.replace(/[^0-9]/g, "");

    if (numericValue.length > 1 && numericValue.startsWith("0")) {
      setter(numericValue.slice(1));
    } else {
      setter(numericValue);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;

    setNumber(value);

    const add = (list: string[]) => {
      if (list.length > 0) {
        setBets((prev) => [
          ...prev,
          ...list.map((v) => ({ value: v, selected: true, isValid: true })),
        ]);
      }
      setNumber("");
    };

    if (type === "2d" && value.length === 2) add([value]);
    if (type === "3d" && value.length === 3) add([value]);
    if (type === "run" && value.length === 1) add([value]);
    if (type === "6d" && value.length === 3) add(generate6Glab(value));
    if (type === "19d" && value.length === 1) add(generate19Doors(value, doorMode));
  };
    
  const handleClickReverseNumbers = () => {
    const validSelectedBets = bets.filter(bet => bet.isValid && bet.selected);
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

    const existingBetsSet = new Set(bets.map(b => b.value));
    
    const finalBetsToAdd = [...new Set(newReversedValues)]
        .filter(num => !existingBetsSet.has(num)); 

    if (finalBetsToAdd.length > 0) {
        const newBetsToAddObjects = finalBetsToAdd.map(value => ({ value, selected: true, isValid: true }));
        setBets(prevBets => [...prevBets, ...newBetsToAddObjects]);
    }
  };

  const handleAddDoubleAndTripleNumber = (mode: string) => {
    const numbles = getNumble(mode);
    const existingBetsSet = new Set(bets.map(b => b.value));

    const allowedBets = numbles.filter(num => !existingBetsSet.has(num));

    if (allowedBets.length > 0) {
        const newBets: BetNumber[] = allowedBets.map(value => ({ value, selected: true, isValid: true }));
        setBets(prevBets => [...prevBets, ...newBets]);
    }
  };
  
  const fetchLimitAndSpentSummary = useCallback(async () => {
    if (!user || !lottoId) return;
    try {
      const response = await api.get<RawLimitSummary>(`/api/round-limit-summary/${lottoId}/user/${user.id}`);
      setRawLimitData(response.data);
    } catch (error) {
      console.error("Error fetching limit summary:", error);
      setRawLimitData(null);
    }
  }, [lottoId, user]);

  useEffect(() => {
      if (!lottoId || !user) {
          return;
      }
      fetchLimitAndSpentSummary();
      const limitInterval = setInterval(fetchLimitAndSpentSummary, 100);
      return () => {
          clearInterval(limitInterval);
      };
  }, [lottoId, user, fetchLimitAndSpentSummary]);
  
 // ✨ [จุดที่แก้ไข] 2: เปลี่ยนชื่อ overLimitNumbersSet เป็น overLimitDetails และปรับปรุง Logic ทั้งหมด
  const overLimitDetails = useMemo((): OverLimitDetails => {
    const details: OverLimitDetails = new Map();
    if (!rawLimitData) {
      return details;
    }

    const { defaultLimits, rangeLimits, spentSummary } = rawLimitData;
    const combinedTotals = new Map<string, { top: number; bottom: number; tote: number }>();

    const addToCombined = (
      map: typeof combinedTotals, betNumber: string, top: number, bottom: number, tote: number
    ) => {
      if (!map.has(betNumber)) {
        map.set(betNumber, { top: 0, bottom: 0, tote: 0 });
      }
      const current = map.get(betNumber)!;
      current.top += top;
      current.bottom += bottom;
      current.tote += tote;
    };

    spentSummary.forEach(item => {
      if (!item || !item.bet_number) return;
      const amount = parseFloat(item.total_spent || '0');
      const style = (item.bet_style || '').trim();
      addToCombined(
        combinedTotals,
        item.bet_number,
        (style === 'บน' || style === 'ตรง') ? amount : 0,
        style === 'ล่าง' ? amount : 0,
        style === 'โต๊ด' ? amount : 0
      );
    });

    bill.forEach(entry => {
      entry.bets.forEach(betNumber => {
        addToCombined(
          combinedTotals,
          betNumber,
          entry.priceTop || 0,
          entry.priceBottom || 0,
          entry.priceTote || 0
        );
      });
    });

    for (const [betNumber, combined] of combinedTotals.entries()) {
      const overLimitStyles = new Set<OverLimitStyle>();
      
      const applicableRules = rangeLimits.filter(
        r => r && r.range_start && r.range_end &&
          betNumber.length === r.range_start.length &&
          parseInt(betNumber, 10) >= parseInt(r.range_start, 10) &&
          parseInt(betNumber, 10) <= parseInt(r.range_end, 10)
      );

      const getMostSpecificRule = (rules: typeof rangeLimits, type: OverLimitStyle) => {
        const typeAliases = type === 'บน' ? ['บน', 'ตรง'] : [type];
        const filteredRules = rules.filter(r => typeAliases.includes(r.number_limit_types as any));
        if (filteredRules.length === 0) return null;
        if (filteredRules.length === 1) return filteredRules[0];
        return filteredRules.sort((a, b) => (parseInt(a.range_end) - parseInt(a.range_start)) - (parseInt(b.range_end) - parseInt(b.range_start)))[0];
      };

      // Check each style against its most specific rule
      const topRule = getMostSpecificRule(applicableRules, 'บน');
      if (topRule && combined.top > parseFloat(topRule.max_amount)) {
        overLimitStyles.add('บน');
      }

      const bottomRule = getMostSpecificRule(applicableRules, 'ล่าง');
      if (bottomRule && combined.bottom > parseFloat(bottomRule.max_amount)) {
        overLimitStyles.add('ล่าง');
      }

      const toteRule = getMostSpecificRule(applicableRules, 'โต๊ด');
      if (toteRule && combined.tote > parseFloat(toteRule.max_amount)) {
        overLimitStyles.add('โต๊ด');
      }

      const totalRule = getMostSpecificRule(applicableRules, 'ทั้งหมด');
      const totalAmountForNumber = combined.top + combined.bottom + combined.tote;

      if (totalRule) {
        // If a specific 'total' rule exists, use it
        if (totalAmountForNumber > parseFloat(totalRule.max_amount)) {
          overLimitStyles.add('ทั้งหมด');
        }
      } else {
        // Fallback to default limit if no specific 'total' rule is found
        const defaultLimitRaw = betNumber.length <= 2 ? defaultLimits?.limit_2d_amount : defaultLimits?.limit_3d_amount;
        if (defaultLimitRaw && parseFloat(defaultLimitRaw) > 0) {
          if (totalAmountForNumber > parseFloat(defaultLimitRaw)) {
            overLimitStyles.add('ทั้งหมด');
          }
        }
      }
      
      if (overLimitStyles.size > 0) {
        details.set(betNumber, overLimitStyles);
      }
    }

    return details;
  }, [bill, rawLimitData]);

  const isBillOverLimit = useMemo(() => {
    if (overLimitDetails.size === 0) return false;
    for (const entry of bill) {
      for (const bet of entry.bets) {
        if (overLimitDetails.has(bet)) {
          return true;
        }
      }
    }
    return false;
  }, [bill, overLimitDetails]);

  // Function to get over-limit numbers for the warning message
  const getOverLimitNumbersInBill = () => {
    const numbers = new Set<string>();
    bill.forEach(entry => {
      entry.bets.forEach(bet => {
        if (overLimitDetails.has(bet)) {
          numbers.add(bet);
        }
      });
    });
    return [...numbers].join(', ');
  }

  if (isLoading) return <FullScreenLoader isLoading={isLoading} />;
  if (!roundDetails) return <div className="text-center p-10 text-gray-500">กรุณารอสักครู่ กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-6">
        <div className="bg-white rounded-lg flex justify-between px-4 py-5 shadow-md items-center">
            <div>
                <h2 className="text-xl font-bold text-gray-800">{roundDetails.name}</h2>
            </div>
            <div className="text-red-400 font-bold text-xl text-center md:text-right">
                {(() => {
                    if (!currentTime || !roundDetails.fullCutoffTimestamp) return "กำลังซิงค์เวลา...";
                    const difference = roundDetails.fullCutoffTimestamp - currentTime.getTime();
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
                    <button className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${subTab === "2d" ? "bg-yellow-300 text-black" : "bg-gray-200 text-gray-700"}`} onClick={() => handleChangeSubTap("2d")}>2 ตัว</button>
                    <button className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${subTab === "3d" ? "bg-yellow-300 text-black" : "bg-gray-200 text-gray-700"}`} onClick={() => handleChangeSubTap("3d")}>3 ตัว</button>
                    <button className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${subTab === "6d" ? "bg-yellow-300 text-black" : "bg-gray-200 text-gray-700"}`} onClick={() => handleChangeSubTap("6d")}>6 กลับ</button>
                    <button className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${subTab === "19d" ? "bg-yellow-300 text-black" : "bg-gray-200 text-gray-700"}`} onClick={() => handleChangeSubTap("19d")}>รูด-19 ประตู</button>
                    <button className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${subTab === "run" ? "bg-yellow-300 text-black" : "bg-gray-200 text-gray-700"}`} onClick={() => handleChangeSubTap("run")}>วิ่ง</button>
                </div>
            </div>

            {subTab === "19d" && ( <div className="flex flex-wrap items-center gap-6 mb-4 p-2">{doorOptions.map((option) => ( <label key={option.value} className="flex items-center space-x-2 cursor-pointer font-semibold"> <input type="radio" name="doorMode" value={option.value} checked={doorMode === option.value} onChange={() => setDoorMode(option.value)} className="h-5 w-5 text-blue-500 border-gray-300 focus:ring-blue-500"/> <span>{option.label}</span> </label> ))}</div>)}
            {bets.length > 0 && (<div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">{bets.map((bet, index) => (<button key={index} onClick={() => handleToggleBet(index)} className={`font-semibold px-4 py-2 rounded-lg shadow animate-pop-in ${!bet.isValid ? 'bg-red-500 text-white cursor-not-allowed' : bet.selected ? 'bg-yellow-300 text-black' : 'bg-gray-300 text-gray-500 line-through'}`}>{bet.value}</button>))}</div>)}
            {(subTab === "2d" || subTab === "3d") && (<div><button className="mb-2 px-4 py-2 bg-black text-white font-bold rounded-md hover:cursor-pointer hover:bg-yellow-300 hover:text-black" onClick={() => handleAddDoubleAndTripleNumber(subTab)}>+ เพิ่มเลขเบิ้ล / เลขตอง</button></div>)}

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                <div className="col-span-2 sm:contents">
                    <label htmlFor="numberInput" className="sm:inline-block sm:mr-2 text-lg">ใส่เลข</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" className="border rounded-md p-2 w-full sm:w-28 mb-0" value={number} onChange={(e) => handleNumberChange(e, subTab)} onPaste={handlePaste}/>
                    {(subTab === "2d" || subTab === "3d") && (<button className="px-4 py-2 bg-black my-2 text-white rounded-md hover:cursor-pointer hover:bg-yellow-400 hover:text-black" onClick={handleClickReverseNumbers}>กลับเลข</button>)}
                </div>
                {!isThreeDigitMode && (<div className="contents"><div className="sm:contents"><label className="block text-lg font-medium text-green-600"> บน</label><input type="text" inputMode="numeric" value={priceTop} onChange={(e) => handlePriceChange(e.target.value, setPriceTop)} className="border rounded-md p-2 w-full sm:w-28"/></div><div className="sm:contents"><label className="block text-lg font-medium text-red-600"> ล่าง</label><input type="text" inputMode="numeric" value={priceBottom} onChange={(e) => handlePriceChange(e.target.value, setPriceBottom)} className="border rounded-md p-2 w-full sm:w-28"/></div></div>)}
                {isThreeDigitMode && (<div className="contents"><div className="sm:contents"><label className="block text-lg font-medium text-green-600"> ตรง</label><input type="text" inputMode="numeric" value={priceTop} onChange={(e) => handlePriceChange(e.target.value, setPriceTop)} className="border rounded-md p-2 w-full sm:w-28"/></div><div className="sm:contents"><label className="block text-lg font-medium text-orange-500"> โต๊ด</label><input type="text" inputMode="numeric" value={priceTote} onChange={(e) => handlePriceChange(e.target.value, setPriceTote)} className="border rounded-md p-2 w-full sm:w-28"/></div>{showThreeBottomInput && (<div className="col-span-2 sm:contents"><label className="block text-lg font-medium text-red-600"> ล่าง</label><input type="text" inputMode="numeric" value={priceBottom} onChange={(e) => handlePriceChange(e.target.value, setPriceBottom)} className="border rounded-md p-2 w-full sm:w-28"/></div>)}</div>)}
                <div className="col-span-2 sm:contents"><button className={`w-full sm:w-auto px-4 py-2 ${loadingAddBills ? "bg-yellow-300": "bg-black"} text-white rounded-md hover:cursor-pointer hover:bg-yellow-400 hover:text-black`} onClick={handleAddBillEntry} disabled={loadingAddBills}>{loadingAddBills ? "กำลังเพิ่มบิล...":"เพิ่มบิล"}</button></div>
            </div>

            <div className="overflow-x-auto">
                <div className="space-y-2 min-w-[450px]">
                    {bill.map((entry, index) => (
                      // ✨ [จุดที่แก้ไข] เปลี่ยนจากการใช้ {...entry} เป็นการระบุ props แต่ละตัวให้ถูกต้อง
                      <CardBillForBets 
                        key={index} 
                        bets={entry.bets}
                        betType={entry.betTypes} // แก้จาก betTypes -> betType
                        bahtPer={entry.bahtPer}
                        priceTop={entry.priceTop}
                        priceTote={entry.priceTote}
                        priceBottom={entry.priceBottom}
                        entryIndex={index} 
                        onRemove={handleRemoveEntry} 
                        onEdit={handleEditEntry} 
                        specialNumbers={specialNumbers} 
                        overLimitDetails={overLimitDetails} 
                      />
                    ))}
                  </div>
            </div>

            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="memo" className="text-lg">บันทึกช่วยจำ</label>
                    <input id="memo" type="text" className="border rounded-md p-2 w-full md:w-72" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <div className="text-lg font-bold ml-4">ยอดรวม:{" "}<span className="text-red-500">{total.toLocaleString("en-US")}</span>{" "}บาท</div>
            </div>

            <div className="flex justify-center gap-4 mt-6 flex-col items-center">
                {isBillOverLimit && (
                    <div className="p-3 mb-2 text-sm text-blue-800 rounded-lg bg-blue-100 w-full md:w-auto text-center animate-fade-in" role="alert">
                        <span className="font-bold"><ExclamationTriangleIcon className="h-5 w-5 inline-block mr-2" />มีบางรายการอาจเกินวงเงิน!</span>
                        <p className="mt-1">เลขต่อไปนี้ ({getOverLimitNumbersInBill()}) อาจเต็มแล้ว โปรดแก้ไขรายการ</p>
                    </div>
                )}
                <div className="flex gap-4">
                    <button className="px-6 py-2 border border-red-500 text-red-500 rounded-md font-semibold hover:bg-red-500 hover:text-white" onClick={() => handleClearBet()}>ล้างตัวเลข</button>
                    <button className={`px-6 py-2 rounded-md font-semibold transition-colors ${(isBillInvalid || isBillOverLimit) ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`} onClick={handleSaveBill} disabled={isBillInvalid || isBillOverLimit}>
                        {isBillInvalid ? 'ไม่สามารถบันทึก (เลขปิด)' : isBillOverLimit ? 'ไม่สามารถบันทึก (เกินวงเงิน)' : 'บันทึกบิล'}
                    </button>
                </div>
            </div>
        </div>

        {billToPrint && ( <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 mt-6 rounded-lg shadow-md animate-fade-in"> <h3 className="font-bold text-lg">บันทึกบิลสำเร็จ!</h3> <p>เลขที่บิล: <span className="font-mono">{billToPrint.billRef}</span></p> <div className="flex flex-wrap gap-4 mt-4"> <button onClick={() => setIsModalVisible(true)} disabled={!receiptImageUrl} className="px-4 py-2 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"> <EyeIcon className="h-5 w-5"/> {receiptImageUrl ? 'ดูบิล' : 'กำลังสร้าง...'} </button> <button onClick={handlePrint} className="px-4 py-2 bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600 flex items-center gap-2"> <PrinterIcon className="h-5 w-5"/> พิมพ์ </button> <button onClick={handleSaveAsImage} className="px-4 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 flex items-center gap-2"> <DownloadIcon className="h-5 w-5"/> บันทึกรูป </button> </div> </div> )}
        {isModalVisible && ( <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 animate-fade-in h-screen"> <div className="p-4 w-full h-full flex justify-center items-center"> <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col relative"> <div className="absolute top-2 right-2 flex gap-2 z-20"> <button onClick={handlePrint} className="p-2 bg-gray-200 rounded-full hover:bg-blue-200 transition-colors" title="พิมพ์"> <PrinterIcon className="h-6 w-6 text-blue-600" /> </button> <button onClick={handleSaveAsImage} className="p-2 bg-gray-200 rounded-full hover:bg-green-200 transition-colors" title="บันทึกรูปภาพ"> <DownloadIcon className="h-6 w-6 text-green-600" /> </button> <button onClick={() => setIsModalVisible(false)} className="p-2 bg-gray-200 rounded-full hover:bg-red-200 transition-colors" title="ปิดหน้าต่างนี้"> <XIcon className="h-6 w-6 text-red-600" /> </button> </div> <div className="overflow-y-auto p-4 pt-12"> {receiptImageUrl ? ( <img src={receiptImageUrl} alt="ใบเสร็จ" className="w-full" /> ) : ( <div className="flex flex-col justify-center items-center h-48 text-center"> <svg className="animate-spin h-8 w-8 text-gray-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> <p className="text-gray-600 font-semibold">กำลังสร้างรูปภาพใบเสร็จ...</p> <p className="text-sm text-gray-500 mt-1">กรุณารอสักครู่</p> </div> )} </div> </div> </div> </div> )}

        <div className="flex flex-col lg:flex-row gap-6">
            <RateDisplayCard details={lottoTypeDetails} />
            <SpecialNumbersCard
                lottoId={lottoId}
                specialNumbers={specialNumbers}
                onUpdate={fetchSpecialNumbersOnly}
            />
            <div className="w-full">
                {user && lottoId && (
                    <LimitAndSpentSummaryCard
                        summaryData={rawLimitData}
                        currentBill={bill}
                    />
                )}
            </div>
        </div>

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