
'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Code2, 
  Loader2, 
  Search, 
  Gamepad2, 
  ListPlus, 
  X, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  MessageSquare,
  Sparkles,
  Terminal,
  Cpu,
  Layers
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useDoc, 
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, serverTimestamp, doc, query, where } from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TECH_STACK } from '@/lib/languages';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { VisualH5PBuilder } from './VisualH5PBuilder';

export default function AdminChallengesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Principiante');
  const [technology, setTechnology] = useState('');
  const [challengeType, setChallengeType] = useState<string>('code');
  const [words, setWords] = useState<string[]>([]);
  const [wordInput, setWordsInput] = useState('');
  const [initialCode, setInitialCode] = useState('');
  const [solution, setSolution] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [questions, setQuestions] = useState<any[]>([]);
  const [jsonConfig, setJsonConfig] = useState('{\n\n}');

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const isAdmin = profile?.role === 'admin';

  const challengesQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (profile.role === 'admin') {
      return collection(db, 'coding_challenges');
    }
    if (profile.role === 'instructor' && user?.uid) {
      return query(collection(db, 'coding_challenges'), where('instructorId', '==', user.uid));
    }
    return null;
  }, [db, profile, user?.uid]);
  const { data: challenges, isLoading: isChallengesLoading } = useCollection(challengesQuery);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDifficulty('Principiante');
    setTechnology('');
    setChallengeType('code');
    setWords([]);
    setInitialCode('');
    setSolution('');
    setIsFree(true);
    setVisibility('public');
    setQuestions([]);
    setJsonConfig('{\n\n}');
  };

  const handleEditClick = (challenge: any) => {
    setEditingId(challenge.id);
    setTitle(challenge.title || '');
    setDescription(challenge.description || '');
    setDifficulty(challenge.difficulty || 'Principiante');
    setTechnology(challenge.technology || '');
    setChallengeType(challenge.type || 'code');
    setWords(challenge.words || []);
    setInitialCode(challenge.initialCode || '');
    setSolution(challenge.solution || '');
    setIsFree(challenge.isFree ?? true);
    setVisibility(challenge.visibility || 'public');
    setQuestions(challenge.questions || []);
    
    if (['dragdrop', 'sortable', 'flashcard', 'interactive-video', 'swipe'].includes(challenge.type)) {
       const { id, title, description, difficulty, technology, type, isFree, visibility, updatedAt, instructorId, instructorName, createdAt, ...rest } = challenge;
       setJsonConfig(JSON.stringify(rest, null, 2));
    } else {
       setJsonConfig('{\n\n}');
    }
    
    setIsDialogOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    const challengeData: any = {
      title,
      description,
      difficulty,
      technology,
      type: challengeType,
      visibility,
      updatedAt: serverTimestamp(),
    };

    if (challengeType === 'code' || challengeType === 'interview') {
      challengeData.initialCode = initialCode;
      challengeData.solution = solution;
    } else if (challengeType === 'wordsearch') {
      challengeData.words = words;
    } else if (challengeType === 'quiz') {
      challengeData.questions = questions;
    } else {
      try {
         const parsed = JSON.parse(jsonConfig);
         Object.assign(challengeData, parsed);
      } catch (err) {
         alert("La configuración JSON es inválida. Revisa la sintaxis.");
         return;
      }
    }

    if (editingId) {
      updateDocumentNonBlocking(doc(db, 'coding_challenges', editingId), challengeData);
    } else {
      challengeData.instructorId = user.uid;
      challengeData.instructorName = profile?.displayName || user.displayName || user.email;
      challengeData.createdAt = serverTimestamp();
      addDocumentNonBlocking(collection(db, 'coding_challenges'), challengeData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-headline font-bold mb-2 flex items-center gap-3 text-slate-900">
              <Sparkles className="h-8 w-8 text-primary" />
              Gestión de Actividades
            </h1>
            <p className="text-muted-foreground font-medium">Crea retos interactivos, trivias o simulacros de entrevista.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 gap-2 shadow-lg shadow-primary/10">
                <Plus className="h-4 w-4" />
                Nueva Actividad
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleFormSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline">{editingId ? 'Editar Actividad' : 'Nueva Actividad'}</DialogTitle>
                  <DialogDescription>Configura el formato y los parámetros de acceso.</DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-8">
                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <Label className="font-bold">Título</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Entrevista: State Management" className="rounded-xl h-11" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="font-bold">Tipo</Label>
                        <Select value={challengeType} onValueChange={(v: any) => setChallengeType(v)}>
                          <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="code">Editor de Código</SelectItem>
                            <SelectItem value="wordsearch">Sopa de Letras</SelectItem>
                            <SelectItem value="quiz">Trivia (Cuestionario)</SelectItem>
                            <SelectItem value="interview">Simulacro Entrevista</SelectItem>
                            <SelectItem value="dragdrop">Arrastrar Código (Fill-In)</SelectItem>
                            <SelectItem value="sortable">Reordenar Lógica</SelectItem>
                            <SelectItem value="flashcard">Flashcards 3D</SelectItem>
                            <SelectItem value="swipe">Cartas Tinder (Sweep)</SelectItem>
                            <SelectItem value="interactive-video">Video Interactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="font-bold">Tecnología</Label>
                        <Select value={technology} onValueChange={setTechnology}>
                          <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {Object.entries(TECH_STACK).map(([cat, subgroups]) => (
                              <SelectGroup key={cat}>
                                <SelectLabel className="bg-muted/50 py-1">{cat}</SelectLabel>
                                {Array.isArray(subgroups) 
                                  ? subgroups.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)
                                  : Object.entries(subgroups).map(([sub, techs]) => techs.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>))
                                }
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="font-bold">Dificultad</Label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Principiante">Principiante</SelectItem>
                            <SelectItem value="Intermedio">Intermedio</SelectItem>
                            <SelectItem value="Avanzado">Avanzado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="font-bold">Visibilidad en Catálogo</Label>
                        <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                          <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Público (Catálogo)</SelectItem>
                            <SelectItem value="private">Privado (Solo Curso)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="font-bold">Acceso Económico</Label>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border h-14">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isFree ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            {isFree ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{isFree ? 'Gratuito para todos' : 'Exclusivo Premium'}</span>
                            <span className="text-[10px] text-muted-foreground">{isFree ? 'Sin restricciones' : 'Requiere suscripción'}</span>
                          </div>
                        </div>
                        <Switch checked={isFree} onCheckedChange={setIsFree} />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="font-bold">Instrucciones / Contexto</Label>
                      <Textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="min-h-[150px] rounded-2xl resize-none" 
                        placeholder="Explica el objetivo de esta actividad..." 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-8 bg-muted/20 p-6 rounded-[2rem] border">
                    {['dragdrop', 'sortable', 'flashcard', 'interactive-video', 'swipe'].includes(challengeType) ? (
                      <div className="grid gap-4">
                        <Tabs defaultValue="visual" className="w-full">
                           <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-slate-200/50 rounded-xl p-1">
                             <TabsTrigger value="visual" className="rounded-lg font-bold">🛠️ Editor Visual No-Code</TabsTrigger>
                             <TabsTrigger value="json" className="rounded-lg font-bold">💻 Variables JSON Base</TabsTrigger>
                           </TabsList>
                           <TabsContent value="visual" className="bg-white p-6 rounded-[2rem] border shadow-sm">
                               <VisualH5PBuilder type={challengeType} jsonConfig={jsonConfig} setJsonConfig={setJsonConfig} technology={technology} lessonTitle={title} />
                           </TabsContent>
                           <TabsContent value="json">
                              <div className="grid gap-4">
                                <div className="flex items-center justify-between">
                                   <Label className="font-bold text-amber-600">Configuración Avanzada JSON</Label>
                                   <Button type="button" variant="outline" size="sm" className="h-8 text-[11px] font-bold border-amber-200 text-amber-700 bg-amber-50" onClick={() => {
                                      if (challengeType === 'flashcard') setJsonConfig('{\n  "cards": [\n    { "front": "¿Qué hace useState?", "back": "Define estados reactivos en React" },\n    { "front": "¿Qué es JSX?", "back": "Sintaxis HTML dentro de JS" }\n  ]\n}');
                                      else if (challengeType === 'swipe') setJsonConfig('{\n  "deck": [\n    { "statement": "React es un lenguaje", "isTrue": false },\n    { "statement": "Next.js permite SSR", "isTrue": true }\n  ]\n}');
                                      else if (challengeType === 'sortable') setJsonConfig('{\n  "lines": [\n    { "id": "L1", "text": "function sumar(a, b) {" },\n    { "id": "L2", "text": "  return a + b;" },\n    { "id": "L3", "text": "}" }\n  ],\n  "correctOrder": ["L1", "L2", "L3"]\n}');
                                      else if (challengeType === 'dragdrop') setJsonConfig('{\n  "template": "const [count, setCount] = {{{hueco1}}}(0);",\n  "snippets": [\n    { "id": "s1", "text": "useState" },\n    { "id": "s2", "text": "useEffect" }\n  ],\n  "correctMapping": {\n    "hueco1": "s1"\n  }\n}');
                                      else if (challengeType === 'interactive-video') setJsonConfig('{\n  "videoUrl": "https://www.youtube.com/watch?v=...",\n  "checkpoints": [\n    {\n      "seconds": 45,\n      "question": "¿De qué hook habla el instructor?",\n      "options": ["useState", "useEffect", "useRef", "useMemo"],\n      "correctIndex": 1\n    }\n  ]\n}');
                                   }}>
                                      Restaurar Plantilla Raw
                                   </Button>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Recomendamos usar el modo <b>Visual</b>, pero si eres desarrollador, puedes inyectar los arrays desde aquí libremente.</p>
                                <Textarea 
                                  value={jsonConfig} 
                                  onChange={(e) => setJsonConfig(e.target.value)} 
                                  className="font-mono text-[11px] min-h-[300px] rounded-2xl bg-[#0d1117] text-[#7ee787] border-slate-800 shadow-inner p-4" 
                                  placeholder="Pega o escribe tu JSON aquí..." 
                                />
                              </div>
                           </TabsContent>
                        </Tabs>
                      </div>
                    ) : challengeType === 'code' || challengeType === 'interview' ? (
                      <>
                        <div className="grid gap-3">
                          <Label className="font-bold">{challengeType === 'code' ? 'Código Inicial' : 'Placeholder de Respuesta'}</Label>
                          <Textarea 
                            value={initialCode} 
                            onChange={(e) => setInitialCode(e.target.value)} 
                            className="font-mono text-[11px] min-h-[180px] rounded-2xl bg-white border-dashed" 
                            placeholder={challengeType === 'code' ? "function solution() { ... }" : "Escribe tu respuesta aquí..."} 
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label className="font-bold text-emerald-600">Referencia IA (Lo que buscará evaluar)</Label>
                          <Textarea 
                            value={solution} 
                            onChange={(e) => setSolution(e.target.value)} 
                            className="font-mono text-[11px] min-h-[120px] rounded-2xl border-emerald-200 bg-emerald-50/20" 
                            placeholder="Ej: Debe usar 'async/await' y explicar el manejo de errores..." 
                          />
                        </div>
                      </>
                    ) : challengeType === 'wordsearch' ? (
                      <div className="space-y-6">
                        <div className="grid gap-3">
                          <Label className="font-bold">Palabras Clave</Label>
                          <div className="flex gap-2">
                            <Input value={wordInput} onChange={(e) => setWordsInput(e.target.value)} placeholder="Ej: PROMISE" className="rounded-xl h-11 bg-white" />
                            <Button type="button" onClick={() => { if(wordInput) setWords([...words, wordInput.toUpperCase()]); setWordsInput(''); }} className="rounded-xl h-11">Añadir</Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {words.map((w, i) => (
                              <Badge key={i} className="rounded-lg bg-white border-slate-200 text-slate-700 py-1.5 gap-2">
                                {w} <X className="h-3 w-3 cursor-pointer" onClick={() => setWords(words.filter((_, idx) => idx !== i))} />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold">Preguntas de la Trivia</Label>
                          <Button type="button" onClick={addQuestion} variant="outline" size="sm" className="rounded-xl h-8"><Plus className="h-3 w-3 mr-1"/> Añadir Pregunta</Button>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                          {questions.map((q, qIdx) => (
                            <Card key={qIdx} className="rounded-xl border-slate-200">
                              <CardContent className="p-4 space-y-3">
                                <Input placeholder="Pregunta..." value={q.question} onChange={(e) => { const n = [...questions]; n[qIdx].question = e.target.value; setQuestions(n); }} className="h-8 text-xs font-bold" />
                                <div className="grid grid-cols-2 gap-2">
                                  {q.options.map((opt: string, oIdx: number) => (
                                    <div key={oIdx} className="flex items-center gap-1">
                                      <input type="radio" checked={q.correctAnswer === oIdx} onChange={() => { const n = [...questions]; n[qIdx].correctAnswer = oIdx; setQuestions(n); }} />
                                      <Input value={opt} onChange={(e) => { const n = [...questions]; n[qIdx].options[oIdx] = e.target.value; setQuestions(n); }} className="h-7 text-[10px]" />
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full rounded-2xl h-14 text-lg font-bold shadow-xl shadow-primary/20">
                    {editingId ? 'Guardar Cambios' : 'Publicar Actividad'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-slate-50 border-none"><TableHead className="pl-8 h-14">Actividad</TableHead><TableHead>Tipo</TableHead><TableHead>Ubicación</TableHead><TableHead>Acceso</TableHead><TableHead className="text-right pr-8">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {isChallengesLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : challenges?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">No hay actividades creadas aún.</TableCell></TableRow>
              ) : challenges?.map(c => (
                <TableRow key={c.id} className="border-slate-100">
                  <TableCell className="pl-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2 rounded-xl text-slate-500">
                        {['swipe', 'flashcard', 'interactive-video', 'dragdrop', 'sortable'].includes(c.type) ? <Sparkles className="h-5 w-5" /> : c.type === 'quiz' ? <HelpCircle className="h-5 w-5" /> : c.type === 'interview' ? <MessageSquare className="h-5 w-5" /> : c.type === 'wordsearch' ? <Gamepad2 className="h-5 w-5" /> : <Terminal className="h-5 w-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{c.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{c.technology}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-lg font-bold">
                       {c.type === 'quiz' ? 'Trivia' : c.type === 'interview' ? 'Entrevista' : c.type === 'wordsearch' ? 'Sopa Letras' : c.type === 'sortable' ? 'Ordenamiento' : c.type === 'dragdrop' ? 'Rompecabezas' : c.type === 'swipe' ? 'Cartas Swing' : c.type === 'flashcard' ? 'Flashcards 3D' : c.type === 'interactive-video' ? 'Video Interactivo' : 'Código'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.visibility === 'private' ? (
                      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 gap-1 rounded-lg">
                        <Lock className="h-3 w-3" /> Privado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1 rounded-lg">
                        <Layers className="h-3 w-3" /> Catálogo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.isFree ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">Libre</Badge> : <Badge className="bg-amber-100 text-amber-700 border-amber-200">Premium</Badge>}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleEditClick(c)}><Edit className="h-4 w-4" /></Button>
                      {(isAdmin || profile?.role === 'instructor') && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => { if(confirm('¿Eliminar actividad?')) deleteDocumentNonBlocking(doc(db, 'coding_challenges', c.id)) }}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
