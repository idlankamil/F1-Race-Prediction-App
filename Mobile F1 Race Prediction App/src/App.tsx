import { useState } from 'react';
import { Home, Calendar, Users } from 'lucide-react';
import { HomeScreen } from './components/HomeScreen';
import { RaceSelectionScreen } from './components/RaceSelectionScreen';
import { DriversScreen } from './components/DriversScreen';
import { RaceDetailsScreen } from './components/RaceDetailsScreen';
import { PredictionResultsScreen } from './components/PredictionResultsScreen'; 
import { ChatWidget } from './components/ChatWidget';
import { ThemeProvider } from './components/ThemeContext'; 

type Screen = 'home' | 'races' | 'drivers';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [isPredictionMode, setIsPredictionMode] = useState(false); 
  
  // 🟢 NEW: Lifted State for Season (Defaults to 2024)
  const [globalSelectedSeason, setGlobalSelectedSeason] = useState('2024');

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
    // If navigating to 'races', keep the season state intact
    // Only reset race selection
    if (screen !== 'races') {
      setSelectedRaceId(null);
      setIsPredictionMode(false);
    } else {
        // If clicking "Races" tab while viewing a race details, go back to list
        setSelectedRaceId(null);
    }
  };

  const handleRaceSelect = (raceId: string) => {
    console.log("Navigating to Results:", raceId);
    setSelectedRaceId(raceId);
    setIsPredictionMode(false); 
  };

  const handlePredictRace = (raceId: string) => {
    console.log("Navigating to Prediction:", raceId);
    setSelectedRaceId(raceId);
    setIsPredictionMode(true);
  };

  const renderScreen = () => {
    if (selectedRaceId) {
      if (isPredictionMode) {
        return (
          <PredictionResultsScreen 
            raceId={selectedRaceId} 
            onBack={() => {
              setSelectedRaceId(null);
              setIsPredictionMode(false);
            }} 
          />
        );
      } else {
        return (
          <RaceDetailsScreen 
            raceId={selectedRaceId} 
            onBack={() => setSelectedRaceId(null)} 
          />
        );
      }
    }

    switch (currentScreen) {
      case 'home': 
        return <HomeScreen 
          onNavigateToRace={handleRaceSelect} 
          onPredictRace={handlePredictRace} 
        />;
      case 'races': 
        return <RaceSelectionScreen 
            onRaceSelect={handleRaceSelect} 
            // 🟢 Pass down state and setter
            selectedSeason={globalSelectedSeason}
            onSeasonChange={setGlobalSelectedSeason}
        />;
      case 'drivers': 
        return <DriversScreen />;
      default: 
        return <HomeScreen onNavigateToRace={handleRaceSelect} onPredictRace={handlePredictRace} />;
    }
  };

  return (
    <ThemeProvider>
      {/* 🟢 FIX 1: Removed 'relative', allow content to flow naturally */}
      <div className="min-h-screen bg-neutral-950 text-white pb-20">
        
        {/* 🟢 FIX 2: Wrapped Content in a specific z-index layer (0) */}
        {/* This ensures your pages never accidentally cover the Chat/Nav */}
        <main className="relative z-0">
            {renderScreen()}
        </main>

        {/* 🟢 FIX 3: Force High Z-Index for Chat Widget */}
        <div className="relative z-50">
            <ChatWidget />
        </div>

        {/* 🟢 FIX 4: Force Max Z-Index for Bottom Nav */}
        {!selectedRaceId && (
          <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 z-[100]">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
              <button onClick={() => handleNavigate('home')} className={`flex flex-col items-center justify-center flex-1 h-full ${currentScreen === 'home' ? 'text-red-500' : 'text-neutral-400'}`}>
                <Home className="w-6 h-6" /><span className="text-xs mt-1">Home</span>
              </button>
              <button onClick={() => handleNavigate('races')} className={`flex flex-col items-center justify-center flex-1 h-full ${currentScreen === 'races' ? 'text-red-500' : 'text-neutral-400'}`}>
                <Calendar className="w-6 h-6" /><span className="text-xs mt-1">Races</span>
              </button>
              <button onClick={() => handleNavigate('drivers')} className={`flex flex-col items-center justify-center flex-1 h-full ${currentScreen === 'drivers' ? 'text-red-500' : 'text-neutral-400'}`}>
                <Users className="w-6 h-6" /><span className="text-xs mt-1">Drivers</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </ThemeProvider>
  );
}