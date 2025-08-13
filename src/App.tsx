/* ---------- utilities --------------------------------------------------- */
class SeededRandom {
  private seed: number;
  constructor(seed: string) { this.seed = this.hash(seed); }
  private hash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
  /** 0 ≤ x < 1 */
  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  int(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  choice<T>(arr: T[]): T { return arr[this.int(0, arr.length - 1)]; }
}

/* ---------- public types ------------------------------------------------ */
export interface RegionSpec { id: string; color: string; path: string; }
export interface MandalaSettings {
  seed: string;                 // RNG seed
  canvasSize: number;           // SVG width / height
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  palette: string[];            // colors to cycle through
}

/* ---------- internal helpers ------------------------------------------- */
type DrawFn = (
  cx: number,
  size: number,
  palette: string[],
  regions: RegionSpec[],
  out: string[],
  idStart: number,
  rng: SeededRandom,
  complexity: number
) => number;                    // returns next idStart

/* ---------- pattern generators ----------------------------------------- */
/* Each generator receives a “complexity” value that the factory tunes from
   1 (beginner) … 10 (advanced).  You can add more generators at will.      */

const concentricCircles: DrawFn = (
  c, s, p, regions, svg, id, rng, complexity
) => {
  const rings = 2 + complexity;                          // 3–12 rings
  const maxR = s * 0.4;
  for (let i = 0; i < rings; i++) {
    const r = maxR * (1 - i / rings);
    const color = p[i % p.length];
    const regId = `region-${id + i}`;
    regions.push({
      id: regId,
      color,
      path:
        `M ${c - r} ${c} A ${r} ${r} 0 1 1 ${c + r} ${c} ` +
        `A ${r} ${r} 0 1 1 ${c - r} ${c} Z`,
    });
    svg.push(
      `<circle id="${regId}" cx="${c}" cy="${c}" r="${r}" ` +
      `fill="${color}" stroke="#222" stroke-width="2"/>`
    );
  }
  return id + rings;
};

const radialPolygons: DrawFn = (
  c, s, p, regions, svg, id, rng, complexity
) => {
  const layers = 1 + Math.ceil(complexity / 2);          // 2–6 layers
  const maxR = s * 0.4;
  for (let layer = 0; layer < layers; layer++) {
    const rOuter = maxR * (1 - layer / (layers + 0.5));
    const rInner = rOuter * 0.5;
    const points = 4 + complexity + layer;               // 5–20 pts
    const color = p[layer % p.length];
    const regId = `region-${id + layer}`;
    let path = '';
    for (let i = 0; i < points * 2; i++) {
      const ang = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      const x = c + r * Math.cos(ang);
      const y = c + r * Math.sin(ang);
      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    path += ' Z';
    regions.push({ id: regId, color, path });
    svg.push(
      `<path id="${regId}" d="${path}" fill="${color}" ` +
      `stroke="#222" stroke-width="2"/>`
    );
  }
  return id + layers;
};

const petalFlower: DrawFn = (
  c, s, p, regions, svg, id, rng, complexity
) => {
  const petals = 4 + complexity;                         // 5–14 petals
  const rOuter = s * 0.4;
  const rPetal = rOuter * 0.5;
  for (let i = 0; i < petals; i++) {
    const ang = (i * 2 * Math.PI) / petals;
    const px = c + rOuter * Math.cos(ang);
    const py = c + rOuter * Math.sin(ang);
    const regId = `region-${id + i}`;
    const path =
      `M ${px} ${py} ` +
      `a ${rPetal} ${rPetal * 0.6} ${ang * 180 / Math.PI} 1 1 ` +
      `${-2 * rPetal * Math.cos(ang)} ${-2 * rPetal * Math.sin(ang)} Z`;
    regions.push({ id: regId, color: p[i % p.length], path });
    svg.push(
      `<path id="${regId}" d="${path}" fill="${p[i % p.length]}" ` +
      `stroke="#222" stroke-width="2"/>`
    );
  }
  return id + petals;
};

/* ---------- difficulty configuration ----------------------------------- */
const difficultyMap: Record<
  MandalaSettings['difficulty'],
  { complexityRange: [number, number]; generators: DrawFn[] }
> = {
  beginner: {
    complexityRange: [1, 3],
    generators: [concentricCircles, petalFlower],
  },
  intermediate: {
    complexityRange: [3, 6],
    generators: [concentricCircles, radialPolygons, petalFlower],
  },
  advanced: {
    complexityRange: [6, 10],
    generators: [concentricCircles, radialPolygons, petalFlower],
  },
};

/* ---------- main class -------------------------------------------------- */
export class MandalaGenerator {
  private rng: SeededRandom;
  constructor(private settings: MandalaSettings) {
    this.rng = new SeededRandom(settings.seed);
  }

  generate(): {
    coloredSvg: string;
    outlineSvg: string;
    regions: RegionSpec[];
  } {
    const { canvasSize, palette, difficulty } = this.settings;
    const center = canvasSize / 2;
    const regions: RegionSpec[] = [];
    const svgParts: string[] = [];

    /* ----- pick generator & complexity --------------------------------- */
    const cfg = difficultyMap[difficulty];
    const generator = this.rng.choice(cfg.generators);
    const complexity = this.rng.int(
      cfg.complexityRange[0],
      cfg.complexityRange[1]
    );

    /* ----- draw -------------------------------------------------------- */
    generator(
      center,
      canvasSize,
      palette,
      regions,
      svgParts,
      0,
      this.rng,
      complexity
    );

    /* ----- assemble ---------------------------------------------------- */
    const coloredSvg =
      `<svg width="${canvasSize}" height="${canvasSize}" ` +
      `viewBox="0 0 ${canvasSize} ${canvasSize}" ` +
      `xmlns="http://www.w3.org/2000/svg">\n` +
      svgParts.join('\n') +
      `\n</svg>`;

    const outlineSvg = coloredSvg
      .replace(/fill="[^"]*"/g, 'fill="none"')
      .replace(/stroke="#222"/g, 'stroke="#000"');

    return { coloredSvg, outlineSvg, regions };
  }
}
