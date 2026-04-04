'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useMemoFirebase 
} from '@/firebase';
import { collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { 
  X, 
  Bell, 
  ChevronRight, 
  Sparkles,
  Megaphone,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

export function AnnouncementPopup() {
  const pathname = usePathname();
  const { user, profile } = useUser();
  const db = useFirestore();
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedAnns, setDismissedAnns] = useState<Record<string, string>>({});

  // Helper to map pathname to internal page IDs
  const currentPageId = useMemo(() => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/courses')) {
      if (pathname.includes('/learn/')) return 'learning';
      return 'courses';
    }
    if (pathname.startsWith('/challenges')) return 'challenges';
    return 'other';
  }, [pathname]);

  // Load dismissed status from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ls_dismissed_announcements');
      if (saved) {
        try {
          setDismissedAnns(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing dismissed announcements", e);
        }
      }
    }
  }, []);

  // Query active announcements
  const annsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'announcements'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(5) // Get latest few to filter client-side for roles/pages
    );
  }, [db]);

  const { data: announcements, isLoading } = useCollection(annsQuery);

  // Find the best announcement to show
  const activeAnnouncement = useMemo(() => {
    if (!announcements || announcements.length === 0) return null;

    const userRole = profile?.role || 'student';

    return announcements.find(ann => {
      // 1. Check expiration
      if (ann.expiresAt && ann.expiresAt instanceof Timestamp && ann.expiresAt.toDate() < new Date()) {
        return false;
      }

      // 2. Check Targeting (Page)
      const targetPages = ann.targetPages || [];
      const matchesPage = targetPages.length === 0 || targetPages.includes(currentPageId);

      // 3. Check Targeting (Role)
      const targetRoles = ann.targetRoles || [];
      const matchesRole = targetRoles.length === 0 || targetRoles.includes(userRole);

      // 4. Check Persistence (Dismissal)
      const lastDismissedUpdate = dismissedAnns[ann.id];
      const announcementUpdatedAt = ann.updatedAt?.toDate()?.toISOString() || ann.createdAt?.toDate()?.toISOString() || '';
      const isDismissed = lastDismissedUpdate === announcementUpdatedAt;

      return matchesPage && matchesRole && !isDismissed;
    });
  }, [announcements, currentPageId, profile?.role, dismissedAnns]);

  // Handle delay to not show immediately on page load
  useEffect(() => {
    if (activeAnnouncement) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // 3 seconds delay for better UX
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [activeAnnouncement]);

  const handleDismiss = () => {
    if (!activeAnnouncement) return;
    
    setIsVisible(false);
    
    const announcementUpdatedAt = activeAnnouncement.updatedAt?.toDate()?.toISOString() || 
                                activeAnnouncement.createdAt?.toDate()?.toISOString() || '';
    
    const newDismissed = {
      ...dismissedAnns,
      [activeAnnouncement.id]: announcementUpdatedAt
    };
    
    setDismissedAnns(newDismissed);
    localStorage.setItem('ls_dismissed_announcements', JSON.stringify(newDismissed));
  };

  if (!activeAnnouncement) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: 50, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-[100] w-[340px] md:w-[400px]"
        >
          <div className="relative bg-white rounded-[2rem] shadow-2xl shadow-primary/20 border-2 border-primary/10 overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
            
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors z-10 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col">
              {activeAnnouncement.imageUrl && (
                <div className="h-32 w-full relative overflow-hidden">
                   <img 
                    src={activeAnnouncement.imageUrl} 
                    alt={activeAnnouncement.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                </div>
              )}

              <div className="p-6 pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary/10 p-2 rounded-xl">
                    <Megaphone className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Anuncio Importante</span>
                  {activeAnnouncement.expiresAt && (
                    <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-1 rounded-full animate-pulse">
                      ¡TIEMPO LIMITADO!
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-headline font-bold text-slate-900 mb-2 leading-tight">
                  {activeAnnouncement.title}
                </h3>
                
                <p className="text-sm text-slate-600 mb-6 line-clamp-3 leading-relaxed">
                  {activeAnnouncement.description}
                </p>

                <div className="flex items-center gap-3">
                  <Link href={activeAnnouncement.ctaLink || '#'} className="flex-1" onClick={handleDismiss}>
                    <Button className="w-full h-12 rounded-2xl font-bold gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all group/btn">
                      {activeAnnouncement.ctaText || 'Ver más'}
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="h-12 rounded-2xl px-4 text-slate-400 hover:text-slate-600 font-medium"
                    onClick={handleDismiss}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
