import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw } from 'lucide-react';

export function DraggableSnippet({ id, text }: { id: string, text: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;
  
  if (isDragging) return <div ref={setNodeRef} style={style} className="bg-primary text-white font-mono px-4 py-2 rounded-xl shadow-2xl opacity-80 scale-110 cursor-grabbing border-2 border-white">{text}</div>;
  
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="bg-slate-800 text-emerald-400 font-mono text-sm px-4 py-2.5 rounded-xl shadow-md border border-slate-700 hover:border-emerald-500 hover:bg-slate-800/80 cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-all">
      {text}
    </div>
  );
}

export function DroppableSlot({ id, currentItem, snippetMap }: { id: string, currentItem: string | null, snippetMap: any }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  return (
    <span ref={setNodeRef} className={`inline-flex items-center justify-center border-2 border-dashed rounded-lg px-4 py-1.5 mx-2 min-w-[120px] transition-all relative top-1 ${isOver ? 'bg-primary/20 border-primary scale-110' : 'border-slate-600'} ${currentItem ? 'bg-slate-800 border-none shadow-inner' : 'bg-black/50'} `}>
       {currentItem ? <code className="text-emerald-400 font-bold text-sm">{snippetMap[currentItem]}</code> : <span className="text-slate-600 italic text-xs tracking-widest uppercase">Arrastra aquí</span>}
    </span>
  );
}

export function DragDropSnippets({ template, snippets, correctMapping, onComplete }: { template: string, snippets: {id: string, text: string}[], correctMapping: Record<string, string>, onComplete: (score: number) => void }) {
   const [placements, setPlacements] = useState<Record<string, string | null>>({});
   const [availableSnippets, setAvailableSnippets] = useState<{id:string, text:string}[]>(snippets);
   const snippetMap = snippets.reduce((acc, s) => ({...acc, [s.id]: s.text}), {} as any);

   const handleDragEnd = (event: any) => {
     const { active, over } = event;
     if (!over) return;
     
     const snippetId = active.id as string;
     const slotId = over.id as string;
     
     // Remueve del banco
     setAvailableSnippets(prev => prev.filter(s => s.id !== snippetId));
     
     // Si el hueco ya tenia algo, devuelve eso al banco
     if (placements[slotId]) {
       setAvailableSnippets(prev => [...prev, snippets.find(s => s.id === placements[slotId])!]);
     }
     
     setPlacements(prev => ({...prev, [slotId]: snippetId}));
   };

   const resetBoard = () => {
       setPlacements({});
       setAvailableSnippets(snippets);
   };

   const checkForm = () => {
     let correct = 0;
     const total = Object.keys(correctMapping).length;
     for (const [slot, expectedSnippet] of Object.entries(correctMapping)) {
       if (placements[slot] === expectedSnippet) correct++;
     }
     const score = (correct / total) * 5;
     onComplete(score);
   };

   // Parser de plantilla: "const {{{s1}}} = require('{{{s2}}}');"
   const parts = template.split(/(\{\{\{.*?\}\}\})/g);

   return (
     <DndContext onDragEnd={handleDragEnd}>
       <div className="max-w-4xl mx-auto space-y-10">
         <div className="flex flex-wrap gap-4 p-8 bg-slate-900 rounded-[2.5rem] min-h-[100px] items-center border shadow-inner">
           {availableSnippets.length === 0 ? (
               <div className="w-full flex items-center justify-between">
                   <p className="text-slate-500 font-medium italic">Todos los fragmentos han sido asignados.</p>
                   <Button variant="ghost" size="sm" onClick={resetBoard} className="text-slate-400 hover:text-white"><RotateCcw className="h-4 w-4 mr-2" /> Reiniciar</Button>
               </div>
           ) : availableSnippets.map(s => <DraggableSnippet key={s.id} id={s.id} text={s.text} />)}
         </div>
         
         <div className="bg-[#1e1e1e] p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900 text-lg font-mono text-slate-300 leading-relaxed whitespace-pre-wrap relative overflow-hidden">
            {parts.map((part, i) => {
               const match = part.match(/\{\{\{(.*?)\}\}\}/);
               if (match) {
                 const slotId = match[1];
                 return <DroppableSlot key={slotId} id={slotId} currentItem={placements[slotId] || null} snippetMap={snippetMap} />;
               }
               return <span key={i}>{part}</span>;
            })}
         </div>

         <div className="flex justify-center pt-8">
            <Button onClick={checkForm} className="bg-primary hover:bg-primary/90 h-16 w-full max-w-md rounded-[2rem] font-bold text-xl gap-4 shadow-2xl shadow-primary/30">
              <CheckCircle2 className="h-7 w-7" /> Evaluar Código Estructural
            </Button>
         </div>
       </div>
     </DndContext>
   );
}
