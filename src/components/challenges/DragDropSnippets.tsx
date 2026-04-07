import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
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

   const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
      useSensor(KeyboardSensor)
   );

   const handleDragEnd = (event: any) => {
     const { active, over } = event;
     if (!over) return;
     
     const snippetId = active.id as string;
     const slotId = over.id as string;

     // Si el item ya estaba en otro slot, lo quitamos de allí primero
     const oldSlot = Object.entries(placements).find(([_, id]) => id === snippetId)?.[0];
     
     setPlacements(prev => {
       const next = { ...prev };
       if (oldSlot) next[oldSlot] = null;
       
       // Si el destino ya tenía algo, ese algo vuelve al banco (si no es el mismo snippet reubicado)
       const previousOccupant = prev[slotId];
       if (previousOccupant && previousOccupant !== snippetId) {
          setAvailableSnippets(bank => [...bank, snippets.find(s => s.id === previousOccupant)!]);
       }

       next[slotId] = snippetId;
       return next;
     });

     // Si venía del banco, lo quitamos del banco
     if (!oldSlot) {
        setAvailableSnippets(prev => prev.filter(s => s.id !== snippetId));
     }
   };

   const resetBoard = () => {
       setPlacements({});
       setAvailableSnippets(snippets);
   };

   const checkForm = () => {
     const normalize = (val: any) => (val || "").toString().toLowerCase().replace(/\s+/g, '').trim();
     let correct = 0;
     const total = Object.keys(correctMapping).length;
     for (const [slot, expected] of Object.entries(correctMapping)) {
       const id = placements[slot];
       if (!id) continue;
       const placedText = normalize(snippetMap[id]);
       const expectedText = normalize(snippetMap[expected] || expected);
       if (placedText === expectedText || normalize(id) === expectedText) correct++;
     }
     const score = (correct / total) * 5;
     onComplete(score);
   };

   const isAllFilled = Object.keys(correctMapping).every(slot => !!placements[slot]);

   // Parser de plantilla robusto: soporte para {{id}} y {{{id}}}
   const parts = (template || "").split(/(\{\{\{?.*?\}\}\}?)/g);

   if (!template || template.trim() === "") {
     return (
       <div className="flex flex-col items-center justify-center p-20 bg-slate-100 rounded-[3rem] border-4 border-dashed border-slate-300">
         <p className="text-slate-400 font-bold text-center">No hay plantilla definida para este reto.<br/>Define una en el editor visual.</p>
       </div>
     );
   }

   return (
     <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
               // Extraemos el ID considerando tanto {{id}} como {{{id}}}
               const match = part.match(/^\{\{\{?(.*?)\}\}\}?$/);
               if (match) {
                 const slotId = match[1].trim();
                 return <DroppableSlot key={`${slotId}-${i}`} id={slotId} currentItem={placements[slotId] || null} snippetMap={snippetMap} />;
               }
               return <span key={i}>{part}</span>;
            })}
         </div>

         <div className="flex justify-center pt-8">
            <Button 
              onClick={checkForm} 
              disabled={!isAllFilled}
              className={`h-16 w-full max-w-md rounded-[2rem] font-bold text-xl gap-4 shadow-2xl transition-all ${isAllFilled ? 'bg-primary hover:bg-primary/90 shadow-primary/30' : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}
            >
              <CheckCircle2 className="h-7 w-7" /> Evaluar Código Estructural
            </Button>
         </div>
       </div>
     </DndContext>
   );
}
