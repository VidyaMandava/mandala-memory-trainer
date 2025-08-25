import React, { useState, useEffect, useRef } from 'react';
import { Timer, Palette, Play, Square, Download, RefreshCw, Settings } from 'lucide-react';


// Seeded Random Generator
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
  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  int(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
  choice<T>(arr: T[]): T { return arr[this.int(0, arr.length - 1)]; }
}

// Types
interface RegionSpec { id: string; color: string; path: string; }
interface MandalaSettings {
  seed: string;
  canvasSize: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  palette: string[];
}

interface GameSettings {
  exposureTime: number;
  roundCount: number;
  showCountdown: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  colorCount: number;
  palette: string[];
}

interface GameState {
  phase: 'idle' | 'showing' | 'waiting' | 'revealing' | 'finished';
  round: number;
  score: number;
  currentSeed: string;
  timeRemaining: number;
}

// Pattern generator function type
type DrawFn = (
  cx: number,
  size: number,
  palette: string[],
  regions: RegionSpec[],
  out: string[],
  idStart: number,
  rng: SeededRandom,
  complexity: number
) => number;

// Pattern Generators - Much More Variety!
const concentricCircles: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const rings = 2 + complexity;
  const maxR = s * 0.4;
  for (let i = 0; i < rings; i++) {
    const r = maxR * (1 - i / rings);
    const color = p[i % p.length];
    const regId = `region-${id + i}`;
    regions.push({
      id: regId,
      color,
      path: `M ${c - r} ${c} A ${r} ${r} 0 1 1 ${c + r} ${c} A ${r} ${r} 0 1 1 ${c - r} ${c} Z`,
    });
    svg.push(`<circle id="${regId}" cx="${c}" cy="${c}" r="${r}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + rings;
};

const concentricSquares: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const squares = 2 + complexity;
  const maxSize = s * 0.7;
  for (let i = 0; i < squares; i++) {
    const size = maxSize * (1 - i / squares);
    const half = size / 2;
    const color = p[i % p.length];
    const regId = `region-${id + i}`;
    regions.push({
      id: regId,
      color,
      path: `M ${c - half} ${c - half} L ${c + half} ${c - half} L ${c + half} ${c + half} L ${c - half} ${c + half} Z`
    });
    svg.push(`<rect id="${regId}" x="${c - half}" y="${c - half}" width="${size}" height="${size}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + squares;
};

const trianglePattern: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const layers = 1 + complexity;
  const maxR = s * 0.4;
  for (let layer = 0; layer < layers; layer++) {
    const r = maxR * (1 - layer / (layers + 1));
    const color = p[layer % p.length];
    const regId = `region-${layer + id}`;
    const height = r * Math.sqrt(3) / 2;
    const x1 = c, y1 = c - height / 2;
    const x2 = c - r / 2, y2 = c + height / 2;
    const x3 = c + r / 2, y3 = c + height / 2;
    regions.push({
      id: regId,
      color,
      path: `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`
    });
    svg.push(`<polygon id="${regId}" points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + layers;
};

const diamondPattern: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const diamonds = 2 + complexity;
  const maxR = s * 0.4;
  for (let i = 0; i < diamonds; i++) {
    const r = maxR * (1 - i / diamonds);
    const color = p[i % p.length];
    const regId = `region-${id + i}`;
    const path = `M ${c} ${c - r} L ${c + r} ${c} L ${c} ${c + r} L ${c - r} ${c} Z`;
    regions.push({ id: regId, color, path });
    svg.push(`<path id="${regId}" d="${path}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + diamonds;
};

const starPattern: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const layers = 1 + Math.ceil(complexity / 3);
  const maxR = s * 0.4;
  for (let layer = 0; layer < layers; layer++) {
    const rOuter = maxR * (1 - layer / (layers + 0.5));
    const rInner = rOuter * 0.4;
    const points = 5 + complexity + layer;
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
    svg.push(`<path id="${regId}" d="${path}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + layers;
};

const hexagonPattern: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const hexagons = 2 + complexity;
  const maxR = s * 0.4;
  for (let i = 0; i < hexagons; i++) {
    const r = maxR * (1 - i / hexagons);
    const color = p[i % p.length];
    const regId = `region-${id + i}`;
    let path = '';
    for (let j = 0; j < 6; j++) {
      const ang = (j * Math.PI) / 3;
      const x = c + r * Math.cos(ang);
      const y = c + r * Math.sin(ang);
      path += j === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    path += ' Z';
    regions.push({ id: regId, color, path });
    svg.push(`<path id="${regId}" d="${path}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + hexagons;
};

const petalFlower: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const petals = 6 + complexity * 2;
  const rOuter = s * 0.35;
  const rPetal = rOuter * 0.6;
  for (let i = 0; i < petals; i++) {
    const ang = (i * 2 * Math.PI) / petals;
    const px = c + rOuter * 0.7 * Math.cos(ang);
    const py = c + rOuter * 0.7 * Math.sin(ang);
    const regId = `region-${id + i}`;
    const path = `M ${px} ${py} a ${rPetal} ${rPetal * 0.8} ${ang * 180 / Math.PI} 1 1 ${-rPetal * Math.cos(ang)} ${-rPetal * Math.sin(ang)} Z`;
    regions.push({ id: regId, color: p[i % p.length], path });
    svg.push(`<path id="${regId}" d="${path}" fill="${p[i % p.length]}" stroke="#222" stroke-width="2"/>`);
  }
  return id + petals;
};

const spiralPattern: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const arms = 3 + complexity;
  const maxR = s * 0.4;
  for (let arm = 0; arm < arms; arm++) {
    const baseAngle = (arm * 2 * Math.PI) / arms;
    const color = p[arm % p.length];
    const regId = `region-${id + arm}`;
    let path = `M ${c} ${c}`;
    for (let t = 0; t <= Math.PI * 2; t += 0.2) {
      const r = (maxR * t) / (Math.PI * 2);
      const ang = baseAngle + t;
      const x = c + r * Math.cos(ang);
      const y = c + r * Math.sin(ang);
      path += ` L ${x} ${y}`;
    }
    path += ' Z';
    regions.push({ id: regId, color, path });
    svg.push(`<path id="${regId}" d="${path}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + arms;
};

const radialSegments: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const segments = 6 + complexity * 2;
  const maxR = s * 0.4;
  for (let i = 0; i < segments; i++) {
    const ang1 = (i * 2 * Math.PI) / segments;
    const ang2 = ((i + 1) * 2 * Math.PI) / segments;
    const color = p[i % p.length];
    const regId = `region-${id + i}`;
    const x1 = c + maxR * Math.cos(ang1);
    const y1 = c + maxR * Math.sin(ang1);
    const x2 = c + maxR * Math.cos(ang2);
    const y2 = c + maxR * Math.sin(ang2);
    const path = `M ${c} ${c} L ${x1} ${y1} A ${maxR} ${maxR} 0 0 1 ${x2} ${y2} Z`;
    regions.push({ id: regId, color, path });
    svg.push(`<path id="${regId}" d="${path}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + segments;
};

const wavePattern: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const waves = 4 + complexity;
  const maxR = s * 0.4;
  for (let w = 0; w < waves; w++) {
    const r = maxR * (1 - w / (waves + 1));
    const color = p[w % p.length];
    const regId = `region-${id + w}`;
    const amplitude = r * 0.2;
    const frequency = 8 + complexity * 2;
    let path = '';
    const points = frequency * 4;
    for (let i = 0; i <= points; i++) {
      const ang = (i * 2 * Math.PI) / points;
      const waveR = r + amplitude * Math.sin(ang * frequency);
      const x = c + waveR * Math.cos(ang);
      const y = c + waveR * Math.sin(ang);
      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    path += ' Z';
    regions.push({ id: regId, color, path });
    svg.push(`<path id="${regId}" d="${path}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + waves;
};

const crossPattern: DrawFn = (c, s, p, regions, svg, id, rng, complexity) => {
  const layers = 2 + complexity;
  const maxSize = s * 0.6;
  for (let i = 0; i < layers; i++) {
    const size = maxSize * (1 - i / layers);
    const thickness = size * 0.3;
    const color = p[i % p.length];
    const regId = `region-${id + i}`;
    const half = size / 2;
    const thickHalf = thickness / 2;
    const path = `M ${c - thickHalf} ${c - half} L ${c + thickHalf} ${c - half} L ${c + thickHalf} ${c - thickHalf} L ${c + half} ${c - thickHalf} L ${c + half} ${c + thickHalf} L ${c + thickHalf} ${c + thickHalf} L ${c + thickHalf} ${c + half} L ${c - thickHalf} ${c + half} L ${c - thickHalf} ${c + thickHalf} L ${c - half} ${c + thickHalf} L ${c - half} ${c - thickHalf} L ${c - thickHalf} ${c - thickHalf} Z`;
    regions.push({ id: regId, color, path });
    svg.push(`<path id="${regId}" d="${path}" fill="${color}" stroke="#222" stroke-width="2"/>`);
  }
  return id + layers;
};

// Enhanced Color Palettes with Green, Orange, Pink
const PALETTES = {
  Primary: ['#E53935', '#1E88E5', '#FDD835', '#43A047', '#FF5722', '#E91E63', '#9C27B0', '#FF9800'],
  Vibrant: ['#FF4444', '#44FF44', '#4444FF', '#FFAA00', '#FF44AA', '#44AAFF', '#AAFF44', '#AA44FF'],
  Pastel: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFDFBA', '#E0BBE4', '#D4F1F4', '#B4E7CE'],
  Bright: ['#FF0000', '#00FF00', '#0000FF', '#FF8000', '#FF0080', '#8000FF', '#00FF80', '#80FF00']
};

// Difficulty Configuration with Many More Generators
const difficultyMap: Record<MandalaSettings['difficulty'], { complexityRange: [number, number]; generators: DrawFn[] }> = {
  beginner: {
    complexityRange: [1, 2],
    generators: [concentricCircles, concentricSquares, trianglePattern, diamondPattern, hexagonPattern, crossPattern],
  },
  intermediate: {
    complexityRange: [2, 4],
    generators: [concentricCircles, concentricSquares, trianglePattern, diamondPattern, starPattern, hexagonPattern, petalFlower, radialSegments, crossPattern],
  },
  advanced: {
    complexityRange: [4, 6],
    generators: [concentricCircles, concentricSquares, trianglePattern, diamondPattern, starPattern, hexagonPattern, petalFlower, spiralPattern, radialSegments, wavePattern, crossPattern],
  },
};

// Enhanced Mandala Generator
class MandalaGenerator {
  private rng: SeededRandom;
  constructor(private settings: MandalaSettings) {
    this.rng = new SeededRandom(settings.seed);
  }

  generate(): { coloredSvg: string; outlineSvg: string; regions: RegionSpec[]; } {
    const { canvasSize, palette, difficulty } = this.settings;
    const center = canvasSize / 2;
    const regions: RegionSpec[] = [];
    const svgParts: string[] = [];

    const cfg = difficultyMap[difficulty];
    const generator = this.rng.choice(cfg.generators);
    const complexity = this.rng.int(cfg.complexityRange[0], cfg.complexityRange[1]);

    // Shuffle palette for more variety
    const shuffledPalette = [...palette].sort(() => this.rng.random() - 0.5);

    generator(center, canvasSize, shuffledPalette, regions, svgParts, 0, this.rng, complexity);

    const coloredSvg = `<svg width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" xmlns="http://www.w3.org/2000/svg">\n${svgParts.join('\n')}\n</svg>`;
    const outlineSvg = coloredSvg.replace(/fill="[^"]*"/g, 'fill="none"').replace(/stroke="#222"/g, 'stroke="#000"');

    return { coloredSvg, outlineSvg, regions };
  }
}

// Main App Component
export default function MandalaMemoryTrainer() {
  // Game settings with enhanced palette
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    exposureTime: 15,
    roundCount: 10,
    showCountdown: true,
    difficulty: 'beginner',
    colorCount: 6,
    palette: PALETTES.Primary.slice(0, 6)
  });

  // Mandala settings with enhanced palette
  const [mandalaSettings, setMandalaSettings] = useState<MandalaSettings>({
    difficulty: 'beginner',
    palette: PALETTES.Primary.slice(0, 6),
    seed: Date.now().toString(),
    canvasSize: 400
  });

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    phase: 'idle',
    round: 0,
    score: 0,
    currentSeed: '',
    timeRemaining: 0
  });

  const [currentMandala, setCurrentMandala] = useState<{
    coloredSvg: string;
    outlineSvg: string;
    regions: RegionSpec[];
  } | null>(null);

  const timerRef = useRef<number>();

  // Generate mandala
  const generateMandala = () => {
    const generator = new MandalaGenerator(mandalaSettings);
    const mandala = generator.generate();
    setCurrentMandala(mandala);
  };

  useEffect(() => {
    generateMandala();
  }, [mandalaSettings]);

  // Update difficulty
  const updateDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
    setMandalaSettings(prev => ({ ...prev, difficulty }));
    setGameSettings(prev => ({ ...prev, difficulty }));
    setTimeout(() => {
      setMandalaSettings(prev => ({ ...prev, seed: Date.now().toString() }));
    }, 100);
  };

  // Update color palette
  const updatePalette = (paletteName: keyof typeof PALETTES) => {
    const newPalette = PALETTES[paletteName].slice(0, gameSettings.colorCount);
    setMandalaSettings(prev => ({ ...prev, palette: newPalette }));
    setGameSettings(prev => ({ ...prev, palette: newPalette }));
    setTimeout(() => {
      setMandalaSettings(prev => ({ ...prev, seed: Date.now().toString() }));
    }, 100);
  };

  // Start game
  const startGame = () => {
    const newSeed = Date.now().toString();
    setMandalaSettings(prev => ({ ...prev, seed: newSeed }));
    setGameState({
      phase: 'showing',
      round: 1,
      score: 0,
      currentSeed: newSeed,
      timeRemaining: gameSettings.exposureTime
    });
    startTimer();
  };

  // Timer logic
  const startTimer = () => {
    const startTime = Date.now();
    const duration = gameSettings.exposureTime * 1000;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      
      setGameState(prev => ({ ...prev, timeRemaining: remaining / 1000 }));

      if (remaining <= 0) {
        setGameState(prev => ({ ...prev, phase: 'waiting' }));
      } else {
        timerRef.current = requestAnimationFrame(tick);
      }
    };

    timerRef.current = requestAnimationFrame(tick);
  };

  // Next round
  const nextRound = () => {
    if (gameState.round >= gameSettings.roundCount) {
      setGameState(prev => ({ ...prev, phase: 'finished' }));
      return;
    }

    const newSeed = Date.now().toString();
    setMandalaSettings(prev => ({ ...prev, seed: newSeed }));
    setGameState(prev => ({
      ...prev,
      phase: 'showing',
      round: prev.round + 1,
      currentSeed: newSeed,
      timeRemaining: gameSettings.exposureTime
    }));
    startTimer();
  };

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Mandala Memory Trainer</h1>
          <p className="text-gray-600">Train your visual memory</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Settings className="mr-2" size={20} />
              Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <select
                  value={gameSettings.difficulty}
                  onChange={(e) => updateDifficulty(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color Palette</label>
                <select
                  value={Object.keys(PALETTES).find(key => 
                    PALETTES[key as keyof typeof PALETTES].slice(0, gameSettings.colorCount).every((color, idx) => 
                      gameSettings.palette[idx] === color
                    )
                  ) || 'Primary'}
                  onChange={(e) => updatePalette(e.target.value as keyof typeof PALETTES)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="Primary">Primary (Red, Blue, Yellow, Green, Orange, Pink)</option>
                  <option value="Vibrant">Vibrant</option>
                  <option value="Pastel">Pastel</option>
                  <option value="Bright">Bright</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Exposure Time</label>
                <select
                  value={gameSettings.exposureTime}
                  onChange={(e) => setGameSettings(prev => ({ 
                    ...prev, 
                    exposureTime: parseInt(e.target.value) 
                  }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value={60}>60 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={15}>15 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={8}>8 seconds</option>
                  <option value={5}>5 seconds</option>
                  <option value={3}>3 seconds</option>
                  <option value={2}>2 seconds</option>
                </select>
              </div>

              <button
                onClick={() => setMandalaSettings(prev => ({ 
                  ...prev, 
                  seed: Date.now().toString() 
                }))}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 flex items-center justify-center"
              >
                <RefreshCw size={16} className="mr-2" />
                New Design
              </button>
            </div>
          </div>

          {/* Canvas Area - Same as before */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg">
            <div className="p-6">
              {currentMandala && (
                <div className="flex flex-col items-center">
                  {gameState.phase === 'idle' && (
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">Ready to start memory training?</p>
                      <p className="text-sm text-gray-500 mb-6">
                        Look at the colored image, then use your crayons to color the outline!
                      </p>
                      <button
                        onClick={startGame}
                        className="bg-green-500 text-white py-3 px-6 rounded-md hover:bg-green-600 flex items-center"
                      >
                        <Play size={20} className="mr-2" />
                        Start Memory Game
                      </button>
                    </div>
                  )}

                  {gameState.phase === 'showing' && (
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {Math.ceil(gameState.timeRemaining)}s
                        </div>
                        <div className="text-lg font-medium text-gray-700 mb-1">
                          Remember this pattern!
                        </div>
                        <div className="text-sm text-gray-600">
                          Round {gameState.round} of {gameSettings.roundCount}
                        </div>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: currentMandala.coloredSvg }} />
                    </div>
                  )}

                  {gameState.phase === 'waiting' && (
                    <div className="text-center">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold mb-3">Time's up!</h3>
                        <p className="text-gray-600 mb-4">
                          Now color the outline with your crayons from memory.
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                          Click the button below when you want to see the original again.
                        </p>
                      </div>
                      
                      <div className="flex justify-center mb-6">
                        <div dangerouslySetInnerHTML={{ __html: currentMandala.outlineSvg }} />
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={() => setGameState(prev => ({ ...prev, phase: 'revealing' }))}
                          className="bg-blue-500 text-white py-2 px-6 rounded-md hover:bg-blue-600 mr-4"
                        >
                          Show Original Image
                        </button>
                        <button
                          onClick={nextRound}
                          className="bg-green-500 text-white py-2 px-6 rounded-md hover:bg-green-600"
                        >
                          Next Round
                        </button>
                      </div>
                    </div>
                  )}

                  {gameState.phase === 'revealing' && (
                    <div className="text-center">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold mb-3">Here's the original!</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Compare with your colored version
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h4 className="font-medium mb-2">Original (Colored)</h4>
                          <div dangerouslySetInnerHTML={{ __html: currentMandala.coloredSvg }} />
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Your Outline</h4>
                          <div dangerouslySetInnerHTML={{ __html: currentMandala.outlineSvg }} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={() => setGameState(prev => ({ ...prev, phase: 'waiting' }))}
                          className="bg-gray-500 text-white py-2 px-6 rounded-md hover:bg-gray-600 mr-4"
                        >
                          Hide Original
                        </button>
                        <button
                          onClick={nextRound}
                          className="bg-green-500 text-white py-2 px-6 rounded-md hover:bg-green-600"
                        >
                          Next Round
                        </button>
                      </div>
                    </div>
                  )}

                  {gameState.phase === 'finished' && (
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-4">Game Complete! 🎉</h3>
                      <p className="text-lg text-gray-700 mb-6">
                        Great job training your memory!
                      </p>
                      <div className="text-sm text-gray-600 mb-6">
                        Completed {gameSettings.roundCount} rounds
                      </div>
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, phase: 'idle', round: 0 }))}
                        className="bg-blue-500 text-white py-3 px-6 rounded-md hover:bg-blue-600"
                      >
                        Play Again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
