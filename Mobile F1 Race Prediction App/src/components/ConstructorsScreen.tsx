import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { constructors, drivers } from '../lib/data';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function ConstructorsScreen() {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const toggleTeam = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500 text-xs">Catching up</span>;
      case 'down':
        return <span className="text-red-500 text-xs">Falling behind</span>;
      default:
        return <span className="text-neutral-500 text-xs">Stable</span>;
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white pb-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-neutral-950 to-neutral-950" />
      <div className="relative z-10">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <h1 className="text-white uppercase tracking-tight font-bold mb-2">Constructors</h1>
        <p className="text-neutral-400 text-sm uppercase tracking-tight">2025 Championship Standings</p>
      </div>

      {/* Championship Leaderboard */}
      <div className="px-4 space-y-2">
        {constructors.map((team) => {
          const isExpanded = expandedTeam === team.id;
          const teamDrivers = team.drivers.map(driverId => drivers[driverId]).filter(Boolean);

          return (
            <div
              key={team.id}
              className="bg-neutral-900/80 backdrop-blur-sm rounded-lg border border-neutral-800 overflow-hidden"
            >
              {/* Team Header - Always Visible */}
              <button
                onClick={() => toggleTeam(team.id)}
                className="w-full p-4 hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Position Badge */}
                    <div className="flex-shrink-0 w-10 h-10 bg-neutral-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center border border-neutral-800">
                    <span className={`${team.position <= 3 ? 'text-red-500' : 'text-neutral-400'}`}>
                      P{team.position}
                    </span>
                  </div>

                  {/* Team Logo & Color Bar */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-1 h-12 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-white uppercase tracking-tight font-bold mb-1 truncate">{team.name}</h3>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(team.trend)}
                        {getTrendText(team.trend)}
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-white text-xl tabular-nums">{team.points}</div>
                    <div className="text-neutral-500 text-xs">PTS</div>
                  </div>

                  {/* Expand Icon */}
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-neutral-800 p-4 space-y-4">
                  {/* Win Probability */}
                  <div className="bg-neutral-900/80 backdrop-blur-sm rounded-lg p-4 border border-neutral-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-neutral-400 text-sm">Championship Win Probability</span>
                      <span className="text-white text-xl tabular-nums">{team.winProbability}%</span>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          backgroundColor: team.color,
                          width: `${team.winProbability}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Drivers */}
                  <div>
                    <h4 className="text-white text-sm mb-3">Drivers</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {teamDrivers.map((driver) => (
                        <div
                          key={driver.id}
                          className="bg-neutral-950 rounded-lg p-3 border border-neutral-800"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-neutral-800 rounded-full overflow-hidden">
                              <ImageWithFallback
                                src="https://images.unsplash.com/photo-1628618032874-79ad8e9decea?w=100&q=80"
                                alt={driver.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm">{driver.shortName}</div>
                              <div className="text-neutral-500 text-xs">#{driver.number}</div>
                            </div>
                          </div>
                          <div className="text-neutral-400 text-xs truncate">{driver.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Car Image */}
                  <div>
                    <h4 className="text-white text-sm mb-3">2025 Car</h4>
                    <div className="relative aspect-[16/9] bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800">
                      <ImageWithFallback
                        src={team.carImage}
                        alt={`${team.name} car`}
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay gradient for better visibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent" />
                      
                      {/* Car name overlay */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2">
                        <div
                          className="w-1 h-6 rounded-full"
                          style={{ backgroundColor: team.color }}
                          />
                          <span className="text-white text-sm">{team.shortName} {new Date().getFullYear()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  {teamDrivers[0]?.stats && (
                    <div>
                      <h4 className="text-white text-sm mb-3">Team Stats</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-neutral-900/80 backdrop-blur-sm rounded-lg p-3 text-center border border-neutral-800">
                          <div className="text-white text-xl">
                            {teamDrivers.reduce((sum, d) => sum + (d.stats?.wins || 0), 0)}
                          </div>
                          <div className="text-neutral-500 text-xs mt-1">Wins</div>
                        </div>
                        <div className="bg-neutral-900/80 backdrop-blur-sm rounded-lg p-3 text-center border border-neutral-800">
                          <div className="text-white text-xl">
                            {teamDrivers.reduce((sum, d) => sum + (d.stats?.podiums || 0), 0)}
                          </div>
                          <div className="text-neutral-500 text-xs mt-1">Podiums</div>
                        </div>
                        <div className="bg-neutral-900/80 backdrop-blur-sm rounded-lg p-3 text-center border border-neutral-800">
                          <div className="text-white text-xl">
                            {teamDrivers.reduce((sum, d) => sum + (d.stats?.poles || 0), 0)}
                          </div>
                          <div className="text-neutral-500 text-xs mt-1">Poles</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Championship Insights */}
      <div className="px-4 mt-6">
        <div className="bg-neutral-900/80 backdrop-blur-sm rounded-lg p-4 border border-red-600/40">
          <h3 className="text-white uppercase tracking-tight font-bold mb-2">Championship Battle</h3>
          <p className="text-neutral-300 text-sm">
            {constructors[0]?.name} leads with {constructors[0]?.points} points, 
            {' '}{constructors[0]?.points - constructors[1]?.points} points ahead of {constructors[1]?.shortName}.
            {' '}{constructors[1]?.shortName} is {constructors[1]?.trend === 'up' ? 'catching up' : 'defending their position'} in the championship race.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
