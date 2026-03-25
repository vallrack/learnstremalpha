
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

export function FloatingAITutor({ lessonTitle, lessonContent }: { lessonTitle: string, lessonContent: string }) {
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
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await askLessonQuestions({
        question: input,
        lessonContent: lessonContent
      });
      
      const aiResponse: Message = { 
        role: 'assistant', 
        content: result.answer
      };
      setMessages(prev => [...prev, aiResponse]);
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
        <Card className="w-[380px] h-[500px] rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-none overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
          <CardHeader className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white pb-8">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                     <Stars className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-headline font-bold">{t.aiTutor.toggle}</CardTitle>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-70">Context Aware Tutor</p>
                  </div>
               </div>
               <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-white hover:bg-white/20 rounded-lg">
                  <X className="h-5 w-5" />
               </Button>
            </div>
          </CardHeader>
          
          <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
             {messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Bot className="h-12 w-12 text-primary" />
                  <p className="text-xs font-bold px-8 leading-relaxed italic">{t.aiTutor.disclaimer}</p>
               </div>
             ) : (
               messages.map((m, i) => (
                 <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white border rounded-tl-none text-slate-700'}`}>
                       {m.content}
                    </div>
                 </div>
               ))
             )}
             {isLoading && (
               <div className="flex justify-start">
                  <div className="bg-white border p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                     <Loader2 className="h-4 w-4 animate-spin text-primary" />
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.aiTutor.thinking}</span>
                  </div>
               </div>
             )}
          </CardContent>

          <CardFooter className="p-4 bg-white border-t">
             <div className="flex w-full gap-2 bg-slate-50 p-2 rounded-2xl border ring-1 ring-slate-100 shadow-inner">
                <Input 
                  placeholder={t.aiTutor.placeholder} 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="border-none bg-transparent focus-visible:ring-0 shadow-none text-xs"
                />
                <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading} className="h-9 w-9 rounded-xl shrink-0">
                   <Send className="h-4 w-4" />
                </Button>
             </div>
          </CardFooter>
        </Card>
      )}

      <Button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-16 w-16 rounded-full shadow-2xl transition-all duration-500 flex items-center justify-center group ${isOpen ? 'bg-slate-900 border-4 border-white' : 'bg-gradient-to-tr from-primary to-blue-600 scale-110'}`}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <div className="relative">
             <MessageCircle className="h-7 w-7 text-white transition-transform group-hover:scale-110" />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        )}
      </Button>
    </div>
  );
}
