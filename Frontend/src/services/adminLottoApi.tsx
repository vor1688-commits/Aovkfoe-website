import axios from 'axios';

// ตั้งค่า URL หลักของ API ของคุณ
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/admin';

// Interface สำหรับข้อมูลประเภทหวย
export interface LottoTypeForAdmin {
  id: number;
  name: string;
  rate_3_top: number;
  rate_3_tote: number;
  rate_2_top: number;
  rate_2_bottom: number;
  rate_run_top: number;
  rate_run_bottom: number;
  betting_start_time: string; // "HH:mm:ss"
  betting_cutoff_time: string; // "HH:mm:ss"
  generation_strategy: 'Daily' | 'Weekly' | 'Monthly' | string;
}

// Type สำหรับข้อมูลในฟอร์ม
export type LottoTypeForAdminFormData = Omit<LottoTypeForAdmin, 'id'>;

// Object ที่รวมฟังก์ชันเรียก API ทั้งหมด
export const adminLottoApi = {
  async getAll(): Promise<LottoTypeForAdmin[]> {
    const response = await axios.get<LottoTypeForAdmin[]>(`${API_URL}/lotto-types`);
    return response.data;
  },
  async create(data: LottoTypeForAdminFormData): Promise<LottoTypeForAdmin> {
    const response = await axios.post<LottoTypeForAdmin>(`${API_URL}/lotto-types`, data);
    return response.data;
  },
  async update(id: number, data: LottoTypeForAdminFormData): Promise<LottoTypeForAdmin> {
    const response = await axios.put<LottoTypeForAdmin>(`${API_URL}/lotto-types/${id}`, data);
    return response.data;
  },
  async delete(id: number): Promise<any> {
    const response = await axios.delete(`${API_URL}/lotto-types/${id}`);
    return response.data;
  },
};