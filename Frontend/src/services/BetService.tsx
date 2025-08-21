import { nanoid } from "nanoid";

/**
 * ฟังก์ชันสำหรับสร้างเลข "6 กลับ" จากเลข 3 หลัก
 * @param threeDigitNumber - string ของตัวเลข 3 หลัก เช่น "123"
 * @returns Array ของ string ที่เป็นเลขทั้งหมด 6 รูปแบบ (หรือน้อยกว่าถ้ามีเลขซ้ำ)
 */
export const generate6Glab = (threeDigitNumber: string): string[] => {
  // ตรวจสอบข้อมูลนำเข้า
  if (typeof threeDigitNumber !== 'string' || threeDigitNumber.length !== 3) {
    console.error("กรุณาใส่ตัวเลข 3 หลักในรูปแบบ string");
    return [];
  }

  // แยกตัวเลขแต่ละหลัก
  const [a, b, c] = threeDigitNumber;

  // สร้างเลขทุกชุดที่เป็นไปได้
  const allPermutations = [
    `${a}${b}${c}`, `${a}${c}${b}`,
    `${b}${a}${c}`, `${b}${c}${a}`,
    `${c}${a}${b}`, `${c}${b}${a}`,
  ];

  // ใช้ Set เพื่อกรองเอาเฉพาะเลขที่ไม่ซ้ำกัน แล้วแปลงกลับเป็น Array
  const uniquePermutations = Array.from(new Set(allPermutations));

  return uniquePermutations;
};
 

// คุณสามารถเพิ่มฟังก์ชันอื่นๆ ที่เกี่ยวกับการคำนวณหวยไว้ในไฟล์นี้ได้อีกในอนาคต
// export const someOtherFunction = () => { ... };
/**
 * @param digit - string ของตัวเลข 1 หลัก เช่น "1"
 * @param mode - รูปแบบการสร้าง 'front', 'back', หรือ 'all'
 * @returns Array ของ string ที่เป็นเลข 2 หลัก
 * */
export const generate19Doors = (
  digit: string,
  mode: string = 'all',
): string[] => {
  // 1. ตรวจสอบข้อมูลนำเข้า
  if (typeof digit !== 'string' || digit.length !== 1 || isNaN(parseInt(digit, 10))) {
    console.error("กรุณาใส่ตัวเลข 1 หลักในรูปแบบ string เช่น '1' หรือ '7'");
    return [];
  }

  const frontNumbers: string[] = [];
  const backNumbers: string[] = [];

  // 2. สร้างเลขที่เป็นไปได้ทั้งหมด
  for (let i = 0; i < 10; i++) {
    // สร้างชุดเลขที่ input อยู่ด้านหน้า (รูดหน้า)
    frontNumbers.push(`${digit}${i}`); // เช่น 10, 11, 12, ... , 19

    // สร้างชุดเลขที่ input อยู่ด้านหลัง (รูดหลัง)
    backNumbers.push(`${i}${digit}`); // เช่น 01, 11, 21, ... , 91
  }

  // 3. คืนค่าตาม mode ที่เลือก
  switch (mode) {
    case 'front':
      return frontNumbers; // คืนค่าเฉพาะชุดเลขที่ input อยู่หน้า
    case 'back':
      return backNumbers; // คืนค่าเฉพาะชุดเลขที่ input อยู่หลัง
    case 'all':
      // รวมทั้งสองชุด และใช้ Set เพื่อกำจัดตัวที่ซ้ำกัน (เช่น "11")
      const allNumbers = [...frontNumbers, ...backNumbers];
      return Array.from(new Set(allNumbers));
    default:
      // กรณีใส่ mode มาไม่ถูกต้อง ให้คืนค่าเป็น array ว่าง
      return [];
  }
};
 
export const reverseNumbers = (numbers: string[]): string[] => {
  // ตรวจสอบว่าข้อมูลที่รับมาเป็น Array หรือไม่
  if (!Array.isArray(numbers)) {
    console.error("ข้อมูลที่ส่งเข้ามาต้องเป็น Array เท่านั้น");
    return [];
  }

  // ใช้ .map() เพื่อวนลูปและจัดการแต่ละตัวเลข
  return numbers.map(numStr => 
    numStr
      .split('')  // 1. แยก string เป็น Array ของตัวอักษร: "123" -> ['1', '2', '3']
      .reverse()  // 2. กลับด้าน Array: ['1', '2', '3'] -> ['3', '2', '1']
      .join('')   // 3. รวม Array กลับเป็น string: ['3', '2', '1'] -> "321"
  );
};
 

export const getNumble = (mode:string): string[] => {
  const numberList:string[] = [];
  for(let i=0; i<10; i++){
    const doubleNumber = `${i}${i}`; 
    const finalNumber = (mode==='3d')? `${doubleNumber}${i}`:doubleNumber;
    numberList.push(finalNumber)
  }
  return numberList;
}

export const getBetTypeName = (betType: string): string => {
  if (betType.includes('2d')) {
    return '2ตัว';
  } else if (betType.includes('3d')) {
    return '3ตัว';
  } else if (betType.includes('6d')) {
    return '3ตัว';
  } else if (betType.includes('19d')) {
    return '2ตัว';
  } else if (betType.includes('run')) {
    return 'วิ่ง';
  }
  
  // คืนค่าเดิมถ้าไม่ตรงกับเงื่อนไขไหนเลย
  return betType; 
};

export const generateBillRef = (length: number = 20): string => {
  return nanoid(length);
}; 
/**
 * สร้าง string วันที่ในรูปแบบ YYYY-MM-DD
 * @param options - อ็อบเจกต์สำหรับปรับเปลี่ยนวันที่จากวันปัจจุบัน
 * @param options.years - จำนวนปีที่จะบวกหรือลบ (เช่น 1, -1)
 * @param options.months - จำนวนเดือนที่จะบวกหรือลบ (เช่น 2, -3)
 * @param options.days - จำนวนวันที่จะบวกหรือลบ (เช่น 7, -14)
 * @returns string วันที่ในรูปแบบ 'YYYY-MM-DD'
 */

export const getDateString = (options: { years?: number; months?: number; days?: number } = {}) => {
  const date = new Date(); // ใช้วันที่ปัจจุบันเป็นค่าเริ่มต้น

  // ปรับเปลี่ยนวันที่ตาม options ที่ได้รับ
  if (options.years) {
    date.setFullYear(date.getFullYear() + options.years);
  }
  if (options.months) {
    date.setMonth(date.getMonth() + options.months);
  }
  if (options.days) {
    date.setDate(date.getDate() + options.days);
  }

  // จัดรูปแบบวันที่ให้เป็น YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};


export const formatDateBasicString = (
    isoString: string | null | undefined, 
    format: 'long' | 'short' = 'short'
): string => {
    // 1. ตรวจสอบว่ามีข้อมูลส่งเข้ามาหรือไม่
    if (!isoString) {
        return "-";
    }

    // 2. ดึงเฉพาะส่วนของวันที่ (YYYY-MM-DD) ออกมา
    const datePart = isoString.split('T')[0];
    const date = new Date(datePart);

    // 3. ตรวจสอบว่าวันที่ถูกต้องหรือไม่
    if (isNaN(date.getTime())) {
        return "วันที่ไม่ถูกต้อง";
    }

    // 4. กำหนด Options สำหรับการแสดงผล (โดยไม่มี weekday)
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: format, // ใช้ 'long' หรือ 'short'
        day: 'numeric',
        timeZone: 'UTC', // ระบุ UTC เพื่อให้แสดงวันที่ตรงกับ String ที่เข้ามา
    };
    
    // 5. แปลงและส่งค่ากลับ
    return date.toLocaleDateString('th-TH', options);
};



export const formatDateString = (
    isoString: string | null | undefined, 
    format: 'long' | 'short' = 'short'
): string => {
    // 1. ตรวจสอบว่ามีข้อมูลส่งเข้ามาหรือไม่
    if (!isoString) {
        return "-"; // หรือ "ไม่มีข้อมูล"
    }

    // 2. ดึงเฉพาะส่วนของวันที่ (YYYY-MM-DD) ออกมา
    const datePart = isoString.split('T')[0];
    const date = new Date(datePart);

    // 3. ตรวจสอบว่าวันที่ถูกต้องหรือไม่
    if (isNaN(date.getTime())) {
        return "วันที่ไม่ถูกต้อง";
    }

    // 4. กำหนด Options สำหรับการแสดงผล
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: format, // ใช้ 'long' หรือ 'short'
        day: 'numeric',
        timeZone: 'UTC', // ระบุ UTC เพื่อให้แสดงวันที่ตรงกับ String ที่เข้ามา
    };
    
    // เพิ่ม weekday เข้าไปถ้าต้องการรูปแบบ 'long'
    if (format === 'long') {
        options.weekday = 'long';
    }

    // 5. แปลงและส่งค่ากลับ
    return date.toLocaleDateString('th-TH', options);
};

/**
 * แปลงสตริงวันที่ (พ.ศ.) ให้เป็นรูปแบบภาษาไทยเต็ม
 * @param {string} dateString - วันที่ในรูปแบบ 'DD/M/YYYY' เช่น '17/7/2568'
 * @param {'long' | 'short'} monthFormat - รูปแบบเดือน ('long' สำหรับ 'กรกฎาคม', 'short' สำหรับ 'ก.ค.')
 * @returns {string} - วันที่ในรูปแบบภาษาไทย เช่น "วันพฤหัสบดีที่ 17 กรกฎาคม พ.ศ. 2568"
 */
export const formatFullThaiDate = (dateString: string, monthFormat: 'long' | 'short' = 'long') => {
  // 1. แยกส่วนของวัน, เดือน, ปี (พ.ศ.) ออกจากสตริง
  const parts = dateString.split('/');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const yearBE = parseInt(parts[2], 10);
 
  const yearAD = yearBE - 543;
 
  const date = new Date(yearAD, month - 1, day);
 
  const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: monthFormat, 
        day: 'numeric',
        calendar: 'buddhist',
    }; 
  const thaiDate = date.toLocaleString('th-TH', options);

  return thaiDate;
} 

export const formatTimeZoneToDate = (
    date: Date, 
    monthFormat: 'long' | 'short' = 'long' // เพิ่มพารามิเตอร์ตัวที่ 2 พร้อมกำหนดค่าดีฟอลต์เป็น 'long'
): string => {
    // 1. ตรวจสอบความถูกต้องของข้อมูล (เหมือนเดิม)
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "วันที่ไม่ถูกต้อง";
    }

    // 2. กำหนด options โดยใช้ monthFormat ที่รับเข้ามา
    const options = {
        year: 'numeric',
        month: monthFormat, // ใช้ค่าจากพารามิเตอร์
        day: 'numeric',
        timeZone: 'Asia/Bangkok'
    } as const;

    // 3. แปลงวันที่ตาม options ที่กำหนด
    return date.toLocaleDateString('th-TH', options);
}


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

// สร้าง Type ที่ชัดเจนสำหรับพารามิเตอร์เพื่อป้องกันการใส่ค่าผิด
export type BetDimension = '2d' | '3d' | '6d' | '19d' | 'run';
export type BetStyle = 'บน' | 'ล่าง' | 'โต๊ด' | 'ตรง';

/**
 * ดึงอัตราจ่ายที่ถูกต้องจากประเภทหวยและรูปแบบการแทงที่กำหนด
 * @param lottoTypes - Array ของข้อมูลประเภทหวยทั้งหมด (จาก State)
 * @param lottoName - ชื่อของหวยที่ต้องการค้นหา เช่น "หวยไทย"
 * @param betDimension - รูปแบบการแทง เช่น "3d", "2d", "run"
 * @param betStyle - สไตล์การแทง เช่น "บน", "ล่าง", "โต๊ด"
 * @returns อัตราจ่าย (ตัวเลข) หรือ 0 หากไม่พบข้อมูล
 */
export const getPayoutRate = (
    lottoTypes: LottoType[],
    lottoName: string,
    betDimension: BetDimension,
    betStyle: BetStyle
): number => {
    // 1. ค้นหาประเภทหวยที่ตรงกับชื่อที่ส่งเข้ามา
    const selectedType = lottoTypes.find(type => type.name === lottoName);

    // 2. ถ้าไม่เจอประเภทหวยที่ตรงกัน ให้แจ้งเตือนและ trả về 0
    if (!selectedType) {
        console.warn(`[getPayoutRate] ไม่พบประเภทหวยที่ชื่อ: ${lottoName}`);
        return 0;
    }

    // 3. ตรวจสอบเงื่อนไขและ trả về อัตราจ่ายที่ถูกต้อง
    // กรณีแทงเลข 3 ตัว (3d) หรือ 6 กลับ (6d)
    if (betDimension === '3d' || betDimension === '6d') {
        if (betStyle === 'บน' || betStyle === 'ตรง') {
            return selectedType.rate_3_top;
        }
        if (betStyle === 'ล่าง') {
            return selectedType.rate_3_bottom;
        }
        if (betStyle === 'โต๊ด') {
            return selectedType.rate_3_tote;
        }
    }

    // กรณีแทงเลข 2 ตัว (2d) หรือ 19 ประตู (19d)
    if (betDimension === '2d' || betDimension === '19d') {
        if (betStyle === 'บน') {
            return selectedType.rate_2_top;
        }
        if (betStyle === 'ล่าง') {
            return selectedType.rate_2_bottom;
        }
    }

    // กรณีแทงเลขวิ่ง (run)
    if (betDimension === 'run') {
        if (betStyle === 'บน') {
            return selectedType.rate_run_top;
        }
        if (betStyle === 'ล่าง') {
            return selectedType.rate_run_bottom;
        }
    }

    // ถ้าไม่เข้าเงื่อนไขใดๆ เลย
    console.warn(`[getPayoutRate] ไม่พบอัตราจ่ายสำหรับ: ${lottoName}, ${betDimension}, ${betStyle}`);
    return 0;
};


// src/services/BetService.ts

// ... (โค้ดเดิมของคุณทั้งหมด) ...

// --- Centralized Type Definitions ---

export interface Order {
  id: number;
  billRef: string;
  createdAt: string;
  lottoName: string;
  itemCount: number;
  totalAmount: number;
  returnedAmount: number;  
  netAmount?: number;
  status: 'ยืนยันแล้ว' | 'ยกเลิก' | 'รอผล';
  username: string;
  note: string | null;
  bill_lotto_draw: string | null;
  hasHalfRateItem?: boolean;
}

export interface OrderX {
  id: number;
  billRef: string;
  createdAt: string;
  lottoName: string;
  itemCount: number;
  totalAmount: number;
  returnedAmount: number;  
  netAmount?: number;
  status: 'ยืนยันแล้ว' | 'ยกเลิก' | 'รอผล';
  username: string;
  note: string | null;
  billLottoDraw: string | null;
  hasHalfRateItem?: boolean;
}

export interface BetItem {
  id: number;
  bill_entry_id: number;
  bet_number: string;
  status: string | null;
  price: number;
  bet_style: BetStyle; // ใช้ Type ที่เฉพาะเจาะจง
  rate: number;
  payout_amount: number;
  baht_per: number;
}

export interface BillEntryDetail {
  id: number;
  bill_id: number;
  bet_type: BetDimension; // ใช้ Type ที่เฉพาะเจาะจง
  total: number;
  items: BetItem[];
}



/**
 * ฟังก์ชันสำหรับแปลงชื่อย่อประเภทการแทงเป็นชื่อเต็มภาษาไทย
 * (เวอร์ชันยืดหยุ่น: รองรับตัวพิมพ์เล็ก/ใหญ่ และการเว้นวรรค)
 * @param betType - ชื่อย่อที่ต้องการแปลง (เช่น '3 Top', '3top', '3Top')
 * @returns ชื่อเต็มภาษาไทย หรือคืนค่าเดิมถ้าไม่รู้จักรูปแบบ
 */
export const translateBetTypeFlexible = (betType: string): string => {
  // Pattern สำหรับจับคู่: (กลุ่มตัวเลข หรือ Run) ตามด้วย (Top, Bottom, Tote)
  // i = case-insensitive (ไม่สนใจตัวพิมพ์เล็ก/ใหญ่)
  const match = betType.match(/(\d+|Run)\s*(Top|Bottom|Tote)/i);

  // ถ้าไม่ตรงกับรูปแบบที่กำหนด ให้คืนค่าเดิมกลับไป
  if (!match) {
    return betType;
  }

  // match[1] คือส่วนแรก (เช่น "3", "Run")
  // match[2] คือส่วนที่สอง (เช่น "Top", "Bottom") ทำให้เป็นตัวพิมพ์เล็กทั้งหมดเพื่อเทียบ
  const typePart = match[1];
  const directionPart = match[2].toLowerCase();

  // การกำหนด Type ให้ directionMap จะช่วยแก้ Error ที่สอง
  const directionMap: Record<string, string> = {
    top: 'บน',
    bottom: 'ล่าง',
    tote: 'โต๊ด',
  };

  const translatedDirection = directionMap[directionPart];

  // กรณีเป็นเลขวิ่ง (Run) จะไม่มีคำว่า "ตัว"
  if (typePart.toLowerCase() === 'run') {
    return `วิ่ง${translatedDirection}`;
  }

  // กรณีอื่นๆ ให้ประกอบร่างเป็น "X ตัว Y"
  return `${typePart} ตัว ${translatedDirection}`;
};



export const generatePermutations = (input: string): string[] => {
  if (input.length !== 3) return [input];

  const chars = input.split('');
  // ใช้ Set เพื่อป้องกันเลขซ้ำในกรณีที่มีเลขเหมือนกัน (เช่น 112)
  const permutations = new Set<string>();

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        if (i !== j && j !== k && i !== k) {
          permutations.add(`${chars[i]}${chars[j]}${chars[k]}`);
        }
      }
    }
  }
  return Array.from(permutations);
};



export const getDatePart = (isoString: string | null | undefined): string => {
    if (!isoString) {
        return "ไม่มีข้อมูล"; // หรือค่าว่าง '' ตามที่คุณต้องการ
    }
    // ใช้ .split('T') เพื่อแยกวันที่ออกจากเวลา และดึงเฉพาะส่วนแรก (วันที่)
    return isoString.split('T')[0];
};


 

export const formatDateToDDMMYYYY = (isoString: string | null | undefined): string => {
    if (!isoString || typeof isoString !== 'string' || !isoString.includes('-')) {
      return 'วว/ดด/ปปปป'; // ข้อความเริ่มต้น
    }
    const [year, month, day] = isoString.split('-');
    return `${day}/${month}/${year}`;
};