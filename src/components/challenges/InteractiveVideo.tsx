import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactPlayer from 'react-player/lazy';
import { Button } from '@/components/ui/button';
import { PlayCircle, CheckCircle2, XCircle, Diamond } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type VideoCheckpoint = {
   seconds: number;
   question: string;
   options: string[];
   correctIndex: number;
};

type FeedbackState = { type: 'correct' | 'incorrect'; checkpointSeconds: number } | null;

export function InteractiveVideo({ url, checkpoints, onComplete }: { url: string, checkpoints: VideoCheckpoint[], onComplete: (score: number) => void }) {
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<VideoCheckpoint | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [clearedCheckpoints, setClearedCheckpoints] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(null);
  const [duration, setDuration] = useState(0);
  const [playedFraction, setPlayedFraction] = useState(0);
  const playerRef = useRef<any>(null);

  const handleProgress = useCallback((state: any) => {
      const { playedSeconds, played } = state;
      setPlayedFraction(played);
      const hit = checkpoints.find(c => playedSeconds >= c.seconds && playedSeconds < c.seconds + 1.5 && !clearedCheckpoints.includes(c.seconds));
      if (hit) {
          setPlaying(false);
          setActiveCheckpoint(hit);
      }
  }, [checkpoints, clearedCheckpoints]);

  const answerCheckpoint = (index: number) => {
      if (!activeCheckpoint) return;
      
      const isCorrect = activeCheckpoint.correctIndex === index;
      if (isCorrect) setCorrectCount(c => c + 1);
      
      // Show feedback for 1.5 seconds before resuming
      setFeedbackState({ type: isCorrect ? 'correct' : 'incorrect', checkpointSeconds: activeCheckpoint.seconds });
      setClearedCheckpoints(prev => [...prev, activeCheckpoint.seconds]);
      setActiveCheckpoint(null);
      
      setTimeout(() => {
          setFeedbackState(null);
          setPlaying(true);
      }, 1500);
  };

  const handleEnded = () => {
      const score = checkpoints.length > 0 ? (correctCount / checkpoints.length) * 5 : 5;
      onComplete(score);
  };

  const getCheckpointStatus = (cp: VideoCheckpoint): 'pending' | 'correct' | 'incorrect' => {
      if (!clearedCheckpoints.includes(cp.seconds)) return 'pending';
      // We can't easily track per-checkpoint correctness from current state alone,
      // so we track it via feedbackState history. For simplicity, cleared = done.
      return 'correct'; // simplified — could be enhanced with a map
  };

  if (!mounted) {
      return <div className="max-w-4xl mx-auto aspect-video animate-pulse bg-slate-900 rounded-[3rem] shadow-2xl border-4 border-slate-800"></div>;
  }

  if (!url || typeof url !== 'string' || url.trim() === '') {
      return (
        <div className="max-w-4xl mx-auto rounded-[3rem] p-12 shadow-inner border-4 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center space-y-4">
          <XCircle className="h-16 w-16 text-slate-300" />
          <h3 className="text-xl font-bold font-headline text-slate-500">Video No Configurado</h3>
          <p className="text-sm text-slate-400 font-medium">Esta actividad no cuenta con una URL de video válida.<br/>Contacta con soporte o con el instructor.</p>
        </div>
      );
  }

  // Sanitizar URL para ReactPlayer
  let safeUrl = url.trim();
  if (safeUrl.startsWith('<iframe')) {
      const match = safeUrl.match(/src="([^"]+)"/);
      if (match) safeUrl = match[1];
  } else if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
      safeUrl = 'https://' + safeUrl;
  }

  return (
      <div className="space-y-4">
        {/* Video Player Container */}
        <div className="max-w-4xl mx-auto rounded-[3rem] overflow-hidden shadow-2xl border-4 border-slate-900 bg-black relative aspect-video">
           <ReactPlayer
              ref={playerRef}
              url={safeUrl}
              playing={playing}
              controls={!activeCheckpoint && !feedbackState}
              width="100%"
              height="100%"
              onProgress={handleProgress}
              onDuration={(d: number) => setDuration(d)}
              onEnded={handleEnded}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
           />
           
           {/* Question Overlay */}
           <AnimatePresence>
              {activeCheckpoint && (
                  <motion.div 
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }} 
                     exit={{ opacity: 0 }} 
                     className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-10 z-50 text-center"
                  >
                      <motion.div initial={{ y: 50, scale: 0.9 }} animate={{ y: 0, scale: 1 }} className="max-w-xl w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border-4 border-emerald-500/20">
                          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                              <PlayCircle className="h-8 w-8 text-emerald-600" />
                          </div>
                          <h3 className="text-2xl font-headline font-bold text-slate-900 mb-8 leading-tight">{activeCheckpoint.question}</h3>
                          <div className="space-y-4">
                              {activeCheckpoint.options.map((opt, i) => (
                                  <Button key={i} onClick={() => answerCheckpoint(i)} variant="outline" className="w-full h-auto py-4 px-6 text-left justify-start rounded-2xl border-2 border-slate-100 font-bold text-slate-700 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 transition-all whitespace-normal shadow-sm">
                                      {opt}
                                  </Button>
                              ))}
                          </div>
                      </motion.div>
                  </motion.div>
              )}
           </AnimatePresence>

           {/* Feedback Overlay */}
           <AnimatePresence>
              {feedbackState && (
                  <motion.div 
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }} 
                     exit={{ opacity: 0 }}
                     transition={{ duration: 0.3 }}
                     className={`absolute inset-0 flex flex-col items-center justify-center z-50 ${
                       feedbackState.type === 'correct' 
                         ? 'bg-emerald-500/30 backdrop-blur-sm' 
                         : 'bg-rose-500/30 backdrop-blur-sm'
                     }`}
                  >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="flex flex-col items-center gap-4"
                      >
                        {feedbackState.type === 'correct' ? (
                          <>
                            <div className="bg-emerald-500 w-28 h-28 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50">
                              <CheckCircle2 className="h-16 w-16 text-white" />
                            </div>
                            <motion.p 
                              initial={{ opacity: 0, y: 20 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              transition={{ delay: 0.3 }}
                              className="text-3xl font-headline font-bold text-white drop-shadow-lg"
                            >
                              ¡Correcto!
                            </motion.p>
                          </>
                        ) : (
                          <>
                            <motion.div 
                              animate={{ x: [0, -10, 10, -10, 10, 0] }}
                              transition={{ duration: 0.5 }}
                              className="bg-rose-500 w-28 h-28 rounded-full flex items-center justify-center shadow-2xl shadow-rose-500/50"
                            >
                              <XCircle className="h-16 w-16 text-white" />
                            </motion.div>
                            <motion.p 
                              initial={{ opacity: 0, y: 20 }} 
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="text-3xl font-headline font-bold text-white drop-shadow-lg"
                            >
                              Incorrecto
                            </motion.p>
                          </>
                        )}
                      </motion.div>
                  </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Progress Bar with Checkpoint Markers */}
        {duration > 0 && checkpoints.length > 0 && (
          <div className="max-w-4xl mx-auto px-4">
            <div className="relative h-3 bg-slate-200 rounded-full overflow-visible">
              {/* Played progress */}
              <motion.div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-blue-500 rounded-full"
                style={{ width: `${playedFraction * 100}%` }}
                transition={{ duration: 0.3 }}
              />
              
              {/* Checkpoint markers */}
              {checkpoints.map((cp, i) => {
                const position = duration > 0 ? (cp.seconds / duration) * 100 : 0;
                const isCleared = clearedCheckpoints.includes(cp.seconds);
                return (
                  <div 
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                    style={{ left: `${Math.min(position, 100)}%` }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.3 }}
                      className={`w-5 h-5 rounded-md rotate-45 flex items-center justify-center cursor-pointer transition-all shadow-md ${
                        isCleared 
                          ? 'bg-emerald-500 shadow-emerald-300' 
                          : 'bg-amber-400 shadow-amber-200 animate-pulse'
                      }`}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                        {isCleared ? '✅ Respondido' : `⏱️ ${Math.floor(cp.seconds / 60)}:${String(Math.floor(cp.seconds % 60)).padStart(2, '0')}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Stats bar */}
            <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>{clearedCheckpoints.length}/{checkpoints.length} Preguntas</span>
              <span>{correctCount} Correctas</span>
            </div>
          </div>
        )}
      </div>
  );
}
