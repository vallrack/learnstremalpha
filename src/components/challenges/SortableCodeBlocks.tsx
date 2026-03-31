import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { CheckCircle2, GripVertical } from 'lucide-react';

export function SortableItem({ id, content }: { id: string; content: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl cursor-grab active:cursor-grabbing font-mono text-sm shadow-sm ${isDragging ? 'shadow-2xl opacity-80 border-primary' : ''}`}>
      <div {...attributes} {...listeners} className="text-slate-500 hover:text-white transition-colors p-1"><GripVertical className="h-5 w-5" /></div>
      <code className="text-emerald-400 flex-1">{content}</code>
    </div>
  );
}

export function SortableCodeBlocks({ lines, correctOrder, onComplete }: { lines: {id: string, text: string}[], correctOrder: string[], onComplete: (score: number) => void }) {
  const [items, setItems] = useState(lines);

  // Sync state if props change (e.g. navigation)
  React.useEffect(() => {
    setItems(lines);
  }, [lines]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const checkOrder = () => {
    let correct = 0;
    items.forEach((item, idx) => {
      if (item.id === correctOrder[idx]) correct++;
    });
    const score = (correct / items.length) * 5;
    onComplete(score);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 bg-black/90 rounded-[3rem] p-10 shadow-2xl border-4 border-slate-900">
      <div className="text-center mb-8">
         <h2 className="text-3xl font-headline font-bold text-white mb-2">Reorganiza el Algoritmo</h2>
         <p className="text-slate-400 font-medium text-lg">Arrastra y suelta las líneas de código hasta que configuren la lógica matemáticamente correcta.</p>
      </div>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map(item => <SortableItem key={item.id} id={item.id} content={item.text} />)}
          </div>
        </SortableContext>
      </DndContext>
      
      <div className="pt-8 flex justify-center border-t border-slate-800 mt-8">
        <Button onClick={checkOrder} className="bg-primary hover:bg-primary/90 rounded-2xl h-14 px-10 font-bold text-lg gap-3 shadow-lg shadow-primary/20">
           <CheckCircle2 className="h-6 w-6" /> Compilar y Evaluar Lógica
        </Button>
      </div>
    </div>
  );
}
