'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserCircle, Loader2, AlertCircle, UserPlus, BookOpen, Check, Star } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useBrand } from '@/lib/branding/BrandingProvider';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { name, logoUrl } = useBrand();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  // Fetch available courses for registration
  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'courses'), where('isActive', '==', true));
  }, [firestore]);
  const { data: availableCourses, isLoading: isLoadingCourses } = useCollection(coursesQuery);

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const syncUserProfile = async (authUser: any, nameOverride?: string, enrolledCourses?: string[]) => {
    if (!firestore || !authUser) return;
    
    if (authUser.isAnonymous) return;

    const ADMIN_EMAILS = ['varrack67@gmail.com', 'vallrack67@gmail.com'];
    const isAdmin = ADMIN_EMAILS.includes(authUser.email?.toLowerCase());

    const userRef = doc(firestore, 'users', authUser.uid);
    try {
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setDocumentNonBlocking(userRef, {
          id: authUser.uid,
          displayName: nameOverride || authUser.email?.split('@')[0] || 'Estudiante',
          email: authUser.email,
          profileImageUrl: authUser.photoURL || `https://picsum.photos/seed/${authUser.uid}/200/200`,
          createdAt: serverTimestamp(),
          isPremiumSubscriber: isAdmin,
          role: isAdmin ? 'admin' : 'student',
          isActive: true,
          xp: 0,
          level: 1
        }, { merge: true });

        // Enrolment logic for new registration
        if (enrolledCourses && enrolledCourses.length > 0) {
          enrolledCourses.forEach(courseId => {
            const progressRef = doc(firestore, 'users', authUser.uid, 'courseProgress', courseId);
            setDocumentNonBlocking(progressRef, {
              courseId,
              status: 'started',
              progressPercentage: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          });
        }
      } else {
        if (isAdmin && (userDoc.data()?.role !== 'admin' || !userDoc.data()?.isPremiumSubscriber)) {
          setDocumentNonBlocking(userRef, { 
            role: 'admin', 
            isPremiumSubscriber: true 
          }, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Could not sync profile during login", e);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await syncUserProfile(userCredential.user);
      router.push('/dashboard');
    } catch (err: any) {
      let message = 'Error al iniciar sesión. Por favor, verifica tus datos.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = 'Credenciales inválidas. Verifica tu correo y contraseña.';
      }
      setError({ message, code: err.code });
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError({ message: 'Las contraseñas no coinciden.' });
      return;
    }
    if (password.length < 6) {
      setError({ message: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: displayName
      });

      await syncUserProfile(userCredential.user, displayName, selectedCourseIds);
      
      router.push('/dashboard');
    } catch (err: any) {
      let message = 'Error al crear la cuenta.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Este correo electrónico ya está registrado.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'El formato del correo electrónico no es válido.';
      }
      setError({ message, code: err.code });
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId) 
        : [...prev, courseId]
    );
  };

  const [linkingEmail, setLinkingEmail] = useState('');
  const [linkingPassword, setLinkingPassword] = useState('');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<any>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await syncUserProfile(userCredential.user);
      router.push('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        // El email ya existe con email/password — guardamos el credential de Google
        // y pedimos la contraseña al usuario para hacer el linking
        const googleCredential = GoogleAuthProvider.credentialFromError(err);
        setPendingGoogleCredential(googleCredential);
        setLinkingEmail(err.customData?.email || '');
        setError({
          message: `Este correo (${err.customData?.email || ''}) ya tiene cuenta con contraseña. Ingresa tu contraseña para vincular tu cuenta de Google automáticamente.`,
          code: err.code
        });
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError({ message: 'Error al iniciar sesión con Google. Intenta de nuevo.', code: err.code });
      }
      setLoading(false);
    }
  };

  const handleLinkGoogleAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogleCredential || !linkingEmail || !linkingPassword) return;
    setLoading(true);
    setError(null);
    try {
      const { linkWithCredential } = await import('firebase/auth');
      // 1. Sign in with email/password (cuenta existente)
      const existingUser = await signInWithEmailAndPassword(auth, linkingEmail, linkingPassword);
      // 2. Vincular la cuenta de Google al mismo UID
      await linkWithCredential(existingUser.user, pendingGoogleCredential);
      // 3. Actualizar la foto de perfil desde Google si no tiene una propia
      await syncUserProfile(existingUser.user);
      setPendingGoogleCredential(null);
      setLinkingPassword('');
      router.push('/dashboard');
    } catch (err: any) {
      let message = 'Contraseña incorrecta. Intenta de nuevo.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Contraseña incorrecta. Intenta de nuevo.';
      }
      setError({ message, code: err.code });
      setLoading(false);
    }
  };


  const handleAnonymousLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
      router.push('/dashboard');
    } catch (err: any) {
      let message = 'Error al iniciar sesión como invitado.';
      setError({ message, code: err.code });
      setLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se usa logoUrl de useBrand()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md lg:max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          <div className="hidden lg:flex flex-col justify-center space-y-8 pr-12">
            <div className="relative w-32 h-32">
              <Image src={logoUrl} alt={`${name} Logo`} fill className="object-contain" />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-headline font-bold leading-tight">Aprende lo que el mercado necesita hoy.</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Únete a la academia donde los retos de código son evaluados por IA y tu talento se convierte en un portfolio profesional.
              </p>
            </div>
            <RealTestimonials />
          </div>

          <div className="w-full max-w-md mx-auto">
            <Card className="border-border/50 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none h-14 bg-slate-50">
                  <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:shadow-none rounded-none font-bold text-lg">Ingresar</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:shadow-none rounded-none font-bold text-lg">Registrarse</TabsTrigger>
                </TabsList>
                
                <CardContent className="pt-8 space-y-4 px-8 pb-8">
                  {error && (
                    <Alert variant="destructive" className="rounded-2xl mb-4 bg-rose-50 border-rose-100 text-rose-900">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="font-bold">Aviso</AlertTitle>
                      <AlertDescription>{error.message}</AlertDescription>
                    </Alert>
                  )}

                  {/* Formulario de vinculación de cuentas Google + Email/Password */}
                  {pendingGoogleCredential && (
                    <form onSubmit={handleLinkGoogleAccount} className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <p className="text-sm font-bold text-primary">Vincular cuenta de Google</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Tu contraseña actual para <span className="text-primary">{linkingEmail}</span></Label>
                        <Input
                          type="password"
                          placeholder="Ingresa tu contraseña"
                          value={linkingPassword}
                          onChange={e => setLinkingPassword(e.target.value)}
                          required
                          className="rounded-xl h-11 bg-white"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading} className="flex-1 rounded-xl h-11 font-bold gap-2">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Vincular y Entrar
                        </Button>
                        <Button type="button" variant="ghost" className="rounded-xl h-11 px-4 text-slate-500" onClick={() => { setPendingGoogleCredential(null); setLinkingPassword(''); setError(null); }}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  )}

                  <TabsContent value="login" className="mt-0 space-y-6">
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-bold ml-1">Correo Electrónico</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="tu@ejemplo.com" 
                          required 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="rounded-xl h-12 bg-slate-50 border-none shadow-none focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="font-bold ml-1">Contraseña</Label>
                        <Input 
                          id="password" 
                          type="password" 
                          placeholder="Tu contraseña"
                          required 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="rounded-xl h-12 bg-slate-50 border-none shadow-none focus-visible:ring-primary"
                        />
                      </div>
                      <Button type="submit" className="w-full h-14 rounded-2xl gap-2 font-bold text-lg shadow-xl shadow-primary/20" disabled={loading}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                        Acceder a mi cuenta
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="mt-0 space-y-6">
                    <form onSubmit={handleEmailRegister} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="reg-name" className="font-bold ml-1">Nombre Completo</Label>
                        <Input 
                          id="reg-name" 
                          type="text" 
                          placeholder="Ej: Juan Pérez" 
                          required 
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="rounded-xl h-12 bg-slate-50 border-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email" className="font-bold ml-1">Correo Electrónico</Label>
                        <Input 
                          id="reg-email" 
                          type="email" 
                          placeholder="tu@ejemplo.com" 
                          required 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="rounded-xl h-12 bg-slate-50 border-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reg-password" className="font-bold ml-1">Contraseña</Label>
                          <Input 
                            id="reg-password" 
                            type="password" 
                            placeholder="Mín. 6"
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="rounded-xl h-12 bg-slate-50 border-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-confirm" className="font-bold ml-1">Confirmar</Label>
                          <Input 
                            id="reg-confirm" 
                            type="password" 
                            placeholder="Repetir"
                            required 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="rounded-xl h-12 bg-slate-50 border-none"
                          />
                        </div>
                      </div>

                      {/* Course Selection Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                          <Label className="font-bold">Inscribirme en:</Label>
                          <span className="text-[10px] uppercase font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                            {selectedCourseIds.length} seleccionados
                          </span>
                        </div>
                        <ScrollArea className="h-[160px] w-full rounded-2xl border bg-slate-50/50 p-4">
                          {isLoadingCourses ? (
                            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-xs">Cargando catálogo...</span>
                            </div>
                          ) : availableCourses && availableCourses.length > 0 ? (
                            <div className="space-y-3">
                              {availableCourses.map((course) => (
                                <div 
                                  key={course.id} 
                                  className={`flex items-center space-x-3 p-3 rounded-xl transition-all cursor-pointer border ${selectedCourseIds.includes(course.id) ? 'bg-primary/5 border-primary/20' : 'bg-white border-transparent shadow-sm'}`}
                                  onClick={() => toggleCourse(course.id)}
                                >
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedCourseIds.includes(course.id) ? 'bg-primary border-primary' : 'bg-white border-slate-300'}`}>
                                    {selectedCourseIds.includes(course.id) && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate leading-tight">{course.title}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mt-0.5">{course.technology}</p>
                                  </div>
                                  {course.isFree ? (
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">GRATIS</span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">PRO</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                              <BookOpen className="h-8 w-8 text-slate-200 mb-2" />
                              <p className="text-[10px] text-muted-foreground font-medium italic">No hay cursos disponibles para pre-inscripción en este momento.</p>
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      <Button type="submit" className="w-full h-14 rounded-2xl gap-2 font-bold text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20" disabled={loading}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
                        Empezar a aprender
                      </Button>
                    </form>
                  </TabsContent>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-100" />
                    </div>
                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="bg-white px-4 text-muted-foreground">O continúa con</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl gap-3 bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-200 shadow-sm"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Continuar con Google
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="w-full h-10 rounded-xl gap-2 text-slate-500 hover:text-slate-700 text-sm"
                    onClick={handleAnonymousLogin}
                    disabled={loading}
                  >
                    <UserCircle className="h-4 w-4" />
                    Entrar como Invitado
                  </Button>
                </CardContent>
                <CardFooter className="pb-8 justify-center bg-slate-50/50 pt-6">
                  <p className="text-[10px] text-muted-foreground text-center px-10 leading-relaxed font-medium">
                    Al unirte a {name}, aceptas nuestros <span className="text-primary cursor-pointer hover:underline">términos de servicio</span> y <span className="text-primary cursor-pointer hover:underline">política de privacidad</span>.
                  </p>
                </CardFooter>
              </Tabs>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente que carga testimonios reales desde Firestore
function RealTestimonials() {
  const db = useFirestore();
  const [reviews, setReviews] = useState<any[]>([]);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!db) return;

    // Importación dinámica limpia
    const loadTestimonials = async () => {
      try {
        const { collectionGroup, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
        const q = query(
          collectionGroup(db, 'ratings'),
          where('rating', '>=', 4),
          orderBy('rating', 'desc'),
          limit(10)
        );
        
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data()).filter(d => d.comment && d.comment.trim().length > 10);
        setReviews(data.slice(0, 3));
      } catch (err) {
        console.warn("RealTestimonials: Error loading reviews", err);
      }
    };

    loadTestimonials();
  }, [db]);

  // Auto-rotar testimonios cada 5s
  useEffect(() => {
    if (reviews.length < 2) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % reviews.length), 5000);
    return () => clearInterval(t);
  }, [reviews.length]);

  if (reviews.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur border border-slate-100 rounded-3xl p-6 space-y-3">
        <p className="text-sm font-bold text-slate-700">Sé el primero en dejar tu reseña</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Completa un curso y comparte tu experiencia con la comunidad.
        </p>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 text-slate-200" />)}
        </div>
      </div>
    );
  }

  const r = reviews[current];
  return (
    <div className="bg-white/90 backdrop-blur border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm transition-all">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className={`h-4 w-4 ${i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
        ))}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed italic line-clamp-3">
        &ldquo;{r.comment}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        {r.profileImageUrl ? (
          <img src={r.profileImageUrl} alt={r.displayName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {r.displayName?.[0]?.toUpperCase() || 'E'}
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-slate-800">{r.displayName || 'Estudiante'}</p>
          <p className="text-[10px] text-muted-foreground">Estudiante verificado</p>
        </div>
        {reviews.length > 1 && (
          <div className="ml-auto flex gap-1">
            {reviews.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-primary' : 'bg-slate-200'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
