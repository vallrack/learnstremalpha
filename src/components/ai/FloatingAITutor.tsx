
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, MessageSquare, X, Send, Loader2, Bot, User, Stars, MessageCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/use-translation';
import { askLessonQuestions } from '@/ai/flows/ask-lesson-questions';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function FloatingAITutor({ 
  lessonTitle, 
  lessonContent,
  isDisabled = false 
}: { 
  lessonTitle: string, 
  lessonContent: string,
  isDisabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (isDisabled || !input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await askLessonQuestions({
        question: input,
        lessonContent: lessonContent
      });
      
      if (result.success) {
        const aiResponse: Message = { 
          role: 'assistant', 
          content: result.data.answer
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result.error
        }]);
      }
    } catch (error) {
       console.error("AI Tutor Error:", error);
       setMessages(prev => [...prev, { role: 'assistant', content: "Lo siento, hubo un error al procesar tu duda." }]);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-[380px] h-[500px] rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-none overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 ring-1 ring-slate-200">
          <CardHeader className="bg-gradient-to-br from-indigo-600 via-primary to-blue-600 p-6 text-white pb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between mb-2 relative z-10">
               <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md shadow-inner">
                     <Stars className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-headline font-bold">{t.aiTutor.toggle}</CardTitle>
                    <p className="text-[9px] uppercase font-black tracking-widest opacity-80 flex items-center gap-1">
                      <Sparkles className="h-2 w-2" /> Powered by LearnStream AI
                    </p>
                  </div>
               </div>
               <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-9 w-9 text-white hover:bg-white/20 rounded-xl transition-colors">
                  <X className="h-5 w-5" />
               </Button>
            </div>
          </CardHeader>
          
          <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
             {isDisabled ? (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6 p-4">
                  <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center shadow-inner border border-amber-100">
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-headline font-bold text-slate-900 text-lg">Función Restringida</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      Tu academia actual no tiene habilitadas las herramientas de Inteligencia Artificial.
                    </p>
                  </div>
                  <Button variant="outline" className="rounded-2xl border-2 font-bold hover:bg-white" onClick={() => window.open('/register-academy', '_blank')}>
                    Saber más sobre el Plan Pro
                  </Button>
               </div>
             ) : messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-5 opacity-50 px-6">
                  <div className="bg-primary/5 p-5 rounded-[2rem]">
                    <Bot className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-[13px] font-bold text-slate-600 leading-relaxed italic">"{t.aiTutor.disclaimer}"</p>
               </div>
             ) : (
               messages.map((m, i) => (
                 <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-[14px] leading-relaxed shadow-sm ring-1 ring-slate-100 ${m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white rounded-tl-none text-slate-700'}`}>
                       {m.content}
                    </div>
                 </div>
               ))
             )}
             {isLoading && (
               <div className="flex justify-start">
                  <div className="bg-white border p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3 ring-1 ring-slate-100">
                     <Loader2 className="h-4 w-4 animate-spin text-primary" />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.aiTutor.thinking}</span>
                  </div>
               </div>
             )}
          </CardContent>

          {!isDisabled && (
            <CardFooter className="p-4 bg-white border-t">
              <div className="flex w-full gap-2 bg-slate-50 p-2 rounded-2xl border ring-1 ring-slate-100 shadow-inner group-focus-within:ring-primary/20 transition-all">
                  <Input 
                    placeholder={t.aiTutor.placeholder} 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="border-none bg-transparent focus-visible:ring-0 shadow-none text-sm placeholder:text-slate-400"
                  />
                  <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading} className="h-10 w-10 rounded-xl shrink-0 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                    <Send className="h-4 w-4" />
                  </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      <Button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-16 w-16 rounded-3xl shadow-2xl transition-all duration-500 flex items-center justify-center group ${isOpen ? 'bg-slate-900 border-4 border-white' : 'bg-gradient-to-tr from-indigo-600 to-primary scale-110'}`}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <div className="relative">
             <MessageCircle className="h-8 w-8 text-white transition-transform group-hover:scale-110" />
             <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        )}
      </Button>
    </div>
  );
}
