
'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { WaitingHall } from '@/components/instructor/WaitingHall';
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
  Layers,
  Wand2
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
import { generateActivities } from '@/ai/flows/generate-activities';

export default function AdminChallengesClient() {
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
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'es'>('es');
  const [targetRole, setTargetRole] = useState('');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('COP');

  // AI Generation state
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiLessonContent, setAiLessonContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiEngine, setAiEngine] = useState<'gemini' | 'claude'>('gemini');

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const isDemoAccount = user?.email === 'demo@learnstream.ai';
  const isAdmin = profile?.role === 'admin' || isDemoAccount;

  const challengesQuery = useMemoFirebase(() => {
    if (!db || (!profile && !isDemoAccount)) return null;
    if (isAdmin) {
      return collection(db, 'coding_challenges');
    }
    if (profile?.role === 'instructor' && user?.uid) {
      return query(collection(db, 'coding_challenges'), where('instructorId', '==', user.uid));
    }
    return null;
  }, [db, profile, user?.uid, isAdmin, isDemoAccount]);
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
    setTargetLanguage('es');
    setTargetRole('');
    setPrice('0');
    setCurrency('COP');
  };

  const activityCategories: Record<string, { label: string; types: string[]; icon?: string }> = {
    all: { label: 'Todas', types: [] },
    ia: { label: 'Experiencias IA', types: ['interview', 'swipe', 'flashcard'], icon: '✨' },
    tech: { label: 'Desafíos Técnicos', types: ['code', 'dragdrop', 'sortable'], icon: '💻' },
    fun: { label: 'Evaluación & Juegos', types: ['quiz', 'wordsearch', 'interactive-video'], icon: '🎮' }
  };

  const [activeCategory, setActiveCategory] = useState('all');

  const handleAIGenerate = async (type: any) => {
    if (!aiLessonContent.trim() || !db) return;
    setIsGenerating(true);
    setAiError('');
    try {
      let resultData: any;

      if (aiEngine === 'claude') {
        const puter = (window as any).puter;
        if (!puter) throw new Error("Puter.js no detectado. Revisa tu conexión.");
        
        const prompt = `Eres un diseñador instruccional experto. Genera el contenido para una actividad tipo "${type}" basada en esta lección:
        
        TÍTULO: ${title}
        TECNOLOGÍA: ${technology}
        CONTENIDO: ${aiLessonContent}
        
        REGLAS:
        - Retorna UNICAMENTE un objeto JSON con esta estructura:
          { 
            "activityConfig": "string de JSON válido con la config especifica", 
            "activityTitle": "título creativo", 
            "activityDescription": "descripción breve" 
          }
        - Para activityConfig, sigue el esquema de ${type}:
          flashcard: { cards: [{front, back}] }
          swipe: { deck: [{statement, isTrue}] }
          sortable: { lines: [{id, text}], correctOrder: [ids] }
          quiz: { questions: [{question, options, correctIndex}] }
          code: { initialCode, solution }
          interview: { targetRole, targetLanguage, solution }
        - Todo en ESPAÑOL LATINO.`;

        const response = await puter.ai.chat(prompt, { model: 'claude-3-5-sonnet' });
        const content = response?.message?.content?.[0]?.text || response?.message?.content || "";
        // Extraer JSON si hay texto extra
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("La IA no devolvió un formato válido.");
        resultData = JSON.parse(jsonMatch[0]);
      } else {
        const result = await generateActivities({
          lessonTitle: title || 'Desafío Nuevo',
          lessonContent: aiLessonContent,
          technology: technology || 'General',
          activityType: type,
        });
        if (!result.success) throw new Error(result.error);
        resultData = result.data;
      }
      
      if (resultData) {
        const config = typeof resultData.activityConfig === 'string' ? JSON.parse(resultData.activityConfig) : resultData.activityConfig;
        
        if (type === 'code') {
          setInitialCode(config.initialCode || '');
          setSolution(config.solution || '');
        } else if (type === 'interview') {
          setTargetRole(config.targetRole || '');
          setTargetLanguage(config.targetLanguage || 'es');
          setSolution(config.solution || '');
        } else if (['dragdrop', 'sortable', 'flashcard', 'interactive-video', 'swipe'].includes(type)) {
          setJsonConfig(JSON.stringify(config, null, 2));
        } else if (type === 'quiz') {
          setQuestions(config.questions || []);
        } else if (type === 'wordsearch') {
          setWords(config.words || []);
        }

        if (resultData.activityTitle) setTitle(resultData.activityTitle);
        if (resultData.activityDescription) setDescription(resultData.activityDescription);
        
        setIsAIOpen(false);
        setAiLessonContent('');
      }
    } catch (err: any) {
      setAiError(err?.message || 'Error de conexión.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredChallenges = (challenges || []).filter(c => {
    if (activeCategory === 'all') return true;
    return activityCategories[activeCategory as keyof typeof activityCategories].types.includes(c.type);
  });

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
    setTargetLanguage(challenge.targetLanguage || 'es');
    setTargetRole(challenge.targetRole || '');
    setPrice(challenge.price?.toString() || '0');
    setCurrency(challenge.currency || 'COP');
    
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
      isFree,
      price: !isFree ? parseFloat(price) || 0 : 0,
      currency,
      visibility,
      updatedAt: serverTimestamp(),
    };

    if (challengeType === 'code' || challengeType === 'interview') {
      challengeData.initialCode = initialCode;
      challengeData.solution = solution;
      if (challengeType === 'interview') {
        challengeData.targetLanguage = targetLanguage;
        challengeData.targetRole = targetRole || title;
      }
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
      challengeData.instructorName = profile?.displayName || user.displayName || user.email || 'Demo Instructor';
      challengeData.createdAt = serverTimestamp();
      addDocumentNonBlocking(collection(db, 'coding_challenges'), challengeData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', ''], correctAnswer: 0 }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    if (field === 'question') updated[index].question = value;
    if (field === 'correctAnswer') updated[index].correctAnswer = value;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length < 6) {
      updated[qIndex].options.push('');
      setQuestions(updated);
    }
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length > 2) {
      updated[qIndex].options.splice(oIndex, 1);
      // Ajustar respuesta correcta si es necesario
      if (updated[qIndex].correctAnswer >= updated[qIndex].options.length) {
        updated[qIndex].correctAnswer = updated[qIndex].options.length - 1;
      }
      setQuestions(updated);
    }
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  if (profile?.instructorStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <WaitingHall />
      </div>
    );
  }

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

                    {!isFree && (
                      <div className="grid grid-cols-2 gap-4 p-4 border-2 border-primary/20 rounded-2xl bg-primary/5 animate-in fade-in slide-in-from-top-2">
                        <div className="grid gap-2">
                          <Label htmlFor="c-price" className="font-bold">Precio de Venta</Label>
                          <Input id="c-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Ej: 25000" className="bg-white rounded-xl" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="c-currency" className="font-bold">Moneda</Label>
                          <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger id="c-currency" className="bg-white rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="COP">COP (Pesos Colombianos)</SelectItem>
                              <SelectItem value="USD">USD (Dólares)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

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
                             <TabsTrigger value="json" className="rounded-lg font-bold">⚙️ Ajustes Avanzados (Opcional)</TabsTrigger>
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
                        {challengeType === 'interview' && (
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="grid gap-2">
                              <Label className="font-bold">Idioma de Entrevista</Label>
                              <Select value={targetLanguage} onValueChange={(v: any) => setTargetLanguage(v)}>
                                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="es">Español</SelectItem>
                                  <SelectItem value="en">English</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label className="font-bold">Rol / Tema Objetivo</Label>
                              <Input 
                                value={targetRole} 
                                onChange={(e) => setTargetRole(e.target.value)} 
                                placeholder="Ej: React Expert, Senior Python..." 
                                className="rounded-xl h-11"
                              />
                            </div>
                          </div>
                        )}

                        {/* AI Wizard for Code/Interview */}
                        <div className="mb-6">
                           {!isAIOpen ? (
                             <Button type="button" onClick={() => setIsAIOpen(true)} variant="outline" className="w-full h-11 rounded-xl border-orange-200 bg-orange-50/50 text-orange-700 font-bold hover:bg-orange-100 hover:border-orange-300 transition-all gap-2">
                               <Sparkles className="h-4 w-4" />
                               Despertar Genio IA para este Reto
                             </Button>
                           ) : (
                             <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 space-y-3">
                                <div className="flex items-center justify-between gap-4 mb-2">
                                    <Label className="text-orange-800 font-bold text-xs">Instrucciones de la Lección</Label>
                                    <div className="flex bg-orange-100 rounded-lg p-0.5">
                                       <button type="button" onClick={() => setAiEngine('gemini')} className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${aiEngine === 'gemini' ? 'bg-white text-orange-600 shadow-sm' : 'text-orange-400'}`}>GEMINI</button>
                                       <button type="button" onClick={() => setAiEngine('claude')} className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${aiEngine === 'claude' ? 'bg-white text-indigo-600 shadow-sm' : 'text-orange-400'}`}>CLAUDE</button>
                                    </div>
                                 </div>
                                <Textarea 
                                  value={aiLessonContent} 
                                  onChange={(e) => setAiLessonContent(e.target.value)}
                                  placeholder="Pega el contenido base para generar el reto..."
                                  className="min-h-[100px] text-xs bg-white border-orange-100"
                                />
                                {aiError && <p className="text-[10px] text-rose-500 font-bold">{aiError}</p>}
                                <div className="flex gap-2">
                                   <Button type="button" onClick={() => handleAIGenerate(challengeType)} disabled={isGenerating} className="flex-1 bg-orange-600 hover:bg-orange-700 h-9 text-xs">
                                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                                      Generar Estructura y Solución
                                   </Button>
                                   <Button type="button" variant="ghost" size="sm" onClick={() => {setIsAIOpen(false); setAiError('')}} className="text-orange-600 hover:bg-orange-100 h-9">Cancelar</Button>
                                </div>
                             </div>
                           )}
                        </div>

                        <div className="grid gap-3">
                          <Label className="font-bold">{challengeType === 'code' ? 'Código Inicial (Estructura Base)' : 'Puntos Clave a Mencionar'}</Label>
                          <Textarea 
                            value={initialCode} 
                            onChange={(e) => setInitialCode(e.target.value)} 
                            className="font-mono text-[11px] min-h-[120px] rounded-2xl bg-white border-dashed" 
                            placeholder={challengeType === 'code' ? "function solution() { ... }" : "Palabras clave que el estudiante debe intentar usar..."} 
                          />
                        </div>
                        <div className="grid gap-3 mt-4">
                          <Label className="font-bold text-emerald-600">{challengeType === 'code' ? 'Solución Esperada' : 'Guía IA (Contexto Interno)'}</Label>
                          <Textarea 
                            value={solution} 
                            onChange={(e) => setSolution(e.target.value)} 
                            className="font-mono text-[11px] min-h-[120px] rounded-2xl border-emerald-200 bg-emerald-50/20" 
                            placeholder="Ej: Actúa de forma estricta sobre Clean Architecture y pregunta sobre SOLID..." 
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
                            <Card key={qIdx} className="rounded-2xl border-2 border-slate-100 bg-slate-50/50">
                              <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                  <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center bg-primary text-[10px]">{qIdx + 1}</Badge>
                                  <Input 
                                    placeholder="Escribe la pregunta..." 
                                    value={q.question} 
                                    onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)} 
                                    required
                                    className="rounded-xl border-none shadow-none text-sm font-bold bg-transparent p-0 h-auto focus-visible:ring-0"
                                  />
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                                    onClick={() => removeQuestion(qIdx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {q.options.map((opt: string, oIdx: number) => (
                                    <div key={oIdx} className="flex items-center gap-2 group p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                                      <input 
                                        type="radio" 
                                        name={`correct-${qIdx}`}
                                        checked={q.correctAnswer === oIdx} 
                                        onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                                        className="h-4 w-4 text-primary border-slate-300 focus:ring-primary"
                                      />
                                      <Input 
                                        value={opt} 
                                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} 
                                        placeholder={`Opción ${oIdx + 1}`}
                                        className="h-8 text-[11px] border-none shadow-none bg-transparent p-0 focus-visible:ring-0"
                                      />
                                      {q.options.length > 2 && (
                                        <Button 
                                          type="button"
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-destructive transition-all"
                                          onClick={() => removeOption(qIdx, oIdx)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  {q.options.length < 6 && (
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      onClick={() => addOption(qIdx)}
                                      className="h-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-primary hover:border-primary/30 transition-all text-xs font-bold gap-2"
                                    >
                                      <Plus className="h-4 w-4" /> Añadir Opción
                                    </Button>
                                  )}
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

        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="w-full">
           <TabsList className="bg-white/50 p-1.5 h-14 rounded-2xl border mb-8 flex justify-start gap-2 overflow-x-auto">
              {Object.entries(activityCategories).map(([key, cat]) => (
                <TabsTrigger 
                  key={key} 
                  value={key} 
                  className="rounded-xl px-5 font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all gap-2"
                >
                  <span className="text-sm">{cat.label}</span>
                  <Badge variant="secondary" className="h-5 px-1.5 rounded-md text-[10px] bg-slate-100 text-slate-500 font-bold border-none group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                    {(challenges || []).filter(c => key === 'all' ? true : cat.types.includes(c.type)).length}
                  </Badge>
                </TabsTrigger>
              ))}
           </TabsList>

           <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
             <Table>
               <TableHeader><TableRow className="bg-slate-50 border-none"><TableHead className="pl-8 h-14 font-bold text-slate-900">Actividad</TableHead><TableHead className="font-bold text-slate-900">Tipo</TableHead><TableHead className="font-bold text-slate-900">Ubicación</TableHead><TableHead className="font-bold text-slate-900">Acceso</TableHead><TableHead className="text-right pr-8 font-bold text-slate-900">Acciones</TableHead></TableRow></TableHeader>
               <TableBody>
                 {isChallengesLoading ? (
                   <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                 ) : filteredChallenges.length === 0 ? (
                   <TableRow><TableCell colSpan={5} className="h-60 text-center flex flex-col items-center justify-center gap-4">
                      <div className="bg-slate-100 p-6 rounded-full text-slate-400">
                        <Search className="h-10 w-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-600">No hay actividades de este tipo</p>
                        <p className="text-sm text-slate-400 italic">Crea una nueva {activeCategory !== 'all' ? activityCategories[activeCategory as keyof typeof activityCategories].label.toLowerCase() : 'actividad'} para comenzar.</p>
                      </div>
                   </TableCell></TableRow>
                 ) : filteredChallenges.map(c => (
                   <TableRow key={c.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                     <TableCell className="pl-8 py-4">
                       <div className="flex items-center gap-4">
                         <div className={`p-3 rounded-[1.25rem] shadow-sm border ${
                            activityCategories.ia.types.includes(c.type) ? 'bg-purple-50 border-purple-100 text-purple-600' :
                            activityCategories.tech.types.includes(c.type) ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                            'bg-slate-50 border-slate-100 text-slate-500'
                         }`}>
                           {['swipe', 'flashcard', 'interactive-video', 'dragdrop', 'sortable'].includes(c.type) ? <Sparkles className="h-5 w-5" /> : c.type === 'quiz' ? <HelpCircle className="h-5 w-5" /> : c.type === 'interview' ? <MessageSquare className="h-5 w-5" /> : c.type === 'wordsearch' ? <Gamepad2 className="h-5 w-5" /> : <Terminal className="h-5 w-5" />}
                         </div>
                         <div className="flex flex-col">
                           <span className="font-bold text-slate-900 text-sm leading-tight mb-1">{c.title}</span>
                           <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold border-none bg-slate-100 text-slate-500 py-0 h-4 px-1.5 rounded-sm">{c.technology}</Badge>
                              <span className="text-[10px] text-slate-400">•</span>
                              <span className="text-[10px] text-slate-400 font-medium">{c.difficulty}</span>
                           </div>
                         </div>
                       </div>
                     </TableCell>
                     <TableCell>
                       <Badge variant="secondary" className={`rounded-lg font-bold text-[11px] px-3 py-1 border-none ${
                          activityCategories.ia.types.includes(c.type) ? 'bg-purple-100/50 text-purple-700' :
                          activityCategories.tech.types.includes(c.type) ? 'bg-indigo-100/50 text-indigo-700' :
                          'bg-slate-100 text-slate-600'
                       }`}>
                          {c.type === 'quiz' ? 'Trivia' : c.type === 'interview' ? 'Simulación IA' : c.type === 'wordsearch' ? 'Sopa Letras' : c.type === 'sortable' ? 'Ordenamiento' : c.type === 'dragdrop' ? 'Rompecabezas' : c.type === 'swipe' ? 'Cartas Tinder' : c.type === 'flashcard' ? 'Flashcards 3D' : c.type === 'interactive-video' ? 'Video Interactivo' : 'Código Técnico'}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       {c.visibility === 'private' ? (
                         <Badge variant="outline" className="bg-slate-100/50 text-slate-600 border-slate-200 gap-1.5 rounded-lg font-bold text-[10px] px-2.5 h-6">
                           <Lock className="h-3 w-3" /> Privado
                         </Badge>
                       ) : (
                         <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1.5 rounded-lg font-bold text-[10px] px-2.5 h-6">
                           <Eye className="h-3 w-3" /> En Catálogo
                         </Badge>
                       )}
                     </TableCell>
                     <TableCell>
                       {c.isFree ? (
                          <div className="flex items-center gap-2">
                             <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                             <span className="text-[11px] font-bold text-emerald-700">Abierto / Libre</span>
                          </div>
                       ) : (
                          <div className="flex items-center gap-2">
                             <div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-200" />
                             <span className="text-[11px] font-bold text-amber-700">Premium (${c.price})</span>
                          </div>
                       )}
                     </TableCell>
                     <TableCell className="text-right pr-12">
                       <div className="flex justify-end gap-2">
                         <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200 hover:border-primary hover:text-primary transition-all bg-white shadow-sm" onClick={() => handleEditClick(c)}>
                            <Edit className="h-4 w-4" />
                         </Button>
                         {(isAdmin || profile?.role === 'instructor') && (
                           <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all" onClick={() => { if(confirm('¿Eliminar esta actividad permanentemente?')) deleteDocumentNonBlocking(doc(db, 'coding_challenges', c.id)) }}>
                              <Trash2 className="h-4 w-4" />
                           </Button>
                         )}
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
        </Tabs>
      </main>
    </div>
  );
}
