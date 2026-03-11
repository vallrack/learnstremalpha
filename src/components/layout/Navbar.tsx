'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlayCircle, User, Crown, LayoutDashboard, LogOut, LogIn } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, isUserLoading } = useUser();
  const { auth } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <nav className="border-b bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <PlayCircle className="text-primary-foreground h-6 w-6" />
          </div>
          <span className="font-headline font-bold text-xl tracking-tight">LearnStream</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/courses" className="text-sm font-medium hover:text-primary transition-colors">Cursos</Link>
          {user && (
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Mi Aprendizaje</Link>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {user && (
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="hidden lg:flex gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Panel Admin
            </Button>
          </Link>
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
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="h-full w-full object-cover" />
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
                <Link href="/profile" className="cursor-pointer">Perfil</Link>
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
