'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Search, Monitor, Laptop, MonitorDot, Command } from 'lucide-react';

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
}

export function GUIMimicWindow({ components, title, theme, onClose }: GUIMimicWindowProps) {
  const isRetro = theme === 'retro';

  return (
    <div className={`
      relative w-full max-w-2xl mx-auto overflow-hidden shadow-2xl transition-all duration-500
      ${isRetro 
        ? 'bg-[#C0C0C0] border-[3px] border-t-white border-l-white border-b-[#808080] border-r-[#808080] font-sans text-black' 
        : 'bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/20'
      }
    `}>
      {/* Title Bar */}
      <div className={`
        flex items-center justify-between px-3 py-1 mb-4 select-none
        ${isRetro 
          ? 'bg-[#000080] text-white h-6' 
          : 'bg-slate-50/50 border-b border-slate-100 h-14 px-6'
        }
      `}>
        <div className="flex items-center gap-2">
          {isRetro ? <MonitorDot className="h-3 w-3" /> : <Command className="h-5 w-5 text-primary" />}
          <span className={`font-bold ${isRetro ? 'text-[10px] uppercase font-mono' : 'text-sm font-headline'}`}>{title || 'Python GUI Simulator'}</span>
        </div>
        <div className="flex items-center gap-2">
          {isRetro ? (
            <button className="bg-[#C0C0C0] border-t-white border-l-white border-b-[#808080] border-r-[#808080] border-2 h-4 w-4 flex items-center justify-center text-black font-black text-[10px]">_</button>
          ) : (
             <div className="flex gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="w-3 h-3 rounded-full bg-slate-200" />
             </div>
          )}
          <button 
            onClick={onClose}
            className={`
              flex items-center justify-center transition-all
              ${isRetro 
                ? 'bg-[#C0C0C0] border-t-white border-l-white border-b-[#808080] border-r-[#808080] border-2 h-4 w-4 text-black font-black text-[10px]' 
                : 'w-8 h-8 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white'
              }
            `}
          >
            <X className={isRetro ? 'h-3 w-3' : 'h-4 w-4'} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative min-h-[400px] w-full p-4 overflow-auto">
        {components.map((comp, idx) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            left: `${comp.x}%`,
            top: `${comp.y}%`,
            transform: 'translate(-50%, -50%)',
          };

          if (comp.type === 'button') {
            return (
              <button 
                key={idx} 
                style={style}
                className={`
                  transition-all active:scale-95
                  ${isRetro 
                    ? 'bg-[#C0C0C0] border-t-white border-l-white border-b-[#808080] border-r-[#808080] border-2 px-3 py-1 text-[11px] shadow-[1px_1px_0px_#000]' 
                    : 'bg-primary text-white rounded-xl px-5 py-2 text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40'
                  }
                `}
              >
                {comp.text}
              </button>
            );
          }

          if (comp.type === 'label') {
            return (
              <span 
                key={idx} 
                style={style}
                className={isRetro ? 'text-[11px] font-sans' : 'text-sm font-medium text-slate-700'}
              >
                {comp.text}
              </span>
            );
          }

          if (comp.type === 'input') {
            return (
              <div key={idx} style={style} className="flex flex-col gap-1">
                 <input 
                    readOnly
                    placeholder="Python Input..."
                    className={`
                      ${isRetro 
                        ? 'bg-white border-b-white border-r-white border-t-[#808080] border-l-[#808080] border-2 px-1 text-[11px] outline-none h-6' 
                        : 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-48'
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
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 opacity-50">
             {isRetro ? <Monitor className="h-10 w-10 text-slate-500" /> : <MonitorDot className="h-16 w-16 text-slate-200" />}
             <p className={`text-center max-w-[200px] ${isRetro ? 'text-[10px]' : 'text-xs italic'}`}>
                {isRetro ? 'NO GUI ELEMENTS DETECTED IN CODE.' : 'Escribe código gráfico en Python para ver la magia...'}
             </p>
          </div>
        )}
      </div>

      {/* Footer Info (Modern Style Only) */}
      {!isRetro && (
        <div className="bg-slate-50/30 p-4 border-t border-slate-100/50 flex justify-center">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Powered by AI Visual Simulator</span>
        </div>
      )}
    </div>
  );
}
