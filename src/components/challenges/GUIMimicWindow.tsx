'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Monitor, MonitorDot, Command } from 'lucide-react';

interface GUIComponent {
  type: 'button' | 'label' | 'input' | 'checkbox' | 'radio' | 'window';
  text?: string;
  id?: string;
  x: number;
  y: number;
  color?: string;
  background?: string;
}

interface GUIMimicWindowProps {
  components: GUIComponent[];
  title: string;
  theme: 'retro' | 'modern';
  onClose?: () => void;
  width?: number;
  height?: number;
}

export function GUIMimicWindow({ components, title, theme, onClose, width = 400, height = 300 }: GUIMimicWindowProps) {
  const isRetro = theme === 'retro';
  
  // LÃ³gica de escalado inteligente para que ventanas grandes (ej: 800x600) quepan en el modal
  const [scale, setScale] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.parentElement?.clientWidth || 0;
      const availableWidth = Math.min(containerWidth * 0.9, 700); // MÃ¡ximo 700px efectivos
      
      if (width > availableWidth) {
        setScale(availableWidth / width);
      } else {
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width]);

  return (
    <div ref={containerRef} className="w-full flex justify-center items-center py-4">
      <motion.div 
        drag
        dragMomentum={false}
        dragElastic={0.1}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: scale, opacity: 1 }}
        style={{ 
          width: width, 
          height: height + (isRetro ? 28 : 64), // Compensar el TitleBar
          maxWidth: 'none' // Deshabilitamos el max-width de Tailwind para usar el ancho de la IA
        }}
        className={`
          relative overflow-hidden shadow-2xl transition-colors duration-500 cursor-default flex flex-col shrink-0
          ${isRetro 
            ? 'bg-[#C0C0C0] border-[4px] border-t-white border-l-white border-b-[#808080] border-r-[#808080] font-sans text-black' 
            : 'bg-white/90 backdrop-blur-2xl rounded-[3rem] border border-white/40'
          }
        `}
      >
        {/* Title Bar (Drag Handle) */}
        <div 
          className={`
            flex items-center justify-between px-3 py-1 select-none cursor-move active:cursor-grabbing shrink-0
            ${isRetro 
              ? 'bg-[#000080] text-white h-7' 
              : 'bg-slate-100/30 border-b border-black/5 h-16 px-8'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {isRetro ? <MonitorDot className="h-4 w-4" /> : <Command className="h-6 w-6 text-primary" />}
            <span className={`font-bold truncate max-w-[150px] sm:max-w-none ${isRetro ? 'text-[11px] uppercase tracking-wide' : 'text-base font-headline text-slate-800'}`}>
              {title || 'Python GUI Simulator'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isRetro ? (
              <div className="flex gap-1.5">
                 <button className="bg-[#C0C0C0] border-t-white border-l-white border-b-[#808080] border-r-[#808080] border-2 h-5 w-5 flex items-center justify-center text-black font-black text-[12px] shadow-sm transform active:border-b-white active:border-r-white active:border-t-[#808080] active:border-l-[#808080]">0</button>
                 <button className="bg-[#C0C0C0] border-t-white border-l-white border-b-[#808080] border-r-[#808080] border-2 h-5 w-5 flex items-center justify-center text-black font-black text-[12px] shadow-sm transform active:border-b-white active:border-r-white active:border-t-[#808080] active:border-l-[#808080]">1</button>
              </div>
            ) : (
               <div className="hidden sm:flex gap-2 mr-6">
                  <div className="w-4 h-4 rounded-full bg-slate-200/50 hover:bg-slate-300 transition-colors" />
                  <div className="w-4 h-4 rounded-full bg-slate-200/50 hover:bg-slate-300 transition-colors" />
               </div>
            )}
            <button 
              onClick={onClose}
              className={`
                flex items-center justify-center transition-all active:scale-90
                ${isRetro 
                  ? 'bg-[#C0C0C0] border-t-white border-l-white border-b-[#808080] border-r-[#808080] border-2 h-6 w-6 text-black font-black' 
                  : 'w-10 h-10 rounded-full bg-rose-100/50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200/30'
                }
              `}
            >
              <X className={isRetro ? 'h-4 w-4' : 'h-5 w-5'} />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative flex-1 w-full p-6 overflow-hidden">
          {components.map((comp, idx) => {
            const style: React.CSSProperties = {
              position: 'absolute',
              left: `${comp.x}%`,
              top: `${comp.y}%`,
              transform: 'translate(-50%, -50%)',
            };

            if (comp.type === 'button') {
              return (
                <motion.button 
                  key={idx} 
                  style={style}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    transition-all whitespace-nowrap min-w-[60px]
                    ${isRetro 
                      ? 'bg-[#C0C0C0] border-t-white border-l-white border-b-black border-r-black border-2 px-3 py-1.5 text-[11px] shadow-[2px_2px_0px_#808080] active:shadow-none active:border-t-black active:border-l-black active:border-b-white active:border-r-white' 
                      : 'bg-primary text-white rounded-[1.25rem] px-6 py-2.5 text-xs font-bold shadow-xl shadow-primary/30 hover:shadow-primary/50'
                    }
                  `}
                >
                  {comp.text}
                </motion.button>
              );
            }

            if (comp.type === 'label') {
              return (
                <span 
                  key={idx} 
                  style={style}
                  className={`
                    whitespace-pre-wrap max-w-[90%] text-center
                    ${isRetro ? 'text-[11px] font-sans h-auto' : 'text-sm font-semibold text-slate-800 tracking-tight'}
                  `}
                >
                  {comp.text}
                </span>
              );
            }

            if (comp.type === 'input') {
              return (
                <div key={idx} style={style} className="flex flex-col gap-1.5">
                   <input 
                      readOnly
                      placeholder="Input..."
                      className={`
                        ${isRetro 
                          ? 'bg-white border-b-white border-r-white border-t-[#808080] border-l-[#808080] border-2 px-2 text-[11px] outline-none h-7 w-32' 
                          : 'bg-slate-50 border-2 border-slate-200/50 rounded-2xl px-4 py-3 text-xs w-48 focus:border-primary/50 transition-all shadow-inner'
                        }
                      `}
                   />
                </div>
              );
            }

            return null;
          })}

          {/* Empty State */}
          {components.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[200px] gap-6 opacity-30 animate-in fade-in duration-1000">
               {isRetro ? <Monitor className="h-10 w-10 text-slate-500" /> : <MonitorDot className="h-16 w-16 text-slate-300" />}
               <p className={`text-center max-w-[200px] leading-relaxed ${isRetro ? 'text-[10px] uppercase tracking-widest' : 'text-xs font-medium italic'}`}>
                  {isRetro ? 'NO GUI WIDGETS.' : 'Escribe código gráfico en Python...'}
               </p>
            </div>
          )}
        </div>

        {/* Footer Info (Modern Style Only) */}
        {!isRetro && (
          <div className="bg-slate-100/20 p-4 border-t border-slate-100/40 flex justify-center backdrop-blur-md shrink-0">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">Visual Laboratory</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
