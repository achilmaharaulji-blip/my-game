export class SpatialGrid<T> {
  private readonly cellSize: number;
  private readonly invCellSize: number;
  private readonly buckets: Map<number, T[]>;

  constructor(cellSize = 180) {
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
    this.buckets = new Map();
  }

  private hashCell(cx: number, cy: number): number {
    // Pack signed 16-bit grid coords cleanly into a single integer key
    return ((cx + 32768) << 16) | ((cy + 32768) & 0xffff);
  }

  clear(): void {
    for (const bucket of this.buckets.values()) {
      bucket.length = 0;
    }
  }

  insert(x: number, y: number, item: T): void {
    const cx = Math.floor(x * this.invCellSize);
    const cy = Math.floor(y * this.invCellSize);
    const key = this.hashCell(cx, cy);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = [];
      this.buckets.set(key, bucket);
    }
    bucket.push(item);
  }

  queryRadius(x: number, y: number, radius: number, out: T[]): T[] {
    out.length = 0;
    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCy = Math.floor((y - radius) * this.invCellSize);
    const maxCy = Math.floor((y + radius) * this.invCellSize);

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.buckets.get(this.hashCell(cx, cy));
        if (bucket && bucket.length > 0) {
          for (let i = 0; i < bucket.length; i++) {
            out.push(bucket[i]);
          }
        }
      }
    }
    return out;
  }
}
