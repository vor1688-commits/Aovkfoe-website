export interface User {
  id: number;
  username: string;
  role: 'user' | 'admin' | 'owner';
}

export interface LottoType {
  id: number;
  name: string;
  // ... field อื่นๆ ของ lotto type
}

// เพิ่ม interface นี้เข้าไป
export interface LottoRound {
  id: number;
  name: string;
  open_datetime: string;
  cutoff_datetime: string;
  status: string;
  closed_numbers: string[];
  half_pay_numbers: string[];
  lotto_type_id: number;
}