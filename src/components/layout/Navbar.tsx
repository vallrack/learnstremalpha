
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  Crown, 
  User, 
  LayoutDashboard, 
  LogOut, 
  LogIn, 
  Code2, 
  Users, 
  Languages, 
  Menu, 
  BookOpen, 
  ChevronRight,
  Home,
  Settings,
  ChevronDown,
  Tag,
  GraduationCap
} from 'lucide-react';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { useTranslation } from '@/lib/i18n/use-translation';
import { useState } from 'react';

export function Navbar() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { t, language, setLanguage } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const isAdmin = profile?.role === 'admin';
  const isInstructor = profile?.role === 'instructor';
  const hasManagementAccess = isAdmin || isInstructor;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const logoUrl = "https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i";

  const navLinks = [
    { href: '/', label: t.common.language === 'es' ? 'Inicio' : 'Home', icon: Home },
    { href: '/courses', label: t.common.courses, icon: BookOpen },
    { href: '/challenges', label: t.common.challenges, icon: Code2 },
  ];

  if (user) {
    navLinks.push({ href: '/dashboard', label: t.common.myLearning, icon: LayoutDashboard });
  }

  const adminLinks = [
    { href: '/admin/challenges', label: 'Desafíos', icon: Code2, roles: ['admin', 'instructor'] },
    { href: '/admin', label: 'Catálogo Cursos', icon: LayoutDashboard, roles: ['admin', 'instructor'] },
    { href: '/admin/students', label: 'Usuarios y Roles', icon: Users, roles: ['admin'] },
    { href: '/admin/promotions', label: 'Promociones', icon: Tag, roles: ['admin'] },
  ];

  const visibleAdminLinks = adminLinks.filter(link => link.roles.includes(profile?.role || ''));

  return (
    <nav className="border-b bg-white px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4 md:gap-8">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] rounded-r-[2rem] p-0 overflow-hidden flex flex-col">
            <SheetHeader className="p-6 border-b bg-muted/10">
              <SheetTitle className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <Image src={logoUrl} alt="Logo" fill className="object-contain" />
                </div>
                <span className="font-headline font-bold text-xl">LearnStream</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Navegación</p>
                <div className="grid gap-1">
                  {navLinks.map((link) => (
                    <Link 
                      key={link.href} 
                      href={link.href} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-primary/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                          <link.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <span className="font-bold text-sm">{link.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                  ))}
                </div>
              </section>

              {hasManagementAccess && (
                <section className="space-y-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest px-2">Gestión Académica</p>
                  <div className="grid gap-1">
                    {visibleAdminLinks.map((link) => (
                      <Link 
                        key={link.href} 
                        href={link.href} 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-amber-100/50 group-hover:bg-amber-100 transition-colors">
                            <link.icon className="h-4 w-4 text-amber-600" />
                          </div>
                          <span className="font-bold text-sm text-amber-900">{link.label}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-all" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <div className="p-6 border-t bg-muted/5 mt-auto">
              {!user ? (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full h-12 rounded-2xl font-bold gap-2">
                    <LogIn className="h-4 w-4" />
                    {t.common.startFree}
                  </Button>
                </Link>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-2xl font-bold text-destructive border-destructive/20 hover:bg-destructive/5 gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  {t.common.logout}
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 md:gap-3">
          <div className="relative w-10 h-10 md:w-12 md:h-12">
             <Image 
                src={logoUrl} 
                alt="Logo LearnStream" 
                fill 
                className="object-contain" 
             />
          </div>
          <span className="font-headline font-bold text-lg md:text-xl tracking-tight hidden xs:block">LearnStream</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/courses" className="text-sm font-medium hover:text-primary transition-colors">{t.common.courses}</Link>
          <Link href="/challenges" className="text-sm font-medium hover:text-primary transition-colors">{t.common.challenges}</Link>
          {user && (
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">{t.common.myLearning}</Link>
          )}
          
          {user && hasManagementAccess && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden lg:inline">{isAdmin ? 'Gestión Admin' : 'Panel Instructor'}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-2xl shadow-xl border-amber-100">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-amber-600 px-4 pt-3 pb-1">Administración</DropdownMenuLabel>
                {visibleAdminLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild className="p-3 cursor-pointer rounded-xl mx-1">
                    <Link href={link.href} className="flex items-center gap-2">
                      <link.icon className="h-4 w-4 text-amber-600" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setLanguage('es')} className={language === 'es' ? 'bg-primary/10 font-bold' : ''}>
              Español
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-primary/10 font-bold' : ''}>
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {!user && !isUserLoading && (
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              {t.common.login}
            </Button>
          </Link>
        )}

        <Button variant="outline" size="sm" className="gap-2 text-primary border-primary hover:bg-primary/5 rounded-xl hidden xs:flex">
          <Crown className="h-4 w-4 fill-primary" />
          <span className="hidden sm:inline">{user ? t.common.upgrade : 'Ver Planes'}</span>
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full overflow-hidden border h-9 w-9">
                {profile?.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border-muted/50">
              <DropdownMenuLabel className="p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-sm">{profile?.displayName || 'Estudiante'}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{user.email || 'Invitado'}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-xl mx-1">
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {t.common.profile}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-xl mx-1">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  {t.common.myLearning}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="p-3 text-destructive focus:text-destructive cursor-pointer rounded-xl mx-1">
                <LogOut className="h-4 w-4 mr-2" />
                {t.common.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button size="sm" className="rounded-full px-4 md:px-6 h-9 font-bold text-xs">
              {t.common.startFree}
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
