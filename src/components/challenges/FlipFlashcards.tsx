import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, X, RotateCw } from 'lucide-react';

export function FlipFlashcards({ cards, onComplete }: { cards: {front: string, back: string}[], onComplete: (score: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [shake, setShake] = useState(false);
  
  const currentCard = cards[currentIndex];

  const handleNext = (correct: boolean) => {
    if (correct) {
      setCorrectCount(c => c + 1);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    
    setIsFlipped(false);
    
    // Suavizamos la transición a la siguiente carta
    setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(c => c + 1);
        } else {
          onComplete(((correctCount + (correct ? 1 : 0)) / cards.length) * 5);
        }
    }, correct ? 250 : 600);
  };

  if(!currentCard) return null;

  return (
     <div className="max-w-md mx-auto py-10 w-full" style={{ perspective: '1200px' }}>
        <div className="flex justify-between items-center mb-8 px-4 font-bold tracking-widest uppercase text-xs">
           <span className="text-slate-400">Carta {currentIndex + 1} de {cards.length}</span>
           <span className="text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg">Aciertos: {correctCount}</span>
        </div>
        
        <div className="relative w-full aspect-[3/4] cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
           <motion.div
              initial={false}
              animate={{ 
                rotateY: isFlipped ? 180 : 0,
                x: shake ? [-10, 10, -10, 10, 0] : 0 
              }}
              transition={{ 
                rotateY: { duration: 0.7, type: 'spring', stiffness: 200, damping: 20 },
                x: { duration: 0.4 }
              }}
              className="w-full h-full relative"
              style={{ transformStyle: 'preserve-3d' }}
           >
              {/* Lado Frontal (Término) */}
              <div 
                className="absolute inset-0 w-full h-full bg-white border-4 border-slate-100 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-10 text-center" 
                style={{ backfaceVisibility: 'hidden' }}
              >
                 <h3 className="text-4xl font-headline font-bold text-slate-900 mb-6 leading-tight">{currentCard.front}</h3>
                 <div className="absolute bottom-8 flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px] bg-slate-50 px-4 py-2 rounded-full">
                    <RotateCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-700" />
                    Toca para girar
                 </div>
              </div>
              
              {/* Lado Trasero (Definición/Solución técnica) */}
              <div 
                 className="absolute inset-0 w-full h-full bg-slate-900 border-4 border-slate-800 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-12 text-center" 
                 style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                 <p className="text-2xl font-medium text-emerald-400 leading-relaxed font-mono whitespace-pre-wrap">{currentCard.back}</p>
                 <div className="absolute top-8 left-8 text-slate-500 opacity-20 text-6xl font-serif">"</div>
              </div>
           </motion.div>
        </div>
        
        {/* Controles de Autoevaluación flotantes */}
        <AnimatePresence>
            {isFlipped && (
               <motion.div 
                 initial={{ opacity: 0, y: 30, scale: 0.9 }} 
                 animate={{ opacity: 1, y: 0, scale: 1 }} 
                 exit={{ opacity: 0, y: 15, scale: 0.9 }} 
                 className="flex justify-center gap-6 mt-12"
               >
                   <Button onClick={(e) => { e.stopPropagation(); handleNext(false); }} className="h-20 w-20 rounded-full bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-600 shadow-xl border border-rose-100 hover:scale-110 transition-transform flex flex-col gap-1">
                       <X className="h-8 w-8" />
                       <span className="text-[10px] font-bold uppercase">Fallé</span>
                   </Button>
                   <Button onClick={(e) => { e.stopPropagation(); handleNext(true); }} className="h-20 w-20 rounded-full bg-white text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 shadow-xl border border-emerald-100 hover:scale-110 transition-transform flex flex-col gap-1">
                       <Check className="h-8 w-8" />
                       <span className="text-[10px] font-bold uppercase">Lo sabía</span>
                   </Button>
               </motion.div>
            )}
        </AnimatePresence>
     </div>
  );
}
