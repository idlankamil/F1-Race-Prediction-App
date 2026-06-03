// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export interface Race {
  id: string;
  round: number;
  name: string;
  circuit: string;
  country: string;
  date: string;
  status: 'finished' | 'upcoming';
  flag: string;
  time?: string; // Optional time field for upcoming races
}

export interface Driver {
  id: string;
  name: string;
  shortName: string;
  team: string;
  teamColor: string;
  number: number;
  nationality: string;
  status: 'active' | 'reserve';
  stats?: {
    championships: number;
    wins: number;
    podiums: number;
    poles: number;
  };
}

export interface Prediction {
  position: number;
  driver: Driver;
  probability: number;
  reasons: {
    positive: string[];
    negative: string[];
  };
}

export interface Constructor {
  id: string;
  name: string;
  shortName: string;
  color: string;
  logo: string;
  points: number;
  position: number;
  trend: 'up' | 'down' | 'stable';
  drivers: string[]; // Array of driver IDs
  winProbability: number;
  carImage: string;
}

// ==========================================
// TEAMS DATA (for Fan Pulse ratings)
// ==========================================

export const teams = {
  'McLaren': { id: 'mclaren', name: 'McLaren' },
  'Mercedes': { id: 'mercedes', name: 'Mercedes' },
  'Red Bull Racing': { id: 'red-bull', name: 'Red Bull Racing' },
  'Ferrari': { id: 'ferrari', name: 'Ferrari' },
  'Williams': { id: 'williams', name: 'Williams' },
  'Racing Bulls': { id: 'rb', name: 'Racing Bulls' },
  'Aston Martin': { id: 'aston-martin', name: 'Aston Martin' },
  'Haas F1 Team': { id: 'haas', name: 'Haas F1 Team' },
  'Kick Sauber': { id: 'sauber', name: 'Kick Sauber' },
  'Alpine': { id: 'alpine', name: 'Alpine' }
};


// ==========================================
// 2. DATA: DRIVERS
// ==========================================

export const drivers: Record<string, Driver> = {
  NOR: { id: 'NOR', name: 'Lando Norris', shortName: 'NOR', team: 'McLaren', teamColor: '#FF8000', number: 4, nationality: 'British', status: 'active', stats: { championships: 1, wins: 11, podiums: 44, poles: 16 } },
  VER: { id: 'VER', name: 'Max Verstappen', shortName: 'VER', team: 'Red Bull Racing', teamColor: '#3671C6', number: 1, nationality: 'Dutch', status: 'active', stats: { championships: 4, wins: 71, podiums: 127, poles: 48 } },
  PIA: { id: 'PIA', name: 'Oscar Piastri', shortName: 'PIA', team: 'McLaren', teamColor: '#FF8000', number: 81, nationality: 'Australian', status: 'active', stats: { championships: 0, wins: 9, podiums: 26, poles: 6 } },
  RUS: { id: 'RUS', name: 'George Russell', shortName: 'RUS', team: 'Mercedes', teamColor: '#27F4D2', number: 63, nationality: 'British', status: 'active', stats: { championships: 0, wins: 5, podiums: 24, poles: 7 } },
  LEC: { id: 'LEC', name: 'Charles Leclerc', shortName: 'LEC', team: 'Ferrari', teamColor: '#E8002D', number: 16, nationality: 'Monégasque', status: 'active', stats: { championships: 0, wins: 8, podiums: 50, poles: 27 } },
  HAM: { id: 'HAM', name: 'Lewis Hamilton', shortName: 'HAM', team: 'Ferrari', teamColor: '#E8002D', number: 44, nationality: 'British', status: 'active', stats: { championships: 7, wins: 105, podiums: 202, poles: 104 } },
  ANT: { id: 'ANT', name: 'Kimi Antonelli', shortName: 'ANT', team: 'Mercedes', teamColor: '#27F4D2', number: 12, nationality: 'Italian', status: 'active', stats: { championships: 0, wins: 0, podiums: 3, poles: 0 } },
  ALB: { id: 'ALB', name: 'Alexander Albon', shortName: 'ALB', team: 'Williams', teamColor: '#64C4FF', number: 23, nationality: 'Thai', status: 'active', stats: { championships: 0, wins: 0, podiums: 2, poles: 0 } },
  SAI: { id: 'SAI', name: 'Carlos Sainz', shortName: 'SAI', team: 'Williams', teamColor: '#64C4FF', number: 55, nationality: 'Spanish', status: 'active', stats: { championships: 0, wins: 4, podiums: 29, poles: 6 } },
  ALO: { id: 'ALO', name: 'Fernando Alonso', shortName: 'ALO', team: 'Aston Martin', teamColor: '#229971', number: 14, nationality: 'Spanish', status: 'active', stats: { championships: 2, wins: 32, podiums: 106, poles: 22 } },
  STR: { id: 'STR', name: 'Lance Stroll', shortName: 'STR', team: 'Aston Martin', teamColor: '#229971', number: 18, nationality: 'Canadian', status: 'active', stats: { championships: 0, wins: 0, podiums: 3, poles: 1 } },
  HUL: { id: 'HUL', name: 'Nico Hülkenberg', shortName: 'HUL', team: 'Kick Sauber', teamColor: '#52E252', number: 27, nationality: 'German', status: 'active', stats: { championships: 0, wins: 0, podiums: 1, poles: 1 } },
  BOR: { id: 'BOR', name: 'Gabriel Bortoleto', shortName: 'BOR', team: 'Kick Sauber', teamColor: '#52E252', number: 5, nationality: 'Brazilian', status: 'active', stats: { championships: 0, wins: 0, podiums: 0, poles: 0 } },
  TSU: { id: 'TSU', name: 'Yuki Tsunoda', shortName: 'TSU', team: 'Red Bull Racing', teamColor: '#3671C6', number: 22, nationality: 'Japanese', status: 'active', stats: { championships: 0, wins: 0, podiums: 0, poles: 0 } },
  LAW: { id: 'LAW', name: 'Liam Lawson', shortName: 'LAW', team: 'Racing Bulls', teamColor: '#6692FF', number: 30, nationality: 'New Zealander', status: 'active', stats: { championships: 0, wins: 0, podiums: 0, poles: 0 } },
  HAD: { id: 'HAD', name: 'Isack Hadjar', shortName: 'HAD', team: 'Racing Bulls', teamColor: '#6692FF', number: 6, nationality: 'French', status: 'active', stats: { championships: 0, wins: 0, podiums: 1, poles: 0 } },
  OCO: { id: 'OCO', name: 'Esteban Ocon', shortName: 'OCO', team: 'Haas F1 Team', teamColor: '#B6BABD', number: 31, nationality: 'French', status: 'active', stats: { championships: 0, wins: 1, podiums: 4, poles: 0 } },
  BEA: { id: 'BEA', name: 'Oliver Bearman', shortName: 'BEA', team: 'Haas F1 Team', teamColor: '#B6BABD', number: 87, nationality: 'British', status: 'active', stats: { championships: 0, wins: 0, podiums: 0, poles: 0 } },
  GAS: { id: 'GAS', name: 'Pierre Gasly', shortName: 'GAS', team: 'Alpine', teamColor: '#FF87BC', number: 10, nationality: 'French', status: 'active', stats: { championships: 0, wins: 1, podiums: 4, poles: 0 } },
  COL: { id: 'COL', name: 'Franco Colapinto', shortName: 'COL', team: 'Alpine', teamColor: '#FF87BC', number: 43, nationality: 'Argentine', status: 'active', stats: { championships: 0, wins: 0, podiums: 0, poles: 0 } },
};

// ==========================================
// 3. DATA: RACES
// ==========================================

export const races: Race[] = [
  {
    id: 'bahrain',
    round: 1,
    name: 'Gulf Air Bahrain Grand Prix',
    circuit: 'Bahrain International Circuit',
    country: 'Bahrain',
    date: '2025-03-02',
    status: 'finished',
    flag: '🇧🇭'
  },
  {
    id: 'saudi',
    round: 2,
    name: 'Saudi Arabian Grand Prix',
    circuit: 'Jeddah Corniche Circuit',
    country: 'Saudi Arabia',
    date: '2025-03-09',
    status: 'finished',
    flag: '🇸🇦'
  },
  {
    id: 'australia',
    round: 3,
    name: 'Australian Grand Prix',
    circuit: 'Melbourne, Australia',
    country: 'Australia',
    date: '2025-03-23',
    status: 'finished',
    flag: '🇦🇺'
  },
  {
    id: 'japan',
    round: 4,
    name: 'Japanese Grand Prix',
    circuit: 'Suzuka International Racing Course',
    country: 'Japan',
    date: '2025-04-06',
    status: 'finished',
    flag: '🇯🇵'
  },
  {
    id: 'china',
    round: 5,
    name: 'Chinese Grand Prix',
    circuit: 'Shanghai International Circuit',
    country: 'China',
    date: '2025-04-20',
    status: 'upcoming',
    flag: '🇨🇳'
  },
  {
    id: 'miami',
    round: 6,
    name: 'Miami Grand Prix',
    circuit: 'Miami International Autodrome',
    country: 'United States',
    date: '2025-05-04',
    status: 'upcoming',
    flag: '🇺🇸'
  },
  {
    id: 'imola',
    round: 7,
    name: 'Emilia Romagna Grand Prix',
    circuit: 'Autodromo Enzo e Dino Ferrari',
    country: 'Italy',
    date: '2025-05-18',
    status: 'upcoming',
    flag: '🇮🇹'
  },
  {
    id: 'monaco',
    round: 8,
    name: 'Monaco Grand Prix',
    circuit: 'Circuit de Monaco',
    country: 'Monaco',
    date: '2025-05-25',
    status: 'upcoming',
    flag: '🇲🇨'
  },
  {
    id: 'spain',
    round: 9,
    name: 'Spanish Grand Prix',
    circuit: 'Circuit de Barcelona-Catalunya',
    country: 'Spain',
    date: '2025-06-01',
    status: 'upcoming',
    flag: '🇪🇸'
  },
  {
    id: 'canada',
    round: 10,
    name: 'Canadian Grand Prix',
    circuit: 'Circuit Gilles Villeneuve',
    country: 'Canada',
    date: '2025-06-15',
    status: 'upcoming',
    flag: '🇨🇦'
  },
  
  // --- SPECIAL: AUSTRALIA 2026 TEST CASE ---
  {
    id: "australian-gp-2026", 
    round: 11,
    name: "Australian Grand Prix (2026)",
    circuit: "Melbourne, Australia",
    date: "2026-03-08", 
    time: "12:00 PM",
    flag: "🇦🇺",
    status: "upcoming",
    country: "Australia"
  },
  
  {
    id: 'britain',
    round: 12,
    name: 'Pirelli British Grand Prix',
    circuit: 'Silverstone Circuit',
    country: 'Great Britain',
    date: '2025-07-06',
    status: 'upcoming',
    flag: '🇬🇧'
  },
  {
    id: 'hungary',
    round: 13,
    name: 'Hungarian Grand Prix',
    circuit: 'Hungaroring',
    country: 'Hungary',
    date: '2025-07-20',
    status: 'upcoming',
    flag: '🇭🇺'
  },
  {
    id: 'belgium',
    round: 14,
    name: 'Belgian Grand Prix',
    circuit: 'Circuit de Spa-Francorchamps',
    country: 'Belgium',
    date: '2025-07-27',
    status: 'upcoming',
    flag: '🇧🇪'
  },
];

// ==========================================
// 4. DATA: CONSTRUCTORS
// ==========================================

export const constructors: Constructor[] = [
  {
    id: 'mclaren',
    name: 'McLaren Formula 1 Team',
    shortName: 'McLaren',
    color: '#F47600',
    logo: '🧡',
    points: 833,
    position: 1,
    trend: 'up',
    drivers: ['NOR', 'PIA'],
    winProbability: 85,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  },
  {
    id: 'mercedes',
    name: 'Mercedes-AMG Petronas F1 Team',
    shortName: 'Mercedes',
    color: '#00D7B6',
    logo: '⭐',
    points: 469,
    position: 2,
    trend: 'up',
    drivers: ['RUS', 'ANT'],
    winProbability: 40,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  },
  {
    id: 'red-bull',
    name: 'Oracle Red Bull Racing',
    shortName: 'Red Bull',
    color: '#4781D7',
    logo: '🏎️',
    points: 451,
    position: 3,
    trend: 'down',
    drivers: ['VER', 'TSU'],
    winProbability: 55,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  },
  {
    id: 'ferrari',
    name: 'Scuderia Ferrari HP',
    shortName: 'Ferrari',
    color: '#ED1131',
    logo: '🐎',
    points: 398,
    position: 4,
    trend: 'down',
    drivers: ['LEC', 'HAM'],
    winProbability: 42,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  },
  {
    id: 'williams',
    name: 'Atlassian Williams Racing',
    shortName: 'Williams',
    color: '#1868DB',
    logo: '💙',
    points: 137,
    position: 5,
    trend: 'up',
    drivers: ['ALB', 'SAI'],
    winProbability: 15,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  },
  {
    id: 'rb',
    name: 'Visa Cash App RB F1 Team',
    shortName: 'RB',
    color: '#6C98FF',
    logo: '🔵',
    points: 92,
    position: 6,
    trend: 'stable',
    drivers: ['LAW', 'HAD'],
    winProbability: 8,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  },
  {
    id: 'aston-martin',
    name: 'Aston Martin Aramco F1 Team',
    shortName: 'Aston Martin',
    color: '#229971',
    logo: '💚',
    points: 89,
    position: 7,
    trend: 'down',
    drivers: ['ALO', 'STR'],
    winProbability: 10,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  },
  {
    id: 'haas',
    name: 'MoneyGram Haas F1 Team',
    shortName: 'Haas',
    color: '#9C9FA2',
    logo: '⚪',
    points: 79,
    position: 8,
    trend: 'up',
    drivers: ['OCO', 'BEA'],
    winProbability: 5,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  },
  {
    id: 'sauber',
    name: 'Stake F1 Team Kick Sauber',
    shortName: 'Kick Sauber',
    color: '#01C00E',
    logo: '💚',
    points: 70,
    position: 9,
    trend: 'stable',
    drivers: ['HUL', 'BOR'],
    winProbability: 2,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  },
  {
    id: 'alpine',
    name: 'BWT Alpine F1 Team',
    shortName: 'Alpine',
    color: '#00A1E8',
    logo: '🩷',
    points: 22,
    position: 10,
    trend: 'down',
    drivers: ['GAS', 'COL'],
    winProbability: 1,
    carImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'
  }
];

// ==========================================
// 5. HELPER FUNCTIONS & MOCK DATA
// ==========================================

export const getPredictions = (raceId: string): Prediction[] => {
  // Mock predictions based on race - useful for fallback if API fails
  if (raceId === 'britain') {
    return [
      {
        position: 1,
        driver: drivers.NOR,
        probability: 65,
        reasons: {
          positive: ['Strong historical performance at this circuit', 'Ranked #1 in recent Practice 3 data', 'Home race advantage'],
          negative: ['Historically poor performance in wet conditions']
        }
      },
    ];
  }
  
  // Default predictions for other races
  return [
    { position: 1, driver: drivers.VER, probability: 68, reasons: { positive: ['Championship leader', 'Strong pace'], negative: ['Grid penalty risk'] } },
    { position: 2, driver: drivers.NOR, probability: 62, reasons: { positive: ['McLaren upgrades', 'Consistent form'], negative: ['Qualifying struggles'] } },
    { position: 3, driver: drivers.LEC, probability: 55, reasons: { positive: ['Ferrari pace', 'Circuit suits car'], negative: ['Reliability concerns'] } },
    { position: 4, driver: drivers.HAM, probability: 50, reasons: { positive: ['Experience', 'Race craft'], negative: ['Mercedes pace deficit'] } },
    { position: 5, driver: drivers.PIA, probability: 48, reasons: { positive: ['McLaren pace'], negative: ['Less experience'] } },
    { position: 6, driver: drivers.SAI, probability: 45, reasons: { positive: ['Consistent'], negative: ['Qualifying position'] } },
    { position: 7, driver: drivers.RUS, probability: 42, reasons: { positive: ['Mercedes upgrades'], negative: ['Setup issues'] } },
    { position: 8, driver: drivers.PER, probability: 38, reasons: { positive: ['Red Bull pace'], negative: ['Form concerns'] } },
    { position: 9, driver: drivers.ALO, probability: 35, reasons: { positive: ['Experience'], negative: ['Pace deficit'] } },
    { position: 10, driver: drivers.STR, probability: 30, reasons: { positive: ['Team support'], negative: ['Qualifying'] } },
  ];
};

export const myPredictions = [
  { raceId: 'britain', summary: '1. NOR, 2. VER, 3. HAM' },
  { raceId: 'austria', summary: '1. VER, 2. NOR, 3. LEC' },
  { raceId: 'canada', summary: '1. VER, 2. HAM, 3. NOR' },
];

export const newsItems = [
  {
    id: 1,
    title: 'Weather Update',
    description: 'Rain probable for Qualifying',
    type: 'weather' as const,
  },
  {
    id: 2,
    title: 'Driver Update',
    description: 'Leclerc confirmed 5-place grid penalty',
    type: 'penalty' as const,
  },
  {
    id: 3,
    title: 'Team News',
    description: 'McLaren bringing major upgrade package',
    type: 'upgrade' as const,
  },
];