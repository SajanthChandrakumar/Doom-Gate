import React, { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Coins, 
  Zap,
  Brain,
  ShoppingCart,
  ShieldAlert,
  Settings as SettingsIcon,
  X,
  Map as MapIcon,
  Construction,
  Smartphone,
  Trophy,
  AlertTriangle
} from "lucide-react";
import IsometricCity from "./components/IsometricCity";
import BuildShop from "./components/BuildShop";
import TargetSelection from "./components/TargetSelection";
import DoomGateShield from "./components/DoomGateShield";
import { CityTile, UserStats, TileType } from "./types";

const INITIAL_TILES: CityTile[] = [
  { id: '1', type: 'road', x: 0, y: 0 },
  { id: '2', type: 'road', x: 1, y: 0 },
  { id: '3', type: 'road', x: 2, y: 0 },
  { id: '4', type: 'skyscraper', x: 0, y: 1 },
];

export default function App() {
  const [tiles, setTiles] = useState<CityTile[]>(INITIAL_TILES);
  const [stats, setStats] = useState<UserStats>({
    coins: 150,
    focusLevel: 80,
    smogLevel: 20,
    blockedApps: ['instagram', 'tiktok']
  });

  const [activeTab, setActiveTab] = useState<'city' | 'shop' | 'settings'>('city');
  const [isShieldOpen, setIsShieldOpen] = useState(false);
  const [simulatingApp, setSimulatingApp] = useState("");

  const handlePurchase = (type: TileType, cost: number) => {
    if (stats.coins >= cost) {
      // Find an empty spot
      const occupied = new Set(tiles.map(t => `${t.x},${t.y}`));
      let found = false;
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          if (!occupied.has(`${x},${y}`)) {
            const newTile: CityTile = {
              id: Math.random().toString(36).substr(2, 9),
              type,
              x,
              y
            };
            setTiles(prev => [...prev, newTile]);
            setStats(prev => ({ 
              ...prev, 
              coins: prev.coins - cost,
              smogLevel: Math.max(0, prev.smogLevel - (type === 'park' ? 15 : 0))
            }));
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  };

  const handleShieldUnlock = () => {
    setStats(prev => ({
      ...prev,
      coins: prev.coins + 10,
      smogLevel: Math.max(0, prev.smogLevel - 20),
      focusLevel: Math.min(100, prev.focusLevel + 10)
    }));
    setIsShieldOpen(false);
  };

  const handleShieldFail = (penalty: number) => {
    setStats(prev => ({
      ...prev,
      coins: Math.max(0, prev.coins - penalty),
      smogLevel: Math.min(100, prev.smogLevel + 15),
      focusLevel: Math.max(0, prev.focusLevel - 10)
    }));
  };

  const simulateAppOpen = (app: string) => {
    setSimulatingApp(app);
    setIsShieldOpen(true);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24">
      <DoomGateShield 
        isOpen={isShieldOpen} 
        appName={simulatingApp}
        onUnlockSuccess={handleShieldUnlock}
        onUnlockFail={handleShieldFail}
      />

      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-blue flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.5)]">
            <MapIcon className="w-5 h-5 text-cyber-black" />
          </div>
          <h1 className="font-mono font-bold tracking-tighter text-xl">DOOM-GATE</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <Coins className="w-4 h-4 text-neon-blue" />
            <span className="font-mono font-bold text-sm">{stats.coins}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 flex-1 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'city' && (
            <motion.div
              key="city"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <IsometricCity tiles={tiles} smogLevel={stats.smogLevel} />

              {/* App Simulators */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Simulate App Launch</h3>
                <div className="grid grid-cols-2 gap-2">
                  {stats.blockedApps.map(app => (
                    <button
                      key={app}
                      onClick={() => simulateAppOpen(app)}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      Open {app}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Focus XP</span>
                    <Zap className="w-3 h-3 text-neon-blue" />
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-neon-blue"
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.focusLevel}%` }}
                    />
                  </div>
                </div>
                <div className="glass-panel p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-white/40 uppercase">City Health</span>
                    <Trophy className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-green-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${100 - stats.smogLevel}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'shop' && (
            <motion.div
              key="shop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <BuildShop coins={stats.coins} onPurchase={handlePurchase} />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <TargetSelection 
                selectedApps={stats.blockedApps} 
                onToggle={(app) => {
                  setStats(prev => ({
                    ...prev,
                    blockedApps: prev.blockedApps.includes(app)
                      ? prev.blockedApps.filter(a => a !== app)
                      : [...prev.blockedApps, app]
                  }));
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-cyber-black/80 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <NavButton 
            active={activeTab === 'city'} 
            onClick={() => setActiveTab('city')}
            icon={<MapIcon className="w-5 h-5" />}
            label="City"
          />
          <NavButton 
            active={activeTab === 'shop'} 
            onClick={() => setActiveTab('shop')}
            icon={<Construction className="w-5 h-5" />}
            label="Build"
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon className="w-5 h-5" />}
            label="Config"
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-neon-blue' : 'text-white/30 hover:text-white/60'}`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-neon-blue/20 shadow-[0_0_10px_rgba(0,243,255,0.3)]' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-mono uppercase tracking-tighter">{label}</span>
      {active && <motion.div layoutId="nav-indicator" className="w-1 h-1 rounded-full bg-neon-blue mt-1" />}
    </button>
  );
}
