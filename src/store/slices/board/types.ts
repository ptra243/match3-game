import { Color } from '../../types';

export interface Tile {
  color: Color;
  isMatched: boolean;
  isNew: boolean;
  isAnimating: boolean;
  isFrozen: boolean;
  isIgnited: boolean;
}

export interface BoardState {
  board: Tile[][];
  selectedTile: { row: number; col: number } | null;
  initializeBoard: () => void;
  dropTiles: () => Promise<Tile[][]>;
  fillEmptyTiles: () => Promise<Tile[][]>;
  markTilesForDestruction: (tiles: { row: number; col: number }[]) => Promise<{ destroyedTiles: { row: number; col: number; color: Color }[] }>;
  markTilesAsMatched: (tiles: { row: number; col: number }[]) => Promise<{
    matchedTiles: { row: number; col: number; color: Color }[];
    explosionTilesCount: number;
  }>;
  convertTiles: (tiles: { row: number; col: number; color: Color }[]) => Promise<void>;
  updateTile: (row: number, col: number, tile: Partial<Tile>) => void;
  setBoard: (newBoard: Tile[][]) => void;
  processNewBoard: (newBoard: Tile[][]) => Promise<void>;
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
} 