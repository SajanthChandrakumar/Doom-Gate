export type TileType = 'empty' | 'road' | 'skyscraper' | 'park' | 'neon-tower';

export interface CityTile {
  id: string;
  type: TileType;
  x: number;
  y: number;
}

export interface UserStats {
  coins: number;
  focusLevel: number; // 0 to 100
  smogLevel: number; // 0 to 100
  blockedApps: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}
