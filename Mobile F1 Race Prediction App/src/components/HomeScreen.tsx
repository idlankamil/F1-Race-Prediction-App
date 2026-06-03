import { useEffect, useState } from 'react';
import { ChevronRight, Newspaper, Zap, MapPin, TrendingUp, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { races } from '../lib/data';
import { FanPulseWidget } from './FanPulseWidget';
// @ts-ignore
import { useTheme } from './../components/ThemeContext.tsx'; 
import { ThemeToggle } from './ThemeToggle';
import logo from '../styles/logo.png'; 

// 🟢 CONFIG
const API_BASE = 'https://isreal-falconiform-seasonedly.ngrok-free.dev'; 

interface HomeScreenProps {
  onNavigateToRace: (raceId: string) => void;
  onPredictRace: (raceId: string) => void; 
}

interface NewsArticle {
  Headline: string;
  Source: string;
  Date: string;
  Link: string;
  Team?: string; 
}

// Consistent Spacing
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

export function HomeScreen({ onNavigateToRace, onPredictRace }: HomeScreenProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [realNews, setRealNews] = useState<NewsArticle[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [hasModalOpen, setHasModalOpen] = useState(false);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  // --- MODAL DETECTION ---
  useEffect(() => {
    const checkForModals = () => {
      const modals = document.querySelectorAll('[data-modal="true"]');
      setHasModalOpen(modals.length > 0);
    };
    checkForModals();
    const interval = setInterval(checkForModals, 100);
    return () => clearInterval(interval);
  }, []);

  const nextRace = races.find(race => race.id === 'australian-gp-2026') || races.find(race => race.status === 'upcoming');
  
  useEffect(() => {
    if (!nextRace) return;
    const updateCountdown = () => {
      const now = new Date();
      const cleanDate = nextRace.date.replace(/-/g, '/'); 
      const cleanTime = nextRace.time ? nextRace.time : '12:00:00';
      const raceDateStr = `${cleanDate} ${cleanTime}`;
      const raceDate = new Date(raceDateStr);
      
      if (isNaN(raceDate.getTime())) return;
      const diff = raceDate.getTime() - now.getTime();
      
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ days, hours, minutes, seconds });
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextRace]);

  // --- LISTENER FOR CHATBOT UPDATES ---
  useEffect(() => {
    const handleNewsUpdateSignal = () => {
        setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('newsUpdated', handleNewsUpdateSignal);
    return () => window.removeEventListener('newsUpdated', handleNewsUpdateSignal);
  }, []);

  // --- FETCH NEWS ---
  useEffect(() => {
    const fetchNews = async () => {
      setIsRefreshing(true);
      try {
        const res = await fetch(`${API_BASE}/news/latest?t=${Date.now()}`, {
             headers: { "ngrok-skip-browser-warning": "true" }
        });
        if (res.ok) {
          const data = await res.json();
          setRealNews(data.slice(0, 5));
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (e) {
        console.error("Failed to fetch news", e);
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    };
    fetchNews();
  }, [refreshTrigger]); 
  
  if (!nextRace) return null;

  // --- DYNAMIC STYLES ---
  const containerStyle = isDark 
    ? { backgroundColor: '#0a0a0a', color: '#ee1919ff' } 
    : { 
        backgroundColor: '#E2E8F0',
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        color: '#1e293b' 
      };

  const getBorderColor = (section: 'hero' | 'pulse' | 'news' | 'card') => {
    if (isDark) {
      switch(section) {
        case 'hero': return 'border-gray-700';
        case 'pulse': return 'border-blue-900/40';
        case 'news': return 'border-green-900/40';
        case 'card': return 'border-neutral-800';
        default: return 'border-neutral-800';
      }
    } else {
      switch(section) {
        case 'hero': return 'border-red-200';
        case 'pulse': return 'border-blue-200';
        case 'news': return 'border-green-200';
        case 'card': return 'border-slate-200';
        default: return 'border-slate-200';
      }
    }
  };

  const getHeroCardBg = () => {
    if (isDark) {
      return { background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', color: '#ffffff' };
    } else {
      return { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff' };
    }
  };

  const getCountdownBoxStyle = () => {
    if (isDark) {
      return { backgroundColor: '#262626', borderColor: '#404040', color: '#ffffff' };
    } else {
      return { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' };
    }
  };

  const badgeStyle = { backgroundColor: '#dc2626', color: '#ffffff' };
  const speedLinesColor = isDark ? 'bg-gray-700/10' : 'bg-white/5';
  const heroCardStyle = getHeroCardBg();
  const countdownBoxStyle = getCountdownBoxStyle();

  return (
    <div 
      className={`min-h-screen font-sans w-full transition-colors duration-300 ${hasModalOpen ? 'z-0' : ''}`}
      style={containerStyle}
      data-home-screen="true"
    >
      
      {/* --- HEADER (FIXED POSITION) --- */}
      {/* 🟢 CHANGED: Fixed position, top-0, z-50 to ensure it floats above all scrolling content */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 px-6 pt-12 pb-6 shadow-2xl flex justify-between items-center transition-colors duration-300 backdrop-blur-md"
        style={{ 
            background: 'linear-gradient(to right, #7f1d1d, #450a0a)',
            transform: 'translateZ(0)' // Hardware accel
        }}
      >
        <div>
            <div className="flex items-center gap-2 mt-6">
                <img src={logo} alt="F1INSIDER" className="h-8 w-auto" />
            </div>
        </div>

        <div className="flex items-center gap-3">
            <ThemeToggle />
        </div>
      </div>

      {/* --- CONTENT WRAPPER --- */}
      {/* 🟢 CHANGED: Added paddingTop (pt-[140px]) to account for the fixed header height */}
      <div className="pt-[140px] pb-10">
        
        {/* Race Week Badge */}
        <div className="mb-4 px-6">
            <div className="inline-block px-3 py-2 rounded-xl bg-green-500 text-white dark:bg-red-600 dark:text-red-100">
            <h1 className="text-[10px] uppercase tracking-widest opacity-80">
                Race Week Hub
            </h1>
            </div>
        </div>

        {/* Content Body */}
        <div className={`${SPACING.SECTION_PADDING} ${SPACING.CONTENT_GAP}`}>
            
            {/* --- 1. HERO CARD --- */}
            <section className={SPACING.SECTION_MARGIN}>
            <div className={`${SPACING.HEADER_MARGIN} ${SPACING.SECTION_PADDING}`}>
                <div className={`flex items-center ${SPACING.COMPONENT_GAP} ${isDark ? 'text-white' : 'text-slate-800'}`}>
                <div className="w-1 h-6 bg-red-600 rounded-full shadow-sm mt-6"></div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-600 opacity-90 mb-0.5 mt-6">Featured</p>
                    <h2 className="font-bold text-xl tracking-tight">Next Grand Prix</h2>
                </div>
                </div>
            </div>
            
            <div className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('hero')} overflow-hidden`}>
                <div className={SPACING.CARD_GAP}>
                <div className={`${SPACING.BORDER_RADIUS} w-full`} style={heroCardStyle}>
                    <div className={`absolute top-0 right-0 w-40 h-full skew-x-12 transform translate-x-20 pointer-events-none ${speedLinesColor}`} />
                    <div className={`relative ${SPACING.CARD_PADDING}`}>
                    
                    {/* Date and Badge */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg border border-red-500 m-2" style={badgeStyle}>
                        Live Countdown
                        </div>
                        <span className={isDark ? "text-gray-400 text-xs font-mono tracking-wider" : "text-white/60 text-xs font-mono tracking-wider"}>
                        {nextRace.date}
                        </span>
                    </div>

                    {/* Race Info */}
                    <div className={`flex items-center ${SPACING.COMPONENT_GAP} mb-8`}>
                        <span className="text-5xl filter drop-shadow-2xl">{nextRace.flag}</span>
                        <div>
                        <h3 className="text-2xl font-black uppercase leading-none mb-1 text-white">
                            {nextRace.name}
                        </h3>
                        <div className="flex items-center gap-1 font-bold text-xs uppercase tracking-widest text-red-400">
                            <MapPin className="w-3 h-3" />
                            {nextRace.circuit}
                        </div>
                        </div>
                    </div>

                    {/* Countdown Grid */}
                    <div className={`grid grid-cols-4 ${SPACING.COMPONENT_GAP} mb-6`}>
                        {[
                        { label: 'DAYS', val: countdown.days },
                        { label: 'HRS', val: countdown.hours },
                        { label: 'MIN', val: countdown.minutes },
                        { label: 'SEC', val: countdown.seconds }
                        ].map((item, i) => (
                        <div key={i} className={`rounded-xl p-3 text-center backdrop-blur-md shadow-inner border ${isDark ? 'border-gray-700' : 'border-white/10'}`} style={countdownBoxStyle}>
                            <div className="text-2xl font-black tabular-nums leading-none mb-1 text-white">
                            {String(item.val).padStart(2, '0')}
                            </div>
                            <div className={`text-[10px] font-bold tracking-wider ${isDark ? 'text-gray-400' : 'text-white/40'}`}>
                            {item.label}
                            </div>
                        </div>
                        ))}
                    </div>

                    {/* PREDICT BUTTON */}
                    <Button 
                        onClick={() => onPredictRace(nextRace.id)}
                        disabled={hasModalOpen}
                        tabIndex={hasModalOpen ? -1 : 0}
                        className={`
                            group relative w-full h-14 mt-4 overflow-hidden rounded-xl border-0
                            font-black uppercase tracking-widest text-white shadow-xl transition-all duration-300
                            hover:scale-[1.02] active:scale-[0.98]
                            ${hasModalOpen ? 'pointer-events-none opacity-40 blur-sm grayscale' : ''} 
                            ${isDark 
                                ? 'bg-gradient-to-r from-red-700 via-red-600 to-orange-600 shadow-red-900/40' 
                                : 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 shadow-red-500/40'
                            }
                        `}
                    >
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 ease-in-out z-10" />
                        <div className="relative z-20 flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse fill-yellow-300" />
                            <span className="text-sm">View AI Prediction</span>
                            <TrendingUp className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                        </div>
                    </Button>

                    </div>
                </div>
                </div>
            </div>
            </section>

            {/* --- 2. FAN PULSE --- */}
            <section className={SPACING.SECTION_MARGIN}>
                <div className={`${SPACING.HEADER_MARGIN} ${SPACING.SECTION_PADDING}`}>
                    <div className={`flex items-center ${SPACING.COMPONENT_GAP} ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    <div className={`w-1 h-6 rounded-full shadow-sm ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`}></div>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Community</p>
                        <h2 className="font-bold text-xl tracking-tight">Fan Pulse</h2>
                    </div>
                    </div>
                    <p className={`text-sm mt-2 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Real-time sentiment from F1 fans worldwide
                    </p>
                </div>
                
                <div className="isolate">
                <div className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${isDark ? 'border-neutral-800' : 'border-slate-200'}`}>
                    <div className={SPACING.CARD_GAP}>
                    <div className={`${SPACING.BORDER_RADIUS} ${isDark ? 'bg-neutral-900' : 'bg-slate-50'}`}>
                        <FanPulseWidget />
                    </div>
                    </div>
                </div>
                </div>
            </section>

            {/* --- 3. NEWS LIST --- */}
            <section className={SPACING.SECTION_MARGIN}>
            <div className={`${SPACING.HEADER_MARGIN} ${SPACING.SECTION_PADDING}`}>
                <div className={`flex items-center justify-between ${isDark ? 'text-white' : 'text-slate-800'}`}>
                <div className={`flex items-center ${SPACING.COMPONENT_GAP}`}>
                    <div className="w-1 h-6 bg-green-600 rounded-full shadow-sm"></div>
                    <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-green-600 opacity-90 mb-0.5">Updates</p>
                    <h2 className="font-bold text-xl tracking-tight">Trending News</h2>
                    </div>
                </div>
                
                <div className={`flex items-center ${SPACING.COMPONENT_GAP}`}>
                    {lastUpdated && (
                        <span className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
                            {lastUpdated}
                        </span>
                    )}
                    <button 
                        onClick={() => setRefreshTrigger(prev => prev + 1)}
                        disabled={isRefreshing}
                        className={`p-2 rounded-full transition-all active:scale-95 ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300' : 'bg-white hover:bg-gray-100 text-slate-600 shadow-sm'}`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-green-500' : ''}`} />
                    </button>
                </div>
                </div>
                <p className={`text-sm mt-2 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                Latest headlines from the F1 world
                </p>
            </div>

            <div className={SPACING.CONTENT_GAP}>
                {realNews.length === 0 ? (
                <div className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('news')}`}>
                    <div className={SPACING.CARD_GAP}>
                    <div className={`${SPACING.BORDER_RADIUS} border ${SPACING.CARD_PADDING} text-center ${isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-100'}`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                        <Newspaper className={`w-8 h-8 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`} />
                        </div>
                        <p className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No News Available</p>
                        <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>Ask the chatbot to fetch the latest news</p>
                    </div>
                    </div>
                </div>
                ) : (
                realNews.map((item, index) => (
                    <div key={index} className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('news')}`}>
                    <div className={SPACING.CARD_GAP}>
                        <a href={item.Link} target="_blank" rel="noopener noreferrer" className={`${SPACING.BORDER_RADIUS} ${SPACING.CARD_PADDING} shadow-md flex items-center ${SPACING.COMPONENT_GAP} transition-all active:scale-[0.99] border ${isDark ? 'bg-neutral-900 border-neutral-700 hover:border-neutral-600' : 'bg-white border-slate-100 hover:border-green-100 hover:shadow-lg'}`}>
                        <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center font-bold shadow-inner ${isDark ? 'bg-green-900/20 text-green-500' : 'bg-green-50 text-green-600'}`}>
                            <Zap className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm leading-snug line-clamp-2 mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.Headline}</h4>
                            <div className={`flex items-center ${SPACING.COMPONENT_GAP}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${isDark ? 'text-neutral-300 bg-neutral-800 border border-neutral-700' : 'text-slate-600 bg-slate-100 border border-slate-200'}`}>{item.Source}</span>
                            <span className={`text-xs ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>{item.Date}</span>
                            </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-neutral-600' : 'text-slate-400'}`} />
                        </a>
                    </div>
                    </div>
                ))
                )}
            </div>
            </section>
        </div>
      </div>
    </div>
  );
}