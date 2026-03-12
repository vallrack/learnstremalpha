"use client";

import { useState } from 'react';
import { askLessonQuestions } from '@/ai/flows/ask-lesson-questions';
import { summarizeLessonContent } from '@/ai/flows/summarize-lesson-content';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LessonAssistant({ lessonContent }: { lessonContent: string }) {
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  async function handleAsk() {
    if (!question.trim()) return;
    
    const userMsg = question;
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuestion('');
    setLoading(true);

    try {
      const { answer } = await askLessonQuestions({ 
        question: userMsg, 
        lessonContent 
      });
      setChat(prev => [...prev, { role: 'ai', text: answer }]);
    } catch (error) {
      setChat(prev => [...prev, { role: 'ai', text: "Lo siento, no pude procesar tu pregunta en este momento." }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const { summary } = await summarizeLessonContent({ lessonContent });
      setChat(prev => [...prev, { role: 'ai', text: `**Resumen de la lección:** ${summary}` }]);
    } catch (error) {
      setChat(prev => [...prev, { role: 'ai', text: "Lo siento, no pude generar el resumen." }]);
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <Card className="h-full flex flex-col border-none shadow-none bg-background/50 rounded-none border-l">
      <CardHeader className="border-b py-3 px-4">
        <CardTitle className="text-sm font-headline flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Asistente LearnStream
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {chat.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                  Pregúntame cualquier cosa sobre esta lección o solicita un resumen rápido.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSummarize}
                  disabled={summarizing}
                  className="gap-2 text-xs"
                >
                  {summarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Resumir Lección
                </Button>
              </div>
            )}
            {chat.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary' : 'bg-accent'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                </div>
                <div className={`p-3 rounded-lg text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border shadow-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="p-3 rounded-lg text-sm bg-card border shadow-sm flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-card">
          <div className="relative">
            <Textarea
              placeholder="Haz una pregunta sobre el tema..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              className="resize-none pr-10 min-h-[60px] text-xs"
            />
            <Button 
              size="icon" 
              variant="ghost" 
              className="absolute right-2 bottom-2 text-primary hover:bg-primary/10"
              onClick={handleAsk}
              disabled={loading || !question.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
