import React, { useState, useEffect, useMemo } from 'react'; 
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'; 
import type { PrizeCheckItem } from '../pages/PrizeCheckPage';
import api from '../api/axiosConfig';

// --- Interfaces ---
interface LottoType {
  id: number;
  name: string;
}
interface LottoRound {
  id: number;
  name: string;
  cutoff_datetime: string;
}
interface ManualWinningNumbers {
  '3top': string; '3tote': string; '3bottom': string;
  '2top': string; '2bottom': string;
  'run_top': string; 'run_bottom': string;
}

// --- Props ---
interface ManualPrizeCheckerProps {
  allItems: PrizeCheckItem[]; // รับรายการโพยทั้งหมดมาเพื่อใช้ตรวจสอบ
}

// --- Main Component ---
const ManualPrizeChecker: React.FC<ManualPrizeCheckerProps> = ({ allItems }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lottoTypes, setLottoTypes] = useState<LottoType[]>([]);
  const [lottoRounds, setLottoRounds] = useState<LottoRound[]>([]);
  const [selectedLottoTypeId, setSelectedLottoTypeId] = useState<string>('');
  const [selectedLottoRoundId, setSelectedLottoRoundId] = useState<string>('');
  const [winningNumbers, setWinningNumbers] = useState<ManualWinningNumbers>({
    '3top': '', '3tote': '', '3bottom': '',
    '2top': '', '2bottom': '',
    'run_top': '', 'run_bottom': ''
  });
  const [results, setResults] = useState<PrizeCheckItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
 
 useEffect(() => { 
    api.get<LottoType[]>(`/lotto-types`)
        .then(res => setLottoTypes(res.data))
        .catch(err => console.error("Failed to fetch lotto types", err));
}, []);
 
  useEffect(() => {
    if (!selectedLottoTypeId) {
      setLottoRounds([]);
      setSelectedLottoRoundId('');
      return;
    }
    // ใช้ api.get แทน
    api.get(`/lotto-rounds?typeId=${selectedLottoTypeId}`)
        .then(res => setLottoRounds(res.data.rounds || []))
        .catch(err => console.error("Failed to fetch rounds", err));
}, [selectedLottoTypeId]);;

  // Input Validation Handler
  const handleInputChange = (value: string, field: keyof ManualWinningNumbers) => {
    const filteredValue = value.replace(/[^0-9, ]/g, '');
    let maxLength = 3;
    if (field.includes('2')) maxLength = 2;
    if (field.includes('run')) maxLength = 1;

    const parts = filteredValue.split(/([, ])/);
    const validatedParts = parts.map(part => {
        if (!/[, ]/.test(part) && part.length > maxLength) {
            return part.substring(0, maxLength);
        }
        return part;
    });
    let finalValue = validatedParts.join('');
    finalValue = finalValue.replace(/ +/g, ' ').replace(/,+/g, ',').replace(/, /g, ',').replace(/ ,/g, ',');
    
    setWinningNumbers(prev => ({ ...prev, [field]: finalValue }));
  };

  // Prize Checking Logic
  const handleCheckPrizes = () => {
    if (!selectedLottoRoundId) {
        alert("กรุณาเลือกงวดที่ต้องการตรวจ");
        return;
    }
    setIsLoading(true);
    
    // แปลง input string เป็น array ของตัวเลขที่ชนะ
    const prizes = {
        '3top': winningNumbers['3top'].split(/[, ]+/).filter(Boolean),
        '3tote': winningNumbers['3tote'].split(/[, ]+/).filter(Boolean),
        '3bottom': winningNumbers['3bottom'].split(/[, ]+/).filter(Boolean),
        '2top': winningNumbers['2top'].split(/[, ]+/).filter(Boolean),
        '2bottom': winningNumbers['2bottom'].split(/[, ]+/).filter(Boolean),
        'run_top': winningNumbers['run_top'].split(/[, ]+/).filter(Boolean),
        'run_bottom': winningNumbers['run_bottom'].split(/[, ]+/).filter(Boolean),
    };

    // กรองโพยเฉพาะงวดที่เลือก
    const itemsToCheck = allItems.filter(item => item.lottoRoundId === Number(selectedLottoRoundId));
    
    const winners = itemsToCheck.filter(item => {
        const style = item.bet_style.toLowerCase();
        const num = item.bet_number;

        if (style === 'ตรง' && prizes['3top'].includes(num)) return true;
        if (style === 'โต๊ด' && prizes['3tote'].includes(num)) return true;
        if (style === 'บน' && prizes['2top'].includes(num)) return true;
        if (style === 'ล่าง' && (prizes['2bottom'].includes(num) || prizes['3bottom'].includes(num))) return true;
        // เพิ่มเงื่อนไขสำหรับเลขวิ่ง
        
        return false;
    });

    setResults(winners);
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 mb-6">
      <button onClick={() => setIsExpanded(p => !p)} className="w-full text-left p-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 focus:outline-none">
        <h2 className="text-lg font-semibold text-gray-700">ตรวจหวยด้วยตนเอง</h2>
        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="p-4 border-t border-gray-200 space-y-4">
            {/* Form Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={selectedLottoTypeId} onChange={e => setSelectedLottoTypeId(e.target.value)} className="input-form">
                <option value="">-- เลือกประเภทหวย --</option>
                {lottoTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={selectedLottoRoundId} onChange={e => setSelectedLottoRoundId(e.target.value)} className="input-form" disabled={!selectedLottoTypeId}>
                <option value="">-- เลือกงวด --</option>
                {lottoRounds.map(r => <option key={r.id} value={r.id}>{r.name} ({new Date(r.cutoff_datetime).toLocaleDateString('th-TH')})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.keys(winningNumbers).map(key => (
                    <div key={key}>
                        <label className="label-form">{key.replace('_', ' ')}</label>
                        <input 
                            type="text"
                            value={winningNumbers[key as keyof ManualWinningNumbers]}
                            onChange={e => handleInputChange(e.target.value, key as keyof ManualWinningNumbers)}
                            className="input-form font-mono"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end">
                <button onClick={handleCheckPrizes} disabled={isLoading} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400">
                    <MagnifyingGlassIcon className="h-5 w-5"/>
                    <span>{isLoading ? 'กำลังตรวจ...' : 'ตรวจรางวัล'}</span>
                </button>
            </div>
            
            {/* Results */}
            {results.length > 0 && (
                <div className="pt-4 border-t">
                    <h3 className="font-bold mb-2">ผลการตรวจ: พบ {results.length} รายการที่ถูกรางวัล</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            {/* ... a table to display winning items from `results` state ... */}
                        </table>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
      <style>{`.label-form { display: block; font-size: 0.8rem; font-weight: 500; color: #4B5563; margin-bottom: 0.25rem; text-transform: capitalize; } .input-form { width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; }`}</style>
    </div>
  );
};

export default ManualPrizeChecker;