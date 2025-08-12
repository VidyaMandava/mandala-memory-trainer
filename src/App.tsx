import React, { useState, useEffect, useRef } from 'react';
import { Timer, Palette, Play, Square, Download, RefreshCw, Settings } from 'lucide-react';

// Types
interface MandalaSettings {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  colorCount: number;
  palette: string[];
  radialSlices: number;
  rings: number;
  shapeComplexity: number;
  seed: string;
  canvasSize: number;
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

interface RegionSpec {
  id: string;
  color: string;
  path: string;
}

// Palettes
const PALETTES = {
  Primary: ['#E53935', '#1E88E5', '#FDD835', '#43A047', '#8E24AA'],
  Bold: ['#FF5722', '#03A9F4', '#FFC107', '#4CAF50', '#673AB7', '#FFEB3B'],
  Pastel: ['#F48FB1', '#81D4FA', '#FFF59D', '#A5D6A7', '#CE93D8'],
  HighContrast: ['#D32F2F', '#1976D2', '#FBC02D', '#388E3C', '#000000', '#FFFFFF']
};

// Seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = this.hashCode(seed);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }
}

// Mandala Generator
class MandalaGenerator {
  private rng: SeededRandom;
  private settings: MandalaSettings;

  constructor(settings: MandalaSettings) {
    this.settings = settings;
    this.rng = new SeededRandom(settings.seed);
  }

  generate(): { coloredSvg: string; outlineSvg: string; regions: RegionSpec[] } {
    const { canvasSize, palette, difficulty } = this.settings;
    const center = canvasSize / 2;
    const regions: RegionSpec[] = [];
    let svgElements: string[] = [];
    let regionId = 0;

    // Choose a random design pattern based on your sample images
    const designTypes = [
      'concentric_circles',
      'nested_squares', 
      'triangle_in_circle',
      'star_pattern',
      'hexagon_center',
      'mixed_shapes',
      'diamond_pattern'
    ];
    
    const designType = this.rng.choice(designTypes);
    
    switch (designType) {
      case 'concentric_circles':
        this.generateConcentricCircles(center, canvasSize, palette, regions, svgElements, regionId);
        break;
      case 'nested_squares':
        this.generateNestedSquares(center, canvasSize, palette, regions, svgElements, regionId);
        break;
      case 'triangle_in_circle':
        this.generateTriangleInCircle(center, canvasSize, palette, regions, svgElements, regionId);
        break;
      case 'star_pattern':
        this.generateStarPattern(center, canvasSize, palette, regions, svgElements, regionId);
        break;
      case 'hexagon_center':
        this.generateHexagonCenter(center, canvasSize, palette, regions, svgElements, regionId);
        break;
      case 'mixed_shapes':
        this.generateMixedShapes(center, canvasSize, palette, regions, svgElements, regionId);
        break;
      default:
        this.generateDiamondPattern(center, canvasSize, palette, regions, svgElements, regionId);
    }

    const coloredSvg = `<svg width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      ${svgElements.join('\n')}
    </svg>`;

    const outlineSvg = coloredSvg.replace(/fill="[^"]*"/g, 'fill="none"').replace(/stroke="#222"/g, 'stroke="#000"');

    return { coloredSvg, outlineSvg, regions };
  }

  private generateConcentricCircles(center: number, size: number, palette: string[], regions: RegionSpec[], svgElements: string[], startId: number) {
    const { difficulty } = this.settings;
    
    // Simpler for beginners
    const numCircles = difficulty === 'beginner' ? 2 : this.rng.randomInt(2, 4);
    const maxRadius = center * 0.8;
    
    for (let i = 0; i < numCircles; i++) {
      const radius = maxRadius * (1 - i / numCircles);
      const color = palette[i % palette.length];
      const id = `region-${startId + i}`;
      
      regions.push({ 
        id, 
        color, 
        path: `M ${center - radius} ${center} A ${radius} ${radius} 0 1 1 ${center + radius} ${center} A ${radius} ${radius} 0 1 1 ${center - radius} ${center} Z`
      });
      
      svgElements.push(`<circle id="${id}" cx="${center}" cy="${center}" r="${radius}" fill="${color}" stroke="#222" stroke-width="2"/>`);
    }

    // Only add center shape for intermediate/advanced or occasionally for beginners
    if (difficulty !== 'beginner' || this.rng.random() > 0.7) {
      const centerSize = maxRadius * 0.2;
      const centerColor = palette[(numCircles) % palette.length];
      const centerId = `region-${startId + numCircles}`;
      
      regions.push({ 
        id: centerId, 
        color: centerColor, 
        path: `M ${center - centerSize} ${center} A ${centerSize} ${centerSize} 0 1 1 ${center + centerSize} ${center} A ${centerSize} ${centerSize} 0 1 1 ${center - centerSize} ${center} Z`
      });
      svgElements.push(`<circle id="${centerId}" cx="${center}" cy="${center}" r="${centerSize}" fill="${centerColor}" stroke="#222" stroke-width="2"/>`);
    }
  }

  private generateNestedSquares(center: number, size: number, palette: string[], regions: RegionSpec[], svgElements: string[], startId: number) {
    const { difficulty } = this.settings;
    
    // Simpler for beginners
    const numSquares = difficulty === 'beginner' ? 2 : this.rng.randomInt(2, 4);
    const maxSize = center * 1.4;
    
    for (let i = 0; i < numSquares; i++) {
      const squareSize = maxSize * (1 - i / numSquares);
      const color = palette[i % palette.length];
      const id = `region-${startId + i}`;
      const half = squareSize / 2;
      
      regions.push({ 
        id, 
        color, 
        path: `M ${center - half} ${center - half} L ${center + half} ${center - half} L ${center + half} ${center + half} L ${center - half} ${center + half} Z`
      });
      
      svgElements.push(`<rect id="${id}" x="${center - half}" y="${center - half}" width="${squareSize}" height="${squareSize}" fill="${color}" stroke="#222" stroke-width="2"/>`);
    }

    // Only add center element for intermediate/advanced
    if (difficulty !== 'beginner') {
      const centerSize = maxSize * 0.15;
      const centerColor = palette[numSquares % palette.length];
      const centerId = `region-${startId + numSquares}`;
      
      regions.push({ 
        id: centerId, 
        color: centerColor, 
        path: `M ${center - centerSize} ${center} A ${centerSize} ${centerSize} 0 1 1 ${center + centerSize} ${center} A ${centerSize} ${centerSize} 0 1 1 ${center - centerSize} ${center} Z`
      });
      svgElements.push(`<circle id="${centerId}" cx="${center}" cy="${center}" r="${centerSize}" fill="${centerColor}" stroke="#222" stroke-width="2"/>`);
    }
  }

  private generateTriangleInCircle(center: number, size: number, palette: string[], regions: RegionSpec[], svgElements: string[], startId: number) {
    const { difficulty } = this.settings;
    const circleRadius = center * 0.8;
    const triangleSize = circleRadius * 0.6;
    
    // Background circle
    const circleColor = palette[0];
    const circleId = `region-${startId}`;
    regions.push({ 
      id: circleId, 
      color: circleColor, 
      path: `M ${center - circleRadius} ${center} A ${circleRadius} ${circleRadius} 0 1 1 ${center + circleRadius} ${center} A ${circleRadius} ${circleRadius} 0 1 1 ${center - circleRadius} ${center} Z`
    });
    svgElements.push(`<circle id="${circleId}" cx="${center}" cy="${center}" r="${circleRadius}" fill="${circleColor}" stroke="#222" stroke-width="2"/>`);

    // Triangle
    const triangleColor = palette[1 % palette.length];
    const triangleId = `region-${startId + 1}`;
    const height = triangleSize * Math.sqrt(3) / 2;
    const x1 = center;
    const y1 = center - height / 2;
    const x2 = center - triangleSize / 2;
    const y2 = center + height / 2;
    const x3 = center + triangleSize / 2;
    const y3 = center + height / 2;
    
    regions.push({ 
      id: triangleId, 
      color: triangleColor, 
      path: `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`
    });
    svgElements.push(`<polygon id="${triangleId}" points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${triangleColor}" stroke="#222" stroke-width="2"/>`);

    // Center circle only for intermediate/advanced, and only if enough colors
    if (difficulty !== 'beginner' && palette.length > 2) {
      const centerRadius = triangleSize * 0.15;
      const centerColor = palette[2 % palette.length];
      const centerId = `region-${startId + 2}`;
      
      regions.push({ 
        id: centerId, 
        color: centerColor, 
        path: `M ${center - centerRadius} ${center} A ${centerRadius} ${centerRadius} 0 1 1 ${center + centerRadius} ${center} A ${centerRadius} ${centerRadius} 0 1 1 ${center - centerRadius} ${center} Z`
      });
      svgElements.push(`<circle id="${centerId}" cx="${center}" cy="${center}" r="${centerRadius}" fill="${centerColor}" stroke="#222" stroke-width="2"/>`);
    }
  }

  private generateStarPattern(center: number, size: number, palette: string[], regions: RegionSpec[], svgElements: string[], startId: number) {
    const outerRadius = center * 0.7;
    const innerRadius = outerRadius * 0.4;
    const numPoints = this.rng.randomInt(5, 8);
    
    // Create star path
    let starPath = '';
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (i * Math.PI) / numPoints;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = center + radius * Math.cos(angle - Math.PI / 2);
      const y = center + radius * Math.sin(angle - Math.PI / 2);
      
      if (i === 0) {
        starPath += `M ${x} ${y}`;
      } else {
        starPath += ` L ${x} ${y}`;
      }
    }
    starPath += ' Z';
    
    const starColor = palette[0];
    const starId = `region-${startId}`;
    regions.push({ id: starId, color: starColor, path: starPath });
    svgElements.push(`<path id="${starId}" d="${starPath}" fill="${starColor}" stroke="#222" stroke-width="2"/>`);

    // Center circle
    const centerRadius = innerRadius * 0.5;
    const centerColor = palette[1 % palette.length];
    const centerId = `region-${startId + 1}`;
    
    regions.push({ 
      id: centerId, 
      color: centerColor, 
      path: `M ${center - centerRadius} ${center} A ${centerRadius} ${centerRadius} 0 1 1 ${center + centerRadius} ${center} A ${centerRadius} ${centerRadius} 0 1 1 ${center - centerRadius} ${center} Z`
    });
    svgElements.push(`<circle id="${centerId}" cx="${center}" cy="${center}" r="${centerRadius}" fill="${centerColor}" stroke="#222" stroke-width="2"/>`);
  }

  private generateHexagonCenter(center: number, size: number, palette: string[], regions: RegionSpec[], svgElements: string[], startId: number) {
    const hexRadius = center * 0.6;
    
    // Background shape
    const bgColor = palette[0];
    const bgId = `region-${startId}`;
    
    if (this.rng.random() > 0.5) {
      // Circle background
      regions.push({ 
        id: bgId, 
        color: bgColor, 
        path: `M ${center - hexRadius * 1.2} ${center} A ${hexRadius * 1.2} ${hexRadius * 1.2} 0 1 1 ${center + hexRadius * 1.2} ${center} A ${hexRadius * 1.2} ${hexRadius * 1.2} 0 1 1 ${center - hexRadius * 1.2} ${center} Z`
      });
      svgElements.push(`<circle id="${bgId}" cx="${center}" cy="${center}" r="${hexRadius * 1.2}" fill="${bgColor}" stroke="#222" stroke-width="2"/>`);
    } else {
      // Square background
      const bgSize = hexRadius * 1.6;
      const half = bgSize / 2;
      regions.push({ 
        id: bgId, 
        color: bgColor, 
        path: `M ${center - half} ${center - half} L ${center + half} ${center - half} L ${center + half} ${center + half} L ${center - half} ${center + half} Z`
      });
      svgElements.push(`<rect id="${bgId}" x="${center - half}" y="${center - half}" width="${bgSize}" height="${bgSize}" fill="${bgColor}" stroke="#222" stroke-width="2"/>`);
    }

    // Hexagon
    let hexPath = '';
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = center + hexRadius * Math.cos(angle);
      const y = center + hexRadius * Math.sin(angle);
      
      if (i === 0) {
        hexPath += `M ${x} ${y}`;
      } else {
        hexPath += ` L ${x} ${y}`;
      }
    }
    hexPath += ' Z';
    
    const hexColor = palette[1 % palette.length];
    const hexId = `region-${startId + 1}`;
    regions.push({ id: hexId, color: hexColor, path: hexPath });
    svgElements.push(`<path id="${hexId}" d="${hexPath}" fill="${hexColor}" stroke="#222" stroke-width="2"/>`);

    // Center shape
    const centerSize = hexRadius * 0.4;
    const centerColor = palette[2 % palette.length];
    const centerId = `region-${startId + 2}`;
    
    if (this.rng.random() > 0.5) {
      // Square center
      const half = centerSize / 2;
      regions.push({ 
        id: centerId, 
        color: centerColor, 
        path: `M ${center - half} ${center - half} L ${center + half} ${center - half} L ${center + half} ${center + half} L ${center - half} ${center + half} Z`
      });
      svgElements.push(`<rect id="${centerId}" x="${center - half}" y="${center - half}" width="${centerSize}" height="${centerSize}" fill="${centerColor}" stroke="#222" stroke-width="2"/>`);
    } else {
      // Circle center
      regions.push({ 
        id: centerId, 
        color: centerColor, 
        path: `M ${center - centerSize/2} ${center} A ${centerSize/2} ${centerSize/2} 0 1 1 ${center + centerSize/2} ${center} A ${centerSize/2} ${centerSize/2} 0 1 1 ${center - centerSize/2} ${center} Z`
      });
      svgElements.push(`<circle id="${centerId}" cx="${center}" cy="${center}" r="${centerSize/2}" fill="${centerColor}" stroke="#222" stroke-width="2"/>`);
    }
  }

  private generateMixedShapes(center: number, size: number, palette: string[], regions: RegionSpec[], svgElements: string[], startId: number) {
    const bgSize = center * 1.4;
    const bgColor = palette[0];
    const bgId = `region-${startId}`;
    
    // Background rectangle
    const half = bgSize / 2;
    regions.push({ 
      id: bgId, 
      color: bgColor, 
      path: `M ${center - half} ${center - half} L ${center + half} ${center - half} L ${center + half} ${center + half} L ${center - half} ${center + half} Z`
    });
    svgElements.push(`<rect id="${bgId}" x="${center - half}" y="${center - half}" width="${bgSize}" height="${bgSize}" fill="${bgColor}" stroke="#222" stroke-width="2"/>`);

    // Two triangles
    const triSize = bgSize * 0.35;
    
    // Left triangle (yellow in sample)
    const tri1Color = palette[1 % palette.length];
    const tri1Id = `region-${startId + 1}`;
    const tri1X = center - bgSize * 0.25;
    const tri1Y = center;
    const tri1Path = `M ${tri1X - triSize/2} ${tri1Y + triSize/2} L ${tri1X} ${tri1Y - triSize/2} L ${tri1X + triSize/2} ${tri1Y + triSize/2} Z`;
    
    regions.push({ id: tri1Id, color: tri1Color, path: tri1Path });
    svgElements.push(`<path id="${tri1Id}" d="${tri1Path}" fill="${tri1Color}" stroke="#222" stroke-width="2"/>`);

    // Right triangle (green in sample)
    const tri2Color = palette[2 % palette.length];
    const tri2Id = `region-${startId + 2}`;
    const tri2X = center + bgSize * 0.25;
    const tri2Y = center;
    const tri2Path = `M ${tri2X - triSize/2} ${tri2Y - triSize/2} L ${tri2X + triSize/2} ${tri2Y - triSize/2} L ${tri2X} ${tri2Y + triSize/2} Z`;
    
    regions.push({ id: tri2Id, color: tri2Color, path: tri2Path });
    svgElements.push(`<path id="${tri2Id}" d="${tri2Path}" fill="${tri2Color}" stroke="#222" stroke-width="2"/>`);
  }

  private generateDiamondPattern(center: number, size: number, palette: string[], regions: RegionSpec[], svgElements: string[], startId: number) {
    const radius = center * 0.8;
    
    // Background circle
    const bgColor = palette[0];
    const bgId = `region-${startId}`;
    regions.push({ 
      id: bgId, 
      color: bgColor, 
      path: `M ${center - radius} ${center} A ${radius} ${radius} 0 1 1 ${center + radius} ${center} A ${radius} ${radius} 0 1 1 ${center - radius} ${center} Z`
    });
    svgElements.push(`<circle id="${bgId}" cx="${center}" cy="${center}" r="${radius}" fill="${bgColor}" stroke="#222" stroke-width="2"/>`);

    // Diamond/rhombus in center
    const diamondSize = radius * 0.6;
    const diamondColor = palette[1 % palette.length];
    const diamondId = `region-${startId + 1}`;
    const diamondPath = `M ${center} ${center - diamondSize/2} L ${center + diamondSize/2} ${center} L ${center} ${center + diamondSize/2} L ${center - diamondSize/2} ${center} Z`;
    
    regions.push({ id: diamondId, color: diamondColor, path: diamondPath });
    svgElements.push(`<path id="${diamondId}" d="${diamondPath}" fill="${diamondColor}" stroke="#222" stroke-width="2"/>`);

    // Small center circle
    const centerRadius = diamondSize * 0.2;
    const centerColor = palette[2 % palette.length];
    const centerId = `region-${startId + 2}`;
    
    regions.push({ 
      id: centerId, 
      color: centerColor, 
      path: `M ${center - centerRadius} ${center} A ${centerRadius} ${centerRadius} 0 1 1 ${center + centerRadius} ${center} A ${centerRadius} ${centerRadius} 0 1 1 ${center - centerRadius} ${center} Z`
    });
    svgElements.push(`<circle id="${centerId}" cx="${center}" cy="${center}" r="${centerRadius}" fill="${centerColor}" stroke="#222" stroke-width="2"/>`);
  }
}

// Main App Component
export default function MandalaMemoryTrainer() {
  // Game settings
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    exposureTime: 15,
    roundCount: 10,
    showCountdown: true,
    difficulty: 'beginner',
    colorCount: 4,
    palette: PALETTES.Primary.slice(0, 4)
  });

  // Mandala settings
  const [mandalaSettings, setMandalaSettings] = useState<MandalaSettings>({
    difficulty: 'beginner',
    colorCount: 4,
    palette: PALETTES.Primary.slice(0, 4),
    radialSlices: 6,
    rings: 3,
    shapeComplexity: 1,
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

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'game'>('game');
  const timerRef = useRef<number>();

  // Generate mandala
  const generateMandala = () => {
    const generator = new MandalaGenerator(mandalaSettings);
    const mandala = generator.generate();
    setCurrentMandala(mandala);
    setSelectedColor(mandalaSettings.palette[0]);
  };

  useEffect(() => {
    generateMandala();
  }, [mandalaSettings]);

  // Difficulty configurations
  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return { radialSlices: 6, rings: 3, shapeComplexity: 1 };
      case 'intermediate':
        return { radialSlices: 8, rings: 4, shapeComplexity: 2 };
      case 'advanced':
        return { radialSlices: 10, rings: 5, shapeComplexity: 3 };
      default:
        return { radialSlices: 6, rings: 3, shapeComplexity: 1 };
    }
  };

  // Update difficulty
  const updateDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
    const config = getDifficultyConfig(difficulty);
    setMandalaSettings(prev => ({
      ...prev,
      difficulty,
      ...config
    }));
    setGameSettings(prev => ({
      ...prev,
      difficulty
    }));
  };

  // Update color count
  const updateColorCount = (count: number) => {
    const palette = gameSettings.palette.slice(0, count);
    setMandalaSettings(prev => ({
      ...prev,
      colorCount: count,
      palette
    }));
    setGameSettings(prev => ({
      ...prev,
      colorCount: count,
      palette
    }));
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
    setActiveTab('game');
    startTimer();
  };

  // Timer logic
  const startTimer = () => {
    const startTime = Date.now();
    const duration = gameSettings.exposureTime * 1000;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      
      setGameState(prev => ({
        ...prev,
        timeRemaining: remaining / 1000
      }));

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
          <p className="text-gray-600">Train your visual memory with beautiful symmetric patterns</p>
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
                <label className="block text-sm font-medium mb-2">Colors ({gameSettings.colorCount})</label>
                <input
                  type="range"
                  min="4"
                  max="8"
                  value={gameSettings.colorCount}
                  onChange={(e) => updateColorCount(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Palette</label>
                <select
                  value={Object.keys(PALETTES).find(key => 
                    PALETTES[key as keyof typeof PALETTES].slice(0, gameSettings.colorCount)
                    .every((color, i) => color === gameSettings.palette[i])
                  )}
                  onChange={(e) => {
                    const palette = PALETTES[e.target.value as keyof typeof PALETTES]
                      .slice(0, gameSettings.colorCount);
                    setGameSettings(prev => ({ ...prev, palette }));
                    setMandalaSettings(prev => ({ ...prev, palette }));
                  }}
                  className="w-full p-2 border rounded-md"
                >
                  {Object.keys(PALETTES).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
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

          {/* Canvas Area */}
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
                      <div 
                        dangerouslySetInnerHTML={{ __html: currentMandala.coloredSvg }}
                      />
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
                        <div 
                          dangerouslySetInnerHTML={{ __html: currentMandala.outlineSvg }}
                        />
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
                          <div 
                            dangerouslySetInnerHTML={{ __html: currentMandala.coloredSvg }}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Your Outline</h4>
                          <div 
                            dangerouslySetInnerHTML={{ __html: currentMandala.outlineSvg }}
                          />
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
                        Completed {gameState.round} of {gameSettings.roundCount} rounds
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
