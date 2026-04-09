
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WordSearchGameProps {
  words: string[];
  onComplete: () => void;
}

export function WordSearchGame({ words, onComplete }: WordSearchGameProps) {
  const GRID_SIZE = 15;
  const [grid, setGrid] = useState<string[][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selection, setSelection] = useState<{ start: { r: number, c: number }, end: { r: number, c: number } } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [placedWordsPos, setPlacedWordsPos] = useState<{ word: string, cells: { r: number, c: number }[] }[]>([]);

  const normalizeWord = (w: string) => {
    return w.toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita acentos/tildes
      .replace(/\s+/g, '');
  };

  // Generar la cuadrícula
  useEffect(() => {
    const cleanWords = words.map(normalizeWord);
    const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
    const positions: { word: string, cells: { r: number, c: number }[] }[] = [];

    // Ordenar por longitud descendente para colocar primero las difíciles
    const sortedWords = [...cleanWords].sort((a,b) => b.length - a.length);

    sortedWords.forEach(word => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 150) {
        // 8 Direcciones: 0:H, 1:V, 2:DR, 3:H-Rev, 4:V-Rev, 5:UL, 6:DL, 7:UR
        const direction = Math.floor(Math.random() * 8);
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        
        let canPlace = true;
        const wordCells: { r: number, c: number }[] = [];

        // Vectores de dirección [dr, dc]
        const vectors = [
          [0, 1],   // 0: Horizontal (Derecha)
          [1, 0],   // 1: Vertical (Abajo)
          [1, 1],   // 2: Diagonal (Abajo-Derecha)
          [0, -1],  // 3: Horizontal (Izquierda)
          [-1, 0],  // 4: Vertical (Arriba)
          [-1, -1], // 5: Diagonal (Arriba-Izquierda)
          [1, -1],  // 6: Diagonal (Abajo-Izquierda)
          [-1, 1]   // 7: Diagonal (Arriba-Derecha)
        ];

        const [dr, dc] = vectors[direction];

        for (let i = 0; i < word.length; i++) {
          const r = row + (i * dr);
          const c = col + (i * dc);

          if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE || (newGrid[r][c] !== '' && newGrid[r][c] !== word[i])) {
            canPlace = false;
            break;
          }
          wordCells.push({ r, c });
        }

        if (canPlace) {
          wordCells.forEach((cell, i) => {
            newGrid[cell.r][cell.c] = word[i];
          });
          positions.push({ word, cells: wordCells });
          placed = true;
        }
        attempts++;
      }
    });

    // Rellenar vacíos con letras aleatorias
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (newGrid[r][c] === '') {
          newGrid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    setGrid(newGrid);
    setPlacedWordsPos(positions);
    setFoundWords([]);
  }, [words]);

  const checkSelection = (start: { r: number, c: number }, end: { r: number, c: number }) => {
    const selectedCells: { r: number, c: number }[] = [];
    const dr = end.r - start.r;
    const dc = end.c - start.c;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));

    if (steps === 0) return;

    const ir = dr === 0 ? 0 : dr / steps;
    const ic = dc === 0 ? 0 : dc / steps;

    // Solo permitir líneas rectas (horiz, vert, diag 45)
    if (Math.abs(ir) > 1 || Math.abs(ic) > 1 || (ir !== 0 && ic !== 0 && Math.abs(ir) !== Math.abs(ic))) return;

    for (let i = 0; i <= steps; i++) {
      selectedCells.push({ r: start.r + i * ir, c: start.c + i * ic });
    }

    const selectedWord = selectedCells.map(cell => grid[cell.r][cell.c]).join('');
    const reversedWord = selectedWord.split('').reverse().join('');

    const match = placedWordsPos.find(p => p.word === selectedWord || p.word === reversedWord);
    
    if (match && !foundWords.includes(match.word)) {
      const newFound = [...foundWords, match.word];
      setFoundWords(newFound);
      if (newFound.length === placedWordsPos.length) {
        setTimeout(onComplete, 600);
      }
    }
  };

  const handleMouseDown = (r: number, c: number) => {
    setIsSelecting(true);
    setSelection({ start: { r, c }, end: { r, c } });
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (isSelecting && selection) {
      setSelection({ ...selection, end: { r, c } });
    }
  };

  const handleMouseUp = () => {
    if (selection) {
      checkSelection(selection.start, selection.end);
    }
    setIsSelecting(false);
    setSelection(null);
  };

  const isCellInFoundWord = (r: number, c: number) => {
    return placedWordsPos.some(p => foundWords.includes(p.word) && p.cells.some(cell => cell.r === r && cell.c === c));
  };

  const isCellInSelection = (r: number, c: number) => {
    if (!selection) return false;
    const { start, end } = selection;
    const dr = end.r - start.r;
    const dc = end.c - start.c;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps === 0) return start.r === r && start.c === c;

    const ir = dr === 0 ? 0 : dr / steps;
    const ic = dc === 0 ? 0 : dc / steps;

    for (let i = 0; i <= steps; i++) {
      if (Math.round(start.r + i * ir) === r && Math.round(start.c + i * ic) === c) return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        <div className="md:col-span-2">
          <div 
            className="grid gap-1 p-4 bg-slate-900 rounded-[2rem] shadow-2xl border-4 border-slate-800 touch-none select-none"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` 
            }}
            onMouseLeave={handleMouseUp}
          >
            {grid.map((row, r) => (
              row.map((letter, c) => (
                <div
                  key={`${r}-${c}`}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  onMouseUp={handleMouseUp}
                  className={cn(
                    "aspect-square flex items-center justify-center text-sm md:text-lg font-black rounded-lg transition-all cursor-pointer",
                    isCellInFoundWord(r, c) 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-95" 
                      : isCellInSelection(r, c)
                        ? "bg-primary text-white scale-105"
                        : "text-slate-400 hover:bg-white/5"
                  )}
                >
                  {letter}
                </div>
              ))
            ))}
          </div>
        </div>

        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
          <div className="bg-slate-50 p-6 border-b">
            <h3 className="font-headline font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Vocabulario
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Encuentra {words.length} términos</p>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              {words.map((word, i) => {
                const isFound = foundWords.includes(normalizeWord(word));
                return (
                  <Badge 
                    key={i} 
                    variant={isFound ? 'default' : 'outline'}
                    className={cn(
                      "px-3 py-1.5 rounded-xl transition-all duration-500",
                      isFound 
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                        : "text-slate-400 border-slate-100"
                    )}
                  >
                    {isFound && <CheckCircle2 className="h-3 w-3 mr-1.5" />}
                    {word}
                  </Badge>
                );
              })}
            </div>
            
            {words.length > 0 && foundWords.length === placedWordsPos.length && placedWordsPos.length > 0 && (
              <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-bounce">
                <p className="text-xs font-bold text-emerald-700 text-center">¡Increíble! Has encontrado todas las palabras.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
