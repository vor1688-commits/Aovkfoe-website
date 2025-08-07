
import React, { useEffect, useState, useCallback } from "react";
import LottoCategorySection from "../components/LottoCategorySection";
import ManualLottoCategorySection from "../components/ManualLottoComponents";
import { FullScreenLoader } from "../components/LoadingScreen";

const API_URL = import.meta.env.VITE_API_URL_FRONTEND || 'http://localhost:3001';

// Interface สำหรับข้อมูลแต่ละงวด
interface LottoRoundData {
    id: number;
    name: string;
    open_datetime: string;
    cutoff_datetime: string;
    lotto_type_id: number;
}

// Interface สำหรับโครงสร้างข้อมูลที่ได้จาก API
interface LottoTypeRoundsResponse {
    lotto_type_id: number;
    lotto_type_name: string;
    current_round: LottoRoundData | null;
    next_round: LottoRoundData | null;
}

// Interface สำหรับ API Response ทั้งหมด
interface ApiResponse {
    rounds: LottoTypeRoundsResponse[];
    serverTime: string;
}

const HomePage: React.FC = () => {
    const [lottoTypeRoundsData, setLottoTypeRoundsData] = useState<LottoTypeRoundsResponse[]>([]);
    const [manualLottoRoundsData, setManualLottoRoundsData] = useState<LottoTypeRoundsResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [initialServerTime, setInitialServerTime] = useState<string | null>(null);

    // State สำหรับ "นาฬิกาที่เดินได้"
    const [tickingTime, setTickingTime] = useState<Date | null>(null);

    const fetchLottoRoundsAndTimes = useCallback(async (signal: AbortSignal) => {
        setError(null);
        try {
            const [autoRoundsResult, manualRoundsResult] = await Promise.allSettled([
                fetch(`${API_URL}/api/lotto-types/current-and-next`, { signal }),
                fetch(`${API_URL}/api/lotto-rounds/manual-active`, { signal })
            ]);

            let fetchedServerTime: string | null = null;

            // --- Process Auto Rounds ---
            if (autoRoundsResult.status === 'fulfilled' && autoRoundsResult.value.ok) {
                const autoRoundsData: ApiResponse = await autoRoundsResult.value.json();
                setLottoTypeRoundsData(autoRoundsData.rounds);
                if (!fetchedServerTime) fetchedServerTime = autoRoundsData.serverTime;
            } else {
                setLottoTypeRoundsData([]);
            }

            // --- Process Manual Rounds ---
            if (manualRoundsResult.status === 'fulfilled' && manualRoundsResult.value.ok) {
                const manualRoundsData: ApiResponse = await manualRoundsResult.value.json();
                setManualLottoRoundsData(manualRoundsData.rounds); 
                if (!fetchedServerTime) fetchedServerTime = manualRoundsData.serverTime;
            } else {
                setManualLottoRoundsData([]);
            }
            
            if (fetchedServerTime) {
                setInitialServerTime(fetchedServerTime);
            } else {
                if (!initialServerTime) setInitialServerTime(new Date().toISOString());
                setError("ไม่สามารถซิงค์เวลาจากเซิร์ฟเวอร์ได้");
            }

        } catch (err: any) {
            if (err.name !== 'AbortError') {
              setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
            }
        } finally {
            setLoading(false);
        }
    }, [initialServerTime]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        fetchLottoRoundsAndTimes(signal);
        const interval = setInterval(() => fetchLottoRoundsAndTimes(signal), 60 * 1000); 
        return () => {
            clearInterval(interval);
            controller.abort();
        };
    }, [fetchLottoRoundsAndTimes]);

    // useEffect สำหรับจัดการ "นาฬิกาที่เดินได้"
    useEffect(() => {
        if (initialServerTime) {
            const initialDate = new Date(initialServerTime);
            setTickingTime(initialDate);

            const timerId = setInterval(() => {
                setTickingTime(prevTime => new Date(prevTime!.getTime() + 1000));
            }, 1000);

            return () => clearInterval(timerId);
        }
    }, [initialServerTime]);

    if (loading && !initialServerTime) return <FullScreenLoader isLoading={true} text="กำลังโหลดข้อมูลหวย..."/>;
    if (error && lottoTypeRoundsData.length === 0 && manualLottoRoundsData.length === 0) return <FullScreenLoader isLoading={true} text={`กำลังโหลดข้อมูล`}/>;
    if (!tickingTime) return <FullScreenLoader isLoading={true} text="กำลังซิงค์เวลากับเซิร์ฟเวอร์..."/>;

    const autoHuayCategories = lottoTypeRoundsData.filter(item => item.lotto_type_name.includes("หวย"));
    const autoStockCategories = lottoTypeRoundsData.filter(item => item.lotto_type_name.includes("หุ้น"));
    const manualHuayCategories = manualLottoRoundsData.filter(item => item.lotto_type_name.includes("หวย"));
    const manualStockCategories = manualLottoRoundsData.filter(item => item.lotto_type_name.includes("หุ้น"));
    
    return ( 
        <div className="space-y-6">
            
            {/* Section สำหรับหวยอัตโนมัติ */} 
            {autoHuayCategories.length > 0 && (
                <div className="p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-950 dark:border-gray-950 mb-4 text-white">
                    <h1 className="text-3xl font-bold dark:text-white mb-10 text-white">
                        {"กลุ่มหวยต่างประเทศ"}
                    </h1>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 text-white">
                        {autoHuayCategories.map((lottoTypeData) => (
                            <LottoCategorySection
                                key={`auto-huay-${lottoTypeData.lotto_type_id}`}
                                title={lottoTypeData.lotto_type_name}
                                currentRound={lottoTypeData.current_round}
                                nextRound={lottoTypeData.next_round}
                                currentTime={tickingTime}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Section สำหรับหุ้นอัตโนมัติ */}
            {autoStockCategories.length > 0 && (
                <div className="p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-950 dark:border-gray-950 mb-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-10">
                        {"กลุ่มหวยหุ้น"}
                    </h1>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {autoStockCategories.map((lottoTypeData) => (
                            <LottoCategorySection
                                key={`auto-stock-${lottoTypeData.lotto_type_id}`}
                                title={lottoTypeData.lotto_type_name}
                                currentRound={lottoTypeData.current_round}
                                nextRound={lottoTypeData.next_round}
                                currentTime={tickingTime}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Section สำหรับหวย Manual */}
            {manualHuayCategories.length > 0 && (
                <div className="p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-950 dark:border-gray-950 mb-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-10">
                        {"กลุ่มหวยเปิดรอบพิเศษ"}
                    </h1>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {manualHuayCategories.map((lottoTypeData) => (
                            <ManualLottoCategorySection
                                key={`manual-huay-${lottoTypeData.lotto_type_id}`}
                                title={lottoTypeData.lotto_type_name}
                                currentRound={lottoTypeData.current_round}
                                currentTime={tickingTime}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Section สำหรับหุ้น Manual */}
            {manualStockCategories.length > 0 && (
                <div className="p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-950 dark:border-gray-950 mb-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-10">
                        {"กลุ่มหุ้นเปิดรอบพิเศษ"}
                    </h1>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {manualStockCategories.map((lottoTypeData) => (
                            <ManualLottoCategorySection
                                key={`manual-stock-${lottoTypeData.lotto_type_id}`}
                                title={lottoTypeData.lotto_type_name}
                                currentRound={lottoTypeData.current_round}
                                currentTime={tickingTime}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;