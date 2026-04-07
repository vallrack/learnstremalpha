import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Code2, Sparkles, Loader2, Wand2, TrendingUp } from 'lucide-react';
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Baraja de Flashcards</h3>
                <p className="text-[10px] text-slate-500 font-medium">Crea pares de Término y Definición.</p>
            </div>
            <Button type="button" onClick={() => update({ ...data, cards: [...cards, { front: '', back: '' }] })} size="sm" className="h-10 rounded-xl bg-primary shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"><Plus className="h-4 w-4 mr-2" /> Añadir Tarjeta</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
           {cards.map((c: any, i: number) => (
             <Card key={i} className="rounded-3xl border-none shadow-xl shadow-slate-200/50 relative group overflow-visible bg-white ring-1 ring-slate-100">
               <CardContent className="p-6 space-y-4">
                 <div className="absolute -top-3 -right-3 hidden group-hover:block z-10 animate-in fade-in zoom-in-50">
                   <Button type="button" size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg shadow-rose-500/20" onClick={() => { const n = [...cards]; n.splice(i, 1); update({ ...data, cards: n }); }}><Trash2 className="h-4 w-4" /></Button>
                 </div>
                 <div className="grid gap-2">
                   <Label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter flex items-center gap-1.5"><div className="h-1 w-1 rounded-full bg-primary" /> Término Frontal</Label>
                   <Input value={c.front} onChange={(e) => { const n = [...cards]; n[i].front = e.target.value; update({ ...data, cards: n }); }} className="h-10 text-xs font-bold bg-slate-50 border-none rounded-xl shadow-inner focus-visible:ring-primary/20" placeholder="Ej: React" />
                 </div>
                 <div className="grid gap-2">
                   <Label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter flex items-center gap-1.5"><div className="h-1 w-1 rounded-full bg-emerald-500" /> Solución (Reverso)</Label>
                   <Textarea value={c.back} onChange={(e) => { const n = [...cards]; n[i].back = e.target.value; update({ ...data, cards: n }); }} className="min-h-[80px] text-xs font-medium bg-slate-50 border-none rounded-xl shadow-inner resize-none focus-visible:ring-emerald-500/20" placeholder="Librería UI..." />
                 </div>
               </CardContent>
             </Card>
           ))}
           {cards.length === 0 && (
             <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 border-spacing-4">
                <Sparkles className="h-10 w-10 text-slate-200 mb-4" />
                <p className="text-xs font-bold text-slate-400 italic">No hay tarjetas aún. Comienza añadiendo una.</p>
             </div>
           )}
        </div>
      </div>
    );
  }

  if (type === 'swipe') {
    const deck = data.deck || [];
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Simulador Tinder (Swipe)</h3>
                <p className="text-[10px] text-slate-500 font-medium">Define afirmaciones verdaderas o falsas.</p>
            </div>
            <Button type="button" onClick={() => update({ ...data, deck: [...deck, { statement: '', isTrue: true }] })} size="sm" className="h-10 rounded-xl bg-primary shadow-lg shadow-primary/20"><Plus className="h-4 w-4 mr-2" /> Añadir Afirmación</Button>
        </div>
        
        <div className="grid gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
           {deck.map((d: any, i: number) => (
             <Card key={i} className="rounded-[2rem] border-none shadow-lg shadow-slate-200/40 relative group overflow-visible bg-white ring-1 ring-slate-100">
               <CardContent className="p-5 flex items-center gap-6">
                 <div className="absolute -top-3 -right-3 hidden group-hover:block z-10 animate-in fade-in zoom-in-50">
                   <Button type="button" size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg" onClick={() => { const n = [...deck]; n.splice(i, 1); update({ ...data, deck: n }); }}><Trash2 className="h-4 w-4" /></Button>
                 </div>
                 <div className="flex-1">
                   <Input value={d.statement} onChange={(e) => { const n = [...deck]; n[i].statement = e.target.value; update({ ...data, deck: n }); }} className="h-12 font-bold text-sm bg-slate-50 border-none rounded-2xl shadow-inner px-4 focus-visible:ring-primary/20 placeholder:text-slate-300" placeholder="Ej: El agua hierve a 100°C al nivel del mar." />
                 </div>
                 <div className="flex items-center gap-3 bg-slate-100/50 p-2 rounded-2xl border border-slate-200 shadow-sm">
                   <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider">FALSO</span>
                   <Switch checked={d.isTrue} onCheckedChange={(val) => { const n = [...deck]; n[i].isTrue = val; update({ ...data, deck: n }); }} className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500" />
                   <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">VERDAD</span>
                 </div>
               </CardContent>
             </Card>
           ))}
           {deck.length === 0 && (
             <div className="py-16 flex flex-col items-center justify-center opacity-30 select-none">
                <TrendingUp className="h-12 w-12 mb-3" />
                <p className="text-xs font-bold italic">Mazo vacío. Crea declaraciones desafiantes.</p>
             </div>
           )}
        </div>
      </div>
    );
  }

  if (type === 'sortable') {
    const lines = data.lines || [];
    const correctOrder = data.correctOrder || [];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <div className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><TrendingUp className="h-4 w-4" /></div>
                   Editor de Reordenamiento
                </h3>
                <p className="text-[10px] text-slate-500 font-medium ml-8">El estudiante debe ordenar estas líneas correctamente.</p>
            </div>
            <Button type="button" onClick={() => {
                const newId = `L${Date.now()}`;
                update({ ...data, lines: [...lines, { id: newId, text: '' }], correctOrder: [...(data.correctOrder || []), newId] });
            }} size="sm" className="h-10 rounded-xl bg-slate-900 text-emerald-400 shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 px-6 font-black uppercase text-[10px] tracking-widest"><Plus className="h-4 w-4 mr-2" /> Insertar Línea</Button>
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
      <div className="space-y-10 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
         {/* 1. TEMPLATE SECTION */}
         <div className="space-y-4">
           <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 shadow-lg"><Code2 className="h-4 w-4" /></div>
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">1. Código Base (Plantilla)</h3>
           </div>
           <div className="bg-slate-950 rounded-[2.5rem] p-6 shadow-2xl relative group border border-slate-800 ring-4 ring-slate-900/50">
               <span className="absolute top-4 right-6 text-[9px] font-mono text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded-md border border-slate-800">IDE Editor</span>
               <p className="text-[10px] text-slate-500 mb-4 font-medium italic">Inserta <code className="bg-slate-800 px-1.5 py-0.5 rounded text-primary font-bold">{`{{id}}`}</code> para crear un hueco donde el estudiante arrastrará la respuesta.</p>
               <Textarea 
                 value={data.template || ''} 
                 onChange={(e) => update({...data, template: e.target.value})} 
                 className="font-mono bg-transparent border-none text-emerald-400 text-xs min-h-[160px] p-0 focus-visible:ring-0 resize-none leading-relaxed" 
                 placeholder="const [value, setValue] = {{{h1}}}(0);" 
               />
           </div>
         </div>

         {/* 2. SNIPPETS SECTION */}
         <div className="space-y-4">
           <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><Plus className="h-4 w-4" /></div>
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">2. Fragmentos (Snippets)</h3>
               </div>
               <Button type="button" onClick={() => { const s = data.snippets || []; update({...data, snippets: [...s, { id: `s${Date.now()}`, text: ''}]}) }} size="sm" variant="outline" className="h-8 rounded-xl text-[10px] uppercase font-bold tracking-widest shadow-sm bg-white hover:bg-slate-50">Añadir Bloque</Button>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(data.snippets || []).map((sn: any, i: number) => (
                <div key={sn.id} className="flex gap-2 items-center group bg-white border border-slate-100 p-2 pl-4 rounded-2xl shadow-sm hover:ring-2 hover:ring-primary/10 transition-all">
                  <span className="text-[9px] font-mono font-black text-slate-300 w-8">{sn.id}</span>
                  <Input value={sn.text} onChange={(e) => { const s = [...(data.snippets||[])]; s[i].text = e.target.value; update({...data, snippets: s}); }} className="flex-1 h-9 text-xs font-mono border-none bg-slate-50 rounded-xl shadow-inner focus-visible:ring-0" placeholder="Texto (ej: useState)" />
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { const s = [...(data.snippets||[])]; s.splice(i, 1); update({...data, snippets: s}); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              {(data.snippets || []).length === 0 && <p className="col-span-full text-center text-[10px] text-slate-400 font-bold italic py-4">Define los bloques que el estudiante podrá elegir.</p>}
           </div>
         </div>
         
         {/* 3. MAPPING SECTION */}
         <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm"><Wand2 className="h-4 w-4" /></div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">3. Vinculación Inteligente</h3>
            </div>
            
            {(() => {
               const matches = (data.template || '').match(/\{\{\{(.*?)\}\}\}/g) || (data.template || '').match(/\{\{(.*?)\}\}/g) || [];
               const blanks = [...new Set(matches.map((m: string) => m.replace(/[{}]/g, '')))];
               
               if (blanks.length === 0) {
                  return (
                     <div className="bg-white/50 border-2 border-dashed rounded-[2rem] p-10 text-center space-y-2 select-none group border-slate-200">
                        <div className="bg-slate-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto text-slate-300 group-hover:scale-110 transition-transform"><Sparkles className="h-6 w-6" /></div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Esperando huecos en la plantilla...</p>
                        <p className="text-[10px] text-slate-400 font-medium italic">Escribe {'{{{id}}}'} en el código base.</p>
                     </div>
                  );
               }

              return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {(blanks as string[]).map((blankId: string) => (
                        <div key={blankId} className="flex flex-col gap-2 bg-white p-4 rounded-[1.75rem] border shadow-sm ring-1 ring-slate-100 group transition-all hover:shadow-xl hover:shadow-primary/5">
                           <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Hueco Detectado</Label>
                           <div className="flex items-center gap-3">
                               <div className="bg-slate-900 text-emerald-400 font-mono text-[10px] px-4 py-2 rounded-xl font-black shadow-lg shadow-slate-900/10">
                                  {blankId}
                               </div>
                               <div className="h-px flex-1 bg-slate-100 relative after:content-[''] after:absolute after:right-0 after:-top-1 after:w-2 after:h-2 after:border-t-2 after:border-r-2 after:border-slate-300 after:rotate-45" />
                               <select 
                                  value={(data.correctMapping || {})[blankId] || ''}
                                  onChange={(e) => {
                                     const m = { ...(data.correctMapping || {}) };
                                     m[blankId] = e.target.value;
                                     update({...data, correctMapping: m});
                                  }}
                                  className="h-10 text-[10px] border-none rounded-xl pr-10 px-4 bg-slate-100 font-mono text-slate-700 outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer font-black hover:bg-slate-200 appearance-none shadow-inner"
                               >
                                  <option value="" disabled>Respuesta...</option>
                                  {(data.snippets || []).map((sn: any) => (
                                     <option key={sn.id} value={sn.id}>{sn.id}: {sn.text || '(Vacío)'}</option>
                                  ))}
                               </select>
                           </div>
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
      <div className="space-y-10 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-500">
         {/* 1. SOURCE SECTION */}
         <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm border border-rose-100"><TrendingUp className="h-4 w-4" /></div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">URL del Video (YouTube)</h3>
            </div>
            <Input 
              value={data.videoUrl || ''} 
              onChange={(e) => update({...data, videoUrl: e.target.value})} 
              className="h-14 rounded-2xl font-bold bg-slate-50 border-none shadow-inner px-6 text-sm focus-visible:ring-rose-200 transition-all hover:bg-slate-100/50" 
              placeholder="Ej: https://www.youtube.com/watch?v=..." 
            />
         </div>

         {/* 2. CHECKPOINTS SECTION */}
         <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-sm border border-primary/10"><Sparkles className="h-4 w-4" /></div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Puntos de Interacción</h3>
                </div>
                <Button type="button" onClick={() => update({...data, checkpoints: [...checks, { seconds: 0, question: '', options: ['', ''], correctIndex: 0 }]})} size="sm" className="h-10 rounded-xl bg-primary shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest px-6"><Plus className="h-4 w-4 mr-2" /> Añadir Pregunta</Button>
            </div>
            
            <div className="space-y-6">
               {checks.map((cp: any, i: number) => (
                 <Card key={i} className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 relative group overflow-visible bg-white ring-1 ring-slate-100 animate-in slide-in-from-bottom-5 duration-300">
                    <CardContent className="p-8 space-y-6">
                       <div className="absolute -top-3 -right-3 hidden group-hover:block z-20 animate-in fade-in zoom-in-50">
                         <Button type="button" size="icon" variant="destructive" className="h-9 w-9 rounded-full shadow-lg" onClick={() => update({...data, checkpoints: checks.filter((_:any, idx:number) => idx !== i)})}><Trash2 className="h-4 w-4" /></Button>
                       </div>
                       
                       <div className="flex flex-col md:flex-row gap-8">
                          <div className="w-full md:w-32 shrink-0">
                             <Label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter mb-2 block ml-1 text-center">Momento (Seg)</Label>
                             <Input 
                                type="number" 
                                value={cp.seconds} 
                                onChange={(e) => { const n = [...checks]; n[i].seconds = parseInt(e.target.value); update({ ...data, checkpoints: n }); }} 
                                className="h-14 font-black text-center bg-slate-900 text-rose-400 border-none rounded-2xl shadow-lg ring-4 ring-rose-500/10 focus-visible:ring-rose-500/30 transition-all text-lg" 
                             />
                          </div>
                          <div className="flex-1 space-y-6">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter ml-1">Pregunta Desafiante</Label>
                                <Input 
                                   value={cp.question} 
                                   onChange={(e) => { const n = [...checks]; n[i].question = e.target.value; update({ ...data, checkpoints: n }); }} 
                                   className="h-14 font-black text-sm bg-slate-50 border-none rounded-2xl shadow-inner px-5 focus-visible:ring-primary/20 hover:bg-slate-100/50 transition-all" 
                                   placeholder="¿Qué acaba de explicar el instructor?" 
                                />
                             </div>
                             
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(cp.options || ['', '', '', '']).map((opt: string, oIdx: number) => (
                                  <div key={oIdx} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${cp.correctIndex === oIdx ? 'bg-emerald-50 border-emerald-500/30' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                     <input 
                                        type="radio" 
                                        name={`correct-${i}`} 
                                        checked={cp.correctIndex === oIdx} 
                                        onChange={() => { const n = [...checks]; n[i].correctIndex = oIdx; update({ ...data, checkpoints: n }); }} 
                                        className="h-5 w-5 text-emerald-500 ring-offset-white focus:ring-emerald-500 cursor-pointer"
                                     />
                                     <Input 
                                        value={opt} 
                                        onChange={(e) => { 
                                          const n = [...checks]; 
                                          const opts = [...(n[i].options || ['', '', '', ''])]; 
                                          opts[oIdx] = e.target.value; 
                                          n[i].options = opts; 
                                          update({...data, checkpoints: n}); 
                                        }} 
                                        className="h-10 text-xs font-bold border-none bg-transparent shadow-none p-0 focus-visible:ring-0 placeholder:text-slate-300" 
                                        placeholder={`Opción ${oIdx+1}`} 
                                     />
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
               ))}
               {checks.length === 0 && (
                  <div className="py-24 text-center space-y-4 bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-100">
                     <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-xl"><TrendingUp className="h-8 w-8" /></div>
                     <p className="text-[10px] font-black text-slate-350 uppercase tracking-[0.25em] px-10 leading-relaxed max-w-[280px] mx-auto">Configura momentos de pausa para evaluar al estudiante.</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    );
  }

  return <p className="text-center text-red-500">Builder Visual no disponible para esto. Usa modo JSON.</p>;
}
