import React, { useState, useEffect, useCallback } from 'react'; 
import { ChevronDownIcon, CheckCircleIcon, XCircleIcon, PencilSquareIcon, PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { FullScreenLoader } from '../components/LoadingScreen';
import { translateBetTypeFlexible } from '../services/BetService';
import { useModal } from '../components/Modal';
import api from '../api/axiosConfig';
 

// --- Interfaces ---
interface FloatingDate {
    day: number;
    month: number;
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
    betting_start_time: string | null;
    betting_cutoff_time: string | null;
    generation_strategy: string | null;
    interval_minutes: number | null;
    monthly_fixed_days: number[] | null;
    monthly_floating_dates: FloatingDate[] | null;
    specific_days_of_week: number[] | null;
    betting_skip_start_day: number;
}

type LottoTypeFormData = Omit<LottoType, 'id' | 'monthly_fixed_days' | 'specific_days_of_week' | 'monthly_floating_dates'> & {
    id?: number;
    monthly_fixed_days: string;
    specific_days_of_week: string;
    monthly_floating_dates: FloatingDate[];
    open_datetime?: string;
    cutoff_datetime?: string;
};

// --- Constants & Helpers ---
const rateKeys: (keyof Pick<LottoType, 'rate_3_top' | 'rate_3_tote' | 'rate_3_bottom' | 'rate_2_top' | 'rate_2_bottom' | 'rate_run_top' | 'rate_run_bottom'>)[] = [ 'rate_3_top', 'rate_3_tote', 'rate_3_bottom', 'rate_2_top', 'rate_2_bottom', 'rate_run_top', 'rate_run_bottom' ];
const months = [ { name: 'มกราคม', value: 1 }, { name: 'กุมภาพันธ์', value: 2 }, { name: 'มีนาคม', value: 3 }, { name: 'เมษายน', value: 4 }, { name: 'พฤษภาคม', value: 5 }, { name: 'มิถุนายน', value: 6 }, { name: 'กรกฎาคม', value: 7 }, { name: 'สิงหาคม', value: 8 }, { name: 'กันยายน', value: 9 }, { name: 'ตุลาคม', value: 10 }, { name: 'พฤศจิกายน', value: 11 }, { name: 'ธันวาคม', value: 12 } ];
const daysOfWeek = [
    { name: 'วันอาทิตย์', value: 0 },
    { name: 'วันจันทร์', value: 1 },
    { name: 'วันอังคาร', value: 2 },
    { name: 'วันพุธ', value: 3 },
    { name: 'วันพฤหัสบดี', value: 4 },
    { name: 'วันศุกร์', value: 5 },
    { name: 'วันเสาร์', value: 6 },
];
const getDaysInMonth = (month: number) => { if (month === 2) return 29; if ([4, 6, 9, 11].includes(month)) return 30; return 31; };
const handleLimitedNumberArrayChange = (value: string, maxLength: number): string => { const filteredValue = value.replace(/[^0-9, ]/g, ''); const parts = filteredValue.split(/([, ])/); const validatedParts = parts.map(part => { if (!/[, ]/.test(part) && part.length > maxLength) { return part.substring(0, maxLength); } return part; }); return validatedParts.join('').replace(/, +/g, ', ').replace(/,+/g, ',').replace(/ +/g, ' '); };
// const formatDaysOfWeekInput = (value: string): string => { const filteredValue = value.replace(/[^0-6, ]/g, ''); const parts = filteredValue.split(/[\s,]+/).filter(Boolean); const uniqueParts = [...new Set(parts)]; const limitedParts = uniqueParts.slice(0, 7); return limitedParts.join(', '); };

// --- Sub-Components ---

const LottoTypeDisplay: React.FC<{ lottoType: LottoType }> = ({ lottoType }) => {
  // ฟังก์ชัน renderValue ถูกปรับปรุงให้รับ key ของข้อมูลมาด้วย
  // เพื่อให้รู้ว่ากำลังจะแสดงผลข้อมูลช่องไหน
  const { alert, confirm, showStatus, hideStatus } = useModal();
  const renderValue = (
    value: any,
    key?: keyof LottoType
  ) => {
    if (
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      value === ""
    ) {
      return <span className="text-gray-500 italic">ไม่มี</span>;
    }

    if (Array.isArray(value)) {
      // ✨ FIX: เพิ่มเงื่อนไขนี้เพื่อแปลงเลขวันเป็นชื่อวัน
      if (key === "specific_days_of_week") {
        return value
          .map(
            (dayValue) =>
              daysOfWeek.find((d) => d.value === dayValue)?.name || dayValue
          )
          .join(", ");
      }

      if (value.every((item) => typeof item === "object" && item.day && item.month)) {
        return value
          .map(
            (d: FloatingDate) =>
              `วันที่ ${d.day} ${
                months.find((m) => m.value === d.month)?.name || ""
              }`
          )
          .join(" | ");
      }
      return value.join(", ");
    }
    return String(value);
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-md font-semibold text-gray-300 mb-2">
          อัตราจ่าย (Rates)
        </legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
          {rateKeys.map((key) => (
            <div key={key}>
              <label className="label-display">
                {translateBetTypeFlexible(key.replace("rate_", "").replace(/_/g, " "))}
              </label>
              {/* ✨ FIX: ส่ง key เข้าไปใน renderValue */}
              <p className="value-display">{renderValue(lottoType[key], key)}</p>
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-md font-semibold text-gray-300 mb-2">
          ตั้งค่าเวลา (Time Settings)
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <label className="label-display">เวลาเริ่มรับแทง</label>
            <p className="value-display">
              {renderValue(
                lottoType.betting_start_time,
                "betting_start_time"
              )}
            </p>
          </div>
          <div>
            <label className="label-display">เวลาปิดรับแทง</label>
            <p className="value-display">
              {renderValue(
                lottoType.betting_cutoff_time,
                "betting_cutoff_time"
              )}
            </p>
          </div>
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-md font-semibold text-gray-300 mb-2">
          กลยุทธ์การสร้างงวด (Generation Strategy)
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          <div>
            <label className="label-display">เลือกวิธีการสร้างงวดใหม่</label>
            <p className="value-display">
              {renderValue(
                lottoType.generation_strategy,
                "generation_strategy"
              )}
            </p>
          </div>
          <div>
            <label className="label-display">นาที (minutes)</label>
            <p className="value-display">
              {renderValue(lottoType.interval_minutes, "interval_minutes")}
            </p>
          </div>
          <div>
            <label className="label-display">ต้องการเปิดให้ซื้อใหม่หลังจากงวดเก่าปิดกี่วัน</label>
            <p className="value-display">
              {renderValue(
                lottoType.betting_skip_start_day,
                "betting_skip_start_day"
              )}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <label className="label-display">ระบุวันเฉพาะที่ต้องการเปิดให้ซื้อ</label>
              <p className="value-display">
                {/* ✨ FIX: ส่ง key เข้าไปใน renderValue */}
                {renderValue(
                  lottoType.specific_days_of_week,
                  "specific_days_of_week"
                )}
              </p>
            </div>
            <div>
              <label className="label-display">สร้างงวดใหม่ทุกๆวันที่ (ของเดือน)</label>
              <p className="value-display">
                {renderValue(
                  lottoType.monthly_fixed_days,
                  "monthly_fixed_days"
                )}
              </p>
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label-display">วันที่ลอยตัวในการสร้างของเดือน</label>
            <div className="value-display">
              {renderValue(
                lottoType.monthly_floating_dates,
                "monthly_floating_dates"
              )}
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
};

const LottoTypeForm: React.FC<{
  initialData?: LottoType;
  onSave: (data: Partial<LottoTypeFormData>) => void;
  onCancel: () => void;
  onDelete: () => void;
  isSaving: boolean;
}> = ({ initialData, onSave, onCancel, onDelete, isSaving }) => {
  const [formData, setFormData] = useState<Partial<LottoTypeFormData>>({});
  const isCreating = !initialData;
  const { alert, confirm, showStatus, hideStatus } = useModal();

  // State สำหรับเก็บค่าวันที่จะเพิ่มใน dropdown
  const [dayToAdd, setDayToAdd] = useState<string>("0");

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        monthly_fixed_days: initialData.monthly_fixed_days?.join(", ") || "",
        specific_days_of_week:
          initialData.specific_days_of_week?.join(", ") || "",
        monthly_floating_dates: Array.isArray(initialData.monthly_floating_dates)
          ? initialData.monthly_floating_dates
          : [],
      });
    } else {
      setFormData({
        name: "",
        rate_3_top: 0,
        rate_3_tote: 0,
        rate_3_bottom: 0,
        rate_2_top: 0,
        rate_2_bottom: 0,
        rate_run_top: 0,
        rate_run_bottom: 0,
        betting_start_time: "00:00",
        betting_cutoff_time: "00:00",
        generation_strategy: "",
        interval_minutes: null,
        monthly_fixed_days: "",
        monthly_floating_dates: [],
        specific_days_of_week: "",
        betting_skip_start_day: 0,
        open_datetime: "",
        cutoff_datetime: "",
      });
    }
  }, [initialData]);

  const handleFormChange = (
    field: keyof Omit<LottoTypeFormData, "monthly_floating_dates">,
    value: string | number
  ) => {
    if (field === "generation_strategy" && typeof value === "string") {
      setFormData((prev) => ({
        ...prev,
        generation_strategy: value,
        interval_minutes: null,
        specific_days_of_week: "",
        monthly_fixed_days: "",
        monthly_floating_dates: [],
      }));
    } else if (field === "monthly_fixed_days") {
      setFormData((prev) => ({
        ...prev,
        [field]: handleLimitedNumberArrayChange(String(value), 2),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const getDaysArrayFromString = (daysString: string | undefined): string[] => {
    if (!daysString || typeof daysString !== 'string') return [];
    // แก้ไขให้ split ได้ทั้ง comma และช่องว่าง และกรองค่าว่างออก
    return daysString.split(/[\s,]+/).filter(Boolean); 
  };

  // ✨ ฟังก์ชันสำหรับจัดการ "Specific Days of Week"
  const handleAddDayOfWeek = () => {
    const currentDays = getDaysArrayFromString(formData.specific_days_of_week);

    if (!currentDays.includes(dayToAdd)) { 
        const newDays = [...currentDays, dayToAdd]
            .filter(Boolean)
            .sort((a, b) => Number(a) - Number(b)); 
        handleFormChange("specific_days_of_week", newDays.join(', '));
    }
  };

  const handleRemoveDayOfWeek = (dayToRemove: number) => {
    const currentDays = getDaysArrayFromString(formData.specific_days_of_week);

    
     const newDays = currentDays
        .filter((day) => day !== String(dayToRemove))
        .sort((a, b) => Number(a) - Number(b));
    handleFormChange("specific_days_of_week", newDays.join(', '));
  };

  const handleFloatingDateChange = (
    index: number,
    field: "day" | "month",
    value: string
  ) => {
    const updatedDates = [...(formData.monthly_floating_dates || [])];
    const numValue = parseInt(value, 10);
    const currentEntry = { ...updatedDates[index] };
    currentEntry[field] = isNaN(numValue) ? 0 : numValue;
    if (field === "month") {
      const maxDays = getDaysInMonth(currentEntry.month);
      if (currentEntry.day > maxDays) currentEntry.day = maxDays;
    }
    updatedDates[index] = currentEntry;
    setFormData((prev) => ({ ...prev, monthly_floating_dates: updatedDates }));
  };

  const handleAddFloatingDate = () =>
    setFormData((prev) => ({
      ...prev,
      monthly_floating_dates: [
        ...(prev.monthly_floating_dates || []),
        { day: 1, month: 1 },
      ],
    }));
  const handleRemoveFloatingDate = (index: number) =>
    setFormData((prev) => ({
      ...prev,
      monthly_floating_dates: (prev.monthly_floating_dates || []).filter(
        (_, i) => i !== index
      ),
    }));

  // ✨ ตัวแปรช่วยสำหรับ UI ใหม่ของ Specific Days of Week
  const selectedDayValues =
    formData.specific_days_of_week?.split(",").filter(Boolean).map(Number) || [];
  const availableDays = daysOfWeek.filter(
    (day) => !selectedDayValues.includes(day.value)
  );
  
  // ✨ Effect เพื่ออัปเดตค่า default ของ dropdown เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (availableDays.length > 0) {
      setDayToAdd(String(availableDays[0].value));
    }
  }, [selectedDayValues.length, availableDays.length]);
  


  return (
    <div className="space-y-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
      <fieldset>
        <legend className="text-md font-semibold text-gray-300 mb-2">
          ข้อมูลทั่วไป
        </legend>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label-form">ชื่อประเภทหวย</label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => handleFormChange("name", e.target.value)}
              className="input-form"
            />
          </div>
        </div>
      </fieldset>

      {isCreating && (
        <fieldset>
          <legend className="text-md font-semibold text-gray-300 mb-2">
            ตั้งค่างวดแรก
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-form">วันที่เปิดรับ</label>
              <input
                type="datetime-local"
                value={formData.open_datetime || ""}
                onChange={(e) =>
                  handleFormChange("open_datetime", e.target.value)
                }
                className="input-form"
              />
            </div>
            <div>
              <label className="label-form">วันที่ปิดรับ</label>
              <input
                type="datetime-local"
                value={formData.cutoff_datetime || ""}
                onChange={(e) =>
                  handleFormChange("cutoff_datetime", e.target.value)
                }
                className="input-form"
              />
            </div>
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="text-md font-semibold text-gray-300 mb-2">
          อัตราจ่าย (Rates)
        </legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rateKeys.map((key) => (
            <div key={key}>
              <label className="label-form">
                {translateBetTypeFlexible(key.replace("rate_", "").replace(/_/g, " "))}
              </label>
              <input
                type="number"
                value={(formData[key] as number) || 0}
                onChange={(e) =>
                  handleFormChange(key, parseFloat(e.target.value) || 0)
                }
                className="input-form"
              />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-md font-semibold text-gray-300 mb-2">
          ตั้งค่าเวลา (Time Settings)
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-form">เวลาเริ่มรับแทง</label>
            <input
              type="time"
              value={formData.betting_start_time || ""}
              onChange={(e) =>
                handleFormChange("betting_start_time", e.target.value)
              }
              className="input-form"
            />
          </div>
          <div>
            <label className="label-form">เวลาปิดรับแทง</label>
            <input
              type="time"
              value={formData.betting_cutoff_time || ""}
              onChange={(e) =>
                handleFormChange("betting_cutoff_time", e.target.value)
              }
              className="input-form"
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-md font-semibold text-gray-300 mb-2">
          กลยุทธ์การสร้างงวด
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label-form">เลือกวิธีการสร้างงวดใหม่</label>
            <select
              value={formData.generation_strategy || ""}
              onChange={(e) =>
                handleFormChange("generation_strategy", e.target.value)
              }
              className="input-form"
            > 
              <option value="interval">ทำงานทุกๆนาที</option>
              <option value="daily">ทำงานทุกๆวัน</option>
              <option value="onlyday">ทำงานเฉพาะวันที่ระบุ</option>
              <option value="monthly_fixed_days">
                ทำงานทุกๆวันที่ในแต่ละเดือน
              </option>
            </select>
          </div>
          <div
            className={`${
              formData.generation_strategy !== "interval" ? "opacity-50" : ""
            }`}
          >
            <label className="label-form">นาที (minutes)</label>
            <input
              type="number"
              value={formData.interval_minutes || ""}
              onChange={(e) =>
                handleFormChange(
                  "interval_minutes",
                  parseInt(e.target.value, 10) || 0
                )
              }
              className="input-form"
              placeholder="For interval strategy"
              disabled={formData.generation_strategy !== "interval"}
            />
          </div>
          <div>
          <label className="label-form">ต้องการเปิดให้ซื้อใหม่หลังจากงวดเก่าปิดกี่วัน</label>
          <select
            value={formData.betting_skip_start_day ?? '0'}
            onChange={(e) =>
              handleFormChange(
                "betting_skip_start_day",
                e.target.value
              )
            }
            className="input-form"
          >
            {/* สร้างตัวเลือกตั้งแต่ -31 ถึง 31 */}
            {Array.from({ length: 63 }, (_, i) => i - 31).map(day => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

          {/* ✨ UI ส่วนที่แก้ไขสำหรับ Specific Days of Week */}
          <div
            className={`sm:col-span-2 lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4`}
          >
            <div
              className={`${
                formData.generation_strategy !== "onlyday"
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
            >
              <label className="label-form">ระบุวันเฉพาะที่ต้องการเปิดให้ซื้อ</label>
              <div className="space-y-2">
                {/* แสดงผล Tag ของวันที่เลือก */}
                <div className="flex flex-wrap gap-2 p-2 bg-gray-900/50 rounded-md border border-gray-700 min-h-[42px]">
                  {selectedDayValues.length > 0 ? (
                    selectedDayValues.map((dayValue) => {
                      const dayName = daysOfWeek.find(
                        (d) => d.value === dayValue
                      )?.name;
                      return (
                        <span
                          key={dayValue}
                          className="flex items-center gap-1.5 bg-cyan-800/50 text-cyan-300 text-xs font-semibold px-2 py-1 rounded-full"
                        >
                          {dayName}
                          <button
                            type="button"
                            onClick={() => handleRemoveDayOfWeek(dayValue)}
                            className="text-cyan-300 hover:text-white"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-gray-500 text-sm italic p-1">
                      ยังไม่ได้เลือกวัน
                    </span>
                  )}
                </div>

                {/* Dropdown และปุ่มสำหรับเพิ่มวัน */}
                {availableDays.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={dayToAdd}
                      onChange={(e) => setDayToAdd(e.target.value)}
                      className="input-form"
                    >
                      {availableDays.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddDayOfWeek}
                      className="p-2 text-cyan-400 hover:text-cyan-300 flex-shrink-0"
                    >
                      <PlusCircleIcon className="h-7 w-7" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div
              className={`${
                formData.generation_strategy !== "monthly_fixed_days"
                  ? "opacity-50"
                  : ""
              }`}
            >
              <label className="label-form">สร้างงวดใหม่ทุกๆวันที่ (ของเดือน)</label>
              <input
                type="text"
                value={formData.monthly_fixed_days || ""}
                onChange={(e) =>
                  handleFormChange("monthly_fixed_days", e.target.value)
                }
                className="input-form"
                placeholder="1, 16"
                disabled={formData.generation_strategy !== "monthly_fixed_days"}
              />
            </div>
          </div>

          <div
            className={`sm:col-span-2 lg:col-span-3 ${
              formData.generation_strategy !== "monthly_fixed_days"
                ? "opacity-50"
                : ""
            }`}
          >
            <label className="label-form">วันที่ลอยตัวในการสร้างของเดือน</label>
            <div
              className={`space-y-2 p-2 bg-gray-900/50 rounded-md border border-gray-700 ${
                formData.generation_strategy !== "monthly_fixed_days"
                  ? "cursor-not-allowed"
                  : ""
              }`}
            >
              {(formData.monthly_floating_dates || []).map((date, index) => {
                const daysInSelectedMonth = getDaysInMonth(date.month);
                return (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={date.day || ""}
                      onChange={(e) =>
                        handleFloatingDateChange(index, "day", e.target.value)
                      }
                      className="input-form w-1/2"
                      disabled={
                        formData.generation_strategy !== "monthly_fixed_days"
                      }
                    >
                      {Array.from(
                        { length: daysInSelectedMonth },
                        (_, i) => i + 1
                      ).map((dayNum) => (
                        <option key={dayNum} value={dayNum}>
                          วันที่ {dayNum}
                        </option>
                      ))}
                    </select>
                    <select
                      value={date.month || ""}
                      onChange={(e) =>
                        handleFloatingDateChange(index, "month", e.target.value)
                      }
                      className="input-form w-1/2"
                      disabled={
                        formData.generation_strategy !== "monthly_fixed_days"
                      }
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveFloatingDate(index)}
                      className="p-2 text-red-400 hover:text-red-300 flex-shrink-0"
                      disabled={
                        formData.generation_strategy !== "monthly_fixed_days"
                      }
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={handleAddFloatingDate}
                disabled={
                  formData.generation_strategy !== "monthly_fixed_days"
                }
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-semibold mt-2 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusCircleIcon className="h-5 w-5" />
                เพิ่มวันที่พิเศษ
              </button>
            </div>
          </div>
        </div>
      </fieldset>

      <div className="flex justify-between items-center mt-4">
        <div>
          {!isCreating && (
            <button
              onClick={onDelete}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold text-sm"
            >
              <TrashIcon className="h-5 w-5" />
              <span>ลบ</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-sm"
          >
            <XCircleIcon className="h-5 w-5" />
            <span>ยกเลิก</span>
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-sm disabled:bg-gray-500"
          >
            <CheckCircleIcon className="h-5 w-5" />
            <span>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
const LottoTypeManagementPage: React.FC = () => {
    const [lottoTypes, setLottoTypes] = useState<LottoType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedTypeId, setExpandedTypeId] = useState<number | null>(null);
    const [editingState, setEditingState] = useState<{ mode: 'edit' | 'create' | null; data?: LottoType }>({ mode: null });
    const { alert, confirm, showStatus, hideStatus } = useModal();

   const fetchLottoTypes = useCallback(async () => {
    setIsLoading(true);
    try { 
        const response = await api.get<LottoType[]>('/api/lotto-types');
        setLottoTypes(response.data || []);
    } catch (error) { 
        console.error("Failed to fetch lotto types:", error);
    } finally {
        setIsLoading(false);
    }
}, []);

    useEffect(() => { fetchLottoTypes(); }, [fetchLottoTypes]);

    const handleSave = async (formData: Partial<LottoTypeFormData>) => {

        setIsSaving(true);
        const toIntArray = (value: string | undefined) => value && value.trim() !== '' ? value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) : null;
        const finalPayload: Partial<LottoType> = { ...formData, monthly_fixed_days: toIntArray(formData.monthly_fixed_days), specific_days_of_week: toIntArray(formData.specific_days_of_week), monthly_floating_dates: formData.monthly_floating_dates?.length ? formData.monthly_floating_dates : null };

        try {
          if (editingState.mode === 'create') { 
              await api.post('/api/add-lotto-types', finalPayload);
              showStatus("success", "สร้างสำเร็จ", `สร้าง "${finalPayload.name}" เรียบร้อยแล้ว`);
              } else if (editingState.mode === 'edit' && editingState.data) { 
                  await api.put(`/api/update-lotto-types/${editingState.data.id}`, finalPayload);
                  showStatus("success", "บันทึกสำเร็จ", `บันทึกข้อมูลสำหรับ "${finalPayload.name}" เรียบร้อยแล้ว`);
              }
              setEditingState({ mode: null });
              fetchLottoTypes();
        } catch (error: any) {
            hideStatus();
            alert("เกิดข้อผิดพลาด", error.response?.data?.error || "ไม่สามารถบันทึกข้อมูลได้", "warning");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (lottoType: LottoType) => {
    const isConfirm = await confirm(
        "ยืนยันการลบ", 
        `คุณแน่ใจหรือไม่ว่าต้องการลบ "${lottoType.name}"? การกระทำนี้ไม่สามารถย้อนกลับได้`, 
        "warning"
        );
        if (isConfirm) {
            try { 
                await api.delete(`/api/delete-lotto-types/${lottoType.id}`);

                showStatus('success', 'ลบสำเร็จ', `ลบประเภทหวย "${lottoType.name}" เรียบร้อยแล้ว`);
                setEditingState({ mode: null });
                fetchLottoTypes();
                
            } catch (error: any) {
                alert("เกิดข้อผิดพลาด", error.response?.data?.error || "ไม่สามารถลบข้อมูลได้", "warning");
            }
        }
    };

    const toggleExpand = (id: number) => {
        if (expandedTypeId === id) {
            setExpandedTypeId(null);
            setEditingState({ mode: null });
        } else {
            setExpandedTypeId(id);
            setEditingState({ mode: null });
        }
    };

    return (
        <div className="bg-gray-900 text-white rounded-2xl shadow-lg overflow-hidden border border-gray-700/50">
            <button onClick={() => setIsExpanded(prev => !prev)} className="w-full text-left p-5 flex justify-between items-center hover:bg-gray-800/50 focus:outline-none transition-colors">
                <h2 className="text-xl font-bold">จัดการประเภทหวย (Rates & Rules)</h2>
                <ChevronDownIcon className={`w-6 h-6 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="p-4 border-t border-gray-700/50">
                        <div className="mb-4 flex justify-end">
                            <button onClick={() => setEditingState({ mode: 'create' })} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold text-sm">
                                <PlusCircleIcon className="h-5 w-5"/>
                                สร้างประเภทหวยใหม่
                            </button>
                        </div>

                        {editingState.mode === 'create' && (
                            <div className="mb-4">
                                <LottoTypeForm
                                    onSave={handleSave}
                                    onCancel={() => setEditingState({ mode: null })}
                                    onDelete={() => {}} // Not used in create mode
                                    isSaving={isSaving}
                                />
                            </div>
                        )}

                        {isLoading ? <> <FullScreenLoader isLoading={isLoading} text="กำลังโหลดข้อมูลประเภทหวย..."/>  <p className="text-center py-10">กำลังโหลด...</p> </> : (
                            <div className="space-y-2">
                                {lottoTypes.map(lottoType => (
                                    <div key={lottoType.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                                        <button onClick={() => toggleExpand(lottoType.id)} className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-700/60 transition-colors">
                                            <h3 className="text-lg font-semibold text-cyan-400">{lottoType.name}</h3>
                                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedTypeId === lottoType.id ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {expandedTypeId === lottoType.id && (
                                            <div className="p-4 border-t border-gray-700">
                                                {editingState.mode === 'edit' && editingState.data?.id === lottoType.id ? (
                                                    <LottoTypeForm
                                                        initialData={lottoType}
                                                        onSave={handleSave}
                                                        onCancel={() => setEditingState({ mode: null })}
                                                        onDelete={() => handleDelete(lottoType)}
                                                        isSaving={isSaving}
                                                    />
                                                ) : (
                                                    <div>
                                                        <LottoTypeDisplay lottoType={lottoType} />
                                                        <div className="flex justify-end mt-4">
                                                            <button onClick={() => setEditingState({ mode: 'edit', data: lottoType })} className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold text-sm">
                                                                <PencilSquareIcon className="h-5 w-5"/>
                                                                <span>แก้ไข</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .label-form, .label-display { display: block; font-size: 0.875rem; font-weight: 500; color: #9CA3AF; margin-bottom: 0.25rem; text-transform: capitalize; }
                .value-display { font-weight: 600; color: #E5E7EB; min-height: 24px; }
                .input-form { background-color: #1F2937; border: 1px solid #4B5563; border-radius: 0.5rem; padding: 0.5rem 0.75rem; color: white; width: 100%; font-size: 0.875rem; transition: border-color 0.2s; }
                .input-form:focus { outline: none; border-color: #06B6D4; }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                  -webkit-appearance: none; 
                  margin: 0; 
                }
                input[type=number] {
                  -moz-appearance: textfield;
                }
            `}</style>
        </div>
    );
};

export default LottoTypeManagementPage;
