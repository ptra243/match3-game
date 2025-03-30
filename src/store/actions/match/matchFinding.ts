import { Tile, Match, Color } from '../../types';

// UnionFind class for match detection
class UnionFind {
  private parent: Map<string, string>;
  private sets: Map<string, { color: Color; tiles: { row: number; col: number }[] }>;

  constructor() {
    this.parent = new Map();
    this.sets = new Map();
  }

  makeSet(tile: { row: number; col: number }, color: Color) {
    const key = `${tile.row},${tile.col}`;
    if (!this.parent.has(key)) {
      this.parent.set(key, key);
      this.sets.set(key, {color, tiles: [tile]});
    }
  }

  find(tile: { row: number; col: number }): string {
    const key = `${tile.row},${tile.col}`;
    if (!this.parent.has(key)) return key;

    let root = this.parent.get(key)!;
    if (root !== key) {
      root = this.find({row: parseInt(root.split(',')[0]), col: parseInt(root.split(',')[1])});
      this.parent.set(key, root);
    }
    return root;
  }

  union(tile1: { row: number; col: number }, tile2: { row: number; col: number }) {
    const root1 = this.find(tile1);
    const root2 = this.find(tile2);

    if (root1 !== root2) {
      this.parent.set(root2, root1);
      const set1 = this.sets.get(root1)!;
      const set2 = this.sets.get(root2)!;

      const allTiles = [...set1.tiles, ...set2.tiles];
      const distinctTiles = allTiles.filter((tile, index, self) =>
        index === self.findIndex(t => t.row === tile.row && t.col === tile.col)
      );

      this.sets.set(root1, {
        color: set1.color,
        tiles: distinctTiles
      });
      this.sets.delete(root2);
    }
  }

  getSets(): Match[] {
    const uniqueSets = new Set<string>();
    const matches: Match[] = [];

    for (const [key, value] of this.sets.entries()) {
      const root = this.find({row: parseInt(key.split(',')[0]), col: parseInt(key.split(',')[1])});
      if (!uniqueSets.has(root)) {
        uniqueSets.add(root);
        const set = this.sets.get(root)!;
        if (set.tiles.length >= 3) {
          matches.push({
            color: set.color,
            tiles: set.tiles,
            length: set.tiles.length
          });
        }
      }
    }

    return matches;
  }
}

function identifySpecialShapes(matches: Match[]): Match[] {
  return matches.map(match => {
    if (match.tiles.length !== 5) return match;

    const rowCounts = new Map<number, number>();
    const colCounts = new Map<number, number>();

    match.tiles.forEach(tile => {
      rowCounts.set(tile.row, (rowCounts.get(tile.row) || 0) + 1);
      colCounts.set(tile.col, (colCounts.get(tile.col) || 0) + 1);
    });

    let isTShape = false;
    let isLShape = false;

    // Check for T shape
    const rowWith3 = Array.from(rowCounts.entries()).find(([_, count]) => count === 3);
    if (rowWith3) {
      const [rowIndex] = rowWith3;
      const colsInRow3 = match.tiles
        .filter(t => t.row === rowIndex)
        .map(t => t.col)
        .sort((a, b) => a - b);

      if (colsInRow3[2] - colsInRow3[0] === 2) {
        const middleCol = colsInRow3[1];
        const verticalTiles = match.tiles.filter(t => t.col === middleCol && t.row !== rowIndex);

        if (verticalTiles.length === 2 &&
          Math.abs(verticalTiles[0].row - verticalTiles[1].row) === 1) {
          isTShape = true;
        }
      }
    }

    // Check for L shape
    const colWith3 = Array.from(colCounts.entries()).find(([_, count]) => count === 3);
    if (colWith3 && !isTShape) {
      const [colIndex] = colWith3;
      const rowsInCol3 = match.tiles
        .filter(t => t.col === colIndex)
        .map(t => t.row)
        .sort((a, b) => a - b);

      if (rowsInCol3[2] - rowsInCol3[0] === 2) {
        const bottomRow = rowsInCol3[2];
        const horizontalTiles = match.tiles.filter(t =>
          t.row === bottomRow && t.col !== colIndex
        );

        if (horizontalTiles.length === 2 &&
          horizontalTiles.every(t => t.col > colIndex) &&
          horizontalTiles.sort((a, b) => a.col - b.col)[1].col - horizontalTiles[0].col === 1) {
          isLShape = true;
        }
      }
    }

    if (isTShape) {
      return {...match, isSpecialShape: 'T' as const};
    } else if (isLShape) {
      return {...match, isSpecialShape: 'L' as const};
    }

    return match;
  });
}

export const findMatches = (board: Tile[][]): Match[] => {
  const BOARD_SIZE = board.length;
  const unionFind = new UnionFind();
  const horizontalVisited = new Set<string>();
  const verticalVisited = new Set<string>();

  const getTileKey = (row: number, col: number) => `${row},${col}`;
  const isHorizontallyVisited = (row: number, col: number) => horizontalVisited.has(getTileKey(row, col));
  const markHorizontallyVisited = (row: number, col: number) => horizontalVisited.add(getTileKey(row, col));
  const isVerticallyVisited = (row: number, col: number) => verticalVisited.has(getTileKey(row, col));
  const markVerticallyVisited = (row: number, col: number) => verticalVisited.add(getTileKey(row, col));

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col].color === 'empty') continue;

      const color = board[row][col].color;

      if (col < BOARD_SIZE - 2 && !isHorizontallyVisited(row, col)) {
        let hLength = 1;
        while (col + hLength < BOARD_SIZE && board[row][col + hLength].color === color) {
          hLength++;
        }

        if (hLength >= 3) {
          const currentTile = {row, col};
          unionFind.makeSet(currentTile, color);
          markHorizontallyVisited(row, col);

          for (let i = 1; i < hLength; i++) {
            const nextTile = {row, col: col + i};
            unionFind.makeSet(nextTile, color);
            unionFind.union(currentTile, nextTile);
            markHorizontallyVisited(row, col + i);
          }
        }
      }

      if (row < BOARD_SIZE - 2 && !isVerticallyVisited(row, col)) {
        let vLength = 1;
        while (row + vLength < BOARD_SIZE && board[row + vLength][col].color === color) {
          vLength++;
        }

        if (vLength >= 3) {
          const currentTile = {row, col};
          unionFind.makeSet(currentTile, color);
          markVerticallyVisited(row, col);

          for (let i = 1; i < vLength; i++) {
            const nextTile = {row: row + i, col};
            unionFind.makeSet(nextTile, color);
            unionFind.union(currentTile, nextTile);
            markVerticallyVisited(row + i, col);
          }
        }
      }
    }
  }

  return identifySpecialShapes(unionFind.getSets());
}; 