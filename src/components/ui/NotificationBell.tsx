'use client';

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Bell, Check, Loader2, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // We need the user's role to determine if they should receive 'admin' notifications
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !profile) return null;
    
    // Admins need to see 'admin' targeted notifications OR their own
    // Limitation in Firestore: 'in' array cannot be used dynamically if role changes often in simple queries,
    // but we can query specific to their role or just fetch their personal ones.
    // For simplicity and Firestore limits, we will query where userId == their uid. 
    // IF admin, we also fetch admin notifications in a separate query or combine them.
    // However, since we can use 'in', let's do:
    const targetIds = [user.uid];
    if (profile.role === 'admin') targetIds.push('admin');
    
    return query(
      collection(db, 'notifications'), 
      where('userId', 'in', targetIds),
      orderBy('createdAt', 'desc')
    );
  }, [db, user?.uid, profile?.role]);

  const { data: notifications, isLoading } = useCollection(notificationsQuery);

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  const handleNotificationClick = async (notification: any) => {
    if (!db) return;
    
    if (!notification.read) {
      const nRef = doc(db, 'notifications', notification.id);
      await updateDoc(nRef, { read: true });
    }

    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const markAllAsRead = async () => {
    if (!db || !notifications) return;
    const batch = writeBatch(db);
    notifications.filter((n: any) => !n.read).forEach((n: any) => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  if (!user || !profile) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100">
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-rose-500 text-white border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 rounded-2xl shadow-xl overflow-hidden border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
          <h3 className="font-bold text-slate-900 font-headline">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg">
              <Check className="h-3 w-3 mr-1" /> Marcar leídas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No tienes notificaciones nuevas.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif: any) => {
                const date = notif.createdAt?.toDate ? notif.createdAt.toDate() : new Date();
                const Icon = notif.type === 'success' ? CheckCircle2 : notif.type === 'alert' ? AlertCircle : Info;
                const iconColor = notif.type === 'success' ? 'text-emerald-500 bg-emerald-50' : notif.type === 'alert' ? 'text-rose-500 bg-rose-50' : 'text-primary bg-primary/10';
                
                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-primary/[0.02]' : ''}`}
                  >
                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex justify-between gap-2 items-start">
                        <p className={`text-sm leading-tight ${!notif.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 capitalize pt-1">
                        {formatDistanceToNow(date, { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
