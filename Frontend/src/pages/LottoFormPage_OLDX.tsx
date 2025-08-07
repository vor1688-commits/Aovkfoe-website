// src/pages/LottoFormPage.tsx
import React, { useState, useEffect } from "react"; // 1. เพิ่มการ import useEffect
import { useParams, useLocation } from "react-router-dom";
import {
  generate6Glab,
  generate19Doors,
  reverseNumbers,
  getNumble,
  generateBillRef,
  formatFullThaiDate,
} from "../services/BetService";
import CardBillForBets from "../components/CardBillForBets";

interface BetNumber {
  value: string;
  selected: boolean;
}

interface BillEntry {
  bets: string[];
  betTypes: string;
  bahtPer: number;
  priceTop: number;
  priceBottom: number;
  total: number;
  addBy: string;
}

const LottoFormPage_old = () => {
  const { lottoId } = useParams();

  const location = useLocation();
  const lottoName = location.state?.lottoName || "Loading...";
  const lottoDate = location.state?.lottoDate || "Loading...";
  const lottoTime = location.state?.lottoTime || "Loading...";

  // State สำหรับจัดการว่าแท็บไหนถูกเลือกอยู่
  const [activeTab, setActiveTab] = useState("fast"); // 'fast', '2d3d', 'run', 'win'
  const [subTab, setSubTab] = useState("2d"); // '2d', '3d', '6d', '19d', 'run'
  const [note, setNote] = useState("");
  const [canNote, setCanNote] = useState(false);

  // State สำหรับจัดการข้อมูลในฟอร์ม
  const [number, setNumber] = useState("");
  const [bahtPer, setBahtPer] = useState<number>(0);
  const [priceTop, setPriceTop] = useState("0");
  const [priceBottom, setPriceBottom] = useState("0");
  const [total, setTotal] = useState<number>(0);

  const [bets, setBets] = useState<BetNumber[]>([]);
  //ตัวแปรสำหรับ 19ประตู
  const [doorMode, setDoorMode] = useState("all");
  const doorOptions = [
    { value: "all", label: "19-ประตู" },
    { value: "front", label: "รูด-หน้า" },
    { value: "back", label: "รูด-หลัง" },
  ];

  const [bill, setBill] = useState<BillEntry[]>([]);

  // 2. เพิ่ม useEffect เพื่อคำนวณยอดรวมใหม่ทุกครั้งที่ 'bill' มีการเปลี่ยนแปลง
  useEffect(() => {
    const totalBets = bill.reduce((sum, entry) => {
      // นำยอดรวมของแต่ละรายการมาบวกกัน
      const entryTotal =
        (entry.priceTop + entry.priceBottom) * entry.bets.length;
      return sum + entryTotal;
    }, 0);
    setTotal(totalBets);
    console.log(bill);
  }, [bill]); // dependency array: effect นี้จะทำงานเมื่อ state 'bill' เปลี่ยนแปลง

   useEffect(() => {
    // Effect นี้จะทำงานหลังจากที่ handleClearBets เปลี่ยน state เรียบร้อยแล้ว
    // และหลังจากที่ component re-render ด้วยค่าใหม่
    console.log("2. useEffect ทำงาน! แสดงค่าล่าสุด:");
    console.log({
      bets,
      total,
      priceTop,
      priceBottom,
    });
  }, [bets, total, priceTop, priceBottom, note, canNote]); 

  const handleSaveBill = async () => {


    if(bill.length === 0){
      alert("ยังไม่มีการเพิ่มบิล โปรดเพิ่มบิลก่อนบันทึกรายการ");
      return
    }

    if (note === '' && !canNote) {
      const isConfirmed = window.confirm("คุณยังไม่ได้ใส่ข้อมูลบันทึกช่วยจำ ต้องการดำเนินการต่อหรือไม่?");
      if (!isConfirmed) {
        return; // หยุดการทำงานของฟังก์ชัน
      } 
    }

    //สร้างข้อมูลที่จะส่งไป
    const payload = {
      billRef: generateBillRef(20),
      userId: 1, // สมมติว่า user id คือ 1 (ในอนาคตจะดึงมาจาก state ตอน login)
      note: note,
      totalAmount: total,
      betName: lottoName,
      billEntries: bill,
    }

    try {
      const response = await fetch("http://localhost:3000/api/savebills", {
        method: 'POST',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if(!response.ok) {
        throw new Error(result.error);
      }

      alert(result.message);
      handleClearBill();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    }

  }

  const handleClearBets = () => {
    setBets([]);  
    setTotal(0);  
    setPriceTop("0");
    setPriceBottom("0"); 
  };

  const handleClearBill = () => {
    setBill([]);
    setTotal(0);
    setSubTab("2d");
    setActiveTab("fast");
    setBahtPer(0); 
    setPriceTop("0");
    setPriceBottom("0");
    setNote("");
    setCanNote(false);
  }

  const handleAddBillBets = (
    bets: string[],
    betType: string,
    bahtPer: number,
    priceTop: number,
    priceBottom: number,
    total: number,
    addBy: string
  ) => {
    const newBill: BillEntry = {
      bets: [...bets],
      betTypes: betType,
      bahtPer: bahtPer,
      priceTop: priceTop,
      priceBottom: priceBottom,
      total: total,
      addBy: addBy,
    };

    // 3. อัปเดต state ของ bill ซึ่งจะไปกระตุ้นให้ useEffect ทำงาน
    setBill((prevbill) => [...prevbill, newBill]);

    // alert(`เพิ่มบิลสำเร็จ!`); // แก้ไข alert ให้แสดงข้อความที่ชัดเจน

    //ทำให้ช่อง input กลับสู่ค่าว่าง (กันการกดซำ)
    setBets([]);
    setPriceTop("0");
    setPriceBottom("0");

    // 4. ลบส่วนการคำนวณยอดรวมที่ทำงานผิดพลาดออกจากฟังก์ชันนี้
  };

  const handleEditEntry = (indexToEdit: number) => {
    const entryToEdit = bill[indexToEdit];
    
    // แปลง string[] ให้เป็น BetNumber[]
    const betsToEdit: BetNumber[] = entryToEdit.bets.map(betValue => ({
      value: betValue,
      selected: true // กำหนดให้ที่ดึงมาแก้ไข ถูกเลือกไว้เสมอ
    }));

    setBets(betsToEdit); // ส่งข้อมูลในรูปแบบที่ถูกต้อง

    setSubTab(entryToEdit.betTypes);
    setBahtPer(entryToEdit.bahtPer);
    setPriceTop(String(entryToEdit.priceTop));
    setPriceBottom(String(entryToEdit.priceBottom));
    
    handleRemoveEntry(indexToEdit);
  }

  const handleRemoveEntry = (indexToRemove: number) => {
    setBill(currentBill => 
      currentBill.filter((_, index) => index !== indexToRemove)
    );
  };

    const handleClickReverseNumbers = () => {
    // ดึงเฉพาะค่า value ที่เป็น string ออกมา
    const currentBetValues = bets.map(b => b.value);
    const reversedList = reverseNumbers(currentBetValues);

    // แปลง string[] ที่ได้กลับมาเป็น BetNumber[]
    const newBets: BetNumber[] = reversedList.map(value => ({ value, selected: true }));
    
    // เพิ่มเข้าไปใน state เดิม (ป้องกันการซ้ำ)
    setBets(prevBets => {
        const existingValues = new Set(prevBets.map(b => b.value));
        const uniqueNewBets = newBets.filter(b => !existingValues.has(b.value));
        return [...prevBets, ...uniqueNewBets];
    });
  };

  const handcleAddDoubleAndTripleNumber = (mode: string) => {
    const numbles = getNumble(mode); // ได้ string[] กลับมา

    // แปลง string[] ให้เป็น BetNumber[]
    const newBets: BetNumber[] = numbles.map(value => ({ value, selected: true }));

    // เพิ่มเข้าไปใน state เดิม (ป้องกันการซ้ำ)
    setBets(prevBets => {
        const existingValues = new Set(prevBets.map(b => b.value));
        const uniqueNewBets = newBets.filter(b => !existingValues.has(b.value));
        return [...prevBets, ...uniqueNewBets];
    });
  };

  const handleToggleBet = (indexToToggle: number) => {
  setBets(currentBets => 
    currentBets.map((bet, index) => 
      index === indexToToggle 
        ? { ...bet, selected: !bet.selected } // สลับค่า selected จาก true เป็น false หรือกลับกัน
        : bet
      )
    );
  };

    const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    numberType: string
  ) => {
    const value = e.target.value;

    if (/^\d*$/.test(value) && value != "e") {
      setNumber(value);

      const addBet = (betValue: string) => {
        const newBet: BetNumber = { value: betValue, selected: true };
        setBets((prevdata) => {
            if (prevdata.some(bet => bet.value === newBet.value)) return prevdata;
            return [...prevdata, newBet];
        });
        setNumber("");
      };
      
      const addBetList = (betList: string[]) => {
        const newBets: BetNumber[] = betList.map(v => ({ value: v, selected: true }));
        setBets(prevBets => {
            const existingValues = new Set(prevBets.map(b => b.value));
            const uniqueNewBets = newBets.filter(b => !existingValues.has(b.value));
            return [...prevBets, ...uniqueNewBets];
        });
        setNumber("");
      }

      if (numberType === "2d" && value.length === 2) addBet(value);
      if (numberType === "3d" && value.length === 3) addBet(value);
      if (numberType === "run" && value.length === 1) addBet(value);
      if (numberType === "6d" && value.length === 3) addBetList(generate6Glab(value));
      if (numberType === "19d" && value.length === 1) addBetList(generate19Doors(value, doorMode));
    }
  };

  const handleChangeSubTap = (nameTab: string) => {
    if (subTab != nameTab) {
      setSubTab(nameTab);
      setBets([]);
    }
  };

  const handleChangePriceTopAndBottom = (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: string
  ) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value != "e") {
      if (mode === "priceTop") {
        setPriceTop(value);
      }
      if (mode === "priceBottom") {
        setPriceBottom(value);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== ส่วนหัว: ชื่อหวยและเวลา ===== */}
      <div className="bg-white rounded-lg flex between px-4  py-5 shadow-red-400 items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {lottoName}
            <span className="font-bold text-lg"></span>
          </h2>
        </div>
        <div className="text-red-400 font-bold text-xl">
          สิ้นสุด{`${formatFullThaiDate(lottoDate)} เวลา ${lottoTime}น.`}
        </div>
      </div>

      {/* ===== ส่วนฟอร์มหลัก ===== */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow">
        {/* --- แถวเลือกอัตราจ่าย และ แท็บหลัก --- */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
          <div className="flex items-center">
            <label htmlFor="rate" className="mr-2 text-gray-600">
              อัตราจ่าย:
            </label>
            {/* สร้าง Form Generate ข้อมูลใน List */}
            <select
              id="rate"
              className="border rounded-md p-2"
              value={bahtPer}
              onChange={(event) => {
                console.log(event.target.value);
                setBahtPer(Number(event.target.value));
              }}
            >
              {/* 2. เพิ่ม option สำหรับค่า 0 เข้าไปเป็นตัวแรก */}
              <option value={0} disabled>
                — กรุณาเลือกอัตราจ่าย —
              </option>

              {/* ส่วนของ .map() ที่สร้าง options อื่นๆ ยังคงเหมือนเดิม */}
              {Array.from({ length: 13 }, (_, index) => {
                const value = index < 10 ? 100 - index * 1 : 180 - index * 10;
                return (
                  <option key={value} value={value}>
                    บาทละ {value}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-4 gap-2">
            <button
              className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
                activeTab === "fast"
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => {
                setActiveTab("fast");
              }}
            >
              แทงเร็ว
            </button>
            <button
              className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
                activeTab === "2d3d"
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => setActiveTab("2d3d")}
            >
              2ตัว/3ตัว
            </button>
            <button
              className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
                activeTab === "run"
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => setActiveTab("run")}
            >
              วิ่ง
            </button>
            <button
              className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
                activeTab === "win"
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => setActiveTab("win")}
            >
              จับวิน
            </button>
          </div>
        </div>

        {/* --- แถวคำอธิบาย และ แท็บรอง --- */}
        <div className="border-t border-b border-gray-200 py-4 mb-4">
          {/* ส่วนนี้คุณสามารถแสดงคำอธิบายตาม mainTab ที่เลือกได้ */}
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
            {/* 3. ใช้ .map() เพื่อสร้าง Radio Button จาก Array */}
            {doorOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center space-x-2 cursor-pointer font-semibold"
              >
                <input
                  type="radio"
                  name="doorMode" // name ต้องเป็นชื่อเดียวกันทุกปุ่มเพื่อให้อยู่ในกลุ่มเดียวกัน
                  value={option.value}
                  // เช็คว่าค่าใน state ตรงกับ value ของปุ่มนี้หรือไม่
                  checked={doorMode === option.value}
                  // เมื่อมีการเปลี่ยนแปลง (คลิก) ให้ set ค่าใหม่ลง state
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
                onClick={() => handleToggleBet(index)} // เมื่อคลิกให้เรียกฟังก์ชันสลับสถานะ
                className={`
                  text-black font-semibold px-4 py-2 rounded-lg shadow animate-pop-in
                  ${bet.selected ? 'bg-yellow-300' : 'bg-gray-300 text-gray-500 line-through'}
                `}
              >
                {bet.value}
              </button>
            ))}
          </div>
        )}
        {(subTab === "2d" || subTab === "3d") && (
          <div className="">
            <button
              className="mb-2 px-4 py-2 bg-black text-white font-bold rounded-md hover:cursor-pointer hover:bg-yellow-300 hover:text-black"
              onClick={() => handcleAddDoubleAndTripleNumber(subTab)}
            >
              + เพิ่มเลขเบิ้ล / เลขตอง
            </button>
          </div>
        )}
        {/* handcleAddDoubleAndTripleNumber */}

        {/* --- แถวใส่เลขและราคา --- */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <label htmlFor="numberInput">ใส่เลข</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="border rounded-md p-2 w-18"
            value={number}
            onChange={(e) => handleNumberChange(e, subTab)} // ใช้ฟังก์ชันเดิมได้เลย
          />

          {(subTab === "2d" || subTab === "3d") && (
            <button
              className="px-4 py-2 bg-black text-white rounded-md hover:cursor-pointer hover:bg-yellow-400 hover:text-black"
              onClick={handleClickReverseNumbers}
            >
              กลับเลข
            </button>
          )}

          <label htmlFor="priceTop" className="">
            ใส่ราคา{" "}
            <span className="font-bold text-green-600">
              {subTab === "3d" ? "ตรง" : "บน"}
            </span>
          </label>
          <input
            id="priceTop"
            inputMode="numeric"
            pattern="[0-9]*"
            type="text"
            className="border rounded-md p-2 w-20"
            value={priceTop}
            onChange={(e) => handleChangePriceTopAndBottom(e, "priceTop")}
          />

          <label htmlFor="priceBottom" className="font-bold text-red-500">
            {subTab === "3d" ? "โต๊ด" : "ล่าง"}
          </label>
          <input
            id="priceBottom"
            type="text"
            className="border rounded-md p-2 w-20"
            value={priceBottom}
            onChange={(e) => handleChangePriceTopAndBottom(e, "priceBottom")}
          />

          <button
            className="px-4 py-2 bg-black text-white rounded-md hover:cursor-pointer hover:bg-yellow-400 hover:text-black"
            onClick={() => {
              if (!bahtPer || Number(bahtPer) === 0) {
                alert("กรุณาเลือกอัตราจ่าย");
                return; // หยุดการทำงานของฟังก์ชันทันที
              }

              if (bets.length <= 0) {
                alert("กรุณใส่เลขก่อน");
                return;
              }

              if ((priceTop.trim() === "" || priceTop.trim() === "0") && (priceBottom.trim() === "" || priceBottom.trim() === "0")) {
                alert("กรุณาใส่ราคา บน หรือ ล่าง ก่อนเพิ่มบิล");
                return;
              }



              const currentBetTypes = subTab;
              const selectedBets = bets
              .filter(bet => bet.selected) // กรองเอาเฉพาะที่ selected เป็น true
              .map(bet => bet.value);  

              if (selectedBets.length === 0) {
                alert("กรุณาเลือกตัวเลขที่ต้องการเพิ่มบิล");
                return;
              } 
              const TotalBets =  bets.length * (Number(priceTop) + Number(priceBottom)); 
              // const TotalBets = selectedBets.length * (Number(priceTop) + Number(priceBottom));
              handleAddBillBets(
              selectedBets,
              currentBetTypes,
              bahtPer,
              Number(priceTop),
              Number(priceBottom),
              TotalBets,
              "username007"
            );
          }}
          >
            เพิ่มบิล
          </button>
        </div>

        {/* --- ส่วนของตารางที่แสดงรายการบิล --- */}
        {/* <div className="space-y-50">
          {bill.map((entry, index) => (
            <CardBillForBets
              key={index}
              bets={entry.bets}
              betType={entry.betTypes}
              bahtPer={entry.bahtPer}
              priceTop={entry.priceTop}
              priceBottom={entry.priceBottom}
              entryIndex={index}
              onRemove={handleRemoveEntry} 
              onEdit={handleEditEntry}
              // addBy={entry.addBy}
            />
          ))}
        </div> */}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="memo" className="text-lg">บันทึกช่วยจำ</label>
            <input
              id="memo"
              type="text"
              className="border rounded-md p-2 min-w-50 w-70"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="text-lg font-bold ml-10">
            ยอดรวม <span className="text-red-500">{total.toLocaleString('en-US')}</span> (บาท)
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            className="px-6 py-2 border border-blue-500 text-blue-500 rounded-md font-semibold hover:cursor-pointer"
            onClick={() => handleClearBets}
          >
            ล้างตาราง
          </button>
          <button className="px-6 py-2 bg-blue-500 text-white rounded-md font-semibold hover:cursor-pointer" onClick={handleSaveBill}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
};

export default LottoFormPage_old;



// // src/pages/LottoFormPage.tsx
// import React, { useState, useEffect, useCallback } from "react"; // ✅ 1. เพิ่ม useCallback
// import { useParams, useLocation, useNavigate } from "react-router-dom";
// import {
//   generate6Glab,
//   generate19Doors,
//   reverseNumbers,
//   getNumble,
//   generateBillRef,
//   formatFullThaiDate,
// } from "../services/BetService";
// import CardBillForBets from "../components/CardBillForBets";
// import RateDisplayCard from "../components/RateDisplayCard";
// import SpecialNumbersCard from "../components/SpecialNumbersCard";
// import { useAuth } from "../contexts/AuthContext";

// interface BetNumber {
//   value: string;
//   selected: boolean;
// }

// interface BillEntry {
//   bets: string[];
//   betTypes: string;
//   bahtPer: number;
//   priceTop: number;
//   priceTote: number;   
//   priceBottom: number;  
//   total: number;
//   addBy: string;
// }

// //สำหรับดึงข้อมูล lotto_type
// interface LottoTypeDetails {
//   id: number;
//   name: string;
//   rate_3_top: string;
//   rate_3_tote: string;
//   rate_3_bottom: string;
//   rate_2_top: string;
//   rate_2_bottom: string;
//   rate_run_top: string;
//   rate_run_bottom: string;
//   betting_start_time: string;
//   betting_cutoff_time: string;
//   generation_strategy: string;
//   // เพิ่ม field อื่นๆ ที่อาจมีค่าเป็น null
//   interval_minutes: number | null;
//   monthly_fixed_days: number[] | null;
//   monthly_floating_dates: any | null;
//   specific_days_of_week: number[] | null;
//   betting_skip_start_day: number;
// }

// //Interface สำหรับเก็บข้อมูลของ Round
// interface LottoRoundDetails {
//   name: string;
//   lottoDate: string;
//   lottoTime: string;
//   fullCutoffDatetime: string;
//   lotto_type_id: string; // <-- ตัวแปรเป้าหมายของเรา
// }

// interface SpecialNumbers {
//   closed_numbers: string[];
//   half_pay_numbers: string[];
// }

// const LottoFormPage = () => {
//   const { user } = useAuth();

//   const { lottoId } = useParams();
//   const location = useLocation(); // location ยังคงมีประโยชน์หากต้องการใช้ข้อมูลอื่นในอนาคต
//   const navigate = useNavigate();

//   const [currentTime, setCurrentTime] = useState<Date | null>(null);

//   const [specialNumbers, setSpecialNumbers] = useState<SpecialNumbers | null>(null);

//   const [priceTote, setPriceTote] = useState("0");
//   // State สำหรับจัดการว่าแท็บไหนถูกเลือกอยู่
//   const [activeTab, setActiveTab] = useState("fast");
//   const [subTab, setSubTab] = useState("2d");
//   const [note, setNote] = useState("");
//   const [canNote, setCanNote] = useState(false);

//   //สร้าง State สำหรับเก็บข้อมูล Round และสถานะ Loading
//   const [roundDetails, setRoundDetails] = useState<LottoRoundDetails | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null); // State สำหรับเก็บข้อความ Error

//   // State สำหรับจัดการข้อมูลในฟอร์ม
//   const [number, setNumber] = useState("");
//   const [bahtPer, setBahtPer] = useState<number>(0);
//   const [priceTop, setPriceTop] = useState("0");
//   const [priceBottom, setPriceBottom] = useState("0");
//   const [total, setTotal] = useState<number>(0);

//   const [bets, setBets] = useState<BetNumber[]>([]);
//   const [doorMode, setDoorMode] = useState("all");
//   const doorOptions = [
//     { value: "all", label: "19-ประตู" },
//     { value: "front", label: "รูด-หน้า" },
//     { value: "back", label: "รูด-หลัง" },
//   ];

//   const [bill, setBill] = useState<BillEntry[]>([]);

//   const [lottoTypeDetails, setLottoTypeDetails] = useState<LottoTypeDetails | null>(null);

//   useEffect(() => {
//     const loadRoundData = async () => {
//       // 1. ตรวจสอบว่ามี lottoId ใน URL หรือไม่
//       if (!lottoId) {
//         setIsLoading(false);
//         setError("ไม่พบ ID ของงวดหวยใน URL");
//         return;
//       }
      
//       setIsLoading(true);
//       setError(null);
//       try {
//         // 2. Fetch ข้อมูลจาก API โดยใช้ lottoId โดยตรง
//         const response = await fetch(`http://localhost:3001/api/lotto-rounds/${lottoId}`);
//         if (!response.ok) {
//           const errorData = await response.json();
//           throw new Error(errorData.error || "ไม่พบข้อมูลงวดหวย");
//         }
//         const data = await response.json();
        
//         // 3. ตั้งค่า State ด้วยข้อมูลที่ได้จาก API ซึ่งมี lotto_type_id อยู่ด้วยเสมอ
//         setRoundDetails({
//           name: data.round.name,
//           lottoDate: new Date(data.cutoff_datetime).toLocaleDateString('th-TH'),
//           lottoTime: new Date(data.cutoff_datetime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
//           fullCutoffDatetime: data.round.cutoff_datetime,  
//                 lotto_type_id: data.round.lotto_type_id,  
//         });

//         setCurrentTime(new Date(data.serverTime));

//       } catch (err: any) {
//         console.error(err);
//         setRoundDetails(null);
//         setError(err.message); // เก็บข้อความ Error เพื่อนำไปแสดงผล
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     loadRoundData();
//   }, [lottoId]); // ให้ Effect นี้ทำงานใหม่ทุกครั้งที่ lottoId ใน URL เปลี่ยนไป


//   useEffect(() => {
//     // ถ้ายังไม่มีเวลาตั้งต้น หรือข้อมูล round ให้หยุดทำงาน
//     if (!currentTime || !roundDetails?.fullCutoffDatetime) return;

//     // สร้าง interval เพื่อ "เดินนาฬิกา" ต่อจากเวลาของ Server
//     const interval = setInterval(() => {
//         setCurrentTime(prevTime => new Date(prevTime!.getTime() + 1000));
//     }, 1000);

//     return () => clearInterval(interval);

// }, [currentTime, roundDetails]); 


//   // useEffect สำหรับเช็คเมื่อหมดเวลา
//   useEffect(() => {
//       if (currentTime && roundDetails?.fullCutoffDatetime) {
//           const cutoffDate = new Date(roundDetails.fullCutoffDatetime);
//           if (currentTime >= cutoffDate) {
//               alert("หมดเวลาซื้อแล้ว ระบบจะนำท่านกลับสู่หน้าหลัก");
//               navigate('/');
//           }
//       }
//   }, [currentTime, roundDetails, navigate]);

//   // useEffect นี้จะแสดงให้เห็นว่า lotto_type_id ถูกเก็บใน state แล้ว
//   useEffect(() => {
//     if (roundDetails) {
//       console.log("✅ Lotto Type ID ที่ดึงมาได้ทันทีคือ:", roundDetails.lotto_type_id);
//     }
//   }, [roundDetails]);


//   useEffect(() => {
//     const totalBets = bill.reduce((sum, entry) => sum + entry.total, 0);
//     setTotal(totalBets);
//   }, [bill]);


//   useEffect(() => {
//     const fetchLottoTypeData = async () => {
//       // ตรวจสอบให้แน่ใจว่ามี roundDetails และ lotto_type_id ก่อนที่จะ fetch
//       if (roundDetails && roundDetails.lotto_type_id) {
//         try {
//           console.log(`กำลังดึงข้อมูลสำหรับ lotto_type_id: ${roundDetails.lotto_type_id}`);
//           const response = await fetch(`http://localhost:3001/api/lotto-types/${roundDetails.lotto_type_id}`);
//           if (!response.ok) {
//             throw new Error('ไม่สามารถดึงข้อมูลรายละเอียดประเภทหวยได้');
//           }
//           const typeData: LottoTypeDetails = await response.json();
//           setLottoTypeDetails(typeData);
//           console.log("✅ ดึงข้อมูล Lotto Type Details สำเร็จ:", typeData);
//         } catch (err: any) {
//           console.error("เกิดข้อผิดพลาดในการดึงข้อมูล Lotto Type:", err.message);
//           setLottoTypeDetails(null); // เคลียร์ค่าหากเกิดข้อผิดพลาด
//         }
//       }
//     };

//     fetchLottoTypeData();
//   }, [roundDetails]); // Dependency array คือ [roundDetails] หมายความว่า effect นี้จะทำงานทุกครั้งที่ state roundDetails เปลี่ยน

  

// const fetchSpecialNumbers = useCallback(async () => {
//     handleClearInputs();
//     if (lottoId) {
//       try {
//         const response = await fetch(`http://localhost:3001/api/lotto-rounds/${lottoId}/number-special`);
//         if (!response.ok) {
//           if (response.status === 404) {
//             setSpecialNumbers({ closed_numbers: [], half_pay_numbers: [] });
//           } else {
//             throw new Error('ไม่สามารถดึงข้อมูลเลขพิเศษได้');
//           }
//           return;
//         }
//         const data: SpecialNumbers = await response.json();
//         setSpecialNumbers(data);
//       } catch (err: any) {
//         console.error("เกิดข้อผิดพลาดในการดึงข้อมูลเลขพิเศษ:", err.message);
//         setSpecialNumbers(null);
//       }
//     }
//   }, [lottoId]); // ฟังก์ชันนี้จะถูกสร้างใหม่เมื่อ lottoId เปลี่ยน

//   // เรียกใช้ fetchSpecialNumbers ครั้งแรก
//   useEffect(() => {
//     fetchSpecialNumbers();
//   }, [fetchSpecialNumbers]);


//   // ... (ฟังก์ชัน handleSaveBill และฟังก์ชันอื่นๆ ยังคงเหมือนเดิม)
//   const handleSaveBill = async () => {
//     if (bill.length === 0) {
//       alert("ยังไม่มีการเพิ่มบิล โปรดเพิ่มบิลก่อนบันทึกรายการ");
//       return;
//     }
    
//     if (note === '' && !canNote) {
//       const isConfirmed = window.confirm("คุณยังไม่ได้ใส่ข้อมูลบันทึกช่วยจำ ต้องการดำเนินการต่อหรือไม่?");
//       if (!isConfirmed) {
//         return;
//       }
//     }

//     if (!roundDetails) {
//       alert("ยังไม่มีข้อมูลหวย ระบบกำลังดึงข้อมูล กรุณารอสักครู่... แล้วค่อยกดบันทึกใหม่อีกครั้ง");
//       return;
//     }
    
//     const payload = {
//       billRef: generateBillRef(20),
//       userId: user?.id,
//       lottoRoundId: Number(lottoId),
//       note: note,
//       totalAmount: total,
//       betName: roundDetails.name,
//       billLottoDraw: roundDetails.fullCutoffDatetime,
//       billEntries: bill,
//     };
    
//     try {
//       const response = await fetch("http://localhost:3001/api/savebills", {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });

//       const result = await response.json();
//       if (!response.ok) {
//         throw new Error(result.error || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ');
//       }

//       alert(result.message);
//       handleClearBill();
//     } catch (err: any) {
//       alert(`เกิดข้อผิดพลาด: ${err.message}`);
//     }
//   };

//   const handleClearInputs = () => { 
//     setBets([]);   
//     setPriceTop("0");
//     setPriceTote("0"); 
//     setPriceBottom("0");
//     setNumber("");
//   };

//   const handleClearBill = () => {
//     setBill([]);
//     setTotal(0);
//     setSubTab("2d");
//     setActiveTab("fast");
//     setBahtPer(0); 
//     setPriceTop("0");
//     setPriceBottom("0");
//     setPriceTote("0"); 
//     setNote("");
//     setCanNote(false);
//   }

//   const handleAddBillEntry = () => {
//     if (bets.length === 0) { alert("กรุณาใส่เลขหวยก่อนทำการเพิ่มบิล"); return; }
//     if (priceTop === "0" && priceTote === "0" && priceBottom === "0") { alert("กรุณาใส่ราคาอย่างน้อย 1 ช่อง"); return; }

//     const selectedBets = bets.filter(bet => bet.selected).map(bet => bet.value);
//     if (selectedBets.length === 0) { alert("กรุณาเลือกตัวเลขที่ต้องการเพิ่มบิล"); return; }

//     const entryTotal = selectedBets.length * (Number(priceTop) + Number(priceTote) + Number(priceBottom));

//     const newEntry: BillEntry = {
//       bets: selectedBets,
//       betTypes: subTab,
//       bahtPer: bahtPer, // ส่งไปก่อน แต่ backend จะไม่ใช้แล้ว
//       priceTop: Number(priceTop),
//       priceTote: Number(priceTote),
//       priceBottom: Number(priceBottom),
//       total: entryTotal,
//       addBy: `${user?.username || "ไม่พบผู้ใช้"}`,
//     };

//     setBill(prevBill => [...prevBill, newEntry]);
//     handleClearInputs();
//   };

//   const handleEditEntry = (indexToEdit: number) => {
//     const entryToEdit = bill[indexToEdit];
//     const betsToEdit: BetNumber[] = entryToEdit.bets.map(betValue => ({
//       value: betValue,
//       selected: true
//     }));
//     setBets(betsToEdit);
//     setSubTab(entryToEdit.betTypes);
//     setBahtPer(entryToEdit.bahtPer);
//     setPriceTop(String(entryToEdit.priceTop));
//     setPriceBottom(String(entryToEdit.priceBottom));
//     handleRemoveEntry(indexToEdit);
//   }

//   const handleRemoveEntry = (indexToRemove: number) => {
//     setBill(currentBill => 
//       currentBill.filter((_, index) => index !== indexToRemove)
//     );
//   };

  
// const handleClickReverseNumbers = () => {
//   const currentBetValues = bets.map(b => b.value);
//   const reversedList = reverseNumbers(currentBetValues);


//  if (!specialNumbers?.closed_numbers || specialNumbers.closed_numbers.length === 0) {
//     const newBets: BetNumber[] = reversedList.map(value => ({ value, selected: true }));
//     setBets(prevBets => [...prevBets, ...newBets]);
//     return;
//   }


//   const closedNumbers = specialNumbers.closed_numbers;

//   const allowedBets = reversedList.filter(num => !closedNumbers.includes(num));
//   const blockedBets = reversedList.filter(num => closedNumbers.includes(num));

//   // ถ้ามีเลขที่ถูกบล็อก ให้แจ้งเตือนผู้ใช้
//   if (blockedBets.length > 0) {
//     alert(`เลขปิดรับ: ${blockedBets.join(', ')} ถูกตัดออกจากรายการ`);
//   }

//   // เพิ่มเฉพาะเลขที่ไม่ใช่เลขปิดเข้าไปในรายการแทง
//   if (allowedBets.length > 0) {
//     const newBets: BetNumber[] = allowedBets.map(value => ({ value, selected: true }));
//     setBets(prevBets => [...prevBets, ...newBets]);
//   }
// };

  
//   const handleAddDoubleAndTripleNumber = (mode: string) => {
//     // 1. สร้างชุดเลขเบิ้ล/ตองเหมือนเดิม
//     const numbles = getNumble(mode);

//     // 2. ตรวจสอบว่ามีข้อมูลเลขปิดหรือไม่ ถ้าไม่มี ก็เพิ่มทั้งหมดแล้วจบการทำงาน
//     if (!specialNumbers?.closed_numbers || specialNumbers.closed_numbers.length === 0) {
//         const newBets: BetNumber[] = numbles.map(value => ({ value, selected: true }));
//         setBets(prevBets => [...prevBets, ...newBets]);
//         return;
//     }

//     // 3. ถ้ามีเลขปิด ให้ทำการกรอง
//     const closedNumbers = specialNumbers.closed_numbers;

//     const allowedBets = numbles.filter(num => !closedNumbers.includes(num));
//     const blockedBets = numbles.filter(num => closedNumbers.includes(num));

//     // 4. ถ้ามีเลขที่ถูกบล็อก ให้แจ้งเตือนผู้ใช้
//     if (blockedBets.length > 0) {
//         alert(`เลขปิดรับ: ${blockedBets.join(', ')} ถูกตัดออกจากรายการ`);
//     }

//     // 5. เพิ่มเฉพาะเลขที่ไม่ใช่เลขปิดเข้าไปในรายการแทง
//     if (allowedBets.length > 0) {
//         const newBets: BetNumber[] = allowedBets.map(value => ({ value, selected: true }));
//         setBets(prevBets => [...prevBets, ...newBets]);
//     }
// };

//   const handleToggleBet = (indexToToggle: number) => {
//     setBets(currentBets => 
//       currentBets.map((bet, index) => 
//         index === indexToToggle 
//           ? { ...bet, selected: !bet.selected }
//           : bet
//       )
//     );
//   };

//   const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, numberType: string) => {
//     const value = e.target.value;
//     if (/^\d*$/.test(value) && value !== "e") {
//       setNumber(value);

//       const addBet = (betValue: string) => {
//         // 1. ตรวจสอบเลขปิดรับสำหรับเลขเดี่ยว
//         if (specialNumbers?.closed_numbers?.includes(betValue)) {
//           alert(`เลข ${betValue} เป็นเลขปิดรับ ไม่สามารถแทงได้`);
//           setNumber(""); // เคลียร์ช่อง input
//           return; // หยุดการทำงาน
//         }
//         const newBet: BetNumber = { value: betValue, selected: true };
//         setBets((prevData) => [...prevData, newBet]);
//         setNumber("");
//       };

//       const addBetList = (betList: string[]) => {
//         let allowedBets = betList;
//         // 2. ตรวจสอบและกรองเลขปิดรับสำหรับชุดเลข
//         if (specialNumbers?.closed_numbers) {
//           const closed = specialNumbers.closed_numbers;
//           allowedBets = betList.filter(bet => !closed.includes(bet));
//           const blockedBets = betList.filter(bet => closed.includes(bet));

//           if (blockedBets.length > 0) {
//             alert(`เลขปิดรับ: ${blockedBets.join(', ')} ถูกตัดออกจากรายการ`);
//           }
//         }
        
//         // 3. เพิ่มเฉพาะเลขที่ไม่ใช่เลขปิด
//         if (allowedBets.length > 0) {
//             const newBets: BetNumber[] = allowedBets.map(v => ({ value: v, selected: true }));
//             setBets(prevBets => [...prevBets, ...newBets]);
//         }
//         setNumber("");
//       };

//       if (numberType === "2d" && value.length === 2) addBet(value);
//       if (numberType === "3d" && value.length === 3) addBet(value);
//       if (numberType === "run" && value.length === 1) addBet(value);
//       if (numberType === "6d" && value.length === 3) addBetList(generate6Glab(value));
//       if (numberType === "19d" && value.length === 1) addBetList(generate19Doors(value, doorMode));
//     }
//   };

//   const handleChangeSubTap = (nameTab: string) => {
//     if (subTab != nameTab) {
//       setSubTab(nameTab);
//       setBets([]);
//     }
//   };

//   const handlePriceChange = (
//     value: string, 
//     setter: React.Dispatch<React.SetStateAction<string>>
//   ) => {
//     // 1. กรองให้รับเฉพาะตัวเลข 0-9 เท่านั้น
//     const digitsOnly = value.replace(/[^0-9]/g, '');

//     // 2. แปลงเป็นตัวเลขแล้วกลับเป็นสตริงอีกครั้งเพื่อลบ 0 นำหน้า
//     //    ถ้าผู้ใช้ลบหมดจะกลายเป็น "0" ซึ่งตรงกับ state เริ่มต้น
//     const processedValue = String(Number(digitsOnly));

//     // 3. อัปเดต State
//     setter(processedValue);
//   };

//   // --- ส่วนแสดงผล UI ---
//   if (isLoading) {
//     return <div className="text-center p-10">กำลังโหลดข้อมูลงวด...</div>;
//   }

//   if (error) {
//     return <div className="text-center p-10 text-red-500">เกิดข้อผิดพลาด: {error}</div>;
//   }

//   if (!roundDetails) {
//     return <div className="text-center p-10 text-red-500">ไม่พบข้อมูลงวดหวยนี้</div>;
//   }

//   const isThreeDigitMode = subTab === '3d' || subTab === '6d';
//   const showThreeBottomInput = isThreeDigitMode && lottoTypeDetails && Number(lottoTypeDetails.rate_3_bottom) > 0;

//   console.log("number pay half --> " + specialNumbers?.half_pay_numbers);
//   console.log("number closed  --> " + specialNumbers?.closed_numbers);

  

//   return (
//     <div className="space-y-6">
//       {/* ===== ส่วนหัว: ชื่อหวยและเวลา ===== */}
//       <div className="bg-white rounded-lg flex justify-between px-4 py-5 shadow-md items-center">
//         <div className="flex items-center">
//           <h2 className="text-xl font-bold text-gray-800">
//             {roundDetails.name} 
//           </h2>
//         </div>
//         <div className="text-red-400 font-bold text-xl">
//           {/* สังเกตว่า lottoDate ไม่ต้องใช้ formatFullThaiDate แล้ว เพราะเราจัดรูปแบบไว้แล้ว */}
//           {/* สิ้นสุด {`${formatFullThaiDate(roundDetails.lottoDate)} เวลา ${roundDetails.lottoTime}น.`}  */}
       
//           <div className="text-red-400 font-bold text-xl text-center md:text-right">
//               {(() => {
//                   // คำนวณเวลาที่เหลือทุกครั้งที่มีการ render
//                   if (!currentTime || !roundDetails?.fullCutoffDatetime) {
//                       return 'กำลังซิงค์เวลา...';
//                   }

//                   const cutoffDate = new Date(roundDetails.fullCutoffDatetime);
//                   const difference = cutoffDate.getTime() - currentTime.getTime();

//                   if (difference <= 0) {
//                       // เราจะ handle การ redirect ใน effect แยกต่างหากเพื่อความสะอาด
//                       return 'หมดเวลาแล้ว';
//                   }

//                   const days = Math.floor(difference / (1000 * 60 * 60 * 24));
//                   const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//                   const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
//                   const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                  
//                   return `เหลือเวลา: ${days} วัน ${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`;
//               })()}
//           </div>
           
//         </div>
//       </div>

//       {/* ===== ส่วนฟอร์มหลัก ===== */}
//       <div className="bg-white p-4 md:p-6 rounded-lg shadow">
//         {/* --- แถวเลือกอัตราจ่าย และ แท็บหลัก --- */}
//         <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
//           <div className="flex items-center"> 
//             {/* <select
//               id="rate"
//               className="border rounded-md p-2"
//               value={bahtPer}
//               onChange={(event) => {
//                 console.log(event.target.value);
//                 setBahtPer(Number(event.target.value));
//               }}
//             > 
//               <option value={0} disabled>
//                 — กรุณาเลือกอัตราจ่าย —
//               </option>
 
//               {Array.from({ length: 13 }, (_, index) => {
//                 const value = index < 10 ? 100 - index * 1 : 180 - index * 10;
//                 return (
//                   <option key={value} value={value}>
//                     บาทละ {value}
//                   </option>
//                 );
//               })}
//             </select> */}
//           </div>

//           {/* <div className="grid grid-cols-4 md:grid-cols-4 gap-2">
//             <button
//               className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
//                 activeTab === "fast"
//                   ? "bg-yellow-300 text-black"
//                   : "bg-gray-200 text-gray-700"
//               }`}
//               onClick={() => {
//                 setActiveTab("fast");
//               }}
//             >
//               แทงเร็ว
//             </button>
//             <button
//               className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
//                 activeTab === "2d3d"
//                   ? "bg-yellow-300 text-black"
//                   : "bg-gray-200 text-gray-700"
//               }`}
//               onClick={() => setActiveTab("2d3d")}
//             >
//               2ตัว/3ตัว
//             </button>
//             <button
//               className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
//                 activeTab === "run"
//                   ? "bg-yellow-300 text-black"
//                   : "bg-gray-200 text-gray-700"
//               }`}
//               onClick={() => setActiveTab("run")}
//             >
//               วิ่ง
//             </button>
//             <button
//               className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
//                 activeTab === "win"
//                   ? "bg-yellow-300 text-black"
//                   : "bg-gray-200 text-gray-700"
//               }`}
//               onClick={() => setActiveTab("win")}
//             >
//               จับวิน
//             </button>
//           </div> */}
//         </div>

//         {/* --- แถวคำอธิบาย และ แท็บรอง --- */}
//         <div className="border-t border-b border-gray-200 py-4 mb-4">
//           {/* ส่วนนี้คุณสามารถแสดงคำอธิบายตาม mainTab ที่เลือกได้ */}
//           <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
//             <button
//               className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
//                 subTab === "2d"
//                   ? "bg-yellow-300 text-black"
//                   : "bg-gray-200 text-gray-700"
//               }`}
//               onClick={() => handleChangeSubTap("2d")}
//             >
//               2 ตัว
//             </button>
//             <button
//               className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
//                 subTab === "3d"
//                   ? "bg-yellow-300 text-black"
//                   : "bg-gray-200 text-gray-700"
//               }`}
//               onClick={() => handleChangeSubTap("3d")}
//             >
//               3 ตัว
//             </button>
//             <button
//               className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
//                 subTab === "6d"
//                   ? "bg-yellow-300 text-black"
//                   : "bg-gray-200 text-gray-700"
//               }`}
//               onClick={() => handleChangeSubTap("6d")}
//             >
//               6 กลับ
//             </button>
//             <button
//               className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
//                 subTab === "19d"
//                   ? "bg-yellow-300 text-black"
//                   : "bg-gray-200 text-gray-700"
//               }`}
//               onClick={() => handleChangeSubTap("19d")}
//             >
//               รูด-19 ประตู
//             </button>
//             <button
//               className={`px-4 py-2 rounded-md font-semibold hover:cursor-pointer ${
//                 subTab === "run"
//                   ? "bg-yellow-300 text-black"
//                   : "bg-gray-200 text-gray-700"
//               }`}
//               onClick={() => handleChangeSubTap("run")}
//             >
//               วิ่ง
//             </button>
//           </div>
//         </div>

//         {subTab === "19d" && (
//           <div className="flex flex-wrap items-center gap-6 mb-4 p-2">
//             {/* 3. ใช้ .map() เพื่อสร้าง Radio Button จาก Array */}
//             {doorOptions.map((option) => (
//               <label
//                 key={option.value}
//                 className="flex items-center space-x-2 cursor-pointer font-semibold"
//               >
//                 <input
//                   type="radio"
//                   name="doorMode" // name ต้องเป็นชื่อเดียวกันทุกปุ่มเพื่อให้อยู่ในกลุ่มเดียวกัน
//                   value={option.value}
//                   // เช็คว่าค่าใน state ตรงกับ value ของปุ่มนี้หรือไม่
//                   checked={doorMode === option.value}
//                   // เมื่อมีการเปลี่ยนแปลง (คลิก) ให้ set ค่าใหม่ลง state
//                   onChange={() => setDoorMode(option.value)}
//                   className="h-5 w-5 text-blue-500 border-gray-300 focus:ring-blue-500"
//                 />
//                 <span>{option.label}</span>
//               </label>
//             ))}
//           </div>
//         )}

//         {bets.length > 0 && (
//           <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
//             {bets.map((bet, index) => (
//               <button
//                 key={index}
//                 onClick={() => handleToggleBet(index)} // เมื่อคลิกให้เรียกฟังก์ชันสลับสถานะ
//                 className={`
//                   text-black font-semibold px-4 py-2 rounded-lg shadow animate-pop-in
//                   ${bet.selected ? 'bg-yellow-300' : 'bg-gray-300 text-gray-500 line-through'}
//                 `}
//               >
//                 {bet.value}
//               </button>
//             ))}
//           </div>
//         )}
//         {(subTab === "2d" || subTab === "3d") && (
//           <div className="">
//             <button
//               className="mb-2 px-4 py-2 bg-black text-white font-bold rounded-md hover:cursor-pointer hover:bg-yellow-300 hover:text-black"
//               onClick={() => handleAddDoubleAndTripleNumber(subTab)}
//             >
//               + เพิ่มเลขเบิ้ล / เลขตอง 
//             </button>
//           </div>
//         )}
//         {/* handcleAddDoubleAndTripleNumber */}

//         {/* --- แถวใส่เลขและราคา --- */}
//         <div className="flex flex-wrap items-center gap-2 mb-4">
//           <label htmlFor="numberInput">ใส่เลข</label>
//           <input
//             type="text"
//             inputMode="numeric"
//             pattern="[0-9]*"
//             className="border rounded-md p-2 w-18"
//             value={number}
//             onChange={(e) => handleNumberChange(e, subTab)} // ใช้ฟังก์ชันเดิมได้เลย
//           />

//           {(subTab === "2d" || subTab === "3d") && (
//             <button
//               className="px-4 py-2 bg-black text-white rounded-md hover:cursor-pointer hover:bg-yellow-400 hover:text-black"
//               onClick={handleClickReverseNumbers}
//             >
//               กลับเลข
//             </button>
//           )}

//                   {/* --- 2 ตัว --- */}
//           {!isThreeDigitMode && (
//               <>
//                   <label className="block text-lg font-medium text-green-600">2 ตัวบน</label>
//                   <div>
//                       <input 
//                           type="text" // เปลี่ยนเป็น text เพื่อการควบคุมที่สมบูรณ์
//                           inputMode="numeric" // แสดงแป้นพิมพ์ตัวเลขบนมือถือ
//                           value={priceTop} 
//                           onChange={(e) => handlePriceChange(e.target.value, setPriceTop)} 
//                           className="border rounded-md p-2 w-28"
//                       />
//                   </div>
//                   <label className="block text-lg font-medium text-red-600">2 ตัวล่าง</label>
//                   <div>
//                       <input 
//                           type="text" 
//                           inputMode="numeric"
//                           value={priceBottom} 
//                           onChange={(e) => handlePriceChange(e.target.value, setPriceBottom)} 
//                           className="border rounded-md p-2 w-28"
//                       />
//                   </div>
//               </>
//           )}

//           {/* --- 3 ตัว --- */}
//           {isThreeDigitMode && (
//               <>
//                       <label className="block text-lg font-medium text-green-600">3 ตัวตรง</label>
//                   <div>
//                       <input 
//                           type="text" 
//                           inputMode="numeric"
//                           value={priceTop} 
//                           onChange={(e) => handlePriceChange(e.target.value, setPriceTop)} 
//                           className="border rounded-md p-2 w-28"
//                       />
//                   </div>
//                       <label className="block text-lg font-medium text-orange-500">3 ตัวโต๊ด</label>
//                   <div>
//                       <input 
//                           type="text" 
//                           inputMode="numeric"
//                           value={priceTote} 
//                           onChange={(e) => handlePriceChange(e.target.value, setPriceTote)} 
//                           className="border rounded-md p-2 w-28"
//                       />
//                   </div>
//                   {/* แสดงช่อง 3 ตัวล่างแบบมีเงื่อนไข */}
//                   {showThreeBottomInput && (
//                       <>
//                           <label className="block text-lg font-medium text-red-600">3 ตัวล่าง</label>
//                         <div>
//                           <input 
//                               type="text" 
//                               inputMode="numeric"
//                               value={priceBottom} 
//                               onChange={(e) => handlePriceChange(e.target.value, setPriceBottom)} 
//                               className="border rounded-md p-2 w-28"
//                           />
//                       </div>
//                       </>
//                   )}
//               </>
//           )}


//           <button
//             className="px-4 py-2 bg-black text-white rounded-md hover:cursor-pointer hover:bg-yellow-400 hover:text-black"
//             onClick={() => {
//               // if (!bahtPer || Number(bahtPer) === 0) {
//               //   alert("กรุณาเลือกอัตราจ่าย");
//               //   return; // หยุดการทำงานของฟังก์ชันทันที
//               // }

//               if (bets.length <= 0) {
//                 alert("กรุณใส่เลขหวยก่อนทำการเพิ่มบิล");
//                 return;
//               }

//               if ((priceTop.trim() === "" || priceTop.trim() === "0" ) && (priceBottom.trim() === "" || priceBottom.trim() === "0") && (priceTote.trim() === "" || priceTote.trim() === "0")) {
//                 alert("กรุณาใส่ราคาก่อนอย่างน้อย 1 ช่องก่อนทำการเพิ่มบิล");
//                 return;
//               }


//               const currentBetTypes = subTab;
//               const selectedBets = bets
//               .filter(bet => bet.selected) // กรองเอาเฉพาะที่ selected เป็น true
//               .map(bet => bet.value);  

//               if (selectedBets.length === 0) {
//                 alert("กรุณาเลือกตัวเลขที่ต้องการเพิ่มบิล");
//                 return;
//               } 

//               const TotalBets = selectedBets.length * (Number(priceTop) + Number(priceBottom));
 
//               // const TotalBets = selectedBets.length * (Number(priceTop) + Number(priceBottom));
//               handleAddBillEntry();
//           }}
//           >
//             เพิ่มบิล
//           </button>
          
//         </div>

//         {/* --- ส่วนของตารางที่แสดงรายการบิล --- */}
//         <div className="space-y-2">
//           {bill.map((entry, index) => (
//             <CardBillForBets
//               key={index}
//               bets={entry.bets}
//               betType={entry.betTypes}
//               bahtPer={entry.bahtPer}
//               priceTop={entry.priceTop}
//               priceTote={entry.priceTote} // ส่ง prop ใหม่
//               priceBottom={entry.priceBottom}
//               entryIndex={index}
//               onRemove={handleRemoveEntry} 
//               onEdit={handleEditEntry}
//             />
//           ))}
//         </div>

//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2"> 
//             <label htmlFor="memo" className="text-lg">บันทึกช่วยจำ</label>
//             <input
//               id="memo"
//               type="text"
//               className="border rounded-md p-2 min-w-50 w-70"
//               value={note}
//               onChange={(e) => setNote(e.target.value)}
//             />
//           </div>

//           <div className="text-lg font-bold ml-10">
//             ยอดรวม <span className="text-red-500">{total.toLocaleString('en-US')}</span> (บาท)
//           </div>
//         </div>

//         <div className="flex justify-center gap-4 mt-6">
//           <button
//             className="px-6 py-2 border border-blue-500 text-blue-500 rounded-md font-semibold hover:cursor-pointer"
//             onClick={() => handleClearInputs()}
//           >
//             ล้างตาราง
//           </button>
//           <button className="px-6 py-2 bg-blue-500 text-white rounded-md font-semibold hover:cursor-pointer" onClick={handleSaveBill}>
//             บันทึก
//           </button>
//         </div> 
//       </div>
//       <div className="flex flex-col lg:flex-row gap-6">
//     <RateDisplayCard details={lottoTypeDetails} /> 

//     <SpecialNumbersCard 
//         lottoId={lottoId} 
//         specialNumbers={specialNumbers} 
//         onUpdate={fetchSpecialNumbers}
//     />
// </div>
//     </div>
//   );
// };

// export default LottoFormPage;
