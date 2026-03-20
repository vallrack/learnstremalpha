
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
  Filter, 
  Info, 
  Layout,
  Terminal,
  Eye,
  EyeOff,
  Gamepad2,
  ListPlus,
  X
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function AdminChallengesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const isAdmin = profile?.role === 'admin';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Principiante');
  const [technology, setTechnology] = useState('');
  const [challengeType, setChallengeType] = useState<'code' | 'wordsearch'>('code');
  const [words, setWords] = useState<string[]>([]);
  const [wordInput, setWordsInput] = useState('');
  const [initialCode, setInitialCode] = useState('');
  const [solution, setSolution] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [courseId, setCourseId] = useState<string>('none');

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

  const coursesQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (profile.role === 'admin') return collection(db, 'courses');
    return query(collection(db, 'courses'), where('instructorId', '==', user?.uid));
  }, [db, profile, user?.uid]);
  const { data: courses } = useCollection(coursesQuery);

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
    setCourseId('none');
  };

  const handleAddWord = () => {
    if (wordInput.trim()) {
      setWords([...words, wordInput.trim()]);
      setWordsInput('');
    }
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
    setCourseId(challenge.courseId || 'none');
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
      words: challengeType === 'wordsearch' ? words : [],
      initialCode: challengeType === 'code' ? initialCode : '',
      solution,
      isFree,
      visibility,
      courseId: visibility === 'private' ? courseId : null,
      updatedAt: serverTimestamp(),
    };

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

  const handleDelete = (id: string) => {
    if (!db || !isAdmin) return;
    if (confirm('¿Eliminar este desafío?')) {
      deleteDocumentNonBlocking(doc(db, 'coding_challenges', id));
    }
  };

  const filteredChallenges = challenges?.filter(challenge => {
    const matchesSearch = challenge.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          challenge.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'all' || challenge.difficulty === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  }) || [];

  const groupedChallenges = filteredChallenges.reduce((acc, challenge) => {
    const tech = challenge.technology || 'Otros';
    if (!acc[tech]) acc[tech] = [];
    acc[tech].push(challenge);
    return acc;
  }, {} as Record<string, any[]>);

  const techEntries = Object.entries(groupedChallenges).sort();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-headline font-bold mb-2 flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-primary" />
              Gestión de Desafíos
            </h1>
            <p className="text-muted-foreground">Crea retos de código o actividades interactivas para tus alumnos.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 gap-2 shadow-lg shadow-primary/10">
                <Plus className="h-4 w-4" />
                Nuevo Desafío
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleFormSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline">{editingId ? 'Editar Desafío' : 'Crear Desafío'}</DialogTitle>
                  <DialogDescription>
                    Elige el formato de evaluación. "Sopa de Letras" es ideal para inglés y vocabulario lógico.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-8">
                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <Label className="font-bold">Título del Reto</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Vocabulario de Variables" className="rounded-xl h-11" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="font-bold">Tipo de Desafío</Label>
                        <Select value={challengeType} onValueChange={(v: any) => setChallengeType(v)}>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="code">
                              <div className="flex items-center gap-2"><Terminal className="h-3 w-3" /> Editor de Código</div>
                            </SelectItem>
                            <SelectItem value="wordsearch">
                              <div className="flex items-center gap-2"><Gamepad2 className="h-3 w-3" /> Sopa de Letras</div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="font-bold">Tecnología Requerida</Label>
                        <Select value={technology} onValueChange={setTechnology}>
                          <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Lenguaje..." /></SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {Object.entries(TECH_STACK).map(([category, subgroups]) => (
                              <SelectGroup key={category}>
                                <SelectLabel className="bg-muted/50 py-1.5">{category}</SelectLabel>
                                {Array.isArray(subgroups) 
                                  ? subgroups.map(tech => <SelectItem key={tech} value={tech}>{tech}</SelectItem>)
                                  : Object.entries(subgroups).map(([sub, techs]) => (
                                      <div key={sub} className="px-2">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-2 mb-1 pl-2">{sub}</p>
                                        {techs.map(tech => <SelectItem key={tech} value={tech}>{tech}</SelectItem>)}
                                      </div>
                                    ))
                                }
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="font-bold">Visibilidad</Label>
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
                      <Label className="font-bold">Enunciado / Instrucciones</Label>
                      <Textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="min-h-[120px] rounded-2xl resize-none" 
                        placeholder={challengeType === 'wordsearch' ? "Encuentra las palabras y escribe una frase con ellas..." : "Explica qué debe resolver el estudiante..."} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-8 bg-muted/20 p-6 rounded-[2rem] border">
                    {challengeType === 'code' ? (
                      <>
                        <div className="grid gap-3">
                          <Label className="font-bold">Código Inicial (Plantilla)</Label>
                          <Textarea 
                            value={initialCode} 
                            onChange={(e) => setInitialCode(e.target.value)} 
                            className="font-mono text-[11px] min-h-[180px] rounded-2xl bg-white border-dashed" 
                            placeholder={"function solution() {\n  // Escribe aquí...\n}"} 
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label className="font-bold text-emerald-600">Referencia IA</Label>
                          <Textarea 
                            value={solution} 
                            onChange={(e) => setSolution(e.target.value)} 
                            className="font-mono text-[11px] min-h-[120px] rounded-2xl border-emerald-200 bg-emerald-50/20" 
                            placeholder="Solución esperada para que la IA califique..." 
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid gap-3">
                          <Label className="font-bold flex items-center gap-2">
                            <ListPlus className="h-4 w-4 text-primary" />
                            Palabras para la Sopa
                          </Label>
                          <div className="flex gap-2">
                            <Input 
                              value={wordInput} 
                              onChange={(e) => setWordsInput(e.target.value)} 
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWord())}
                              placeholder="Ej: STRING" 
                              className="rounded-xl h-11 bg-white"
                            />
                            <Button type="button" onClick={handleAddWord} className="rounded-xl h-11">Añadir</Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {words.map((w, i) => (
                              <Badge key={i} className="rounded-lg bg-white border-slate-200 text-slate-700 py-1.5 gap-2 group">
                                {w}
                                <X className="h-3 w-3 cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setWords(words.filter((_, idx) => idx !== i))} />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-3">
                          <Label className="font-bold text-emerald-600">Referencia IA (Contexto)</Label>
                          <Textarea 
                            value={solution} 
                            onChange={(e) => setSolution(e.target.value)} 
                            className="font-mono text-[11px] min-h-[120px] rounded-2xl border-emerald-200 bg-emerald-50/20" 
                            placeholder="Ej: Estas palabras son tipos de datos en JS. El estudiante debe usarlas para explicar la memoria..." 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full rounded-2xl h-14 text-lg font-bold shadow-xl shadow-primary/20">
                    {editingId ? 'Actualizar Desafío' : 'Publicar Desafío'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <section className="bg-white p-6 rounded-[2rem] border shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Nombre del desafío..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl h-11" 
              />
            </div>
          </div>
          <div className="w-full md:w-48 space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Dificultad</Label>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Principiante">Principiante</SelectItem>
                <SelectItem value="Intermedio">Intermedio</SelectItem>
                <SelectItem value="Avanzado">Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" onClick={() => { setSearchTerm(''); setFilterDifficulty('all'); }} className="h-11 px-4 rounded-xl text-xs text-muted-foreground">
            Limpiar
          </Button>
        </section>

        <div className="space-y-4">
          {isChallengesLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 bg-white rounded-[2rem] border">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando desafíos...</p>
            </div>
          ) : techEntries.length > 0 ? (
            <Accordion type="multiple" className="space-y-4">
              {techEntries.map(([tech, techChallenges]) => (
                <AccordionItem key={tech} value={tech} className="bg-white border rounded-[2rem] overflow-hidden px-6 shadow-sm">
                  <AccordionTrigger className="hover:no-underline py-6">
                    <div className="flex items-center gap-4 text-left">
                      <div className="bg-primary/10 p-2.5 rounded-2xl">
                        {tech.includes('HTML') || tech.includes('CSS') || tech.includes('Figma')
                          ? <Layout className="h-5 w-5 text-primary" />
                          : <Terminal className="h-5 w-5 text-primary" />
                        }
                      </div>
                      <div>
                        <h2 className="text-xl font-headline font-bold">{tech}</h2>
                        <p className="text-xs text-muted-foreground">{techChallenges.length} {techChallenges.length === 1 ? 'desafío' : 'desafíos'}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 border-t pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-none hover:bg-transparent">
                          <TableHead className="w-[40%]">Título</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Visibilidad</TableHead>
                          <TableHead className="text-right pr-4">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {techChallenges.map(challenge => (
                          <TableRow key={challenge.id} className="group hover:bg-muted/10 border-muted/20">
                            <TableCell className="font-bold py-4">
                              <div className="flex flex-col">
                                <span>{challenge.title}</span>
                                <Badge variant="secondary" className="w-fit text-[9px] h-4 mt-1">{challenge.difficulty}</Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {challenge.type === 'wordsearch' ? (
                                <div className="flex items-center gap-1.5 text-purple-600">
                                  <Gamepad2 className="h-3 w-3" />
                                  <span className="text-[10px] font-bold uppercase">Sopa de Letras</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <Code2 className="h-3 w-3" />
                                  <span className="text-[10px] font-bold uppercase">Código</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {challenge.visibility === 'private' ? (
                                <div className="flex items-center gap-1.5 text-amber-600">
                                  <EyeOff className="h-3 w-3" />
                                  <span className="text-xs font-medium">Privado</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                  <Eye className="h-3 w-3" />
                                  <span className="text-xs font-medium">Público</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleEditClick(challenge)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => handleDelete(challenge.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed max-w-2xl mx-auto">
              <Filter className="h-12 w-12 text-muted-foreground opacity-20 mb-4 mx-auto" />
              <p className="text-muted-foreground font-medium">No se encontraron desafíos propios.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
