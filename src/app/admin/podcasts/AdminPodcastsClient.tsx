'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  Mic2,
  Play,
  Download,
  Lock,
  Unlock,
  Video,
  Link as LinkIcon,
  Upload,
  X,
  Music4
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/currency';

export default function AdminPodcastsClient() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewPodcast, setPreviewPodcast] = useState<any | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('COP');
  const [category, setCategory] = useState('Tecnología');
  const [sourceType, setSourceType] = useState<'url' | 'youtube' | 'anchor'>('url');

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const isAdmin = profile?.role === 'admin' || user?.email === 'demo@learnstream.ai';

  const podcastsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, 'podcasts');
  }, [db, isAdmin]);
  const { data: podcasts, isLoading: isPodcastsLoading } = useCollection(podcastsQuery);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setAudioUrl('');
    setVideoUrl('');
    setThumbnailUrl('');
    setDuration('');
    setIsFree(true);
    setPrice('0');
    setCurrency('COP');
    setCategory('Tecnología');
    setSourceType('url');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    const podcastData: any = {
      title,
      description,
      audioUrl,
      videoUrl,
      thumbnailUrl,
      duration,
      isFree,
      price: !isFree ? parseFloat(price) || 0 : 0,
      currency,
      category,
      sourceType,
      updatedAt: serverTimestamp(),
    };

    if (editingId) {
      updateDocumentNonBlocking(doc(db, 'podcasts', editingId), podcastData);
      toast({ title: "Podcast actualizado", description: "Los cambios se guardaron correctamente." });
    } else {
      podcastData.instructorId = user.uid;
      podcastData.instructorName = profile?.displayName || user.displayName || 'Admin';
      podcastData.createdAt = serverTimestamp();
      addDocumentNonBlocking(collection(db, 'podcasts'), podcastData);
      toast({ title: "Podcast publicado", description: "El episodio ya está disponible en el catálogo." });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (podcast: any) => {
    setEditingId(podcast.id);
    setTitle(podcast.title || '');
    setDescription(podcast.description || '');
    setAudioUrl(podcast.audioUrl || '');
    setVideoUrl(podcast.videoUrl || '');
    setThumbnailUrl(podcast.thumbnailUrl || '');
    setDuration(podcast.duration || '');
    setIsFree(podcast.isFree ?? true);
    setPrice(podcast.price?.toString() || '0');
    setCurrency(podcast.currency || 'COP');
    setCategory(podcast.category || 'Tecnología');
    setSourceType(podcast.sourceType || 'url');
    setIsDialogOpen(true);
  };

  const getEmbedUrl = (url: string, type: string) => {
    if (!url) return '';
    if (type === 'youtube') {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    if (type === 'anchor' || url.includes('spotify.com') || url.includes('anchor.fm')) {
        if (url.includes('embed')) return url;
        // Spotify: open.spotify.com/episode/... -> open.spotify.com/embed/episode/...
        // Anchor: anchor.fm/.../episodes/... -> anchor.fm/.../embed/episodes/...
        return url
            .replace('open.spotify.com/episode/', 'open.spotify.com/embed/episode/')
            .replace('/episodes/', '/embed/episodes/');
    }
    return url;
  };

  if (!isAdmin && !isPodcastsLoading) return <div className="p-20 text-center">No tienes permiso para acceder.</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-headline font-bold mb-2 flex items-center gap-3 text-slate-900">
              <Mic2 className="h-8 w-8 text-primary" />
              Gestión de Podcasts
            </h1>
            <p className="text-muted-foreground font-medium">Sube episodios, configura el acceso premium y gestiona tu contenido de audio.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 gap-2 shadow-lg shadow-primary/10">
                <Plus className="h-4 w-4" />
                Nuevo Episodio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleFormSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline">{editingId ? 'Editar Episodio' : 'Nuevo Episodio'}</DialogTitle>
                  <DialogDescription>Configura los detalles del podcast y el archivo de origen.</DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 gap-6 py-8">
                  <div className="grid gap-2">
                    <Label className="font-bold">Título del Episodio</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Episodio 1: El futuro de la IA" className="rounded-xl h-11" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold">Categoría</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tecnología">Tecnología</SelectItem>
                          <SelectItem value="Carrera">Carrera</SelectItem>
                          <SelectItem value="Entrevista">Entrevista</SelectItem>
                          <SelectItem value="Inglés Tech">Inglés Tech</SelectItem>
                          <SelectItem value="Mentalidad">Mentalidad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-bold">Duración (Estimada)</Label>
                      <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ej: 45 min" className="rounded-xl h-11" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label className="font-bold">Fuente de Contenido</Label>
                        <Select value={sourceType} onValueChange={(v: any) => setSourceType(v)}>
                            <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="url">Enlace Directo (.mp3, .wav)</SelectItem>
                                <SelectItem value="youtube">YouTube (Video / Audio)</SelectItem>
                                <SelectItem value="anchor">Spotify / Anchor (Embed)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground px-1 italic">
                          💡 Tip: Si tienes un archivo propio, súbelo a Google Drive o Dropbox y pega el link compartido en "Enlace Directo".
                        </p>
                    </div>
                    <div className="grid gap-2 pt-2">
                        <Label className="font-bold">
                            {sourceType === 'youtube' ? 'Link de YouTube' : 
                             sourceType === 'anchor' ? 'Link de Anchor/Spotify' : 'Enlace Directo'}
                        </Label>
                        <div className="flex flex-col gap-4">
                            <Input 
                                value={audioUrl} 
                                onChange={(e) => setAudioUrl(e.target.value)} 
                                placeholder={
                                    sourceType === 'youtube' ? "https://youtube.com/watch?v=..." : 
                                    sourceType === 'anchor' ? "https://podcasters.spotify.com/..." : 
                                    "Pega el enlace del audio"
                                } 
                                className="rounded-xl h-11" 
                            />

                            {sourceType === 'youtube' && audioUrl.includes('watch') && (
                                <div className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-lg border border-amber-100">
                                    Nota: Usaremos este video para el reproductor embebido.
                                </div>
                            )}
                        </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold">Enlace de Video (Opcional)</Label>
                      <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube, Loom..." className="rounded-xl h-11" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-bold">URL Miniatura (Opcional)</Label>
                      <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="URL de imagen..." className="rounded-xl h-11" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isFree ? 'bg-emerald-100/50 text-emerald-600' : 'bg-amber-100/50 text-amber-600'}`}>
                        {isFree ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{isFree ? 'Gratuito para escuchar' : 'Acceso Premium'}</span>
                        <span className="text-[10px] text-muted-foreground">{isFree ? 'Descarga deshabilitada para todos' : 'Requiere compra/subscripción'}</span>
                      </div>
                    </div>
                    <Switch checked={isFree} onCheckedChange={setIsFree} />
                  </div>

                  {!isFree && (
                    <div className="grid grid-cols-2 gap-4 p-4 border-2 border-primary/20 rounded-2xl bg-primary/5 animate-in fade-in slide-in-from-top-2">
                      <div className="grid gap-2">
                        <Label className="font-bold">Precio Individual</Label>
                        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Ej: 15000" className="bg-white rounded-xl" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="font-bold">Moneda</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger className="bg-white rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COP">COP</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label className="font-bold">Descripción del Episodio</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="min-h-[100px] rounded-xl resize-none" placeholder="¿De qué trata este podcast?" />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="submit" className="w-full rounded-2xl h-14 text-lg font-bold shadow-xl shadow-primary/20" disabled={isUploading}>
                    {editingId ? 'Guardar Cambios' : 'Publicar Episodio'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-none">
                <TableHead className="pl-8 h-14 font-bold text-slate-900">Episodio</TableHead>
                <TableHead className="font-bold text-slate-900">Categoría</TableHead>
                <TableHead className="font-bold text-slate-900">Acceso</TableHead>
                <TableHead className="font-bold text-slate-900 text-center">Audio</TableHead>
                <TableHead className="text-right pr-8 font-bold text-slate-900">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPodcastsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : (podcasts || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-60 text-center">
                    <div className="bg-slate-100 p-6 rounded-full w-fit mx-auto mb-4"><Search className="h-10 w-10 text-slate-400" /></div>
                    <p className="font-bold text-slate-600">No hay podcasts registrados</p>
                    <p className="text-sm text-slate-400 italic">Crea el primer episodio para comenzar.</p>
                  </TableCell>
                </TableRow>
              ) : (podcasts || []).map((p) => (
                <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="pl-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden">
                        {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" /> : <Mic2 className="h-6 w-6" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm leading-tight">{p.title}</span>
                        <span className="text-[10px] text-slate-400">{p.duration || '00:00'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-lg font-bold text-[10px] bg-slate-100 text-slate-600 border-none">{p.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        {p.isFree ? (
                            <Badge className="bg-emerald-100 text-emerald-600 border-none hover:bg-emerald-100 font-bold text-[10px] uppercase">Gratis</Badge>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <Badge className="bg-amber-100 text-amber-600 border-none hover:bg-amber-100 font-bold text-[10px] uppercase">Premium</Badge>
                                <span className="text-[10px] font-bold text-slate-400">{formatPrice(p.price, p.currency)}</span>
                            </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                        {p.audioUrl ? (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                onClick={() => setPreviewPodcast(p)}
                            >
                                <Play className="h-4 w-4" />
                            </Button>
                        ) : (
                            <X className="h-4 w-4 text-rose-500" />
                        )}
                        {p.videoUrl && <Video className="h-4 w-4 text-indigo-500" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9" onClick={() => handleEdit(p)}><Plus className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => deleteDocumentNonBlocking(doc(db, 'podcasts', p.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewPodcast} onOpenChange={(open) => !open && setPreviewPodcast(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem]">
            <DialogHeader>
                <DialogTitle className="text-xl font-headline flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" /> Vista Previa: {previewPodcast?.title}
                </DialogTitle>
            </DialogHeader>
            <div className="py-6 flex flex-col items-center">
                {(() => {
                    const st = previewPodcast?.sourceType || (previewPodcast?.audioUrl?.toLowerCase().includes('youtube') || previewPodcast?.audioUrl?.toLowerCase().includes('youtu.be') ? 'youtube' : previewPodcast?.audioUrl?.toLowerCase().includes('anchor') || previewPodcast?.audioUrl?.toLowerCase().includes('spotify') ? 'anchor' : 'url');
                    
                    if (st === 'youtube') return (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg border">
                            <iframe 
                                src={getEmbedUrl(previewPodcast.audioUrl, 'youtube')}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    );
                    
                    if (st === 'anchor') return (
                        <div className="w-full h-[161px] rounded-2xl overflow-hidden shadow-lg border">
                            <iframe 
                                src={getEmbedUrl(previewPodcast.audioUrl, 'anchor')}
                                className="w-full h-full"
                                frameBorder="0"
                                scrolling="no"
                            />
                        </div>
                    );
                    
                    return (
                        <div className="w-full bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-6">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <Mic2 className="h-10 w-10 text-primary" />
                            </div>
                            <audio controls src={previewPodcast?.audioUrl} className="w-full" />
                            <p className="text-xs text-muted-foreground font-medium italic">Reproductor simple de administración</p>
                        </div>
                    );
                })()}
                
                <div className="mt-8 grid grid-cols-2 w-full gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fuente</p>
                        <Badge className="font-bold text-[10px] uppercase">{previewPodcast?.sourceType || 'url'}</Badge>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Acceso</p>
                        <Badge className={previewPodcast?.isFree ? 'bg-emerald-100 text-emerald-600 border-none' : 'bg-amber-100 text-amber-600 border-none'}>
                            {previewPodcast?.isFree ? 'GRATIS' : 'PREMIUM'}
                        </Badge>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" className="rounded-xl w-full" onClick={() => setPreviewPodcast(null)}>Cerrar Previsualización</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
