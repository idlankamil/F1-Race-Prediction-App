import React, { useState, useMemo, useEffect } from 'react';
import { Search, Camera, Upload, X, Sparkles, Filter, Trophy } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
// @ts-ignore
import { useTheme } from './../components/ThemeContext.tsx'; 
import { ThemeToggle } from './ThemeToggle'; 
import logo from '../styles/logo.png'; 

// 🟢 CONFIG
const API_BASE = 'https://isreal-falconiform-seasonedly.ngrok-free.dev';

// 🟢 TEAMS LIST
const teams = [
  { name: 'All Teams', value: 'all', color: '#FFFFFF' },
  { name: 'Red Bull', value: 'Red Bull', color: '#3671C6' },
  { name: 'McLaren', value: 'McLaren', color: '#FF8000' },
  { name: 'Mercedes', value: 'Mercedes', color: '#27F4D2' },
  { name: 'Ferrari', value: 'Ferrari', color: '#E8002D' },
  { name: 'Williams', value: 'Williams', color: '#64C4FF' },
  { name: 'Aston Martin', value: 'Aston Martin', color: '#229971' },
  { name: 'Racing Bulls', value: 'Racing Bulls', color: '#6692FF' },
  { name: 'Haas', value: 'Haas', color: '#B6BABD' },
  { name: 'Kick Sauber', value: 'Kick Sauber', color: '#52E252' },
  { name: 'Alpine', value: 'Alpine', color: '#FF87BC' },
  { name: 'Retired Drivers', value: 'retired_teams', color: '#888888' },
];

const statusOptions = [
  { label: 'All Drivers', value: 'all' },
  { label: 'Active', value: 'Active' },
  { label: 'Retired', value: 'retired' },
];

const teamColors: Record<string, string> = {
  'Red Bull': '#3671C6',
  'McLaren': '#FF8000',
  'Mercedes': '#27F4D2',
  'Ferrari': '#E8002D',
  'Williams': '#64C4FF',
  'Aston Martin': '#229971',
  'Racing Bulls': '#6692FF',
  'Haas': '#B6BABD',
  'Kick Sauber': '#52E252',
  'Alpine': '#FF87BC',
  'default': '#888888'
};

interface Driver {
  id: string;
  name: string;
  team: string;
  nationality: string;
  number: string;
  age: number;
  f1_debut: number;
  world_champs: number;
  race_starts: number;
  wins: number;
  podiums: number;
  poles: number;
  status: string;
  teamColor?: string;
  stats?: Record<string, string | number>;
  images?: string[];
}

// 🟢 REFINED COMPONENT: HybridSecureImage
const HybridSecureImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        const response = await fetch(src, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          mode: 'cors'
        });

        if (!response.ok) throw new Error('Fetch failed');

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        
        if (isMounted) setImageSrc(objectUrl);

      } catch (err) {
        if (isMounted) {
            setImageSrc(src);
        }
      }
    };

    if (src) fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!isError) {
      setIsError(true);
      e.currentTarget.src = 'https://via.placeholder.com/300x400/333333/ffffff?text=No+Photo';
    }
  };

  if (!imageSrc) {
     return <div className={`bg-gray-200 animate-pulse ${className}`} />;
  }

  return (
    <img 
      src={imageSrc} 
      alt={alt} 
      className={className} 
      loading="lazy"
      onError={handleError}
    />
  );
};

export function DriversScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [driversList, setDriversList] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // 🟢 Fetch drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        console.log("🔄 Fetching drivers from API...");
        const response = await fetch(`${API_BASE}/drivers/all`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          const driversArray = result.drivers || [];
          
          if (driversArray.length === 0) {
            console.warn("⚠️ No drivers returned from API");
            setLoading(false);
            return;
          }
          
          const mappedDrivers = driversArray.map((driver: any) => {
            const team = driver.team || "Unknown";
            return {
              id: driver.id || driver.Abbr || "UNK",
              name: driver.name || driver.Full_Name || "Unknown",
              team: team,
              nationality: driver.country || driver.Nationality || "Unknown",
              number: String(driver.number || "0"),
              age: Number(driver.age || 0),
              f1_debut: Number(driver.f1_debut || driver.debut || 0),
              world_champs: Number(driver.world_champs || 0),
              race_starts: Number(driver.starts || 0),
              wins: Number(driver.wins || 0),
              podiums: Number(driver.podiums || 0),
              poles: Number(driver.poles || 0),
              status: driver.status || (driver.active ? 'Active' : 'Retired'),
              teamColor: teamColors[team] || teamColors.default,
              stats: {
                'Wins': Number(driver.wins || 0),
                'Podiums': Number(driver.podiums || 0),
                'Poles': Number(driver.poles || 0),
                'Starts': Number(driver.starts || 0)
              }
            };
          });
          
          setDriversList(mappedDrivers);
        }
      } catch (error) {
        console.error('🔥 Error fetching drivers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDrivers();
  }, []);

  // 🟢 Filter logic
  const filteredDrivers = useMemo(() => {
    return driversList.filter((driver) => {
      const matchesSearch = 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.nationality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTeam = 
        selectedTeam === 'all' || 
        driver.team === selectedTeam ||
        (selectedTeam === 'retired_teams' && driver.status !== 'Active');
      
      const matchesStatus = 
        selectedStatus === 'all' ||
        (selectedStatus === 'Active' && driver.status === 'Active') ||
        (selectedStatus === 'retired' && driver.status !== 'Active');
      
      return matchesSearch && matchesTeam && matchesStatus;
    });
  }, [driversList, searchQuery, selectedTeam, selectedStatus]);

  // 🟢 Upload Logic
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result as string);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE}/identify-driver`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
          body: formData,
        });
        
        const data = await response.json();

        if (data.success && data.driver_id) {
            let matchedDriver = driversList.find(d => d.id === data.driver_id);
            const enhancedDriver = {
                ...matchedDriver,
                id: data.driver_id,
                name: data.driver_info?.name || matchedDriver?.name || data.driver_id,
                team: data.driver_info?.team || matchedDriver?.team || "Unknown",
                nationality: data.driver_info?.country || matchedDriver?.nationality || "Unknown",
                number: String(data.driver_info?.number || matchedDriver?.number || "0"),
                age: Number(data.driver_info?.age || matchedDriver?.age || 0),
                wins: Number(data.driver_info?.wins || matchedDriver?.wins || 0),
                podiums: Number(data.driver_info?.podiums || matchedDriver?.podiums || 0),
                poles: Number(data.driver_info?.poles || matchedDriver?.poles || 0),
                world_champs: Number(data.driver_info?.world_champs || matchedDriver?.world_champs || 0),
                status: "Active",
                teamColor: teamColors[data.driver_info?.team || matchedDriver?.team || "default"] || teamColors.default,
                stats: {
                   'Wins': Number(data.driver_info?.wins || matchedDriver?.wins || 0),
                   'Podiums': Number(data.driver_info?.podiums || matchedDriver?.podiums || 0)
                }
            } as Driver;

            setSelectedDriver(enhancedDriver);
        } else {
          alert(`❌ ${data.message || "Identification failed"}`);
          setSelectedDriver(null);
        }
      } catch (error) {
        console.error(error);
        alert("Server connection failed.");
      }
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    setInputMessage('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "I'm the Grand Prix Guru! (Demo Response)" }]);
    }, 1000);
  };

  const containerStyle = isDark 
    ? { backgroundColor: '#0a0a0a', color: '#ffffff' } 
    : { backgroundColor: '#E2E8F0', color: '#1e293b', backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' };

  return (
    <div className="min-h-screen pb-24 font-sans w-full transition-colors duration-300" style={containerStyle}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 px-6 pt-12 pb-6 shadow-lg flex justify-between items-center transition-colors duration-300" style={{ background: 'linear-gradient(to right, #7f1d1d, #450a0a)' }}>
        <div><div className="flex items-center gap-2 mt-6"><img src={logo} alt="F1INSIDER" className="h-8 w-auto" /></div></div>
        <div className="flex items-center gap-3"><ThemeToggle /></div>
      </div>

      {/* Content */}
      <div className="pt-32 px-4"> 
        <div className="mb-8 pl-2">
          <div className="inline-block px-3 py-2 rounded-xl bg-green-500 text-white dark:bg-red-600 dark:text-red-100">
            <h1 className="text-[10px] uppercase tracking-widest opacity-80">F1 DRIVERS HALL OF FAME</h1>
          </div>
          <p className={`text-xs mt-2 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>{filteredDrivers.length} drivers • Active & Retired Legends</p>
        </div>

        {/* Status Filter */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-tight transition-all border ${selectedStatus === option.value ? 'bg-red-600 text-white border-red-600 shadow-md' : isDark ? 'bg-neutral-900 text-neutral-400 border-neutral-800' : 'bg-white text-slate-500 border-white shadow-sm'}`}
            >
              <Filter className="inline-block w-3 h-3 mr-2" />{option.label}
            </button>
          ))}
        </div>

        {/* AI Feature Card */}
        <div className="mb-6">
          <button onClick={() => setUploadDialogOpen(true)} className={`w-full border-2 rounded-xl p-6 transition-all text-left group active:scale-[0.99] ${isDark ? 'bg-gradient-to-br from-red-900/20 to-neutral-900 border-red-900/50 hover:border-red-600' : 'bg-white border-white hover:border-red-200 shadow-md hover:shadow-lg'}`}>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Camera className="w-7 h-7 text-white" /></div>
              <div className="flex-1">
                <h3 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Identify Driver AI</h3>
                <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>Upload a photo to instantly see stats & predictions</p>
              </div>
            </div>
          </button>
        </div>

        {/* Search & Team Filters */}
        <div className="mb-4 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`} />
          <Input type="text" placeholder="Search drivers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-10 h-12 border transition-all ${isDark ? 'bg-neutral-900/80 border-neutral-800 text-white' : 'bg-white border-white text-slate-900'}`} />
        </div>
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {teams.map((team) => (
              <button key={team.value} onClick={() => setSelectedTeam(team.value)} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-tight transition-all border ${selectedTeam === team.value ? 'bg-red-600 text-white border-red-600 shadow-md' : isDark ? 'bg-neutral-900 text-neutral-400 border-neutral-800' : 'bg-white text-slate-500 border-white shadow-sm'}`}>
                {team.value !== 'all' && team.value !== 'retired_teams' && <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: team.color }} />}{team.name}
              </button>
            ))}
          </div>
        </div>

        {/* Loading & Grid */}
        {loading ? (
          <div className="text-center py-12"><p className={isDark ? "text-neutral-500" : "text-slate-400"}>Loading drivers...</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredDrivers.map((driver) => (
              <div key={driver.id} className={`rounded-xl border overflow-hidden transition-all relative group ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-white shadow-sm'} ${driver.status !== 'Active' ? 'opacity-80' : ''}`}>
                <div className={`relative aspect-square ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                  
                  {/* Image */}
                  <HybridSecureImage 
                    src={`${API_BASE}/driver-faces/${driver.id}.png`}
                    alt={driver.name}
                    className="w-full h-full object-cover object-top"
                  />
                  
                  <div className="absolute top-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                    <span className="text-white font-bold text-xs">{driver.number}</span>
                  </div>
                  {driver.status !== 'Active' && <div className="absolute top-2 left-2 bg-gray-800/80 text-white text-[10px] px-2 py-1 rounded-full">RETIRED</div>}
                </div>
                <div className="p-3">
                  <div className="mb-1"><h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{driver.name}</h3></div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 rounded-full" style={{ backgroundColor: driver.teamColor }} />
                    <span className={`text-xs truncate ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>{driver.team}</span>
                  </div>
                  
                  {/* 🟢 STATS GRID - REPLACED EMOJIS WITH TEXT */}
                  <div className={`grid grid-cols-2 gap-y-2 gap-x-2 mt-3 pt-3 border-t border-dashed ${isDark ? 'border-neutral-800' : 'border-slate-100'}`}>
                    <div className="flex flex-col">
                        <span className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Wins</span>
                        <span className={`text-xs font-bold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>{driver.wins}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Podiums</span>
                        <span className={`text-xs font-bold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>{driver.podiums}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Poles</span>
                        <span className={`text-xs font-bold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>{driver.poles}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Champs</span>
                        <span className={`text-xs font-bold ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}>{driver.world_champs}</span>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className={`max-w-[90vw] max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl z-50 ${isDark ? '!bg-neutral-900 border-neutral-800 text-white' : '!bg-white border-slate-200 text-slate-900'}`} style={{ backgroundColor: isDark ? '#171717' : '#ffffff' }}>
          <DialogHeader>
            <DialogTitle>Identify Driver AI</DialogTitle>
            <DialogDescription>Upload a photo to identify.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!uploadedImage ? (
              <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer ${isDark ? 'border-neutral-700 bg-neutral-950' : 'border-slate-300 bg-slate-50'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-neutral-400" /><p className="text-sm">Tap to upload</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative w-full h-72">
                  <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover object-top rounded-xl" />
                  <button onClick={() => { setUploadedImage(null); setSelectedDriver(null); }} className="absolute top-2 right-2 w-9 h-9 bg-black/70 rounded-full flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
                </div>
                {selectedDriver && (
                  <div className={`rounded-xl p-4 border mt-2 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden">
                             <HybridSecureImage src={`${API_BASE}/driver-faces/${selectedDriver.id}.png`} alt={selectedDriver.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className={`font-black text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedDriver.name.toUpperCase()}</h3>
                            <p className="text-xs text-neutral-500">{selectedDriver.team}</p>
                        </div>
                    </div>
                    
                    {/* 🟢 FIXED: CLEAR STATS LABELS IN DIALOG */}
                    <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                        <div className={`p-2 rounded-lg border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`text-[8px] font-black uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>TITLES</div>
                            <div className="text-sm font-black">{selectedDriver.world_champs}</div>
                        </div>
                        <div className={`p-2 rounded-lg border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`text-[8px] font-black uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>WINS</div>
                            <div className="text-sm font-black">{selectedDriver.wins}</div>
                        </div>
                        <div className={`p-2 rounded-lg border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`text-[8px] font-black uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>PODIUMS</div>
                            <div className="text-sm font-black">{selectedDriver.podiums}</div>
                        </div>
                        <div className={`p-2 rounded-lg border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`text-[8px] font-black uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>POLES</div>
                            <div className="text-sm font-black">{selectedDriver.poles}</div>
                        </div>
                    </div>

                    <Button onClick={() => { setSearchQuery(selectedDriver.name); setUploadDialogOpen(false); setUploadedImage(null); setSelectedDriver(null); }} className="w-full bg-red-600 text-white font-bold rounded-xl">View Full Profile</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Sheet */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="bottom" className="bg-neutral-900/95 border-t-2 border-red-600 text-white h-[85vh] rounded-t-3xl p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-neutral-800">
            <SheetTitle>Grand Prix Guru</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-red-600' : 'bg-neutral-800'}`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-neutral-900">
            <div className="flex gap-2">
              <Input value={inputMessage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)} className="bg-neutral-800 border-neutral-700 text-white" placeholder="Ask AI about drivers..." />
              <Button onClick={handleSendMessage} className="bg-red-600"><Sparkles className="w-4 h-4" /></Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}