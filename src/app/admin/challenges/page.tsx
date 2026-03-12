
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
  Lock, 
  Unlock, 
  Info, 
  ChevronRight,
  Layout,
  Terminal,
  Trophy
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
import { collection, serverTimestamp, doc } from 'firebase/firestore';
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
  const [filterTech, setFilterTech] = useState('all');

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
  const [initialCode, setInitialCode] = useState('');
  const [solution, setSolution] = useState('');
  const [isFree, setIsFree] = useState(true);

  const challengesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'coding_challenges');
  }, [db]);

  const { data: challenges, isLoading } = useCollection(challengesQuery);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDifficulty('Principiante');
    setTechnology('');
    setInitialCode('');
    setSolution('');
    setIsFree(true);
  };

  const handleEditClick = (challenge: any) => {
    setEditingId(challenge.id);
    setTitle(challenge.title || '');
    setDescription(challenge.description || '');
    setDifficulty(challenge.difficulty || 'Principiante');
    setTechnology(challenge.technology || '');
    setInitialCode(challenge.initialCode || '');
    setSolution(challenge.solution || '');
    setIsFree(challenge.isFree ?? true);
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
      initialCode,
      solution,
      isFree,
      updatedAt: serverTimestamp(),
    };

    if (editingId) {
      updateDocumentNonBlocking(doc(db, 'coding_challenges', editingId), challengeData);
    } else {
      challengeData.instructorId = user.uid;
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

  // Filtrado y Agrupación
  const filteredChallenges = challenges?.filter(challenge => {
    const matchesSearch = challenge.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          challenge.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'all' || challenge.difficulty === filterDifficulty;
    const matchesTech = filterTech === 'all' || challenge.technology === filterTech;
    return matchesSearch && matchesDifficulty && matchesTech;
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
              <Code2 className="h-8 w-8 text-primary" />
              Gestión de Desafíos
            </h1>
            <p className="text-muted-foreground">Configura algoritmos y ejercicios prácticos evaluados por IA.</p>
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
            <DialogContent className="sm:max-w-[850px] rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleFormSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline">{editingId ? 'Editar Desafío' : 'Crear Desafío'}</DialogTitle>
                  <DialogDescription>
                    Define los requisitos técnicos. Recuerda que la IA usará esta información para calificar al alumno.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-8">
                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <Label className="font-bold">Título del Reto</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Invertir una Cadena" className="rounded-xl h-11" />
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
                        <Label className="font-bold">Acceso</Label>
                        <div className="flex items-center justify-between px-3 h-11 bg-muted/30 rounded-xl border">
                          <span className="text-xs font-medium">{isFree ? 'Gratuito' : 'Premium'}</span>
                          <Switch checked={isFree} onCheckedChange={setIsFree} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="font-bold">Tecnología Requerida</Label>
                      <Select value={technology} onValueChange={setTechnology}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Selecciona el lenguaje..." /></SelectTrigger>
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
                      <Label className="font-bold">Enunciado (Instrucciones)</Label>
                      <Textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="min-h-[200px] rounded-2xl resize-none" 
                        placeholder="Explica detalladamente qué debe resolver el alumno..." 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-8 bg-muted/20 p-6 rounded-[2rem] border">
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold flex items-center gap-2">
                          Código Inicial (Plantilla)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild><Info className="h-4 w-4 text-primary cursor-help" /></TooltipTrigger>
                              <TooltipContent className="max-w-[250px] p-3 rounded-xl shadow-xl">
                                <p className="text-xs leading-relaxed">Es el <strong>punto de partida</strong> que el alumno verá escrito en su editor. Úsalo para definir la estructura de la función o los divs básicos para que no empiece de cero.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                      </div>
                      <p className="text-[10px] text-muted-foreground -mt-2">Esto es lo que el alumno verá al abrir el reto.</p>
                      <Textarea 
                        value={initialCode} 
                        onChange={(e) => setInitialCode(e.target.value)} 
                        className="font-mono text-[11px] min-h-[180px] rounded-2xl bg-white border-dashed" 
                        placeholder={"function solution() {\n  // Escribe aquí...\n}"} 
                      />
                    </div>

                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold flex items-center gap-2">
                          Solución Correcta (Referencia)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild><Info className="h-4 w-4 text-emerald-600 cursor-help" /></TooltipTrigger>
                              <TooltipContent className="max-w-[250px] p-3 rounded-xl shadow-xl">
                                <p className="text-xs leading-relaxed">Este código <strong>NO lo ve el alumno</strong>. Sirve para que la IA sepa exactamente cuál es la respuesta esperada y pueda calificar con precisión.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                      </div>
                      <p className="text-[10px] text-emerald-600/70 -mt-2">Solo para uso de la IA evaluadora.</p>
                      <Textarea 
                        value={solution} 
                        onChange={(e) => setSolution(e.target.value)} 
                        className="font-mono text-[11px] min-h-[180px] rounded-2xl border-emerald-200 bg-emerald-50/20" 
                        placeholder="Escribe la solución perfecta aquí..." 
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full rounded-2xl h-14 text-lg font-bold shadow-xl shadow-primary/20">
                    {editingId ? 'Guardar Cambios' : 'Publicar Desafío'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        {/* Barra de Filtros */}
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
          <div className="w-full md:w-48 space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Tecnología</Label>
            <Select value={filterTech} onValueChange={setFilterTech}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(TECH_STACK).map(([category, subgroups]) => (
                  <SelectGroup key={category}>
                    <SelectLabel className="bg-muted/50 py-1.5">{category}</SelectLabel>
                    {Array.isArray(subgroups) 
                      ? subgroups.map(tech => <SelectItem key={tech} value={tech}>{tech}</SelectItem>)
                      : Object.entries(subgroups).map(([sub, techs]) => 
                          techs.map(tech => <SelectItem key={tech} value={tech}>{tech}</SelectItem>)
                        )
                    }
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" onClick={() => { setSearchTerm(''); setFilterDifficulty('all'); setFilterTech('all'); }} className="h-11 px-4 rounded-xl text-xs text-muted-foreground">
            Limpiar
          </Button>
        </section>

        {/* Lista Agrupada */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 bg-white rounded-[2rem] border">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Cargando desafíos...</p>
            </div>
          ) : techEntries.length > 0 ? (
            <Accordion type="multiple" defaultValue={techEntries.map(([tech]) => tech)} className="space-y-4">
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
                        <p className="text-xs text-muted-foreground">{techChallenges.length} {techChallenges.length === 1 ? 'desafío' : 'desafíos'} en esta categoría</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 border-t pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-none hover:bg-transparent">
                          <TableHead className="w-[40%]">Título</TableHead>
                          <TableHead>Acceso</TableHead>
                          <TableHead>Dificultad</TableHead>
                          <TableHead className="text-right pr-4">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {techChallenges.map(challenge => (
                          <TableRow key={challenge.id} className="group hover:bg-muted/10 border-muted/20">
                            <TableCell className="font-bold py-4">
                              <div className="flex flex-col">
                                <span>{challenge.title}</span>
                                <span className="text-[10px] text-muted-foreground font-normal line-clamp-1">{challenge.description}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {challenge.isFree ? (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 rounded-lg"><Unlock className="h-3 w-3 mr-1" /> Gratis</Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 rounded-lg"><Lock className="h-3 w-3 mr-1" /> Premium</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                challenge.difficulty === 'Principiante' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                                challenge.difficulty === 'Intermedio' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                                'bg-rose-500/10 text-rose-600 border-rose-200'
                              }>
                                {challenge.difficulty}
                              </Badge>
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
            <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed max-w-2xl mx-auto flex flex-col items-center">
              <Filter className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground font-medium">No se encontraron desafíos que coincidan con los filtros.</p>
              <Button variant="link" onClick={() => { setSearchTerm(''); setFilterDifficulty('all'); setFilterTech('all'); }}>Ver todos los desafíos</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
