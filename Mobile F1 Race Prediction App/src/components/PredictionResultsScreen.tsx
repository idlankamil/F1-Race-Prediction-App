import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, TrendingUp, Trophy, Crown, User, X, BarChart3 } from 'lucide-react';
import { races, drivers } from '../lib/data'; 
import { useTheme } from './ThemeContext';
import { getDriverImage } from '../lib/images';

// 🟢 CONFIG
const API_BASE = 'https://isreal-falconiform-seasonedly.ngrok-free.dev';

// --- TYPES ---
type PredictionCard = {
  id: string;
  driverName: string;
  driverId: string | null; 
  team: string;
  position: number;
  probability: string;       // Win %
  podiumProbability: string; // Podium %
  pointsProbability: string; // Points %
  reasons: {
    positive: string[];
    negative: string[];
  };
  driver: { teamColor: string };
};

// Helper to find ID from Name
const getDriverIdByName = (fullName: string) => {
  // 1. Try exact match in local data
  const entry = Object.values(drivers).find(d => d.name === fullName);
  if (entry) return entry.id;

  // 2. Fallback: Try partial match (e.g. "Verstappen" in "Max Verstappen")
  const partial = Object.values(drivers).find(d => fullName.includes(d.lastname));
  return partial ? partial.id : null;
};

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
  if (t.includes('sauber') || t.includes('kick') || t.includes('audi')) return '#52E252';
  if (t.includes('rb') || t.includes('racing bulls')) return '#6692FF';
  return '#666666';
};

interface PredictionResultsScreenProps {
  raceId: string;
  onBack: () => void;
}

export function PredictionResultsScreen({ raceId, onBack }: PredictionResultsScreenProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedDriver, setSelectedDriver] = useState<PredictionCard | null>(null);
  const [predictions, setPredictions] = useState<PredictionCard[]>([]);
  const [loading, setLoading] = useState(true);

  const race = races.find(r => r.id === raceId);

  useEffect(() => {
    if (!race) { setLoading(false); return; }

    const fetchPredictions = async () => {
      try {
        const response = await fetch(`${API_BASE}/predict`, {
          method: 'POST',
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            circuit_name: race.circuit || "Unknown Circuit"
          })
        });

        if (!response.ok) throw new Error("API Failed");

        const data = await response.json();
        const backendList = data.predictions || [];

        const formattedResults: PredictionCard[] = backendList.map((item: any) => {
            // 1. Win Probability
            const winVal = typeof item.probability === 'number' ? item.probability : parseFloat(item.probability || '0');
            
            // 2. Podium Probability (Prioritize direct backend value)
            let podiumVal = 0;
            if (item.podium_probability !== undefined && item.podium_probability !== null) {
                podiumVal = typeof item.podium_probability === 'number' ? item.podium_probability : parseFloat(item.podium_probability);
            } else if (item.stats && item.stats.podium_prob) {
                // Legacy fallback
                podiumVal = item.stats.podium_prob;
            } else {
                // Math fallback
                if (item.position <= 3) podiumVal = Math.min(99, Math.max(70, winVal * 2));
                else if (item.position <= 6) podiumVal = Math.min(60, Math.max(20, winVal * 4));
                else podiumVal = Math.max(1, 15 - item.position);
            }

            // 3. Points Probability (Prioritize direct backend value)
            let pointsVal = 0;
            if (item.points_probability !== undefined && item.points_probability !== null) {
                pointsVal = typeof item.points_probability === 'number' ? item.points_probability : parseFloat(item.points_probability);
            } else if (item.stats && item.stats.points_prob) {
                // Legacy fallback
                pointsVal = item.stats.points_prob;
            } else {
                // Math fallback
                if (item.position <= 10) pointsVal = Math.min(99, Math.max(60, 100 - (item.position * 5)));
                else pointsVal = Math.max(5, 40 - ((item.position - 10) * 5));
            }

            // 4. ID Resolution
            const resolvedId = getDriverIdByName(item.driver.name) || item.driver.id;

            return {
                id: item.driver.name,
                driverName: item.driver.name,
                driverId: resolvedId,
                team: item.driver.team,
                position: item.position,
                probability: winVal.toFixed(1) + "%",
                podiumProbability: podiumVal.toFixed(1) + "%",
                pointsProbability: pointsVal.toFixed(1) + "%",
                reasons: item.reasons || { positive: [], negative: [] },
                driver: { teamColor: getTeamColor(item.driver.team) }
            };
        });

        setPredictions(formattedResults);
      } catch (error) {
        console.error("Prediction Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
}, [raceId, race]);

  if (!race) return null;

  // --- STYLES ---
  const containerStyle = isDark 
    ? { backgroundColor: '#0a0a0a', color: '#ffffff' } 
    : { backgroundColor: '#f0f2f5', color: '#0f172a' };

  const cardBg = isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-neutral-400' : 'text-slate-500';

  if (loading) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center font-sans" style={containerStyle}>
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4 text-red-600">🏎️</div>
          <p className={`uppercase tracking-widest font-bold text-xs ${textSecondary}`}>
            Running Simulations...
          </p>
        </div>
      </div>
    );
  }

  const podium = predictions.slice(0, 3);
  
  const PodiumDriverImage = ({ id, alt }: { id: string | null, alt: string }) => {
    // Ensure we try to fetch image, handle missing ID gracefully
    const src = id ? getDriverImage(id) : null;
    return (
      <div className={`rounded-full overflow-hidden border-2 shadow-lg mb-[-10px] z-10 bg-gray-200 relative ${isDark ? 'border-neutral-700' : 'border-white'}`} style={{ width: '60px', height: '60px' }}>
        {src ? (
            <img 
                src={src} 
                alt={alt} 
                className="w-full h-full object-cover object-top" 
                onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
            />
        ) : null}
        {/* Fallback Icon */}
        <div className={`w-full h-full flex items-center justify-center text-gray-400 absolute top-0 left-0 ${src ? 'hidden' : ''}`}>
            <User className="w-8 h-8" />
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-0 overflow-y-auto font-sans pb-20 w-full h-full transition-colors duration-300"
        style={containerStyle}
      >
        
        {/* HEADER */}
        <div 
          className="sticky top-0 z-50 shadow-lg px-4 py-4"
          style={{ background: 'linear-gradient(to right, #991b1b, #7f1d1d)' }}
        >
            <button onClick={onBack} className="flex items-center text-white/90 hover:text-white mb-4 transition-colors">
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="font-medium text-sm">Back</span>
            </button>
            
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                      <span className="text-4xl drop-shadow-md">{race.flag}</span>
                      <div>
                          <h1 className="text-white uppercase font-black text-2xl leading-none tracking-tight">{race.name}</h1>
                          <p className="text-xs font-bold mt-1 uppercase tracking-widest text-red-200">{race.circuit}</p>
                      </div>
                  </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                  <span className="text-[10px] font-bold uppercase text-white tracking-widest">
                      AI Forecast
                  </span>
              </div>
            </div>
        </div>

        {/* PODIUM SECTION */}
        <div className={`px-4 py-10 relative ${isDark ? 'bg-gradient-to-b from-neutral-900 to-transparent' : 'bg-gradient-to-b from-slate-100 to-transparent'}`}>
          <h2 className={`uppercase font-bold tracking-widest text-[10px] mb-8 text-center flex items-center justify-center gap-2 ${textSecondary}`}>
              <Trophy className="w-3 h-3 text-yellow-500" /> Projected Podium
          </h2>
          
          <div className="flex items-end justify-center gap-3 h-56 max-w-sm mx-auto">
            {/* P2 (Left) */}
            {podium[1] && (
              <div className="flex flex-col items-center w-1/3">
                <PodiumDriverImage id={podium[1].driverId} alt={podium[1].driverName} />
                <div className={`w-full rounded-t-lg border-t border-x shadow-sm flex flex-col items-center h-32 relative ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-slate-300'}`}>
                  <div className="w-full h-1.5 rounded-t-lg" style={{ backgroundColor: getTeamColor(podium[1].team) }} />
                  <div className={`mt-3 font-black text-3xl ${textSecondary} opacity-30`}>2</div>
                  <div className="flex flex-col items-center justify-end h-full w-full pb-3">
                      <div className={`text-[10px] font-black uppercase text-center leading-tight px-1 ${textPrimary}`}>
                          {podium[1].driverName.split(' ').pop()}
                      </div>
                      <div className="mt-1 text-[9px] font-bold text-gray-500">{podium[1].probability}</div>
                  </div>
                </div>
              </div>
            )}

            {/* P1 (Center) */}
            {podium[0] && (
              <div className="flex flex-col items-center w-1/3 -mx-1 mb-2">
                <Crown className="w-8 h-8 text-yellow-400 mb-1 fill-yellow-400 animate-bounce" />
                <PodiumDriverImage id={podium[0].driverId} alt={podium[0].driverName} />
                <div className={`w-full rounded-t-lg border-t-4 border-x shadow-xl flex flex-col items-center h-44 relative ${isDark ? 'bg-neutral-800 border-neutral-700 border-t-yellow-500' : 'bg-white border-slate-300 border-t-yellow-400'}`}>
                  <div className={`mt-4 font-black text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>1</div>
                  <div className="flex flex-col items-center justify-end h-full w-full pb-4">
                      <div className={`text-xs font-black uppercase text-center leading-tight px-1 ${textPrimary}`}>
                          {podium[0].driverName.split(' ').pop()}
                      </div>
                      <div className={`mt-2 px-2 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                          {podium[0].probability} Win
                      </div>
                  </div>
                </div>
              </div>
            )}

            {/* P3 (Right) */}
            {podium[2] && (
              <div className="flex flex-col items-center w-1/3">
                <PodiumDriverImage id={podium[2].driverId} alt={podium[2].driverName} />
                <div className={`w-full rounded-t-lg border-t border-x shadow-sm flex flex-col items-center h-24 relative ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-slate-300'}`}>
                  <div className="w-full h-1.5 rounded-t-lg" style={{ backgroundColor: getTeamColor(podium[2].team) }} />
                  <div className={`mt-3 font-black text-3xl ${textSecondary} opacity-30`}>3</div>
                  <div className="flex flex-col items-center justify-end h-full w-full pb-3">
                      <div className={`text-[10px] font-black uppercase text-center leading-tight px-1 ${textPrimary}`}>
                          {podium[2].driverName.split(' ').pop()}
                      </div>
                      <div className="mt-1 text-[9px] font-bold text-gray-500">{podium[2].probability}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FULL GRID LIST */}
        <div className="px-4 space-y-3 pt-2">
            <div className={`text-xs font-bold uppercase tracking-widest mb-2 px-1 ${textSecondary}`}>Full Grid Forecast</div>
            {predictions.map((p) => (
              <div 
                  key={p.id} 
                  onClick={() => setSelectedDriver(p)}
                  className={`rounded-xl border shadow-sm p-3 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer ${cardBg}`}
                  style={{ borderLeft: `4px solid ${getTeamColor(p.team)}` }}
              >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        p.position === 1 ? 'bg-yellow-100 text-yellow-700' :
                        p.position === 2 ? 'bg-gray-200 text-gray-700' :
                        p.position === 3 ? 'bg-orange-100 text-orange-800' :
                        (isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-500')
                    }`}>
                      {p.position}
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${textPrimary}`}>{p.driverName}</div>
                      <div className={`text-[10px] font-bold uppercase ${textSecondary}`}>{p.team}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="text-right">
                          <div className="text-[10px] font-bold text-gray-400 uppercase">Win %</div>
                          <div className="text-green-600 font-bold font-mono text-sm">{p.probability}</div>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-400'}`}>
                          <Info className="w-4 h-4" />
                      </div>
                  </div>
              </div>
            ))}
        </div>
      </div>

      {/* 🟢 CUSTOM MODAL OVERLAY */}
      {selectedDriver && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedDriver(null)}
          />
          
          {/* Modal Content */}
          <div 
            className={`relative z-[70] w-full max-w-lg rounded-2xl shadow-2xl p-8 pt-14 pb-10 border ${
              isDark ? 'border-neutral-700' : 'border-slate-200'
            }`}
            style={{ 
                backgroundColor: isDark ? '#171717' : '#ffffff', 
                color: isDark ? '#ffffff' : '#0f172a'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedDriver(null)}
              className={`absolute top-4 right-4 p-1 rounded-full transition-colors ${
                isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 mb-8 pr-12">
              <div 
                className="w-1.5 h-12 rounded-full mt-1 flex-shrink-0" 
                style={{ backgroundColor: getTeamColor(selectedDriver.team) }}
              />
              <div className="flex flex-col">
                <h2 className="text-3xl font-bold leading-tight tracking-tight">{selectedDriver.driverName}</h2>
                <span className={`text-sm font-bold uppercase tracking-wider mt-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {selectedDriver.team}
                </span>
              </div>
            </div>

            {/* 🟢 STATS GRID - Now uses correct API values */}
            <div className={`grid grid-cols-3 gap-2 mb-8`}>
                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-[10px] font-bold uppercase text-yellow-500 flex items-center gap-1 mb-1">
                        <Trophy className="w-3 h-3" /> Win
                    </div>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedDriver.probability}</div>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-[10px] font-bold uppercase text-green-500 flex items-center gap-1 mb-1">
                        <BarChart3 className="w-3 h-3" /> Podium
                    </div>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedDriver.podiumProbability}</div>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-[10px] font-bold uppercase text-blue-500 flex items-center gap-1 mb-1">
                        <TrendingUp className="w-3 h-3" /> Points
                    </div>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedDriver.pointsProbability}</div>
                </div>
            </div>

            {/* Analysis List */}
          </div>
        </div>
      )}
    </>
  );
}