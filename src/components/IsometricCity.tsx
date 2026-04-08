import React from "react";
import { motion } from "motion/react";
import { CityTile, TileType } from "../types";

interface IsometricCityProps {
  tiles: CityTile[];
  smogLevel: number;
}

const TILE_WIDTH = 60;
const TILE_HEIGHT = 30;

export default function IsometricCity({ tiles, smogLevel }: IsometricCityProps) {
  // Convert grid coordinates to isometric screen coordinates
  const getIsoCoords = (x: number, y: number) => {
    return {
      screenX: (x - y) * (TILE_WIDTH / 2) + 200,
      screenY: (x + y) * (TILE_HEIGHT / 2) + 50
    };
  };

  const renderTile = (tile: CityTile) => {
    const { screenX, screenY } = getIsoCoords(tile.x, tile.y);
    
    return (
      <motion.g
        key={tile.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (tile.x + tile.y) * 0.05 }}
      >
        {/* Base Diamond */}
        <path
          d={`M ${screenX} ${screenY} L ${screenX + TILE_WIDTH / 2} ${screenY + TILE_HEIGHT / 2} L ${screenX} ${screenY + TILE_HEIGHT} L ${screenX - TILE_WIDTH / 2} ${screenY + TILE_HEIGHT / 2} Z`}
          fill={tile.type === 'empty' ? '#1a1a1a' : '#2a2a2a'}
          stroke="#333"
          strokeWidth="0.5"
        />

        {/* Building Content */}
        {tile.type === 'skyscraper' && (
          <g transform={`translate(${screenX - 15}, ${screenY - 40})`}>
            <rect width="30" height="60" fill="#bc13fe" opacity="0.8" />
            <rect width="30" height="60" fill="url(#neonGradient)" opacity="0.4" />
            <line x1="5" y1="10" x2="25" y2="10" stroke="white" strokeWidth="0.5" opacity="0.3" />
            <line x1="5" y1="20" x2="25" y2="20" stroke="white" strokeWidth="0.5" opacity="0.3" />
            <line x1="5" y1="30" x2="25" y2="30" stroke="white" strokeWidth="0.5" opacity="0.3" />
          </g>
        )}

        {tile.type === 'neon-tower' && (
          <g transform={`translate(${screenX - 10}, ${screenY - 80})`}>
            <rect width="20" height="100" fill="#00f3ff" opacity="0.8" />
            <circle cx="10" cy="0" r="5" fill="#00f3ff" className="animate-pulse" />
          </g>
        )}

        {tile.type === 'road' && (
          <path
            d={`M ${screenX} ${screenY + 5} L ${screenX + TILE_WIDTH / 2 - 5} ${screenY + TILE_HEIGHT / 2} L ${screenX} ${screenY + TILE_HEIGHT - 5} L ${screenX - TILE_WIDTH / 2 + 5} ${screenY + TILE_HEIGHT / 2} Z`}
            fill="#333"
          />
        )}

        {tile.type === 'park' && (
          <path
            d={`M ${screenX} ${screenY + 2} L ${screenX + TILE_WIDTH / 2 - 2} ${screenY + TILE_HEIGHT / 2} L ${screenX} ${screenY + TILE_HEIGHT - 2} L ${screenX - TILE_WIDTH / 2 + 2} ${screenY + TILE_HEIGHT / 2} Z`}
            fill="#00ff00"
            opacity="0.3"
          />
        )}
      </motion.g>
    );
  };

  return (
    <div className="relative w-full aspect-square bg-cyber-black rounded-2xl overflow-hidden border border-white/10 shadow-inner">
      {/* Doom-Smog Layer */}
      <motion.div
        className="absolute inset-0 z-20 pointer-events-none"
        animate={{
          backgroundColor: `rgba(255, 0, 0, ${smogLevel / 200})`,
          backdropFilter: `blur(${smogLevel / 20}px)`
        }}
      />
      
      {/* Smog Particles */}
      {smogLevel > 20 && (
        <div className="absolute inset-0 z-21 pointer-events-none overflow-hidden">
          {Array.from({ length: Math.floor(smogLevel / 5) }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-red-500 rounded-full opacity-20"
              initial={{ x: Math.random() * 400, y: Math.random() * 400 }}
              animate={{
                x: [null, Math.random() * 400],
                y: [null, Math.random() * 400],
              }}
              transition={{
                duration: 5 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>
      )}

      <svg viewBox="0 0 400 400" className="w-full h-full">
        <defs>
          <linearGradient id="neonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bc13fe" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        
        {/* Sort tiles by y then x for proper isometric layering */}
        {[...tiles].sort((a, b) => (a.x + a.y) - (b.x + b.y)).map(renderTile)}
      </svg>

      <div className="absolute bottom-4 left-4 z-30">
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          <div className={`w-2 h-2 rounded-full ${smogLevel < 30 ? 'bg-green-400' : smogLevel < 70 ? 'bg-yellow-400' : 'bg-red-400'}`} />
          <span className="text-[10px] font-mono uppercase tracking-widest">
            {smogLevel < 30 ? 'Clear Skies' : smogLevel < 70 ? 'Smog Alert' : 'Doom Smog Critical'}
          </span>
        </div>
      </div>
    </div>
  );
}
