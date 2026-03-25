'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Loader2, 
  Play, 
  Square,
  MessageSquare,
  Sparkles,
  Globe,
  Settings,
  Cpu
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { mockInterview } from '@/ai/flows/mock-interview';

interface VoiceInterviewProps {
  role?: string;
  initialLanguage?: 'en' | 'es';
  onComplete?: (transcript: string) => void;
  instructions?: string;
  isPremiumChallenge?: boolean;
  isAdmin?: boolean;
}

export function VoiceInterview({ 
  role = 'Frontend Developer', 
  initialLanguage = 'es', 
  onComplete, 
  instructions = '', 
  isPremiumChallenge = false,
  isAdmin = false 
}: VoiceInterviewProps) {
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [language, setLanguage] = useState<'en' | 'es'>(initialLanguage);
  const [messages, setMessages] = useState<any[]>([]);
  const [transcript, setTranscript] = useState('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'puter' | 'gemini-direct'>('puter');
  const [puterModel, setPuterModel] = useState('claude-sonnet-4-6');
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language === 'en' ? 'en-US' : 'es-ES';

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const finalMessage = event.results[i][0].transcript;
              handleUserMessage(finalMessage);
            } else {
              currentTranscript += event.results[i][0].transcript;
            }
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech Recognition Error:', event.error);
          setIsListening(false);
        };
      }
      synthRef.current = window.speechSynthesis;
    }
  }, [language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcript]);

  const startInterview = async () => {
    setIsInterviewing(true);
    const initialGreeting = language === 'en' 
      ? `Hello! Ready to start? Tell me about yourself.` 
      : `¡Hola! ¿Listo para comenzar? Cuéntame sobre ti.`;
    
    setMessages([{ role: 'model', content: [{ text: initialGreeting }] }]);
    speak(initialGreeting);
  };

  const stopInterview = () => {
    setIsInterviewing(false);
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (synthRef.current) synthRef.current.cancel();

    // Trigger onComplete with the full conversation
    if (onComplete) {
       const fullTranscript = messages.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content[0].text}`).join('\n');
       onComplete(fullTranscript);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
      if (synthRef.current) synthRef.current.cancel();
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;
    
    synthRef.current.cancel();
    
    // Clean markdown symbols for a more natural speech
    const cleanText = text
      .replace(/\*\*/g, '') // bold
      .replace(/__/g, '')   // underline
      .replace(/#/g, '')    // headers
      .replace(/`/g, '')    // code
      .replace(/\[|\]/g, '') // brackets
      .replace(/\(|\)/g, ''); // parentheses (optional, but can help)

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'en' ? 'en-US' : 'es-ES';
    
    // Attempt to pick a natural voice if available
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find((v: any) => 
      v.lang.includes(language === 'en' ? 'en' : 'es') && (v.name.includes('Google') || v.name.includes('Natural'))
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Auto-start listening after AI finishes speaking
      toggleListening();
    };

    synthRef.current.speak(utterance);
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    // Stop listening while AI works
    recognitionRef.current?.stop();
    setIsListening(false);

    const newUserMessage = { role: 'user', content: [{ text }] };
    setMessages(prev => [...prev, newUserMessage]);
    setIsGenerating(true);

    console.log(`[VoiceInterview] Starting AI call with provider: ${aiProvider}`);

    try {
      let reply = '';
      if (aiProvider === 'gemini') {
        const response = await mockInterview({
          message: text,
          language,
          role,
          instructions,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        });
        reply = response.reply;
      } else if (aiProvider === 'gemini-direct') {
        const GEMINI_API_KEY = "AIzaSyDWPMrsqtbkmVD1Ck1Rduk44-TgPZY28Z0"; // WARNING: RECENTLY REPORTED AS LEAKED. PLEASE ROTATE.
        // Use 2.0-flash as requested by the user
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const systemPrompt = language === 'en' 
          ? `You are a world-class technical interviewer for a ${role} position. ${instructions}. Keep responses concise (max 3 sentences).` 
          : `Eres un entrevistador técnico experto para la posición de ${role}. ${instructions}. Mantén tus respuestas concisas (máximo 3 frases).`;

        // Match the user's working structure exactly: HISTORY MUST START WITH USER
        // We skip the first message if it's the 'model' greeting to ensure compliance.
        const historyGemini = messages
          .filter((m, idx) => !(idx === 0 && m.role === 'model'))
          .map(m => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.content[0].text }]
          }));
        
        // Add current message
        historyGemini.push({ role: 'user', parts: [{ text }] });

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: historyGemini,
            generationConfig: { maxOutputTokens: 512, temperature: 0.7, topP: 0.9 },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
          })
        });

        if (!res.ok) {
           const err = await res.json().catch(() => ({}));
           throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response content.";
      } else {
        // PUTER.JS INTEGRATION (v2 - No API keys or registrations required)
        const puter = (window as any).puter;
        if (!puter) throw new Error("Puter.js not loaded. Please check your internet connection and refresh.");
        
        // Premium Enforcement: If it's a premium challenge, require Puter Sign-in (Admins bypass this)
        const isSignedIn = await puter.auth.isSignedIn();
        if (isPremiumChallenge && !isSignedIn && !isAdmin) {
           throw new Error("Puter Authorization Required: This is a premium challenge. Please use the 'Sign In to Puter' button above to authorize AI usage with your Claude account.");
        }
        
        console.log(`[VoiceInterview] Puter session active: ${isSignedIn}`);

        const systemPrompt = language === 'en' 
          ? `You are a world-class technical interviewer for a ${role} position. ${instructions}. Keep responses concise (max 3 sentences).` 
          : `Eres un entrevistador técnico experto para la posición de ${role}. ${instructions}. Mantén tus respuestas concisas (máximo 3 frases).`;

        const puterMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content[0].text })),
          { role: 'user', content: text }
        ];

        // Map UI model names to Puter actual model strings (using direct value for v2)
        let actualModel = puterModel;
        
        const response = await puter.ai.chat(puterMessages, { model: actualModel });
        reply = response?.message?.content?.[0]?.text || response?.message?.content || "No response content from Puter.";
      }

      const aiResponse = { role: 'model', content: [{ text: reply }] };
      setMessages(prev => [...prev, aiResponse]);
      speak(reply);
    } catch (error: any) {
      console.error(`[VoiceInterview] Error with provider ${aiProvider}:`, error);
      const errorMsg = language === 'en' 
        ? `I'm sorry, I'm having trouble connecting (${aiProvider}: ${error.message || "Unknown error"}). Could you repeat that?` 
        : `Lo siento, tengo problemas de conexión (${aiProvider}: ${error.message || "Error desconocido"}). ¿Podrías repetirlo?`;
      setMessages(prev => [...prev, { role: 'model', content: [{ text: errorMsg }] }]);
      speak(language === 'en' ? "I'm sorry, I'm having trouble connecting." : "Lo siento, tengo problemas de conexión.");
    } finally {
      setIsGenerating(false);
      isProcessingRef.current = false;
    }
  };

  return (
    <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden max-w-4xl mx-auto">
      <CardHeader className="bg-slate-900 text-white p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-2 rounded-xl">
                 <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-2xl font-headline font-bold">Entrevista Premium con IA</CardTitle>
            </div>
            <CardDescription className="text-slate-400 font-medium">Practica tus habilidades de comunicación para: <span className="text-white font-bold">{role}</span></CardDescription>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl">
               <Globe className="h-4 w-4" />
               <select 
                 className="bg-transparent border-none outline-none font-bold text-xs cursor-pointer appearance-none"
                 value={language}
                 onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
                 disabled={isInterviewing}
               >
                 <option value="es" className="bg-slate-800">ES</option>
                 <option value="en" className="bg-slate-800">EN</option>
               </select>
             </Badge>

             <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl">
               <Settings className="h-4 w-4" />
               <select 
                 className="bg-transparent border-none outline-none font-bold text-xs cursor-pointer appearance-none"
                 value={aiProvider}
                 onChange={(e) => setAiProvider(e.target.value as any)}
                 disabled={isInterviewing}
               >
                 <option value="gemini" className="bg-slate-800">Gemini (Cloud)</option>
                 <option value="gemini-direct" className="bg-slate-800">Gemini (Direct)</option>
                 <option value="puter" className="bg-slate-800">Claude (Puter)</option>
               </select>
             </Badge>

              {aiProvider === 'puter' && !isAdmin && (
                <Button 
                 variant="outline" 
                 size="sm" 
                 className="h-9 px-4 rounded-xl border-indigo-700 bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                 onClick={() => (window as any).puter?.auth.signIn()}
                >
                  {isPremiumChallenge ? 'Link Puter Account' : 'Sign In to Puter'}
                </Button>
              )}
             {aiProvider === 'puter' && (
               <Badge variant="outline" className="border-indigo-700 bg-indigo-800 text-indigo-100 gap-2 h-9 px-4 rounded-xl">
                 <Cpu className="h-4 w-4" />
                 <select 
                   className="bg-transparent border-none outline-none font-bold text-[10px] cursor-pointer appearance-none"
                   value={puterModel}
                   onChange={(e) => setPuterModel(e.target.value)}
                   disabled={isInterviewing}
                 >
                   <option value="claude-sonnet-4-6" className="bg-indigo-800">Sonnet 4.6 (Puter v2)</option>
                   <option value="claude-3-7-sonnet" className="bg-indigo-800">3.7 Sonnet</option>
                   <option value="claude-3-5-sonnet" className="bg-indigo-800">3.5 Sonnet</option>
                   <option value="claude-opus-4-6" className="bg-indigo-800">Opus 4.6</option>
                   <option value="claude-haiku-4-5" className="bg-indigo-800">Haiku 4.5</option>
                   <option value="gpt-4o" className="bg-indigo-800">GPT-4o</option>
                 </select>
               </Badge>
             )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[500px]">
          {/* Interaction Area */}
          <div className="lg:col-span-2 p-8 flex flex-col justify-between border-r border-slate-100">
             <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                {/* Voice Visualizer Area */}
                <div className="relative flex items-center justify-center">
                   {/* Ring animations */}
                   {(isListening || isSpeaking || isGenerating) && (
                     <div className="absolute transition-all">
                        <div className={`absolute -inset-20 rounded-full border-2 border-primary/20 animate-ping duration-[3s] ${isGenerating ? 'border-purple-400' : ''}`} />
                        <div className={`absolute -inset-12 rounded-full border-4 border-primary/30 animate-pulse duration-[2s] ${isGenerating ? 'border-purple-300' : ''}`} />
                        <div className={`absolute -inset-6 rounded-full border-8 border-primary/40 animate-pulse duration-1000 ${isGenerating ? 'border-purple-200' : ''}`} />
                     </div>
                   )}
                   
                   <div className={`h-40 w-40 rounded-full flex items-center justify-center relative z-10 transition-all duration-500 shadow-2xl ${
                     isSpeaking ? 'bg-primary scale-110 shadow-primary/40' : 
                     isListening ? 'bg-rose-500 scale-110 shadow-rose-500/40' : 
                     isGenerating ? 'bg-purple-600 animate-bounce' :
                     'bg-slate-100'
                   }`}>
                      {isGenerating ? <Loader2 className="h-16 w-16 text-white animate-spin" /> : 
                       isSpeaking ? <Volume2 className="h-16 w-16 text-white animate-pulse" /> : 
                       isListening ? <Mic className="h-16 w-16 text-white animate-pulse" /> : 
                       <MicOff className="h-16 w-16 text-slate-400" />}
                   </div>
                </div>

                <div className="text-center space-y-4">
                   <h3 className="text-2xl font-headline font-bold text-slate-900">
                     {isGenerating ? (language === 'en' ? 'Preparing Question...' : 'Analizando...') :
                      isSpeaking ? (language === 'en' ? 'Interviewer Speaking' : 'Entrevistador Hablando') :
                      isListening ? (language === 'en' ? 'Listening to You...' : 'Escuchándote...') :
                      (language === 'en' ? 'Interview Paused' : 'Sesión en Pausa')}
                   </h3>
                   <p className="text-slate-500 font-medium max-w-sm mx-auto">
                     {isListening ? (transcript || (language === 'en' ? 'Keep talking...' : 'Cuéntame mas...')) : 
                      isInterviewing ? (language === 'en' ? 'Click the button below to respond.' : 'Presiona el botón para responder.') :
                      (language === 'en' ? 'Start your high-performance interview session.' : 'Comienza tu sesión de alta complejidad.')}
                    </p>
                    
                    {!isInterviewing && (
                      <div className="pt-4">
                        <Button 
                          onClick={startInterview} 
                          className="h-14 px-10 rounded-2xl bg-primary text-lg font-bold shadow-xl shadow-primary/30 gap-3 hover:scale-105 transition-transform"
                        >
                          <Play className="h-5 w-5 fill-current" />
                          {language === 'en' ? 'Start Mock Interview' : 'Comenzar Entrevista'}
                        </Button>
                      </div>
                    )}
                 </div>
             </div>

             <div className="flex items-center justify-center gap-4 pt-8">
               {isInterviewing && (
                 <>
                   <Button 
                     variant="outline" 
                     onClick={toggleListening}
                     disabled={isSpeaking || isGenerating}
                     className={`h-16 w-16 rounded-full shadow-lg transition-all ${
                       isListening ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white border-slate-200'
                     }`}
                   >
                     {isListening ? <Square className="h-6 w-6 fill-current" /> : <Mic className="h-6 w-6" />}
                   </Button>
                   <Button 
                     variant="ghost" 
                     onClick={stopInterview}
                     className="text-slate-400 font-bold hover:text-slate-900"
                   >
                     {language === 'en' ? 'End Session' : 'Finalizar Sesión'}
                   </Button>
                 </>
               )}
             </div>
          </div>

          {/* Transcript / Progress Sidebar */}
          <div className="bg-slate-50/50 p-6 flex flex-col">
             <div className="flex items-center gap-2 mb-6 text-slate-900 font-bold px-2">
                <MessageSquare className="h-4 w-4" />
                Audio Transcript
             </div>
             
             <div 
               ref={scrollRef}
               className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[400px]"
             >
                {messages.length === 0 && (
                  <div className="text-center pt-20 px-4 space-y-2 opacity-40">
                    <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Settings className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">No activity yet</p>
                    <p className="text-[10px] text-slate-400">Your conversation text will appear here.</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[100%] rounded-2xl p-4 text-xs font-medium leading-relaxed shadow-sm ${
                      m.role === 'user' 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      {m.content[0].text}
                    </div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 mt-1.5 px-1">
                      {m.role === 'user' ? 'You' : 'Interviewer'}
                    </span>
                  </div>
                ))}
                {transcript && (
                  <div className="flex flex-col items-end opacity-50">
                    <div className="max-w-[100%] rounded-2xl p-4 text-xs font-medium bg-slate-200 text-slate-600 rounded-tr-none italic">
                      {transcript}...
                    </div>
                  </div>
                )}
             </div>

             <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
                   <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">IA Tips</p>
                   <p className="text-[11px] text-indigo-700 leading-tight">
                     {language === 'en' 
                        ? 'Try using industry-specific keywords and maintain a confident tone.' 
                        : 'Usa palabras clave técnicas y mantén un tono seguro en tus respuestas.'}
                   </p>
                </div>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
