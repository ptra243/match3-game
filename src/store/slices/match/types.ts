import { Color, Tile } from '../../types';

export interface Match {
  color: Color;
  tiles: { row: number; col: number }[];
  isSpecialShape?: 'T' | 'L';
  length?: number;
}

export interface MatchState {
  currentMatchSequence: number;
  currentCombo: number;
  processMatches: () => Promise<boolean>;
  findMatches: (board: Tile[][]) => Match[];
  hasValidMoves: () => boolean;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;
  incrementCombo: () => void;
  resetCombo: () => void;
} 