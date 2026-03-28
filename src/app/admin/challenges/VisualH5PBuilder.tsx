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
      setJsonConfig(result.activityConfig);
      setIsAIOpen(false);
      setAiLessonContent('');
    } catch (err: any) {
      setAiError(err?.message || 'Error al generar la actividad con IA.');
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

  // AI Generation Panel (rendered at the top for supported types)
  const AIPanel = supportedAITypes.includes(type) ? (
    <div className="mb-6">
      {!isAIOpen ? (
        <Button type="button" onClick={() => setIsAIOpen(true)} variant="outline" className="w-full h-12 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/50 text-purple-700 font-bold hover:bg-purple-100 hover:border-purple-400 transition-all gap-3">
          <Wand2 className="h-4 w-4" />
          🪄 Generar Contenido con IA
        </Button>
      ) : (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <Label className="font-bold text-purple-800 text-sm">Generador con IA</Label>
            </div>
            <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] text-purple-500" onClick={() => { setIsAIOpen(false); setAiError(''); }}>Cerrar</Button>
          </div>
          <p className="text-[11px] text-purple-600/80">Pega el contenido de la lección que quieras estudiar. La IA generará el contenido de la actividad automáticamente.</p>
          <Textarea
            value={aiLessonContent}
            onChange={(e) => setAiLessonContent(e.target.value)}
            className="min-h-[120px] rounded-xl border-purple-200 bg-white text-xs resize-none focus-visible:ring-purple-400"
            placeholder="Pega aquí el texto de tu lección, apuntes o documentación técnica..."
          />
          {aiError && <p className="text-xs text-rose-600 font-medium bg-rose-50 px-3 py-2 rounded-lg">{aiError}</p>}
          <Button 
            type="button" 
            onClick={handleAIGenerate} 
            disabled={isGenerating || !aiLessonContent.trim()} 
            className="w-full h-10 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-200 gap-2"
          >
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando con Gemini...</> : <><Wand2 className="h-4 w-4" /> Generar {
              type === 'flashcard' ? 'Tarjetas' : 
              type === 'swipe' ? 'Declaraciones' : 
              type === 'sortable' ? 'Código' : 
              type === 'quiz' ? 'Preguntas' :
              type === 'dragdrop' ? 'Huecos de Código' :
              'Interacciones de Video'
            }</>}
          </Button>
        </div>
      )}
    </div>
  ) : null;

  if (type === 'flashcard') {
    const cards = data.cards || [];
    return (
      <div className="space-y-6">
        {AIPanel}
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
        {AIPanel}
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
        {AIPanel}
        <div className="flex justify-end"><Button type="button" onClick={() => update({ ...data, lines: [...lines, { id: `L${Date.now()}`, text: '' }], correctOrder: [...correctOrder, `L${Date.now()}`] })} size="sm" variant="outline" className="h-8"><Plus className="h-3 w-3 mr-2" /> Insertar Línea</Button></div>
        <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
           {lines.map((L: any, i: number) => (
             <div key={L.id} className="flex gap-2 items-center group">
               <div className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-md font-mono">{i + 1}</div>
               <Input value={L.text} onChange={(e) => { const n = [...lines]; n[i].text = e.target.value; update({ ...data, lines: n }); }} className="h-9 font-mono text-xs bg-slate-900 text-emerald-400 border-none flex-1" placeholder="function() {" />
               <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { const n = [...lines]; const ord = [...correctOrder]; n.splice(i, 1); const ordIdx = ord.indexOf(L.id); if(ordIdx>-1) ord.splice(ordIdx, 1); update({ ...data, lines: n, correctOrder: ord }); }}><Trash2 className="h-4 w-4" /></Button>
             </div>
           ))}
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
           <p className="text-[10px] text-slate-500">Usa <code className="bg-slate-100 px-1 rounded text-primary">{`{{{ID_HUECO}}}`}</code> donde quieras que arrastren código.</p>
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
           <Label className="font-bold text-xs uppercase text-slate-500">3. Mapeo Correcto (Respuestas)</Label>
           <Textarea value={JSON.stringify(data.correctMapping || {}, null, 2)} onChange={(e) => { try { const m = JSON.parse(e.target.value); update({...data, correctMapping: m}); } catch(err) { /* invalid JSON */ } }} className="font-mono text-xs min-h-[100px]" placeholder={'{\n  "h1": "s1"\n}'} />
           <p className="text-[10px] text-rose-500">NOTA: El mapeo se edita en JSON. Ejemplo: {`{"ID_HUECO": "ID_BLOQUE"}`}</p>
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
                   <div className="absolute top-4 right-4"><Button type="button" size="icon" variant="destructive" className="h-6 w-6 rounded-full" onClick={() => { const n = [...checks]; n.splice(i, 1); update({...data, checkpoints: n}) }}><Trash2 className="h-3 w-3" /></Button></div>
                   <div className="grid grid-cols-[140px_1fr] gap-4">
                     <div className="grid gap-1">
                       <Label className="text-[10px] uppercase font-bold text-primary">Minutos : Segundos</Label>
                       <div className="flex items-center gap-1">
                         <Input type="number" min="0" value={Math.floor((c.seconds||0) / 60)} onChange={(e) => { const m = parseInt(e.target.value)||0; const s = (c.seconds||0) % 60; const n = [...checks]; n[i].seconds = m * 60 + s; update({...data, checkpoints: n}) }} className="h-8 font-mono text-center px-1" />
                         <span className="font-bold text-slate-400">:</span>
                         <Input type="number" min="0" max="59" value={(c.seconds||0) % 60} onChange={(e) => { const m = Math.floor((c.seconds||0) / 60); const s = parseInt(e.target.value)||0; const n = [...checks]; n[i].seconds = m * 60 + s; update({...data, checkpoints: n}) }} className="h-8 font-mono text-center px-1" />
                       </div>
                     </div>
                     <div className="grid gap-1">
                       <Label className="text-[10px] uppercase font-bold text-primary">Pregunta Pop-up</Label>
                       <Input value={c.question} onChange={(e) => { const n = [...checks]; n[i].question = e.target.value; update({...data, checkpoints: n}) }} className="h-8 font-bold text-xs" placeholder="¿Qué significa...?" />
                     </div>
                   </div>
                   <div className="bg-white p-3 rounded-lg border grid grid-cols-2 gap-2">
                      {(c.options || ['','','','']).map((opt: string, optIdx: number) => (
                         <div key={optIdx} className="flex items-center gap-2">
                           <input type="radio" checked={c.correctIndex === optIdx} onChange={() => { const n = [...checks]; n[i].correctIndex = optIdx; update({...data, checkpoints: n}) }} />
                           <Input value={opt} onChange={(e) => { const n = [...checks]; n[i].options[optIdx] = e.target.value; update({...data, checkpoints: n}) }} className="h-7 text-[10px]" placeholder={`Opción ${optIdx+1}`} />
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
