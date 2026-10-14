export type Mark = { id: string; x: number; y: number };

export type PinSpot = Mark & { anchorX: number; anchorY: number };

export type Side = "top" | "bottom" | "left" | "right";

const EDGE = 6;

function clamp(value: number): number {
  return Math.min(100 - EDGE, Math.max(EDGE, value));
}

/** Push nearby size marks apart so the numbered pins do not sit on each other. */
export function spreadPins(marks: Mark[], gap = 9): PinSpot[] {
  const placed: PinSpot[] = marks.map((mark) => ({
    id: mark.id,
    x: clamp(mark.x),
    y: clamp(mark.y),
    anchorX: mark.x,
    anchorY: mark.y,
  }));

  for (let pass = 0; pass < 18; pass += 1) {
    let moved = false;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        let dx = placed[j].x - placed[i].x;
        let dy = placed[j].y - placed[i].y;
        let dist = Math.hypot(dx, dy);
        if (dist >= gap) continue;
        if (dist < 0.05) {
          const angle = ((i + 1) * 2.399963) % (Math.PI * 2);
          dx = Math.cos(angle) * 0.05;
          dy = Math.sin(angle) * 0.05;
          dist = 0.05;
        }
        const push = (gap - dist) / 2;
        placed[i].x = clamp(placed[i].x - (dx / dist) * push);
        placed[i].y = clamp(placed[i].y - (dy / dist) * push);
        placed[j].x = clamp(placed[j].x + (dx / dist) * push);
        placed[j].y = clamp(placed[j].y + (dy / dist) * push);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return placed;
}

function nearest(x: number, y: number, others: { x: number; y: number }[]): number {
  let best = 120;
  for (const other of others) best = Math.min(best, Math.hypot(other.x - x, other.y - y));
  return best;
}

/** Pick the side of a pin with room on the page and the fewest neighboring pins. */
export function openSide(x: number, y: number, others: { x: number; y: number }[]): Side {
  const probes: { side: Side; room: number; clear: number }[] = [
    { side: "top", room: y, clear: nearest(x, y - 12, others) },
    { side: "bottom", room: 100 - y, clear: nearest(x, y + 12, others) },
    { side: "left", room: x, clear: nearest(x - 16, y, others) },
    { side: "right", room: 100 - x, clear: nearest(x + 16, y, others) },
  ];
  const usable = probes.filter((probe) => probe.room >= 22);
  const pool = usable.length > 0 ? usable : probes;
  pool.sort((a, b) => b.clear - a.clear || b.room - a.room);
  return pool[0].side;
}
