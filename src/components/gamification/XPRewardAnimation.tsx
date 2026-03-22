'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Star, Sparkles } from 'lucide-react';

interface XPRewardAnimationProps {
  xpGained: number;
  newTotalXP: number;
  onDismiss: () => void;
  badge?: {
    title: string;
    description: string;
  } | null;
}

export function XPRewardAnimation({ xpGained, newTotalXP, onDismiss, badge }: XPRewardAnimationProps) {
  const [phase, setPhase] = useState<'xp' | 'level' | 'badge' | 'done'>('xp');
  
  // Level calculation (same as profile page)
  const level = Math.floor(Math.sqrt(newTotalXP / 100)) + 1;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const progressPercentage = Math.min(100, (newTotalXP / xpForNextLevel) * 100);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setPhase('level'), 1800));
    timers.push(setTimeout(() => setPhase(badge ? 'badge' : 'done'), 3600));
    if (badge) {
      timers.push(setTimeout(() => setPhase('done'), 5400));
    }
    return () => timers.forEach(clearTimeout);
  }, [badge]);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(onDismiss, 500);
      return () => clearTimeout(t);
    }
  }, [phase, onDismiss]);

  // Generate random particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: -(Math.random() * 200 + 100),
    delay: Math.random() * 0.5,
    size: Math.random() * 6 + 4,
    rotation: Math.random() * 360,
  }));

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={onDismiss}
        >
          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ 
                  opacity: 0, 
                  x: '50vw', 
                  y: '50vh',
                  scale: 0,
                  rotate: 0 
                }}
                animate={{ 
                  opacity: [0, 1, 1, 0], 
                  x: `calc(50vw + ${p.x}px)`, 
                  y: `calc(50vh + ${p.y}px)`,
                  scale: [0, 1.5, 1, 0],
                  rotate: p.rotation
                }}
                transition={{ 
                  duration: 2, 
                  delay: p.delay,
                  ease: 'easeOut'
                }}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  background: `linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)`,
                  boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)',
                }}
              />
            ))}
          </div>

          {/* XP Gained Phase */}
          <AnimatePresence mode="wait">
            {phase === 'xp' && (
              <motion.div
                key="xp"
                initial={{ scale: 0, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -30 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex flex-col items-center gap-6"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, -10, 10, -10, 0],
                    scale: [1, 1.1, 1, 1.1, 1]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-28 h-28 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/50"
                >
                  <Zap className="h-14 w-14 text-white drop-shadow-lg" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: [0.5, 1.3, 1] }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-6xl font-headline font-bold text-amber-400 drop-shadow-[0_4px_20px_rgba(251,191,36,0.5)]"
                  >
                    +{xpGained} XP
                  </motion.p>
                  <p className="text-lg text-white/80 font-medium mt-2">¡Experiencia Ganada!</p>
                </motion.div>
              </motion.div>
            )}

            {/* Level Progress Phase */}
            {phase === 'level' && (
              <motion.div
                key="level"
                initial={{ scale: 0, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -30 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex flex-col items-center gap-8 max-w-sm w-full"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-primary to-blue-600 w-16 h-16 rounded-full flex items-center justify-center shadow-xl">
                    <Star className="h-8 w-8 text-amber-300" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-white/60 font-bold uppercase tracking-widest">Tu Nivel</p>
                    <p className="text-4xl font-headline font-bold text-white">Nivel {level}</p>
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div className="w-full space-y-2">
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
                    </motion.div>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-white/50">
                    <span>{newTotalXP} XP</span>
                    <span>{xpForNextLevel} XP</span>
                  </div>
                </div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-sm text-white/40 font-medium"
                >
                  Toca para continuar
                </motion.p>
              </motion.div>
            )}

            {/* Badge Phase */}
            {phase === 'badge' && badge && (
              <motion.div
                key="badge"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 12 }}
                className="flex flex-col items-center gap-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-32 h-32 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/50 relative"
                >
                  <Trophy className="h-16 w-16 text-white drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-4 border-dashed border-white/30"
                  />
                </motion.div>
                <div className="text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 justify-center mb-2"
                  >
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Nueva Insignia Desbloqueada</p>
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </motion.div>
                  <h3 className="text-3xl font-headline font-bold text-white mb-2">{badge.title}</h3>
                  <p className="text-sm text-white/60 font-medium max-w-xs">{badge.description}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
