'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserCircle, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const syncUserProfile = async (authUser: any) => {
    if (!firestore || !authUser) return;
    
    const userRef = doc(firestore, 'users', authUser.uid);
    try {
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const defaultName = authUser.isAnonymous ? 'Invitado' : (email ? email.split('@')[0] : 'Estudiante');
        setDocumentNonBlocking(userRef, {
          id: authUser.uid,
          displayName: authUser.displayName || defaultName,
          email: authUser.email || null,
          profileImageUrl: authUser.photoURL || `https://picsum.photos/seed/${authUser.uid}/200/200`,
          createdAt: serverTimestamp(),
          isPremiumSubscriber: false,
          role: 'student'
        }, { merge: true });
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

  const handleAnonymousLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInAnonymously(auth);
      await syncUserProfile(userCredential.user);
      router.push('/dashboard');
    } catch (err: any) {
      let message = 'Error al iniciar sesión como invitado.';
      if (err.code === 'auth/admin-restricted-operation') {
        message = 'El acceso de invitados está deshabilitado en Firebase. Por favor, habilita "Anonymous Sign-in" en la consola de Firebase.';
      }
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

  const logoUrl = "https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 mb-4 overflow-hidden relative">
              <Image 
                src={logoUrl} 
                alt="LearnStream Logo" 
                fill 
                className="object-cover mix-blend-screen" 
              />
            </div>
            <h1 className="text-3xl font-headline font-bold">Bienvenido a LearnStream</h1>
            <p className="text-muted-foreground">Tu viaje de aprendizaje comienza aquí</p>
          </div>

          <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none h-12 bg-muted/30">
                <TabsTrigger value="login" className="data-[state=active]:bg-background rounded-none">Ingresar</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-background rounded-none">Registrarse</TabsTrigger>
              </TabsList>
              
              <CardHeader className="pt-8">
                <CardTitle className="text-xl">Acceder a tu cuenta</CardTitle>
                <CardDescription>Ingresa tus datos para continuar con tus cursos.</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error de Acceso</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="login" className="mt-0 space-y-4">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="tu@ejemplo.com" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••"
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-xl gap-2" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                      Iniciar Sesión
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="mt-0 space-y-4">
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Usa una cuenta existente o entra como invitado.</p>
                  </div>
                </TabsContent>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">O también</span>
                  </div>
                </div>

                <Button 
                  variant="secondary" 
                  className="w-full h-11 rounded-xl gap-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground"
                  onClick={handleAnonymousLogin}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCircle className="h-4 w-4" />}
                  Continuar como Invitado
                </Button>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
}