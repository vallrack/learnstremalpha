import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as React.ElementType<any>;
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type VideoCheckpoint = {
   seconds: number;
   question: string;
   options: string[];
   correctIndex: number;
};

export function InteractiveVideo({ url, checkpoints, onComplete }: { url: string, checkpoints: VideoCheckpoint[], onComplete: (score: number) => void }) {
  const [playing, setPlaying] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<VideoCheckpoint | null>(null);
  const [clearedCheckpoints, setClearedCheckpoints] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const handleProgress = (state: any) => {
      const { playedSeconds } = state;
      // Validamos si cruzamos el timestamp exacto del checkpoint
      const hit = checkpoints.find(c => playedSeconds >= c.seconds && playedSeconds < c.seconds + 1.5 && !clearedCheckpoints.includes(c.seconds));
      if (hit) {
          setPlaying(false);
          setActiveCheckpoint(hit);
      }
  };

  const answerCheckpoint = (index: number) => {
      if (!activeCheckpoint) return;
      
      const isCorrect = activeCheckpoint.correctIndex === index;
      if (isCorrect) setCorrectCount(c => c + 1);
      
      setClearedCheckpoints(prev => [...prev, activeCheckpoint.seconds]);
      setActiveCheckpoint(null);
      setPlaying(true); 
  };

  const handleEnded = () => {
      const score = checkpoints.length > 0 ? (correctCount / checkpoints.length) * 5 : 5;
      onComplete(score);
  };

  return (
      <div className="max-w-4xl mx-auto rounded-[3rem] overflow-hidden shadow-2xl border-4 border-slate-900 bg-black relative aspect-video">
         <ReactPlayer
            url={url}
            playing={playing}
            controls={!activeCheckpoint}
            width="100%"
            height="100%"
            onProgress={handleProgress}
            onEnded={handleEnded}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
         />
         
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
      </div>
  );
}
