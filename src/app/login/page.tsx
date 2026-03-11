'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle, LogIn, UserCircle, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function LoginPage() {
  const { auth } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already logged in, redirect to dashboard
  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Credenciales inválidas. Por favor, inténtalo de nuevo.');
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
      setError('Error al iniciar sesión como invitado.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <PlayCircle className="h-10 w-10 text-primary" />
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
                    <AlertDescription>{error}</AlertDescription>
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
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Contraseña</Label>
                        <Link href="#" className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
                      </div>
                      <Input 
                        id="password" 
                        type="password" 
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
                    <p className="text-sm text-muted-foreground">El registro está temporalmente limitado. Por favor, usa una cuenta existente o entra como invitado.</p>
                  </div>
                  <Button variant="outline" className="w-full h-11 rounded-xl" disabled>
                    Crear Cuenta
                  </Button>
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
                  <UserCircle className="h-4 w-4" />
                  Continuar como Invitado
                </Button>
              </CardContent>
              
              <CardFooter className="bg-muted/10 border-t p-4 justify-center">
                <p className="text-xs text-center text-muted-foreground">
                  Al continuar, aceptas nuestros <Link href="#" className="underline">Términos de Servicio</Link> y <Link href="#" className="underline">Política de Privacidad</Link>.
                </p>
              </CardFooter>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
}
