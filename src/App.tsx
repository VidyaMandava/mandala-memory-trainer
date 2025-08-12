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
        color
