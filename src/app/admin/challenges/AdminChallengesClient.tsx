
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { WaitingHall } from '@/components/instructor/WaitingHall';
import { useToast } from '@/hooks/use-toast';
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
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, setDoc, getDoc, where } from 'firebase/firestore';
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
import { robustJSONParse } from '@/lib/robust-parse';
import { generateActivities } from '@/ai/flows/generate-activities';
import { generateWithExternalAI } from '@/app/actions/ai-generation';

export default function AdminChallengesClient() {
  const router = useRouter();
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
  const [isCourseOnly, setIsCourseOnly] = useState(false);

  // AI Generation state
  const { toast } = useToast();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiLessonContent, setAiLessonContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiEngine, setAiEngine] = useState<'gemini' | 'claude' | 'deepseek' | 'qwen'>('gemini');

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
    setIsCourseOnly(false);
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
      const prompt = `Eres un diseñador instruccional experto. Genera el contenido para una actividad interactiva tipo "${type}" basada en esta lección:
        
      TÍTULO: ${title}
      TECNOLOGÍA: ${technology}
      CONTENIDO: ${aiLessonContent}
      
      REGLAS CRÍTICAS DE RETO:
      - Para retos de CÓDIGO (code):
        * El "initialCode" debe ser una ESTRUCTURA INCOMPLETA o un ESQUELETO (ej: solo el inicio del algoritmo o comentarios TODO). 
        * El "solution" debe ser el CÓDIGO COMPLETO y funcional.
      - Para REORDENAR (sortable):
        * Genera un bloque de código lógico de 4-8 líneas.
        * El JSON debe ser: { "lines": [{ "id": "L1", "text": "..." }], "correctOrder": ["L1", "L2", ...] }
      - Para FILL-IN (dragdrop):
        * Genera una "template" de código con huecos usando {{{s1}}}, {{{s2}}}.
        * El JSON debe ser: { "template": "...", "snippets": [{ "id": "s1", "text": "..." }], "correctMapping": { "s1": "s1" } }
      - Retorna UNICAMENTE un objeto JSON válido con esta estructura exacta:
        { 
          "activityConfig": { ...config especifica según el tipo... }, 
          "activityTitle": "título creativo", 
          "activityDescription": "descripción breve" 
        }
      - IMPORTANTE: activityConfig debe ser un OBJETO, no un string.
      - DEBES escapar comillas internas como \\" y usar \\n para saltos de línea.
      - Retorna SOLO el JSON, sin bloques de código Markdown ni texto explicativo.
      - Todo en ESPAÑOL LATINO salvo que el contenido sea explícitamente en inglés.`;

      // Llamada al nuevo API Route unificado
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          provider: aiEngine === 'gemini' ? 'gemini' : 
                    aiEngine === 'claude' ? 'claude' : 
                    aiEngine === 'deepseek' ? 'deepseek' : 
                    aiEngine === 'qwen' ? 'qwen' : 'auto'
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const resultData = robustJSONParse(data.result);
      const config = typeof resultData.activityConfig === 'string' ? robustJSONParse(resultData.activityConfig) : resultData.activityConfig || {};
      
      if (type === 'code') {
        setInitialCode(config.initialCode || '');
        setSolution(config.solution || '');
      } else if (type === 'interview') {
        setTargetRole(config.targetRole || '');
        setTargetLanguage(config.targetLanguage || 'es');
        setInitialCode(config.initialCode || '');
        setSolution(config.solution || '');
      } else if (['dragdrop', 'sortable', 'flashcard', 'interactive-video', 'swipe'].includes(type)) {
        setJsonConfig(JSON.stringify(config, null, 2));
      } else if (type === 'quiz') {
        const mappedQuestions = (config.questions || []).map((q: any) => ({
          question: q.question || '',
          options: q.options || ['', ''],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                         typeof q.correctIndex === 'number' ? q.correctIndex : 0
        }));
        setQuestions(mappedQuestions);
      } else if (type === 'wordsearch') {
        let rawWords = config.words || [];
        if (!Array.isArray(rawWords)) {
          const text = JSON.stringify(config);
          const matches = text.match(/[A-Z]{3,}/g);
          rawWords = matches ? [...new Set(matches)] : [];
        }
        setWords(rawWords.map((w: any) => (w || '').toString().toUpperCase()));
      }

      if (resultData.activityTitle) setTitle(resultData.activityTitle);
      if (resultData.activityDescription) setDescription(resultData.activityDescription);
      
      setIsAIOpen(false);
      setAiLessonContent('');
    } catch (err: any) {
      console.error("AI Wizard Error Detail:", err);
      
      // -- ULTIMO SALVAVIDAS: Fallback en el cliente con Puter.js --
      try {
        setIsGenerating(true);
        const puter = (window as any).puter;
        if (!puter) throw new Error("Puter.js no detectado.");

        const prompt = `Eres un diseñador instruccional experto. Genera el contenido para una actividad interactiva tipo "${type}" basada en esta lección:
        TÍTULO: ${title}
        TECNOLOGÍA: ${technology}
        CONTENIDO: ${aiLessonContent}
        REGLAS: Retorna UNICAMENTE un objeto JSON con estructura: { "activityConfig": {objeto}, "activityTitle": "...", "activityDescription": "..." }
        - Para FILL-IN (dragdrop): Usa {{{s1}}} para huecos.
        - Para REORDENAR (sortable): Usa lines y correctOrder.`;

        const response = await puter.ai.chat(prompt, { model: 'gpt-4o' }); // Modelo más estable
        const rawPuter = response?.message?.content?.[0]?.text || response?.message?.content || "";
        
        const resultData = robustJSONParse(rawPuter);
        const config = typeof resultData.activityConfig === 'string' ? robustJSONParse(resultData.activityConfig) : resultData.activityConfig || {};

        if (type === 'code') { setInitialCode(config.initialCode || ''); setSolution(config.solution || ''); }
        else if (type === 'interview') { setTargetRole(config.targetRole || ''); setTargetLanguage(config.targetLanguage || 'es'); setInitialCode(config.initialCode || ''); setSolution(config.solution || ''); }
        else if (['dragdrop', 'sortable', 'flashcard', 'interactive-video', 'swipe'].includes(type)) { setJsonConfig(JSON.stringify(config, null, 2)); }
        else if (type === 'quiz') {
          const mapped = (config.questions || []).map((q: any) => ({
            question: q.question || '',
            options: q.options || ['', ''],
            correctAnswer: q.correctAnswer ?? q.correctIndex ?? 0
          }));
          setQuestions(mapped);
        }
        else if (type === 'wordsearch') { 
          let rawWords = config.words || [];
          if (!Array.isArray(rawWords)) {
            const matches = JSON.stringify(config).match(/[A-Z]{3,}/g);
            rawWords = matches ? [...new Set(matches)] : [];
          }
          setWords(rawWords.map((w: any) => (w || '').toString().toUpperCase())); 
        }
        
        if (resultData.activityTitle) setTitle(resultData.activityTitle);
        if (resultData.activityDescription) setDescription(resultData.activityDescription);
        
        toast({ title: "Generado con éxito", description: "Se usó el motor de respaldo (Puter Cloud)." });
        setIsAIOpen(false);
        setAiLessonContent('');
      } catch (fallbackErr: any) {
        console.error("Puter fallback failed too:", fallbackErr);
        setAiError(err.message || 'Error de conexión con el servicio de IA.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredChallenges = (challenges || []).filter(c => {
    if (activeCategory === 'all') return true;
    return activityCategories[activeCategory as keyof typeof activityCategories].types.includes(c.type);
  });

  const handleEditClick = async (challenge: any) => {
    setEditingId(challenge.id);
    setTitle(challenge.title || '');
    setDescription(challenge.description || '');
    setDifficulty(challenge.difficulty || 'Principiante');
    setTechnology(challenge.technology || '');
    setChallengeType(challenge.type || 'code');
    setIsFree(challenge.isFree ?? true);
    setVisibility(challenge.visibility || 'public');
    setPrice(challenge.price?.toString() || '0');
    setCurrency(challenge.currency || 'COP');
    setIsCourseOnly(challenge.isCourseOnly || false);

    // Cargar datos premium desde la subcolección
    if (db) {
      try {
        const premiumRef = doc(db, 'coding_challenges', challenge.id, 'premium', 'data');
        const snap = await getDoc(premiumRef);
        if (snap.exists()) {
          const pData = snap.data();
          setInitialCode(pData.initialCode || '');
          setSolution(pData.solution || '');
          setQuestions(pData.questions || []);
          setWords(pData.words || []);
          setTargetLanguage(pData.targetLanguage || 'es');
          setTargetRole(pData.targetRole || '');

          if (['dragdrop', 'sortable', 'flashcard', 'interactive-video', 'swipe'].includes(challenge.type)) {
              const { updatedAt, createdAt, ...rest } = pData;
              setJsonConfig(JSON.stringify(rest, null, 2));
          }
        } else {
          // Fallback a campos legacy si aún existen por el proceso de migración
          setWords(challenge.words || []);
          setInitialCode(challenge.initialCode || '');
          setSolution(challenge.solution || '');
          setQuestions(challenge.questions || []);
          setTargetLanguage(challenge.targetLanguage || 'es');
          setTargetRole(challenge.targetRole || '');

          if (['dragdrop', 'sortable', 'flashcard', 'interactive-video', 'swipe'].includes(challenge.type)) {
             const { id, title, description, difficulty, technology, type, isFree, visibility, updatedAt, instructorId, instructorName, createdAt, ...rest } = challenge;
             setJsonConfig(JSON.stringify(rest, null, 2));
          }
        }
      } catch (err) {
        console.error("Error loading challenge premium data:", err);
      }
    }
    
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
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
      isCourseOnly,
      updatedAt: serverTimestamp(),
    };

    try {
      const cId = editingId || doc(collection(db, 'coding_challenges')).id;
      const challengeRef = doc(db, 'coding_challenges', cId);

      // Guardar metadata pública
      await setDoc(challengeRef, {
        ...challengeData,
        instructorId: user.uid,
        instructorName: profile?.displayName || user.displayName || user.email || 'Demo Instructor',
        ...(editingId ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });

      // Guardar contenido sensible en subcolección protegida
      const sensitiveData: any = {};
      if (challengeType === 'code' || challengeType === 'interview') {
        sensitiveData.initialCode = initialCode;
        sensitiveData.solution = solution;
        if (challengeType === 'interview') {
          sensitiveData.targetLanguage = targetLanguage;
          sensitiveData.targetRole = targetRole || title;
        }
      } else if (challengeType === 'wordsearch') {
        sensitiveData.words = words;
      } else if (challengeType === 'quiz') {
        sensitiveData.questions = questions;
      } else {
        try {
           const parsed = JSON.parse(jsonConfig);
           Object.assign(sensitiveData, parsed);
        } catch (err) {
           alert("La configuración JSON es inválida. Revisa la sintaxis.");
           return;
        }
      }

      const premiumRef = doc(db, 'coding_challenges', cId, 'premium', 'data');
      await setDoc(premiumRef, {
        ...sensitiveData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setIsDialogOpen(false);
      resetForm();
      router.refresh();
      toast({ 
        title: editingId ? "Reto actualizado" : "Reto publicado", 
        description: "La estructura de seguridad (decoupled) ha sido aplicada correctamente." 
      });
    } catch (err: any) {
      console.error("Error saving challenge:", err);
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    }
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
            <DialogContent className="lg:max-w-[1200px] md:max-w-4xl sm:max-w-[900px] w-[98vw] rounded-[3rem] max-h-[92vh] overflow-y-auto p-0 border-none shadow-2xl glassmorphism">
              <form onSubmit={handleFormSubmit} className="relative">
                <DialogHeader className="p-8 pb-0">
                  <DialogTitle className="text-3xl font-headline font-black text-slate-900">{editingId ? 'Editar Actividad' : 'Nueva Actividad'}</DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium italic">Configura el formato, los parámetros de acceso y la lógica del reto.</DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 min-h-[700px]">
                  {/* METADATA COLUMN */}
                  <div className="p-8 space-y-6 border-r bg-slate-50/50">
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="font-bold">Acceso Económico</Label>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border h-14">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isFree ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {isFree ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{isFree ? 'Libre' : 'Premium'}</span>
                            </div>
                          </div>
                          <Switch checked={isFree} onCheckedChange={setIsFree} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="font-bold">Privacidad Catálogo</Label>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border h-14">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isCourseOnly ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                              {isCourseOnly ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{isCourseOnly ? 'Solo Curso' : 'En Catálogo'}</span>
                            </div>
                          </div>
                          <Switch checked={isCourseOnly} onCheckedChange={setIsCourseOnly} />
                        </div>
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
                  
                  {/* EDITOR / LOGIC COLUMN */}
                  <div className="p-8 space-y-8 bg-white relative">
                    {/* AI Wizard Global - Habilitado para TODOS los tipos */}
                    <div className="mb-6">
                       {!isAIOpen ? (
                         <Button type="button" onClick={() => setIsAIOpen(true)} variant="outline" className="w-full h-11 rounded-xl border-orange-200 bg-orange-50/50 text-orange-700 font-bold hover:bg-orange-100 hover:border-orange-300 transition-all gap-2">
                           <Sparkles className="h-4 w-4" />
                           Despertar Genio IA para este Reto
                         </Button>
                       ) : (
                         <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-3xl p-6 space-y-4 shadow-xl shadow-orange-500/10 animate-in zoom-in-95 duration-300">
                             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4 mb-2">
                                 <div className="flex items-center gap-2">
                                     <div className="bg-orange-500 p-1.5 rounded-lg text-white shadow-md shadow-orange-500/20"><Sparkles className="h-4 w-4" /></div>
                                     <Label className="text-orange-900 font-black text-[10px] uppercase tracking-[0.15em] py-1">Genio IA de LearnStream</Label>
                                 </div>
                                 <div className="flex flex-wrap bg-white/50 backdrop-blur-md rounded-xl p-1 gap-1 border border-orange-200/50 shadow-inner">
                                    <button type="button" onClick={() => setAiEngine('gemini')} title="Google Gemini 1.5" className={`px-2.5 py-1 text-[9px] font-black rounded-lg transition-all ${aiEngine === 'gemini' ? 'bg-white text-orange-600 shadow-sm' : 'text-orange-400 hover:text-orange-600'}`}>GEMINI</button>
                                    <button type="button" onClick={() => setAiEngine('claude')} title="Anthropic Claude (Puter)" className={`px-2.5 py-1 text-[9px] font-black rounded-lg transition-all ${aiEngine === 'claude' ? 'bg-white text-indigo-600 shadow-sm' : 'text-orange-400 hover:text-indigo-600'}`}>CLAUDE</button>
                                    <button type="button" onClick={() => setAiEngine('deepseek')} title="DeepSeek V3" className={`px-2.5 py-1 text-[9px] font-black rounded-lg transition-all ${aiEngine === 'deepseek' ? 'bg-white text-blue-600 shadow-sm' : 'text-orange-400 hover:text-blue-600'}`}>DEEPSEEK</button>
                                    <button type="button" onClick={() => setAiEngine('qwen')} title="Alibaba Qwen Max" className={`px-2.5 py-1 text-[9px] font-black rounded-lg transition-all ${aiEngine === 'qwen' ? 'bg-white text-emerald-600 shadow-sm' : 'text-orange-400 hover:text-emerald-600'}`}>QWEN</button>
                                 </div>
                             </div>
                             <Textarea 
                               value={aiLessonContent} 
                               onChange={(e) => setAiLessonContent(e.target.value)}
                               placeholder="Pega el contenido base (lección, texto, código) para que el Genio estructure el reto automáticamente..."
                               className="min-h-[140px] text-xs bg-white/80 border-orange-200/50 rounded-2xl focus-visible:ring-orange-300 resize-none shadow-inner p-4 font-medium"
                             />
                             {aiError && <p className="text-[10px] text-rose-500 font-bold px-1">{aiError}</p>}
                             <div className="flex gap-2 pt-2">
                                <Button type="button" onClick={() => handleAIGenerate(challengeType)} disabled={isGenerating} className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 h-12 text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]">
                                   {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                                   Generar Todo Ahora
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => {setIsAIOpen(false); setAiError('')}} className="text-orange-600 hover:bg-orange-200/40 h-12 rounded-2xl px-6 font-bold">Cerrar</Button>
                             </div>
                          </div>

                       )}
                    </div>

                    {['dragdrop', 'sortable', 'flashcard', 'interactive-video', 'swipe'].includes(challengeType) ? (
                      <div className="grid gap-4">
                        <Tabs defaultValue="visual" className="w-full">
                           <TabsList className="flex flex-wrap w-full mb-8 h-auto bg-slate-100 rounded-[1.25rem] p-1.5 gap-1.5 border">
                             <TabsTrigger value="visual" className="flex-1 min-w-[140px] rounded-xl font-black py-3 text-[10px] tracking-widest uppercase transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg active:scale-95">🛠️ Editor Visual</TabsTrigger>
                             <TabsTrigger value="json" className="flex-1 min-w-[140px] rounded-xl font-black py-3 text-[10px] tracking-widest uppercase transition-all data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-lg active:scale-95 px-2">⚙️ Ajustes JSON</TabsTrigger>
                           </TabsList>
                           <TabsContent value="visual" className="bg-white p-0 rounded-none border-none outline-none ring-0">
                               <div className="rounded-[2.5rem] border bg-slate-50/50 p-8 shadow-inner ring-4 ring-white">
                                   <VisualH5PBuilder type={challengeType} jsonConfig={jsonConfig} setJsonConfig={setJsonConfig} technology={technology} lessonTitle={title} />
                               </div>
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

                        <div className="space-y-6 animate-in fade-in duration-500">
                           <div className="grid gap-3">
                             <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">{challengeType === 'code' ? 'Código Inicial (Estructura Base)' : 'Puntos Clave a Mencionar'}</Label>
                             <div className="bg-slate-950 rounded-[2.5rem] p-6 shadow-2xl border border-slate-800 ring-4 ring-slate-900/50">
                               <Textarea 
                                 value={initialCode} 
                                 onChange={(e) => setInitialCode(e.target.value)} 
                                 className="font-mono text-[11px] min-h-[160px] bg-transparent border-none text-emerald-400 p-0 focus-visible:ring-0 resize-none leading-relaxed" 
                                 placeholder={challengeType === 'code' ? "function solution() {\n  // Tu código aquí\n}" : "Conceptos obligatorios para la IA..."} 
                               />
                             </div>
                           </div>
                           <div className="grid gap-3">
                             <Label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest px-1">{challengeType === 'code' ? 'Solución Esperada (Test)' : 'Guía IA (Contexto Estratégico)'}</Label>
                             <div className="bg-emerald-50/30 rounded-[2.5rem] p-6 border-2 border-emerald-100 shadow-inner">
                               <Textarea 
                                 value={solution} 
                                 onChange={(e) => setSolution(e.target.value)} 
                                 className="font-mono text-[11px] min-h-[160px] bg-transparent border-none text-emerald-700 p-0 focus-visible:ring-0 resize-none leading-relaxed" 
                                 placeholder="Ej: El código debe retornar un booleano..." 
                               />
                             </div>
                           </div>
                        </div>
                      </>
                    ) : challengeType === 'wordsearch' ? (
                      <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="bg-slate-50 border-2 border-dashed rounded-[3rem] p-8 space-y-6">
                          <div className="grid gap-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Buscaminas de Conceptos</Label>
                            <div className="flex gap-2 max-w-md mx-auto w-full">
                              <Input value={wordInput} onChange={(e) => setWordsInput(e.target.value)} placeholder="Ej: VARIABLE" className="rounded-2xl h-14 bg-white border-none shadow-lg px-6 font-bold" onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); if(wordInput) setWords([...words, wordInput.toUpperCase()]); setWordsInput(''); } }} />
                              <Button type="button" onClick={() => { if(wordInput) setWords([...words, wordInput.toUpperCase()]); setWordsInput(''); }} className="rounded-2xl h-14 bg-slate-900 px-8 font-black text-xs uppercase tracking-widest text-emerald-400 shadow-xl shadow-slate-900/20">Añadir</Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-center gap-3">
                            {words.map((w, i) => (
                              <Badge key={i} className="rounded-2xl bg-white border-none shadow-md text-slate-700 py-3 px-5 gap-3 font-bold text-xs hover:bg-rose-50 hover:text-rose-600 transition-all cursor-default group">
                                {w} <X className="h-4 w-4 cursor-pointer text-slate-300 group-hover:text-rose-500" onClick={() => setWords(words.filter((_, idx) => idx !== i))} />
                              </Badge>
                            ))}
                            {words.length === 0 && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest py-4">Agrega etiquetas clave para la sopa de letras</p>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in fade-in duration-500 px-1">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Banco de Preguntas</h3>
                             <p className="text-[10px] text-slate-500 font-medium">Define las opciones y marca la respuesta correcta.</p>
                          </div>
                          <Button type="button" onClick={addQuestion} className="rounded-2xl h-11 bg-slate-900 px-6 font-black text-xs uppercase tracking-widest text-primary hover:bg-slate-800 shadow-xl shadow-slate-900/10 transition-all active:scale-95"><Plus className="h-4 w-4 mr-2"/> Nueva Pregunta</Button>
                        </div>
                        
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                          {questions.map((q, qIdx) => (
                            <Card key={qIdx} className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 relative group overflow-visible bg-white ring-1 ring-slate-100 transition-all hover:shadow-2xl hover:shadow-primary/5">
                              <CardContent className="p-8 space-y-6">
                                <div className="flex flex-col gap-4">
                                  <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                        <Badge className="h-8 w-8 rounded-xl p-0 flex items-center justify-center bg-primary text-white font-black text-xs shadow-lg shadow-primary/20">{qIdx + 1}</Badge>
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest py-1 px-1">Reto Principal</Label>
                                     </div>
                                     <Button 
                                       type="button" 
                                       variant="ghost" 
                                       size="icon" 
                                       className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                                       onClick={() => removeQuestion(qIdx)}
                                     >
                                       <Trash2 className="h-5 w-5" />
                                     </Button>
                                  </div>
                                  
                                  <Input 
                                    placeholder="¿Cuál es la capital de...?" 
                                    value={q.question} 
                                    onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)} 
                                    required
                                    className="rounded-2xl border-none shadow-inner text-lg font-black bg-slate-50 px-6 h-16 focus-visible:ring-primary/20 transition-all"
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                  {q.options.map((opt: string, oIdx: number) => (
                                    <div key={oIdx} className={`flex items-center gap-4 group/opt p-4 rounded-3xl border-2 transition-all ${q.correctAnswer === oIdx ? 'bg-emerald-50 border-emerald-500/30' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                      <input 
                                        type="radio" 
                                        name={`correct-${qIdx}`}
                                        checked={q.correctAnswer === oIdx} 
                                        onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                                        className="h-5 w-5 text-emerald-500 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                      />
                                      <Input 
                                        value={opt} 
                                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} 
                                        placeholder={`Opción ${oIdx + 1}`}
                                        className="h-8 text-xs font-bold border-none shadow-none bg-transparent p-0 focus-visible:ring-0 placeholder:text-slate-300"
                                      />
                                      {q.options.length > 2 && (
                                        <Button 
                                          type="button"
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7 opacity-0 group-hover/opt:opacity-100 text-slate-300 hover:text-rose-500 transition-all"
                                          onClick={() => removeOption(qIdx, oIdx)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  {q.options.length < 6 && (
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      onClick={() => addOption(qIdx)}
                                      className="h-16 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all text-[10px] font-black uppercase tracking-widest gap-2"
                                    >
                                      <Plus className="h-4 w-4" /> Añadir Opción
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {questions.length === 0 && (
                             <div className="py-20 text-center space-y-4 bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-200">
                                <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-xl"><Layers className="h-8 w-8" /></div>
                                <p className="text-[10px] font-black text-slate-350 uppercase tracking-[0.25em] px-10 leading-relaxed max-w-[280px] mx-auto">No hay preguntas en esta trivia.</p>
                             </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t p-6 gap-3 z-30">
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="rounded-2xl h-14 px-8 font-bold text-slate-500 hover:bg-slate-50 border-slate-200">Cancelar</Button>
                  </DialogTrigger>
                  <Button type="submit" className="rounded-[1.75rem] h-14 px-12 text-lg font-black uppercase tracking-wider bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:translate-y-[-2px] active:translate-y-0 active:scale-95">
                    {editingId ? 'Guardar Cambios' : 'Lanzar Desafío Ahora'}
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
                           <span className="font-bold text-slate-900 text-sm leading-tight mb-1 truncate max-w-[200px]">{c.title}</span>
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
