import React from "react";
import { Settings, CheckSquare, Square } from "lucide-react";

interface TargetSelectionProps {
  selectedApps: string[];
  onToggle: (app: string) => void;
}

const APPS = [
  { id: 'instagram', name: 'Instagram', color: '#E1306C' },
  { id: 'tiktok', name: 'TikTok', color: '#000000' },
  { id: 'x', name: 'X / Twitter', color: '#1DA1F2' },
  { id: 'reddit', name: 'Reddit', color: '#FF4500' },
];

export default function TargetSelection({ selectedApps, onToggle }: TargetSelectionProps) {
  return (
    <div className="glass-panel p-6 neon-border-purple">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-neon-purple" />
        <h2 className="text-xs font-mono uppercase tracking-widest text-neon-purple">Target Selection</h2>
      </div>

      <p className="text-[10px] text-white/50 uppercase tracking-tighter mb-4">Select apps to block with Doom-Gate</p>

      <div className="space-y-2">
        {APPS.map((app) => {
          const isSelected = selectedApps.includes(app.id);
          return (
            <button
              key={app.id}
              onClick={() => onToggle(app.id)}
              className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                isSelected 
                  ? "bg-neon-purple/10 border-neon-purple/50" 
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: app.color }} 
                />
                <span className="font-medium">{app.name}</span>
              </div>
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-neon-purple" />
              ) : (
                <Square className="w-5 h-5 text-white/20" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
