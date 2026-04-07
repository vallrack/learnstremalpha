import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Code2, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { generateActivities } from '@/ai/flows/generate-activities';

export function VisualH5PBuilder({ type, jsonConfig, setJsonConfig, technology, lessonTitle }: { type: string, jsonConfig: string, setJsonConfig: (val: string) => void, technology?: string, lessonTitle?: string }) {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiLessonContent, setAiLessonContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  const supportedAITypes = ['flashcard', 'swipe', 'sortable', 'quiz', 'dragdrop', 'interactive-video'];

  const handleAIGenerate = async () => {
    if (!aiLessonContent.trim()) return;
    setIsGenerating(true);
    setAiError('');
    try {
      const activityType = type as 'flashcard' | 'swipe' | 'sortable' | 'quiz';
      const result = await generateActivities({
        lessonTitle: lessonTitle || 'Lección sin título',
        lessonContent: aiLessonContent,
        technology: technology || 'General',
        activityType,
      });
      
      if (result.success) {
        setJsonConfig(result.data.activityConfig);
        setIsAIOpen(false);
        setAiLessonContent('');
      } else {
        setAiError(result.error);
      }
    } catch (err: any) {
      setAiError(err?.message || 'Error de conexión al generar la actividad con IA.');
    } finally {
      setIsGenerating(false);
    }
  };


  const data = useMemo(() => {
    try {
      return JSON.parse(jsonConfig);
    } catch {
      return {};
    }
  }, [jsonConfig]);

  const update = (newData: any) => {
    setJsonConfig(JSON.stringify(newData, null, 2));
  };



  if (type === 'flashcard') {
    const cards = data.cards || [];
    return (
      <div className="space-y-6">
        <div className="flex justify-end"><Button type="button" onClick={() => update({ ...data, cards: [...cards, { front: '', back: '' }] })} size="sm" variant="outline" className="h-8"><Plus className="h-3 w-3 mr-2" /> Añadir Tarjeta</Button></div>
        <div className="grid gap-4 max-h-[300px] overflow-y-auto pr-2">
           {cards.map((c: any, i: number) => (
             <Card key={i} className="rounded-xl border-dashed border-slate-300 relative group overflow-visible">
               <CardContent className="p-4 space-y-3">
                 <div className="absolute -top-3 -right-3 hidden group-hover:block z-10">
                   <Button type="button" size="icon" variant="destructive" className="h-6 w-6 rounded-full" onClick={() => { const n = [...cards]; n.splice(i, 1); update({ ...data, cards: n }); }}><Trash2 className="h-3 w-3" /></Button>
                 </div>
                 <div className="grid gap-2">
                   <Label className="text-[10px] font-bold uppercase text-slate-500">Término Frontal</Label>
                   <Input value={c.front} onChange={(e) => { const n = [...cards]; n[i].front = e.target.value; update({ ...data, cards: n }); }} className="h-8 text-xs bg-white" placeholder="Ej: React" />
                 </div>
                 <div className="grid gap-2">
                   <Label className="text-[10px] font-bold uppercase text-slate-500">Solución (Reverso)</Label>
                   <Textarea value={c.back} onChange={(e) => { const n = [...cards]; n[i].back = e.target.value; update({ ...data, cards: n }); }} className="min-h-[60px] text-xs bg-slate-50 border-slate-200" placeholder="Librería UI..." />
                 </div>
               </CardContent>
             </Card>
           ))}
           {cards.length === 0 && <p className="text-center text-xs text-slate-400 italic py-8">No hay tarjetas. Clic en "Añadir Tarjeta".</p>}
        </div>
      </div>
    );
  }

  if (type === 'swipe') {
    const deck = data.deck || [];
    return (
      <div className="space-y-6">
        <div className="flex justify-end"><Button type="button" onClick={() => update({ ...data, deck: [...deck, { statement: '', isTrue: true }] })} size="sm" variant="outline" className="h-8"><Plus className="h-3 w-3 mr-2" /> Añadir Declaración</Button></div>
        <div className="grid gap-4 max-h-[300px] overflow-y-auto pr-2">
           {deck.map((d: any, i: number) => (
             <Card key={i} className="rounded-xl border-slate-200 relative group overflow-visible">
               <CardContent className="p-4 flex items-center gap-4">
                 <div className="absolute -top-3 -right-3 hidden group-hover:block z-10">
                   <Button type="button" size="icon" variant="destructive" className="h-6 w-6 rounded-full" onClick={() => { const n = [...deck]; n.splice(i, 1); update({ ...data, deck: n }); }}><Trash2 className="h-3 w-3" /></Button>
                 </div>
                 <div className="flex-1">
                   <Input value={d.statement} onChange={(e) => { const n = [...deck]; n[i].statement = e.target.value; update({ ...data, deck: n }); }} className="h-9 font-bold text-sm bg-white" placeholder="Ej: HTML es un lenguaje de diseño universal." />
                 </div>
                 <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border">
                   <span className="text-[10px] font-bold uppercase text-rose-500">Falso</span>
                   <Switch checked={d.isTrue} onCheckedChange={(val) => { const n = [...deck]; n[i].isTrue = val; update({ ...data, deck: n }); }} />
                   <span className="text-[10px] font-bold uppercase text-emerald-500">Verdad</span>
                 </div>
               </CardContent>
             </Card>
           ))}
           {deck.length === 0 && <p className="text-center text-xs text-slate-400 italic py-8">Mazo vacío. Crea declaraciones.</p>}
        </div>
      </div>
    );
  }

  if (type === 'sortable') {
    const lines = data.lines || [];
    const correctOrder = data.correctOrder || [];
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-dashed">
            <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700">Líneas del Algoritmo</span>
                <span className="text-[10px] text-slate-500">Define el orden final correcto.</span>
            </div>
            <Button type="button" onClick={() => update({ ...data, lines: [...lines, { id: `L${Date.now()}`, text: '' }], correctOrder: [...correctOrder, `L${Date.now()}`] })} size="sm" className="h-9 rounded-xl shadow-lg shadow-primary/10 transition-transform active:scale-95"><Plus className="h-3.5 w-3.5 mr-2" /> Insertar Línea</Button>
        </div>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
           {lines.map((L: any, i: number) => (
             <div key={L.id} className="flex gap-3 items-center group bg-slate-900/50 p-2 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all">
               <div className="bg-slate-800 text-slate-500 text-[10px] h-7 w-7 flex items-center justify-center rounded-full font-mono shrink-0 shadow-inner">
                 {i + 1}
               </div>
               <Input 
                 value={L.text} 
                 onChange={(e) => { const n = [...lines]; n[i].text = e.target.value; update({ ...data, lines: n }); }} 
                 className="h-10 font-mono text-[11px] bg-slate-950 text-emerald-400 border-none flex-1 placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-emerald-500/30 rounded-xl" 
                 placeholder='Ej: print("Hola Mundo")' 
               />
               <Button 
                 type="button" 
                 size="icon" 
                 variant="ghost" 
                 className="h-9 w-9 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" 
                 onClick={() => { const n = [...lines]; const ord = [...correctOrder]; n.splice(i, 1); const ordIdx = ord.indexOf(L.id); if(ordIdx>-1) ord.splice(ordIdx, 1); update({ ...data, lines: n, correctOrder: ord }); }}
               >
                 <Trash2 className="h-4 w-4" />
               </Button>
             </div>
           ))}
           {lines.length === 0 && (
             <div className="flex flex-col items-center justify-center py-10 opacity-40">
                <Code2 className="h-10 w-10 mb-2" />
                <p className="text-xs font-bold">Sin líneas de código aún</p>
             </div>
           )}
           <p className="text-[10px] text-slate-500 text-center mt-4 border-t pt-4">Ingresa las líneas en el <b>orden correcto final</b>. El sistema las mezclará al azar para el estudiante.</p>
        </div>
      </div>
    );
  }

  if (type === 'dragdrop') {
    return (
      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
         <div className="grid gap-2">
           <Label className="font-bold text-xs uppercase text-slate-500">1. Código Base (Plantilla)</Label>
           <p className="text-[10px] text-slate-500 truncate">Usa <code className="bg-slate-100 px-1 rounded text-primary">{`{{id}}`}</code> o <code className="bg-slate-100 px-1 rounded text-primary">{`{{{id}}}`}</code> para los huecos.</p>
           <Textarea value={data.template || ''} onChange={(e) => update({...data, template: e.target.value})} className="font-mono bg-slate-900 border-none text-emerald-400 text-xs min-h-[120px]" placeholder="const [count, setCount] = {{{h1}}}(0);" />
         </div>
         <div className="grid gap-4 mt-6">
           <div className="flex items-center justify-between">
              <Label className="font-bold text-xs uppercase text-slate-500">2. Fragmentos (Snippets)</Label>
              <Button type="button" onClick={() => { const s = data.snippets || []; update({...data, snippets: [...s, { id: `s${Date.now()}`, text: ''}]}) }} size="sm" variant="outline" className="h-7 text-[10px]"><Plus className="h-3 w-3 mr-1"/> Añadir Bloque</Button>
           </div>
           
           {(data.snippets || []).map((sn: any, i: number) => (
             <div key={sn.id} className="flex gap-2 items-center group bg-white border border-slate-200 p-2 rounded-xl">
               <span className="text-[10px] font-mono font-bold w-12 text-slate-400 text-center">{sn.id}</span>
               <Input value={sn.text} onChange={(e) => { const s = [...(data.snippets||[])]; s[i].text = e.target.value; update({...data, snippets: s}); }} className="flex-1 h-8 text-xs font-mono border-dashed bg-slate-50" placeholder="Texto del bloque (ej: useState)" />
               <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => { const s = [...(data.snippets||[])]; s.splice(i, 1); update({...data, snippets: s}); }}><Trash2 className="h-3 w-3" /></Button>
             </div>
           ))}
         </div>
         
         <div className="grid gap-4 mt-6">
           <Label className="font-bold text-xs uppercase text-slate-500">3. Vinculación de Respuestas</Label>
           <p className="text-[10px] text-slate-500">Asigna el fragmento correcto a cada hueco que creaste en el código base.</p>
           
           {(() => {
              const matches = (data.template || '').match(/\{\{\{(.*?)\}\}\}/g) || [];
              const blanks = matches.map((m: string) => m.replace(/[{}]/g, ''));
              
              if (blanks.length === 0) {
                 return (
                    <div className="bg-slate-50 border border-dashed rounded-xl p-6 text-center text-slate-400 text-xs font-medium">
                       No has definido huecos. Escribe <code className="bg-slate-200 px-1 py-0.5 rounded text-primary font-mono">{'{{{id}}}'}</code> en la Plantilla.
                    </div>
                 );
              }

              return (
                 <div className="grid gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                    {blanks.map((blankId: string) => (
                       <div key={blankId} className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm group hover:border-primary/40 transition-colors">
                          <div className="bg-slate-800 text-emerald-400 font-mono text-xs px-3 py-1.5 rounded-md font-bold w-24 text-center shadow-inner">
                             {blankId}
                          </div>
                          <span className="text-slate-300 font-bold group-hover:text-primary/50 transition-colors">→</span>
                          <select 
                             value={(data.correctMapping || {})[blankId] || ''}
                             onChange={(e) => {
                                const m = { ...(data.correctMapping || {}) };
                                m[blankId] = e.target.value;
                                update({...data, correctMapping: m});
                             }}
                             className="flex-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-slate-50 font-mono text-slate-700 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer font-medium hover:bg-white"
                          >
                             <option value="" disabled>Selecciona el bloque correcto...</option>
                             {(data.snippets || []).map((sn: any) => (
                                <option key={sn.id} value={sn.id}>{sn.id}: {sn.text || '(Vacío)'}</option>
                             ))}
                          </select>
                       </div>
                    ))}
                 </div>
              );
           })()}
         </div>
      </div>
    );
  }

  if (type === 'interactive-video') {
    const checks = data.checkpoints || [];
    return (
      <div className="space-y-6">
         <div className="grid gap-2">
            <Label className="font-bold">Enlace del Video (YouTube / MP4)</Label>
            <Input value={data.videoUrl || ''} onChange={(e) => update({...data, videoUrl: e.target.value})} className="h-10 bg-white" placeholder="https://youtube.com/watch?v=..." />
         </div>
         <div className="flex items-center justify-between border-t pt-6">
            <Label className="font-bold">Interrupciones (Checkpoints)</Label>
            <Button type="button" onClick={() => update({...data, checkpoints: [...checks, { seconds: 10, question: '', options: ['','','',''], correctIndex: 0 }]})} size="sm" variant="outline" className="h-8"><Plus className="h-3 w-3 mr-2" /> Añadir Pausa</Button>
         </div>
         <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {checks.map((c: any, i: number) => (
               <Card key={i} className="rounded-xl border-dashed border-primary/40 bg-primary/5">
                 <CardContent className="p-4 space-y-4 relative">
                   <div className="absolute top-4 right-4"><Button type="button" size="icon" variant="destructive" className="h-6 w-6 rounded-full" onClick={() => update({...data, checkpoints: checks.filter((_:any, idx:number) => idx !== i)})}><Trash2 className="h-3 w-3" /></Button></div>
                   <div className="grid grid-cols-[140px_1fr] gap-4">
                     <div className="grid gap-1">
                       <Label className="text-[10px] uppercase font-bold text-primary">Minutos : Segundos</Label>
                       <div className="flex items-center gap-1">
                         <Input type="number" min="0" value={Math.floor((c.seconds||0) / 60)} onChange={(e) => { const m = parseInt(e.target.value)||0; const s = (c.seconds||0) % 60; update({...data, checkpoints: checks.map((chk:any, idx:number) => idx === i ? {...chk, seconds: m * 60 + s} : chk)}) }} className="h-8 font-mono text-center px-1" />
                         <span className="font-bold text-slate-400">:</span>
                         <Input type="number" min="0" max="59" value={(c.seconds||0) % 60} onChange={(e) => { const m = Math.floor((c.seconds||0) / 60); const s = parseInt(e.target.value)||0; update({...data, checkpoints: checks.map((chk:any, idx:number) => idx === i ? {...chk, seconds: m * 60 + s} : chk)}) }} className="h-8 font-mono text-center px-1" />
                       </div>
                     </div>
                     <div className="grid gap-1">
                       <Label className="text-[10px] uppercase font-bold text-primary">Pregunta Pop-up</Label>
                       <Input value={c.question} onChange={(e) => update({...data, checkpoints: checks.map((chk:any, idx:number) => idx === i ? {...chk, question: e.target.value} : chk)})} className="h-8 font-bold text-xs" placeholder="¿Qué significa...?" />
                     </div>
                   </div>
                   <div className="bg-white p-3 rounded-lg border grid grid-cols-2 gap-2">
                      {(c.options || ['','','','']).map((opt: string, optIdx: number) => (
                         <div key={optIdx} className="flex items-center gap-2">
                           <input type="radio" checked={c.correctIndex === optIdx} onChange={() => update({...data, checkpoints: checks.map((chk:any, idx:number) => idx === i ? {...chk, correctIndex: optIdx} : chk)})} />
                           <Input value={opt} onChange={(e) => { const newOpts = [...c.options]; newOpts[optIdx] = e.target.value; update({...data, checkpoints: checks.map((chk:any, idx:number) => idx === i ? {...chk, options: newOpts} : chk)}); }} className="h-7 text-[10px]" placeholder={`Opción ${optIdx+1}`} />
                         </div>
                      ))}
                   </div>
                 </CardContent>
               </Card>
             ))}
             {checks.length === 0 && <p className="text-center text-xs text-slate-400 italic py-4">No hay pausas configuradas.</p>}
         </div>
      </div>
    );
  }

  return <p className="text-center text-red-500">Builder Visual no disponible para esto. Usa modo JSON.</p>;
}
