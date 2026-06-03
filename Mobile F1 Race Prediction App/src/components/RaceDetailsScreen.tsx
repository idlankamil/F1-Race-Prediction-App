import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Flag, Trophy, Info, TrendingUp, User, Crown, X, BarChart3 } from 'lucide-react';
// @ts-ignore
import { useTheme } from './../components/ThemeContext.tsx';
// 🟢 IMPORT DRIVER DATA FOR ID LOOKUP
import { drivers } from '../lib/data'; 

// 🟢 CONFIG
const API_BASE = 'https://isreal-falconiform-seasonedly.ngrok-free.dev';

// 🟢 1. STRICT TYPES FOR IMAGES
interface NgrokImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

// 🟢 2. NGROK BYPASS IMAGE COMPONENT
const NgrokImage: React.FC<NgrokImageProps> = ({ src, alt, className, style, onError }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src || !src.startsWith('http')) {
      setImgSrc(src);
      return;
    }

    let isMounted = true;
    fetch(src, {
      headers: { 
        'ngrok-skip-browser-warning': 'true',
      }
    })
    .then(async res => {
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      if (isMounted) setImgSrc(URL.createObjectURL(blob));
    })
    .catch(() => {
      if (isMounted) setImgSrc(src); // Fallback to direct link
    });

    return () => { isMounted = false; };
  }, [src]);

  return (
    <img 
      src={imgSrc || src} 
      alt={alt} 
      className={className} 
      style={style}
      onError={onError}
    />
  );
};

// 🟢 FIXED SCHEDULE: Names now match Backend Keys (Bahrain, Jeddah, Interlagos, etc.)
const SCHEDULE_2026 = [
    { "round": 1, "circuit": "Melbourne, Australia" },     // Matches 'Melbourne'
    { "round": 2, "circuit": "Shanghai, China" },          // Matches 'Shanghai'
    { "round": 3, "circuit": "Suzuka, Japan" },            // Matches 'Suzuka'
    { "round": 4, "circuit": "Bahrain" },                  // Matches 'Bahrain'
    { "round": 5, "circuit": "Jeddah, Saudi Arabia" },     // Matches 'Jeddah'
    { "round": 6, "circuit": "Miami, USA" },               // Matches 'Miami'
    { "round": 7, "circuit": "Imola, Italy" },             // Matches 'Imola'
    { "round": 8, "circuit": "Monaco" },                   // Matches 'Monaco'
    { "round": 9, "circuit": "Barcelona, Spain" },         // Matches 'Barcelona'
    { "round": 10, "circuit": "Montreal, Canada" },        // Matches 'Montreal'
    { "round": 11, "circuit": "Spielberg, Austria" },      // Matches 'Spielberg'
    { "round": 12, "circuit": "Silverstone, UK" },         // Matches 'Silverstone'
    { "round": 13, "circuit": "Hungaroring, Hungary" },    // CHANGED: Matches 'Hungaroring'
    { "round": 14, "circuit": "Spa-Francorchamps, Belgium"}, // Matches 'Spa'
    { "round": 15, "circuit": "Zandvoort, Netherlands" },  // Matches 'Zandvoort'
    { "round": 16, "circuit": "Monza, Italy" },            // Matches 'Monza'
    { "round": 17, "circuit": "Baku, Azerbaijan" },        // Matches 'Baku'
    { "round": 18, "circuit": "Singapore" },               // Matches 'Singapore'
    { "round": 19, "circuit": "Austin, USA" },             // Matches 'Austin'
    { "round": 20, "circuit": "Mexico City, Mexico" },     // Matches 'Mexico City'
    { "round": 21, "circuit": "Interlagos, Brazil" },      // CHANGED: Matches 'Interlagos' (was São Paulo)
    { "round": 22, "circuit": "Las Vegas, USA" },          // Matches 'Las Vegas'
    { "round": 23, "circuit": "Qatar" },                   // Matches 'Qatar'
    { "round": 24, "circuit": "Abu Dhabi, UAE" }           // CHANGED: Matches 'Abu Dhabi' (was Yas Marina)
  ];

// --- STATIC DATA (2025) ---
const RESULTS_2025 = [
  { position: 1, driver: "Lando Norris", team: "McLaren", wins: 8, points: 420, status: "Champion", details: "Clinched his maiden World Title with 8 wins and 19 podiums." },
  { position: 2, driver: "Max Verstappen", team: "Red Bull", wins: 9, points: 380, status: "Active", details: "Won the most races (9), but reliability issues cost him the title." },
  { position: 3, driver: "Oscar Piastri", team: "McLaren", wins: 7, points: 300, status: "Active", details: "Breakout season with 7 wins, securing Constructors' Title." },
  { position: 4, driver: "George Russell", team: "Mercedes", wins: 3, points: 250, status: "Active", details: "Led Mercedes charge with 3 wins." },
  { position: 5, driver: "Charles Leclerc", team: "Ferrari", wins: 0, points: 200, status: "Active", details: "Dominated qualifying but struggled with race pace." },
  { position: 6, driver: "Lewis Hamilton", team: "Ferrari", wins: 0, points: 180, status: "Active", details: "Solid debut in Red; consistent points finishes." },
];

interface RaceResult {
  position: number;
  driver: string;
  driverId?: string | null;
  team: string;
  points?: number;
  wins?: number;
  status: string;
  details?: string;
  probability?: string;
  podiumProbability?: string;
  pointsProbability?: string;
  reasons?: { positive: string[], negative: string[] };
}

interface RaceDetailsScreenProps {
  raceId: string;
  onBack: () => void;
}

// 🟢 3. HELPERS (No External Dependencies)
const getTeamColor = (team: string) => {
  if (!team) return '#666666';
  const t = team.toLowerCase();
  if (t.includes('red bull')) return '#3671C6';
  if (t.includes('ferrari')) return '#D92A32';
  if (t.includes('mercedes')) return '#00A19C';
  if (t.includes('mclaren')) return '#FF8000';
  if (t.includes('aston')) return '#006F62';
  if (t.includes('williams')) return '#005AFF';
  if (t.includes('alpine')) return '#FF87BC';
  if (t.includes('haas')) return '#B6BABD';
  if (t.includes('sauber') || t.includes('kick')) return '#52E252';
  if (t.includes('rb') || t.includes('racing bulls')) return '#6692FF';
  return '#666666';
};

// 🟢 FIX: ROBUST ID LOOKUP (Same as Prediction Screen)
const getDriverIdByName = (fullName: string) => {
  if (!fullName) return null;
  // 1. Try exact match in local data
  const entry = Object.values(drivers).find(d => d.name === fullName);
  if (entry) return entry.id;

  // 2. Fallback: Try partial match
  const partial = Object.values(drivers).find(d => fullName.includes(d.lastname));
  if (partial) return partial.id;

  // 3. Last Resort
  return fullName.substring(0, 3).toUpperCase(); 
};

const formatDriverNameForImage = (driverName: string): string => {
  if (!driverName) return '';
  // Try to use the smart lookup first
  const id = getDriverIdByName(driverName);
  if (id) return id;
  return driverName.substring(0, 3).toUpperCase();
};

export function RaceDetailsScreen({ raceId, onBack }: RaceDetailsScreenProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ID Parsing
  const safeId = String(raceId || '');
  let year = '2024'; 
  let round = '1'; 

  const yearMatch = safeId.match(/\b(202\d)\b/); 
  if (yearMatch) year = yearMatch[1];
  else {
      const parts = safeId.split('-');
      if (parts[0] && parts[0].length === 4 && !isNaN(Number(parts[0]))) year = parts[0];
  }

  const roundMatch = safeId.match(/round-(\d+)/i);
  if (roundMatch) round = roundMatch[1];

  const is2025 = safeId.includes('2025-summary') || year === '2025';
  const is2026 = year === '2026';
  const shouldFetch = !is2025; 

  const [fetchedResults, setFetchedResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<RaceResult | null>(null);

  useEffect(() => {
    if (!shouldFetch) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const headers = { 
            "ngrok-skip-browser-warning": "true",
            "Content-Type": "application/json"
        };

        let rawData: any = null;

        if (is2026) {
            const raceInfo = SCHEDULE_2026.find(r => r.round === parseInt(round));
            const circuitName = raceInfo ? raceInfo.circuit : "Unknown";
            
            const res = await fetch(`${API_BASE}/predict`, {
                method: "POST",
                headers,
                body: JSON.stringify({ circuit_name: circuitName })
            });
            
            if (res.ok) {
                const data = await res.json();
                rawData = data.predictions; 
            }
        } 
        else {
            const res = await fetch(`${API_BASE}/race_results?year=${year}&round=${round}`, { method: "GET", headers });
            if (res.ok) rawData = await res.json();
            else {
                const resFallback = await fetch(`${API_BASE}/race/${raceId}/results`, { headers });
                if (resFallback.ok) rawData = await resFallback.json();
            }
        }

        const cleanData: RaceResult[] = [];
        
        if (Array.isArray(rawData)) {
            const mapped = rawData.map((item: any) => {
                 const isPred = is2026 || item.probability !== undefined;
                 
                 let driverName = "Unknown";
                 let teamName = "Unknown";
                 let backendId = null;

                 if (isPred && item.driver && typeof item.driver === 'object') {
                     driverName = item.driver.name;
                     backendId = item.driver.id; 
                     teamName = item.driver.team;
                 } else {
                     driverName = String(item.Driver || item.driver || 'Unknown');
                     teamName = String(item.Team || item.team || 'Unknown');
                 }

                 // 🟢 FIX: Priority to Local Lookup ID, then Backend ID
                 const resolvedId = getDriverIdByName(driverName) || backendId;

                 if (isPred) {
                    // 🟢 FIX: Handle Number/String types safely
                    const winVal = typeof item.probability === 'number' ? item.probability : parseFloat(item.probability || '0');
                    
                    // 🟢 FIX: Use Backend Stats if available (Realistic Mode)
                    let podiumVal = 0;
                    let pointsVal = 0;

                    if (item.stats && item.stats.podium_prob) {
                        podiumVal = item.stats.podium_prob;
                    } else {
                        // Fallback math
                        let pVal = item.podium_probability ? parseFloat(item.podium_probability) : 0;
                        if (!pVal) {
                            if (item.position <= 3) pVal = Math.min(99, Math.max(70, winVal * 2));
                            else if (item.position <= 6) pVal = Math.min(60, Math.max(20, winVal * 4));
                            else pVal = Math.max(1, 15 - item.position);
                        }
                        podiumVal = pVal;
                    }
                    
                    if (item.stats && item.stats.points_prob) {
                        pointsVal = item.stats.points_prob;
                    } else {
                        // Fallback math
                        let ptVal = item.points_probability ? parseFloat(item.points_probability) : 0;
                        if (!ptVal) {
                             if (item.position <= 10) ptVal = Math.min(99, Math.max(60, 100 - (item.position * 5)));
                             else ptVal = Math.max(5, 40 - ((item.position - 10) * 5));
                        }
                        pointsVal = ptVal;
                    }

                    return {
                        position: item.position,
                        driver: driverName,
                        driverId: resolvedId, // <--- Correct ID
                        team: teamName,
                        probability: winVal.toFixed(1) + "%",
                        podiumProbability: podiumVal.toFixed(1) + "%",
                        pointsProbability: pointsVal.toFixed(1) + "%",
                        reasons: item.reasons || { positive: [], negative: [] },
                        status: 'Predicted',
                        details: item.reasons?.positive?.[0] || "AI Analysis pending"
                    };
                 } else {
                    return {
                        position: parseInt(item.Position || item.position || '0'),
                        driver: driverName,
                        driverId: resolvedId, 
                        team: teamName,
                        points: item.Points ? parseFloat(item.Points) : undefined,
                        status: String(item.status || item.Status || 'Finished'),
                        wins: item.wins ? parseInt(item.wins) : undefined,
                        details: item.details
                    };
                 }
            });
            setFetchedResults(mapped);
        }
      } catch (e) { 
        console.error("Fetch Error:", e); 
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [safeId, year, round, shouldFetch, raceId, is2026]);

  const displayList = useMemo(() => {
      if (is2025) return RESULTS_2025;
      return fetchedResults;
  }, [is2025, fetchedResults]);

  const headerTitle = is2025 ? "2025 Standings" : (is2026 ? "AI Prediction" : `Round ${round}`);
  const subTitle = is2025 ? "Season Summary" : (is2026 ? `2026 Season (Round ${round})` : `${year} Official Results`);

  const containerStyle = isDark 
    ? { backgroundColor: '#0a0a0a', color: '#ffffff' } 
    : { backgroundColor: '#f0f2f5', color: '#0f172a' };

  const podium = displayList.slice(0, 3);

  // 🟢 Helper for Image - UPDATED TO USE ID PREFERENTIALLY
  const PodiumDriverImage = ({ id, driverName, alt }: { id: string | null | undefined, driverName: string, alt: string }) => {
    const [imgError, setImgError] = useState(false);
    
    // Construct Source
    let src = null;
    if (id && !imgError) {
      src = `${API_BASE}/driver-faces/${id}.png`;
    } else if (driverName && !imgError) {
      // Last ditch attempt
      const formatted = formatDriverNameForImage(driverName);
      src = `${API_BASE}/driver-faces/${formatted}.png`;
    }
    
    return (
      <div className={`rounded-full overflow-hidden border-2 shadow-lg mb-[-10px] z-10 bg-gray-200 relative ${isDark ? 'border-neutral-700' : 'border-white'}`} style={{ width: '60px', height: '60px' }}>
        {src && !imgError ? (
            <NgrokImage 
              src={src} 
              alt={alt} 
              className="w-full h-full object-cover object-top" 
              onError={() => setImgError(true)}
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
                <User className="w-8 h-8" />
            </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[1000] flex flex-col font-sans w-full h-full transition-colors duration-300" style={containerStyle}>
        {/* HEADER */}
        <div 
          className="flex-shrink-0 z-50 shadow-lg flex items-center gap-4 px-4 py-4" 
          style={{ background: 'linear-gradient(to right, #7f1d1d, #450a0a)', color: 'white' }}
        >
          <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md border border-white/10">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="font-black text-xl leading-none uppercase tracking-tight">{headerTitle}</h1>
            <span className="text-xs opacity-80 font-bold uppercase tracking-widest mt-1 inline-block text-red-100">
              {subTitle}
            </span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-grow overflow-y-auto">
          <div className="px-4 py-6 space-y-3">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin text-4xl mb-4 text-red-600">🏎️</div>
                    <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                        {is2026 ? "Running AI Simulation..." : "Fetching Results..."}
                    </p>
                </div>
            ) : (
                <>
                {/* 2026 PODIUM */}
                {is2026 && displayList.length > 0 && (
                    <div className={`mb-8 relative ${isDark ? 'bg-neutral-900/50' : 'bg-white/50'} rounded-2xl p-4 border ${isDark ? 'border-neutral-800' : 'border-slate-200'}`}>
                        <h2 className="uppercase font-bold tracking-widest text-[10px] mb-6 text-center flex items-center justify-center gap-2 text-gray-500">
                            <Trophy className="w-3 h-3 text-yellow-500" /> Projected Podium
                        </h2>
                        
                        <div className="flex items-end justify-center gap-3 h-56 max-w-sm mx-auto">
                            {/* P2 */}
                            {podium[1] && (
                                <div className="flex flex-col items-center w-1/3">
                                    <PodiumDriverImage id={podium[1].driverId} driverName={podium[1].driver} alt={podium[1].driver} />
                                    <div className={`w-full rounded-t-lg border-t border-x shadow-sm flex flex-col items-center h-24 relative ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-slate-300'}`}>
                                        <div className="w-full h-1.5 rounded-t-lg" style={{ backgroundColor: getTeamColor(podium[1].team) }} />
                                        <div className="mt-2 font-black text-2xl opacity-30">2</div>
                                        <div className="text-[10px] font-black uppercase text-center leading-tight">{podium[1].driver.split(' ').pop()}</div>
                                    </div>
                                </div>
                            )}

                            {/* P1 */}
                            {podium[0] && (
                                <div className="flex flex-col items-center w-1/3 z-10 -mx-1 mb-2">
                                    <Crown className="w-6 h-6 text-yellow-400 mb-1 fill-yellow-400 animate-bounce" />
                                    <PodiumDriverImage id={podium[0].driverId} driverName={podium[0].driver} alt={podium[0].driver} />
                                    <div className={`w-full rounded-t-lg border-t-4 border-x shadow-xl flex flex-col items-center h-36 relative ${isDark ? 'bg-neutral-800 border-neutral-700 border-t-yellow-500' : 'bg-white border-slate-300 border-t-yellow-400'}`}>
                                        <div className="mt-3 font-black text-4xl">1</div>
                                        <div className="text-xs font-black uppercase text-center leading-tight">{podium[0].driver.split(' ').pop()}</div>
                                        <div className="mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">
                                            {podium[0].probability}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* P3 */}
                            {podium[2] && (
                                <div className="flex flex-col items-center w-1/3">
                                    <PodiumDriverImage id={podium[2].driverId} driverName={podium[2].driver} alt={podium[2].driver} />
                                    <div className={`w-full rounded-t-lg border-t border-x shadow-sm flex flex-col items-center h-10 relative ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-slate-300'}`}>
                                        <div className="w-full h-1.5 rounded-t-lg" style={{ backgroundColor: getTeamColor(podium[2].team) }} />
                                        <div className="mt-2 font-black text-2xl opacity-30">3</div>
                                        <div className="text-[10px] font-black uppercase text-center leading-tight">{podium[2].driver.split(' ').pop()}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* LIST */}
                {displayList.map((result, index) => (
                    <div 
                        key={index}
                        className={`p-3 rounded-xl shadow-sm flex flex-col gap-2 border transition-all active:scale-[0.99] ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-white hover:shadow-md'}`}
                        style={{ borderLeft: `4px solid ${getTeamColor(result.team)}` }}
                        onClick={() => is2026 && setSelectedPrediction(result)} 
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-sm shadow-inner ${
                                result.position === 1 ? 'bg-yellow-100 text-yellow-700' : 
                                result.position === 2 ? 'bg-slate-200 text-slate-700' : 
                                result.position === 3 ? 'bg-orange-100 text-orange-800' : 
                                (isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-500')
                            }`}>
                                {result.position === 1 ? <Trophy className="w-4 h-4" /> : result.position}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className={`font-bold truncate text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{result.driver}</div>
                                <div className={`text-[10px] font-bold uppercase tracking-wide truncate ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>{result.team}</div>
                            </div>

                            <div className="text-right">
                                {is2026 ? (
                                    <div className="font-mono font-bold text-sm text-purple-500">
                                        {result.probability} <span className={`text-[9px] font-sans uppercase ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>WIN</span>
                                    </div>
                                ) : (
                                    result.wins !== undefined && result.wins > 0 ? (
                                        <div className="font-mono font-bold text-sm text-blue-500">
                                            {result.wins} <span className={`text-[9px] font-sans uppercase ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>WINS</span>
                                        </div>
                                    ) : (
                                        <div className="font-mono font-bold text-sm text-green-500">
                                            +{result.points} <span className={`text-[9px] font-sans uppercase ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>PTS</span>
                                        </div>
                                    )
                                )}
                            </div>
                            {is2026 && <Info className="w-4 h-4 text-gray-400" />}
                        </div>

                        {!is2026 && result.details && (
                            <div className={`mt-1 pl-12 pr-2 py-2 rounded-lg text-xs leading-relaxed flex gap-2 items-start ${isDark ? 'bg-neutral-800/50 text-neutral-400' : 'bg-slate-50 text-slate-600'}`}>
                                <Info className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-70" />
                                <span>{result.details}</span>
                            </div>
                        )}
                    </div>
                ))}
                </>
            )}

            {!loading && displayList.length === 0 && (
                <div className={`text-center py-12 rounded-2xl border border-dashed ${isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-slate-200 bg-white'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                        <Flag className={`w-6 h-6 ${isDark ? 'text-neutral-600' : 'text-slate-400'}`} />
                    </div>
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>No results available</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>Check back later</p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {selectedPrediction && (
        <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPrediction(null)} />
          <div className={`relative z-[1070] w-full max-w-lg rounded-2xl shadow-2xl p-8 pt-14 pb-10 border ${isDark ? 'border-neutral-700' : 'border-slate-200'}`} style={{ backgroundColor: isDark ? '#171717' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setSelectedPrediction(null)} className={`absolute top-4 right-4 p-1 rounded-full transition-colors ${isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4 mb-8 pr-12">
              <div className="w-1.5 h-12 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: getTeamColor(selectedPrediction.team) }} />
              <div className="flex flex-col">
                <h2 className="text-3xl font-bold leading-tight tracking-tight">{selectedPrediction.driver}</h2>
                <span className={`text-sm font-bold uppercase tracking-wider mt-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{selectedPrediction.team}</span>
              </div>
            </div>
            <div className={`grid grid-cols-3 gap-2 mb-8`}>
                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-[10px] font-bold uppercase text-yellow-500 flex items-center gap-1 mb-1"><Trophy className="w-3 h-3" /> Win</div>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedPrediction.probability}</div>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-[10px] font-bold uppercase text-green-500 flex items-center gap-1 mb-1"><BarChart3 className="w-3 h-3" /> Podium</div>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedPrediction.podiumProbability}</div>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-[10px] font-bold uppercase text-blue-500 flex items-center gap-1 mb-1"><TrendingUp className="w-3 h-3" /> Points</div>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedPrediction.pointsProbability}</div>
                </div>
            </div>
            <div>
                {/* <div className="flex items-center gap-2 text-green-600 mb-4 font-bold text-xs uppercase tracking-widest"><TrendingUp className="w-4 h-4"/> AI Analysis</div>
                <ul className="space-y-4">
                    {selectedPrediction.reasons?.positive?.map((r, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm leading-relaxed"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" /><span>{r}</span></li>
                    ))}
                    {(!selectedPrediction.reasons?.positive || selectedPrediction.reasons.positive.length === 0) && (
                          <li className={`flex items-start gap-3 text-sm leading-relaxed ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}><div className="w-1.5 h-1.5 rounded-full bg-gray-500 mt-2 flex-shrink-0" /><span>Standard performance expected.</span></li>
                    )}
                </ul> */}
            </div>
          </div>
        </div>
      )}
    </>
  );
}