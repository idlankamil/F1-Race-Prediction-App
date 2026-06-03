import React, { useState, useEffect } from 'react';
import { ChevronRight, Calendar, Loader2, MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
// @ts-ignore
import { useTheme } from './../components/ThemeContext.tsx'; 
import { ThemeToggle } from './ThemeToggle';
import logo from '../styles/logo.png'; 

// 🟢 CONFIG
const API_BASE = 'https://isreal-falconiform-seasonedly.ngrok-free.dev';

// --- STATIC DATA: 2026 SCHEDULE ---
const SCHEDULE_2026 = [
  { "id": "2026-round-1", "round": 1, "name": "Australian Grand Prix", "circuit": "Melbourne, Australia", "date": "2026-03-08", "flag": "🇦🇺", "status": "upcoming" },
  { "id": "2026-round-2", "round": 2, "name": "Chinese Grand Prix", "circuit": "Shanghai, China", "date": "2026-03-15", "flag": "🇨🇳", "status": "upcoming" },
  { "id": "2026-round-3", "round": 3, "name": "Japanese Grand Prix", "circuit": "Suzuka, Japan", "date": "2026-03-29", "flag": "🇯🇵", "status": "upcoming" },
  { "id": "2026-round-4", "round": 4, "name": "Bahrain Grand Prix", "circuit": "Sakhir, Bahrain", "date": "2026-04-05", "flag": "🇧🇭", "status": "upcoming" },
  { "id": "2026-round-5", "round": 5, "name": "Saudi Arabian Grand Prix", "circuit": "Jeddah, Saudi Arabia", "date": "2026-04-12", "flag": "🇸🇦", "status": "upcoming" },
  { "id": "2026-round-6", "round": 6, "name": "Miami Grand Prix", "circuit": "Miami, USA", "date": "2026-05-03", "flag": "🇺🇸", "status": "upcoming" },
  { "id": "2026-round-7", "round": 7, "name": "Emilia Romagna Grand Prix", "circuit": "Imola, Italy", "date": "2026-05-17", "flag": "🇮🇹", "status": "upcoming" },
  { "id": "2026-round-8", "round": 8, "name": "Monaco Grand Prix", "circuit": "Monaco", "date": "2026-05-24", "flag": "🇲🇨", "status": "upcoming" },
  { "id": "2026-round-9", "round": 9, "name": "Spanish Grand Prix", "circuit": "Barcelona, Spain", "date": "2026-06-07", "flag": "🇪🇸", "status": "upcoming" },
  { "id": "2026-round-10", "round": 10, "name": "Canadian Grand Prix", "circuit": "Montreal, Canada", "date": "2026-06-14", "flag": "🇨🇦", "status": "upcoming" },
  { "id": "2026-round-11", "round": 11, "name": "Austrian Grand Prix", "circuit": "Spielberg, Austria", "date": "2026-06-28", "flag": "🇦🇹", "status": "upcoming" },
  { "id": "2026-round-12", "round": 12, "name": "British Grand Prix", "circuit": "Silverstone, UK", "date": "2026-07-05", "flag": "🇬🇧", "status": "upcoming" },
  { "id": "2026-round-13", "round": 13, "name": "Hungarian Grand Prix", "circuit": "Budapest, Hungary", "date": "2026-07-26", "flag": "🇭🇺", "status": "upcoming" },
  { "id": "2026-round-14", "round": 14, "name": "Belgian Grand Prix", "circuit": "Spa-Francorchamps, Belgium", "date": "2026-08-02", "flag": "🇧🇪", "status": "upcoming" },
  { "id": "2026-round-15", "round": 15, "name": "Dutch Grand Prix", "circuit": "Zandvoort, Netherlands", "date": "2026-08-30", "flag": "🇳🇱", "status": "upcoming" },
  { "id": "2026-round-16", "round": 16, "name": "Italian Grand Prix", "circuit": "Monza, Italy", "date": "2026-09-06", "flag": "🇮🇹", "status": "upcoming" },
  { "id": "2026-round-17", "round": 17, "name": "Azerbaijan Grand Prix", "circuit": "Baku, Azerbaijan", "date": "2026-09-20", "flag": "🇦🇿", "status": "upcoming" },
  { "id": "2026-round-18", "round": 18, "name": "Singapore Grand Prix", "circuit": "Marina Bay, Singapore", "date": "2026-10-04", "flag": "🇸🇬", "status": "upcoming" },
  { "id": "2026-round-19", "round": 19, "name": "United States Grand Prix", "circuit": "Austin, USA", "date": "2026-10-18", "flag": "🇺🇸", "status": "upcoming" },
  { "id": "2026-round-20", "round": 20, "name": "Mexico City Grand Prix", "circuit": "Mexico City, Mexico", "date": "2026-10-25", "flag": "🇲🇽", "status": "upcoming" },
  { "id": "2026-round-21", "round": 21, "name": "São Paulo Grand Prix", "circuit": "São Paulo, Brazil", "date": "2026-11-08", "flag": "🇧🇷", "status": "upcoming" },
  { "id": "2026-round-22", "round": 22, "name": "Las Vegas Grand Prix", "circuit": "Las Vegas, USA", "date": "2026-11-21", "flag": "🇺🇸", "status": "upcoming" },
  { "id": "2026-round-23", "round": 23, "name": "Qatar Grand Prix", "circuit": "Lusail, Qatar", "date": "2026-11-29", "flag": "🇶🇦", "status": "upcoming" },
  { "id": "2026-round-24", "round": 24, "name": "Abu Dhabi Grand Prix", "circuit": "Yas Marina, UAE", "date": "2026-12-06", "flag": "🇦🇪", "status": "upcoming" }
];

interface Race {
  id: string;
  round: number;
  name: string;
  circuit: string;
  date: string;
  flag: string;
  status: 'finished' | 'upcoming';
}

interface RaceSelectionScreenProps {
  onRaceSelect: (raceId: string) => void;
  selectedSeason: string;
  onSeasonChange: (season: string) => void;
}

const SPACING = {
  SECTION_MARGIN: 'mb-8',
  SECTION_PADDING: 'px-3',
  CARD_PADDING: 'p-3',
  CARD_GAP: 'p-3',
  BORDER_WIDTH: 'border-8',
  BORDER_RADIUS: 'rounded-2xl',
  CONTENT_GAP: 'space-y-6',
  HEADER_MARGIN: 'mb-3',
  COMPONENT_GAP: 'gap-3',
} as const;

export function RaceSelectionScreen({ onRaceSelect, selectedSeason, onSeasonChange }: RaceSelectionScreenProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchRaces = async () => {
      // 2026: Use Static Schedule
      if (selectedSeason === '2026') {
        setRaces(SCHEDULE_2026 as Race[]);
        return;
      }

      // 2025: Show Season Summary Link
      if (selectedSeason === '2025') {
        setRaces([{
           id: '2025-summary',
           round: 1,
           name: '2025 Championship Summary',
           circuit: 'Season Standings',
           date: '2025-12-31',
           flag: '🏆',
           status: 'finished'
        } as Race]);
        return;
      }

      // 2023/2024: Fetch from Python Backend
      setLoading(true);
      try {
        const url = `${API_BASE}/races/${selectedSeason}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "ngrok-skip-browser-warning": "true",
            "Content-Type": "application/json"
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setRaces(data.length > 0 ? data : []);
        } else {
          setRaces([]);
        }
      } catch (e) {
        setRaces([]);
      }
      setLoading(false);
    };

    fetchRaces();
  }, [selectedSeason]);

  const formatDate = (dateString: string) => {
    if (dateString.includes('-01-01')) return selectedSeason; 
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Styles
  const containerStyle = isDark 
    ? { backgroundColor: '#0a0a0a', color: '#ee1919ff' } 
    : { 
        backgroundColor: '#E2E8F0', 
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        color: '#1e293b' 
      };

  const getBorderColor = (section: string) => {
    if (isDark) {
      if (section === 'season') return 'border-blue-900/40';
      if (section === 'race') return 'border-green-900/40';
      return 'border-neutral-800';
    }
    if (section === 'season') return 'border-blue-200';
    if (section === 'race') return 'border-green-200';
    return 'border-slate-200';
  };

  // 🟢 FIX: Tailwind classes for background
  const selectTriggerClass = isDark 
    ? "bg-neutral-900 text-white border-neutral-700" 
    : "bg-white text-neutral-900 border-gray-200";

  // 🟢 FIX: Define explicit background colors for the STYLE prop
  // This guarantees opacity even if CSS/Tailwind fails
  const solidBackground = isDark ? '#171717' : '#ffffff';

  return (
    <div 
      className="fixed inset-0 z-0 overflow-y-auto font-sans pb-24 transition-colors duration-300"
      style={containerStyle}
    >
      
      {/* HEADER */}
      <div 
        className="sticky top-0 z-50 shadow-2xl"
        style={{ background: 'linear-gradient(to right, #7f1d1d, #450a0a)' }}
      >
        <div className={`${SPACING.SECTION_PADDING} py-6`}>
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="flex items-center gap-2">
                <img src={logo} alt="F1INSIDER" className="h-8 w-auto" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
          
          {/* Season Selector */}
          <div className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('season')}`}>
            <div className={SPACING.CARD_GAP}>
              <div className={`${SPACING.BORDER_RADIUS} ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
                <div className={SPACING.CARD_PADDING}>
                  <Select value={selectedSeason} onValueChange={onSeasonChange}>
                    <SelectTrigger 
                      className={`w-full rounded-xl shadow-md h-12 font-bold uppercase tracking-wide border-0 ring-0 focus:ring-0 ${selectTriggerClass}`}
                      // 🟢 FORCE SOLID BACKGROUND ON TRIGGER
                      style={{ backgroundColor: solidBackground }}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    
                    <SelectContent 
                      className={`rounded-xl shadow-xl z-[100] border ${isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-gray-100 text-neutral-900'}`}
                      // 🟢 FORCE SOLID BACKGROUND ON DROPDOWN LIST (THE FIX)
                      style={{ backgroundColor: solidBackground, opacity: 1 }}
                    >
                      <SelectItem value="2026" className="font-bold cursor-pointer hover:bg-red-50 dark:hover:bg-neutral-800">2026 Season (Upcoming)</SelectItem>
                      <SelectItem value="2025" className="font-bold cursor-pointer hover:bg-red-50 dark:hover:bg-neutral-800">2025 Season (Summary)</SelectItem>
                      <SelectItem value="2024" className="font-bold cursor-pointer hover:bg-red-50 dark:hover:bg-neutral-800">2024 Season</SelectItem>
                      <SelectItem value="2023" className="font-bold cursor-pointer hover:bg-red-50 dark:hover:bg-neutral-800">2023 Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Title Badge */}
      <div className="mt-6 mb-6 px-6">
        <div className="inline-block px-3 py-2 rounded-xl bg-green-500 text-white dark:bg-red-600 dark:text-red-100">
          <h1 className="text-[10px] uppercase tracking-widest opacity-80">
            RACE CALENDAR
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${SPACING.SECTION_PADDING} ${SPACING.CONTENT_GAP}`}>
        
        <section className={SPACING.SECTION_MARGIN}>
          <div className={`${SPACING.HEADER_MARGIN} ${SPACING.SECTION_PADDING}`}>
            <div className={`flex items-center ${SPACING.COMPONENT_GAP} ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <div className="w-1 h-7 bg-red-600 rounded-full shadow-sm mt-3.5"></div>
              <div>
                <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  Season {selectedSeason}
                </h1>
                <p className={`text-xs font-bold uppercase tracking-widest mb-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  Grand Prix
                </p>
              </div>
            </div>
            <p className={`text-sm mt-2 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
              Select a race to view {selectedSeason === '2026' ? 'AI predictions' : 'results'}
            </p>
          </div>

          {loading ? (
            <div className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('card')}`}>
              <div className={SPACING.CARD_GAP}>
                <div className={`${SPACING.BORDER_RADIUS} ${SPACING.CARD_PADDING} text-center ${isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-100'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                    <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                  <p className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Loading Calendar...</p>
                </div>
              </div>
            </div>
          ) : races.length === 0 ? (
            <div className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('card')}`}>
              <div className={SPACING.CARD_GAP}>
                <div className={`${SPACING.BORDER_RADIUS} ${SPACING.CARD_PADDING} text-center ${isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-100'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                    <Calendar className={`w-8 h-8 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`} />
                  </div>
                  <p className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No race data found</p>
                  <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>Ensure backend is running</p>
                </div>
              </div>
            </div>
          ) : (
            <div className={SPACING.CONTENT_GAP}>
              {races.map((race) => (
                <div key={race.id} className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('race')}`}>
                  <div className={SPACING.CARD_GAP}>
                    <button
                      onClick={() => onRaceSelect(race.id)}
                      className={`
                        ${SPACING.BORDER_RADIUS} ${SPACING.CARD_PADDING} shadow-md flex items-center ${SPACING.COMPONENT_GAP}
                        transition-all active:scale-[0.99] border w-full text-left group
                        ${isDark ? 'bg-neutral-900 border-neutral-700 hover:border-neutral-600' : 'bg-white border-slate-100 hover:border-blue-100 hover:shadow-lg'}
                      `}
                    >
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-3xl shadow-inner border ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-gray-50 border-gray-100'}`}>
                        {race.flag}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center ${SPACING.COMPONENT_GAP} mb-1`}>
                          <span className={`${isDark ? 'text-red-400 border-red-900/50 bg-red-900/20' : 'text-red-600 border-red-100 bg-red-50'} text-[9px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded`}>
                            Round {race.round}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                            race.status === 'finished'
                              ? (isDark ? 'bg-green-900/20 text-green-400 border border-green-800/50' : 'bg-green-50 text-green-700 border border-green-100')
                              : (isDark ? 'bg-blue-900/20 text-blue-400 border border-blue-800/50' : 'bg-blue-50 text-blue-700 border border-blue-100')
                          }`}>
                            {race.status === 'finished' ? 'Finished' : 'Upcoming'}
                          </span>
                        </div>
                        
                        <h4 className={`font-bold text-sm leading-snug mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {race.name}
                        </h4>
                        <div className={`flex items-center ${SPACING.COMPONENT_GAP}`}>
                          <MapPin className={`w-3 h-3 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`} />
                          <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                            {race.circuit}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-bold whitespace-nowrap px-2 py-1 rounded-md ${isDark ? 'text-white bg-neutral-800' : 'text-gray-900 bg-gray-100'}`}>
                          {formatDate(race.date)}
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-colors ${isDark ? 'text-neutral-600 group-hover:text-red-400' : 'text-gray-300 group-hover:text-red-600'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}