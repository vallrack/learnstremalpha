import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SwipeCards({ deck, onComplete }: { deck: {statement: string, isTrue: boolean}[], onComplete: (score: number) => void }) {
  const [cards, setCards] = useState(deck);
  const [correctCount, setCorrectCount] = useState(0);
  const [shake, setShake] = useState(false);

  const activeCard = cards[0];
  const x = useMotionValue(0);
  
  // Transformaciones físicas ligadas al desplazamiento del dedo/mouse
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  
  // Cambio de color visual que refleja la elección
  const background = useTransform(x, 
    [-150, 0, 150],
    ['rgb(255, 228, 230)', 'rgb(255, 255, 255)', 'rgb(209, 250, 229)']
  );

  const handleDragEnd = (event: any, info: any) => {
     const threshold = 100;
     if (info.offset.x > threshold) {
         handleSwipe(true);
     } else if (info.offset.x < -threshold) {
         handleSwipe(false);
     }
  };

  const handleSwipe = (directionIsTrue: boolean) => {
      const isCorrect = activeCard.isTrue === directionIsTrue;
      if (isCorrect) {
          setCorrectCount(c => c + 1);
      } else {
          setShake(true);
          setTimeout(() => setShake(false), 500);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      const newCards = [...cards];
      newCards.shift();
      setCards(newCards);
      
      if(newCards.length === 0) {
          // El timeout permite que la última animación termine antes de ir de cara a la evaluación final
          setTimeout(() => {
              onComplete(((correctCount + (isCorrect ? 1 : 0)) / deck.length) * 5);
          }, 300);
      }
  };

  if(!activeCard && cards.length === 0) return null;

  return (
     <div className="max-w-md mx-auto h-[600px] relative w-full flex items-center justify-center -mt-10">
        <div className="absolute top-10 font-bold text-slate-400 tracking-widest uppercase text-xs z-0">
           Restan {cards.length} tarjetas
        </div>
        
        <AnimatePresence>
          {activeCard && (
             <motion.div
                key={activeCard.statement}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                style={{ x, rotate, background }} 
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    y: 0,
                    x: shake ? [-10, 10, -10, 10, 0] : 0 
                }}
                transition={{ duration: 0.4 }}
                exit={{ scale: 0.8, opacity: 0, x: x.get(), transition: { duration: 0.2 } }}
                className="absolute w-full h-[450px] rounded-[3rem] shadow-2xl border-4 border-slate-100 flex flex-col items-center justify-center p-10 cursor-grab active:cursor-grabbing z-10"
                whileDrag={{ scale: 1.05, cursor: 'grabbing', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
             >
                <div className="flex-1 flex flex-col items-center justify-center mt-6">
                   <h3 className="text-3xl font-headline font-bold text-center text-slate-800 leading-snug">{activeCard.statement}</h3>
                </div>
                
                <div className="w-full flex justify-between text-sm font-bold mt-auto pt-6 border-t border-slate-200">
                   <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSwipe(false); }}
                      className="text-rose-500 flex flex-col items-center gap-1 hover:scale-110 transition-transform active:opacity-50 opacity-40 hover:opacity-100"
                   >
                      <ThumbsDown className="h-6 w-6"/> Falso
                   </button>
                   <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSwipe(true); }}
                      className="text-emerald-500 flex flex-col items-center gap-1 hover:scale-110 transition-transform active:opacity-50 opacity-40 hover:opacity-100"
                   >
                      <ThumbsUp className="h-6 w-6"/> Verdad
                   </button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
     </div>
  );
}
