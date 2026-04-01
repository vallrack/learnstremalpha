'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Download, 
  Lock,
  Loader2,
  Clock,
  FastForward,
  Rewind
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface PodcastPlayerProps {
  podcast: any;
  hasAccess: boolean;
  onPurchaseClick?: () => void;
}

export function PodcastPlayer({ podcast, hasAccess, onPurchaseClick }: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const isLocked = !hasAccess && !podcast.isFree;
  const getSourceType = () => {
    if (podcast.sourceType) return podcast.sourceType;
    const url = podcast.audioUrl?.toLowerCase() || '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('anchor.fm') || url.includes('spotify.com')) return 'anchor';
    return 'url';
  };

  const sourceType = getSourceType();
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Autoplay/Playback blocked:", error);
          setIsPlaying(false);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const getEmbedUrl = (url: string, type: string) => {
    if (!url) return '';
    if (type === 'youtube') {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    if (type === 'anchor' || url.includes('spotify.com') || url.includes('anchor.fm')) {
        if (url.includes('embed')) return url;
        // Spotify: open.spotify.com/episode/... -> open.spotify.com/embed/episode/...
        // Anchor: anchor.fm/.../episodes/... -> anchor.fm/.../embed/episodes/...
        return url
            .replace('open.spotify.com/episode/', 'open.spotify.com/embed/episode/')
            .replace('/episodes/', '/embed/episodes/');
    }
    return url;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const skipTime = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const handleDownload = () => {
    if (isLocked) {
      toast({ 
        title: "Contenido Premium", 
        description: "Debes adquirir este podcast o tener una suscripción para descargarlo.", 
        variant: "destructive" 
      });
      if (onPurchaseClick) onPurchaseClick();
      return;
    }

    if (sourceType !== 'pc' && sourceType !== 'url') {
        toast({ 
            title: "Descarga no disponible", 
            description: "Esta fuente externa no permite descarga directa. Puedes escucharlo en su plataforma original.", 
            variant: "destructive" 
        });
        return;
    }

    if (podcast.audioUrl) {
      const link = document.createElement('a');
      link.href = podcast.audioUrl;
      link.download = `${podcast.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Iniciando descarga", description: "Tu podcast estará listo en breve." });
    }
  };

  return (
    <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl overflow-hidden max-w-4xl mx-auto w-full group transition-all duration-700 hover:shadow-primary/10">
      
      {/* Premium Lock Overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 text-white">
            <div className="bg-amber-500 p-6 rounded-[2.5rem] mb-6 shadow-2xl shadow-amber-500/20 animate-bounce">
                <Lock className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-3xl font-headline font-bold mb-4">Contenido Premium</h3>
            <p className="text-slate-400 max-w-md mb-8">
                Este episodio es exclusivo para miembros PRO o compradores individuales. ¡Desbloquéalo para acceder a todo el conocimiento!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={onPurchaseClick} className="rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 font-bold text-lg">
                    Adquirir Ahora
                </Button>
                <Link href="/register?plan=pro">
                    <Button variant="outline" className="rounded-2xl h-14 px-8 border-white/20 hover:bg-white/10 text-white font-bold text-lg">
                        Ver Suscripciones
                    </Button>
                </Link>
            </div>
        </div>
      )}

      {/* Media Content */}
      <div className="p-10">
        {(sourceType === 'youtube' && !isLocked) ? (
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <Badge variant="outline" className="rounded-lg border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase py-0 px-2 h-5">
                        YouTube {podcast.category && `• ${podcast.category}`}
                    </Badge>
                </div>
                <div className="w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-50 bg-slate-100">
                    <iframe 
                        src={getEmbedUrl(podcast.audioUrl, 'youtube')}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
                <div className="pt-4">
                    <h2 className="text-3xl font-headline font-bold text-slate-900 mb-2">{podcast.title}</h2>
                    <p className="text-muted-foreground text-sm line-clamp-3">{podcast.description}</p>
                </div>
            </div>
        ) : (sourceType === 'anchor' && !isLocked) ? (
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <Badge variant="outline" className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase py-0 px-2 h-5">
                        Spotify / Anchor {podcast.category && `• ${podcast.category}`}
                    </Badge>
                </div>
                <div className="w-full h-[161px] rounded-[2rem] overflow-hidden shadow-lg border-2 border-slate-50 bg-slate-50">
                    <iframe 
                        src={getEmbedUrl(podcast.audioUrl, 'anchor')}
                        className="w-full h-full"
                        frameBorder="0"
                        scrolling="no"
                    />
                </div>
                <div className="pt-4">
                    <h2 className="text-3xl font-headline font-bold text-slate-900 mb-2">{podcast.title}</h2>
                    <p className="text-muted-foreground text-sm line-clamp-3">{podcast.description}</p>
                </div>
            </div>
        ) : (
            <div className="flex flex-col md:flex-row gap-10 items-center">
                <audio 
                    ref={audioRef} 
                    src={isLocked ? '' : podcast.audioUrl} 
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onWaiting={() => setIsBuffering(true)}
                    onCanPlay={() => setIsBuffering(false)}
                    onEnded={() => setIsPlaying(false)}
                />

                {/* Cover Image/Icon */}
                <div className="w-48 h-48 rounded-[2.5rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-xl relative overflow-hidden group-hover:scale-105 transition-transform duration-500 shrink-0">
                    {podcast.thumbnailUrl ? (
                        <img src={podcast.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-white">
                            <Music4 className="h-16 w-16 opacity-50" />
                            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Podcast</span>
                        </div>
                    )}
                    {isBuffering && (
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-white animate-spin" />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex-1 w-full space-y-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="rounded-lg border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase py-0 px-2 h-5">
                                {podcast.category || 'General'}
                            </Badge>
                        </div>
                        <h2 className="text-3xl font-headline font-bold text-slate-900 mb-2">{podcast.title}</h2>
                        <p className="text-muted-foreground text-sm line-clamp-2">{podcast.description}</p>
                    </div>

                    <div className="space-y-3">
                        <Slider 
                            value={[currentTime]} 
                            max={duration || 100} 
                            step={1} 
                            onValueChange={handleSeek}
                            className="cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => skipTime(-15)} className="text-slate-400 hover:text-primary rounded-full hover:bg-primary/5 h-10 w-10">
                                <RotateCcw className="h-5 w-5" />
                            </Button>
                            <Button 
                                onClick={togglePlay} 
                                className="h-16 w-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all hover:scale-110 active:scale-95"
                            >
                                {isPlaying ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => skipTime(15)} className="text-slate-400 hover:text-primary rounded-full hover:bg-primary/5 h-10 w-10">
                                <RotateCw className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border">
                                {[1, 1.25, 1.5, 2].map(rate => (
                                    <button 
                                        key={rate} 
                                        onClick={() => setPlaybackRate(rate)}
                                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${playbackRate === rate ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {rate}x
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="text-slate-400 h-9 w-9">
                                    {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                </Button>
                                <div className="w-20 hidden sm:block">
                                    <Slider value={[isMuted ? 0 : volume]} max={100} onValueChange={(v) => { setVolume(v[0]); if(v[0]>0) setIsMuted(false); }} />
                                </div>
                            </div>

                            <Button 
                                onClick={handleDownload}
                                className={`h-12 w-12 rounded-2xl transition-all ${isLocked ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'}`}
                            >
                                {isLocked ? <Lock className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

function Music4(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
