import React from "react";
import { ShoppingBag, Construction } from "lucide-react";
import { TileType } from "../types";

interface BuildShopProps {
  coins: number;
  onPurchase: (type: TileType, cost: number) => void;
}

const BUILDINGS: { type: TileType; cost: number; description: string; icon: string }[] = [
  { type: 'road', cost: 20, description: 'Connect your district.', icon: '🛣️' },
  { type: 'park', cost: 50, description: 'Reduce smog levels.', icon: '🌳' },
  { type: 'skyscraper', cost: 100, description: 'Earn more focus XP.', icon: '🏢' },
  { type: 'neon-tower', cost: 250, description: 'The ultimate focus beacon.', icon: '🗼' },
];

export default function BuildShop({ coins, onPurchase }: BuildShopProps) {
  return (
    <div className="glass-panel p-6 neon-border-blue">
      <div className="flex items-center gap-2 mb-6">
        <Construction className="w-5 h-5 text-neon-blue" />
        <h2 className="text-xs font-mono uppercase tracking-widest text-neon-blue">Build Shop</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {BUILDINGS.map((item) => {
          const canAfford = coins >= item.cost;

          return (
            <button
              key={item.type}
              disabled={!canAfford}
              onClick={() => onPurchase(item.type, item.cost)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                canAfford
                  ? "bg-neon-blue/10 border-neon-blue/30 hover:bg-neon-blue/20"
                  : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-2xl">{item.icon}</span>
                <span className={`font-mono text-xs ${canAfford ? 'text-neon-blue' : 'text-white/30'}`}>
                  {item.cost} CR
                </span>
              </div>
              <div>
                <span className="font-bold text-xs tracking-wide uppercase block">{item.type.replace('-', ' ')}</span>
                <p className="text-[9px] text-white/50 leading-tight">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
