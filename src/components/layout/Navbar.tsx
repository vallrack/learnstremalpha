'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Crown, User, LayoutDashboard, LogOut, LogIn, Code2, Users } from 'lucide-react';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  // Consultar perfil para verificar rol
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const isAdmin = profile?.role === 'admin';

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const logoUrl = "https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i";

  return (
    <nav className="border-b bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-12 h-12 overflow-hidden rounded-xl bg-slate-900 p-1">
             <Image 
                src={logoUrl} 
                alt="LearnStream Logo" 
                fill 
                className="object-contain" 
             />
          </div>
          <span className="font-headline font-bold text-xl tracking-tight hidden sm:block">LearnStream</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/courses" className="text-sm font-medium hover:text-primary transition-colors">Cursos</Link>
          <Link href="/challenges" className="text-sm font-medium hover:text-primary transition-colors">Desafíos</Link>
          {user && (
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Mi Aprendizaje</Link>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {user && isAdmin && (
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/admin/students">
              <Button variant="ghost" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Estudiantes
              </Button>
            </Link>
            <Link href="/admin/challenges">
              <Button variant="ghost" size="sm" className="gap-2">
                <Code2 className="h-4 w-4" />
                Desafíos
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Cursos
              </Button>
            </Link>
          </div>
        )}
        
        {!user && !isUserLoading && (
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              Ingresar
            </Button>
          </Link>
        )}

        <Button variant="outline" size="sm" className="gap-2 text-primary border-primary hover:bg-primary/5">
          <Crown className="h-4 w-4 fill-primary" />
          {user ? 'Mejorar Plan' : 'Ver Planes'}
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full overflow-hidden border">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Usuario'} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-bold">{user.displayName || 'Estudiante'}</span>
                  <span className="text-xs text-muted-foreground truncate">{user.email || 'Invitado'}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">Mi Perfil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">Mis Cursos</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button size="sm" className="rounded-full px-6">
              Empieza Gratis
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
