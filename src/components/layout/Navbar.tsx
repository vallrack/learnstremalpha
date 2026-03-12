
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Crown, User, LayoutDashboard, LogOut, LogIn, Code2, Users, Languages } from 'lucide-react';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n/use-translation';

export function Navbar() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { t, language, setLanguage } = useTranslation();

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
    <nav className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-12 h-12">
             <Image 
                src={logoUrl} 
                alt="Logo LearnStream" 
                fill 
                className="object-contain" 
             />
          </div>
          <span className="font-headline font-bold text-xl tracking-tight hidden sm:block">LearnStream</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/courses" className="text-sm font-medium hover:text-primary transition-colors">{t.common.courses}</Link>
          <Link href="/challenges" className="text-sm font-medium hover:text-primary transition-colors">{t.common.challenges}</Link>
          {user && (
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">{t.common.myLearning}</Link>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setLanguage('es')} className={language === 'es' ? 'bg-primary/10 font-bold' : ''}>
              {t.common.spanish}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-primary/10 font-bold' : ''}>
              {t.common.english}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {user && isAdmin && (
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/admin/students">
              <Button variant="ghost" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                {t.common.language === 'es' ? 'Estudiantes' : 'Students'}
              </Button>
            </Link>
            <Link href="/admin/challenges">
              <Button variant="ghost" size="sm" className="gap-2">
                <Code2 className="h-4 w-4" />
                {t.common.challenges}
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                {t.common.courses}
              </Button>
            </Link>
          </div>
        )}
        
        {!user && !isUserLoading && (
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              {t.common.login}
            </Button>
          </Link>
        )}

        <Button variant="outline" size="sm" className="gap-2 text-primary border-primary hover:bg-primary/5">
          <Crown className="h-4 w-4 fill-primary" />
          {user ? t.common.upgrade : (t.common.language === 'es' ? 'Ver Planes' : 'See Plans')}
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
                <Link href="/profile" className="cursor-pointer">{t.common.profile}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">{t.common.myLearning}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                {t.common.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button size="sm" className="rounded-full px-6">
              {t.common.startFree}
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
