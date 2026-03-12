
'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Code2, Loader2, Search, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TECH_STACK } from '@/lib/languages';

export default function AdminChallengesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
  };

  const handleEditClick = (challenge: any) => {
    setEditingId(challenge.id);
    setTitle(challenge.title || '');
    setDescription(challenge.description || '');
    setDifficulty(challenge.difficulty || 'Principiante');
    setTechnology(challenge.technology || '');
    setInitialCode(challenge.initialCode || '');
    setSolution(challenge.solution || '');
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
            <p className="text-muted-foreground">Algoritmos, Estructuras de Datos y Diseño UI/UX.</p>
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
            <DialogContent className="sm:max-w-[700px] rounded-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleFormSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar Desafío' : 'Crear Desafío'}</DialogTitle>
                  <DialogDescription>Completa los detalles técnicos del reto.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Título del Desafío</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Suma de Dos Números" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Dificultad</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Principiante">Principiante</SelectItem>
                          <SelectItem value="Intermedio">Intermedio</SelectItem>
                          <SelectItem value="Avanzado">Avanzado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Tecnología / Lenguaje</Label>
                      <Select value={technology} onValueChange={setTechnology}>
                        <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
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
                      <Label>Descripción del Reto</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[150px]" placeholder="Instrucciones detalladas..." />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Código Inicial (Boilerplate)</Label>
                      <Textarea value={initialCode} onChange={(e) => setInitialCode(e.target.value)} className="font-mono text-xs min-h-[150px]" placeholder="function solution() {\n  \n}" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Solución Sugerida</Label>
                      <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} className="font-mono text-xs min-h-[150px] border-emerald-100" placeholder="Código de la solución..." />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full rounded-xl h-12 shadow-lg shadow-primary/20">
                    {editingId ? 'Actualizar Desafío' : 'Publicar Desafío'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Cargando desafíos...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Título</TableHead>
                  <TableHead>Tecnología</TableHead>
                  <TableHead>Dificultad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challenges?.map(challenge => (
                  <TableRow key={challenge.id} className="group">
                    <TableCell className="font-bold">{challenge.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-lg">{challenge.technology}</Badge>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleEditClick(challenge)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => handleDelete(challenge.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {challenges?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                      No hay desafíos creados todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
