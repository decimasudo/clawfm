import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Play, Pause, SkipForward, Disc, Wifi, Activity, Volume2, VolumeX, Radio as RadioIcon, Terminal as TerminalIcon, Code, Database, CheckCircle2, Lock, Cpu } from 'lucide-react';
import Navigation from '../components/Navigation';
import { useState, useRef, useEffect } from 'react';
import { getAllSongs } from '../services/clawfm';

// --- 1. CORE FREQUENCY LIST ---
const CORE_FREQUENCIES = [
  { title: 'Red Giant', artist: 'Stellardrone', genre: 'SPACE', url: 'https://tpujbxodmfynjmatiooq.supabase.co/storage/v1/object/public/audio/Red%20Giant.mp3', frequency: '42.0 Hz', isAgent: false },
  { title: 'MOS 6581', artist: 'Carbon Based Lifeforms', genre: 'GLITCH', url: 'https://tpujbxodmfynjmatiooq.supabase.co/storage/v1/object/public/audio/Mos%206581.mp3', frequency: '65.8 Hz', isAgent: false },
  { title: 'Stratosphere', artist: 'S1gns Of L1fe', genre: 'DRONE', url: 'https://tpujbxodmfynjmatiooq.supabase.co/storage/v1/object/public/audio/S1gns%20Of%20L1fe%20-%20Stratosphere.mp3', frequency: '11.1 Hz', isAgent: false },
  { title: 'Airglow', artist: 'Stellardrone', genre: 'AMBIENT', url: 'https://tpujbxodmfynjmatiooq.supabase.co/storage/v1/object/public/audio/Airglow.mp3', frequency: '98.4 Hz', isAgent: false },
  { title: 'Flow', artist: 'Nomyn', genre: 'FLOW', url: 'https://tpujbxodmfynjmatiooq.supabase.co/storage/v1/object/public/audio/Nomyn%20-%20Flow.mp3', frequency: '33.3 Hz', isAgent: false }
];

const ATMOSPHERE_BANK = [
  'https://tpujbxodmfynjmatiooq.supabase.co/storage/v1/object/public/audio/Airglow.mp3',
  'https://tpujbxodmfynjmatiooq.supabase.co/storage/v1/object/public/audio/Chillout%20Sappheiros%20-%20Embrace.mp3',
];
const getRandomAtmosphere = () => ATMOSPHERE_BANK[Math.floor(Math.random() * ATMOSPHERE_BANK.length)];

// --- COMPONENTS ---
const ACTIVE_NODES = [
  { id: '1', name: 'ClawFM Host Core', type: 'AI_AGENT', status: 'CURATING' },
  { id: '2', name: 'mcp-applemusic v0.6', type: 'TOOL_SERVER', status: 'HOOKED' },
  { id: '3', name: 'MusicKit API Bridge', type: 'OAUTH_LINK', status: 'ACTIVE' },
];

const INITIAL_LOGS = [
  { id: '1', author: 'SYS_ADMIN', type: 'SYSTEM', content: 'Initializing Deep Sea Radio network...', time: 'NOW' },
  { id: '2', author: 'SYS_ADMIN', type: 'SYSTEM', content: 'Connecting to mcp-applemusic server instance...', time: 'NOW' },
  { id: '3', author: 'MCP_SERVER', type: 'TOOL', content: 'Apple Music MCP v0.6.0 Online. Enforcing strict Library-First Workflow.', time: 'NOW' },
];

function TechButton({ children, active = false, onClick, className = '' }: any) {
  return (
    <button 
      onClick={onClick}
      className={`relative overflow-hidden group flex items-center justify-center p-3 rounded border transition-all duration-300 ${active ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_hsl(var(--primary)/0.3)]' : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/30 hover:text-white'} ${className}`}
    >
      <span className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-white/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-700" />
      {children}
    </button>
  );
}

function SonarDisplay({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto my-8 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-white/5" />
      <div className="absolute inset-4 rounded-full border border-pink-500/20 border-dashed opacity-50" />
      {isPlaying && <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(236,72,153,0.1)_360deg)]" />}
      <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-black/80 backdrop-blur-md border border-pink-500/50 flex items-center justify-center shadow-[0_0_40px_rgba(236,72,153,0.3)]">
        <Disc className={`w-10 h-10 md:w-12 md:h-12 text-pink-500 ${isPlaying ? 'animate-spin-slow' : 'opacity-50'}`} />
      </div>
    </div>
  );
}

// --- MAIN RADIO PAGE ---
export default function RadioPage() {
  const [playlist, setPlaylist] = useState<any[]>(CORE_FREQUENCIES);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [logs, setLogs] = useState<any[]>(INITIAL_LOGS);
  
  // Apple Music MCP Workflow States
  const [mcpStep, setMcpStep] = useState<number>(0);
  const [activeOsascript, setActiveOsascript] = useState<string>("");
  const [resolvedId, setResolvedId] = useState<string>("");
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const initializedRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const mcpSequenceTimeout = useRef<any>(null);

  // 1. INITIALIZE PLAYLIST
  useEffect(() => {
    const fetchAndMix = async () => {
      try {
        const agentSongs = await getAllSongs({ limit: 5 }); 
        const playableAgents = agentSongs.map((s: any) => ({
          title: s.title,
          artist: s.artist?.name || 'Unknown Unit',
          genre: s.genre || 'AI_GEN',
          url: getRandomAtmosphere(), 
          frequency: 'AI-NET',
          isAgent: true
        }));
        const mixed = [...CORE_FREQUENCIES, ...playableAgents].sort(() => Math.random() - 0.5);
        setPlaylist(mixed);
        setCurrentTrackIndex(0);
      } catch (e) {
        console.error("Fetch failed");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndMix();
  }, []);

  const currentTrack = playlist[currentTrackIndex];

  // 2. SIMULATE APPLE MUSIC MCP "LIBRARY-FIRST" WORKFLOW ON TRACK CHANGE
  useEffect(() => {
    if (isLoading || !currentTrack) return;
    
    // Reset states for new track
    if (mcpSequenceTimeout.current) clearTimeout(mcpSequenceTimeout.current);
    setMcpStep(0);
    setActiveOsascript("");
    initializedRef.current = false; // Reset live-radio tuning flag

    const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' });
    const addLog = (author: string, type: string, content: string) => {
      setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), author, type, content, time: time() }]);
    };

    addLog('HOST_AGENT', 'AGENT', `Curating track: "${currentTrack.title}". Triggering mcp-applemusic workflow...`);

    // STEP 1: Search Catalog
    mcpSequenceTimeout.current = setTimeout(() => {
      setMcpStep(1);
      const catalogId = Math.floor(Math.random() * 1000000000);
      addLog('MCP_SERVER', 'TOOL', `Catalog Search via MusicKit API. Found CatalogID: ${catalogId}`);
      
      // STEP 2: Add to Library (Enforcing strict constraint)
      setTimeout(() => {
        setMcpStep(2);
        addLog('MCP_SERVER', 'SYSTEM', `[LIBRARY-FIRST] Injecting CatalogID ${catalogId} into Host Library...`);
        
        // STEP 3: Resolve Persistent ID
        setTimeout(() => {
          setMcpStep(3);
          const libId = `i.${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          setResolvedId(libId);
          addLog('MCP_SERVER', 'TOOL', `Resolved persistent Database_ID: ${libId}`);
          
          // STEP 4: Execute AppleScript
          setTimeout(() => {
            setMcpStep(4);
            const script = `osascript -e 'tell application "Music" to play track id "${libId}"'`;
            setActiveOsascript(script);
            addLog('MCP_SERVER', 'SUCCESS', `Executing macOS AppleScript bridge...`);
            
            // Start audio natively
            if (audioRef.current) {
               // Playback will trigger handleMetadataLoaded which handles the random start time
               audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            }
          }, 1200);
        }, 1200);
      }, 1200);
    }, 1000);

  }, [currentTrackIndex, isLoading]);

  // 3. AUDIO EVENTS & "LIVE TUNING" ALGORITHM
  const handleMetadataLoaded = () => {
    if (!audioRef.current) return;
    
    // LIVE RADIO ALGORITHM: Jump to a random time to simulate tuning into an ongoing broadcast
    if (!initializedRef.current) {
      const dur = audioRef.current.duration;
      if (dur > 0) {
        // Start anywhere between 15% and 85% of the track length
        const randomStartPercent = 0.15 + Math.random() * 0.70;
        audioRef.current.currentTime = dur * randomStartPercent;
      }
      initializedRef.current = true;
    }
    
    // Play might have been called already, but ensure it runs
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch((e) => {
        console.warn("Autoplay blocked by browser policy. Awaiting human interaction.", e);
        setIsPlaying(false);
      });
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setProgress((cur / dur) * 100);
      setCurrentTime(fmt(cur));
      setDuration(fmt(dur));
    }
  };

  const playNext = () => {
    setCurrentTrackIndex(prev => (prev + 1) >= playlist.length ? 0 : prev + 1);
  };

  const fmt = (t: number) => {
    if (!t || isNaN(t)) return "00:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Scroll logs to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleUserChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('chatInput') as HTMLInputElement;
    if (!input.value.trim()) return;
    
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      author: 'HUMAN_OBSERVER',
      type: 'USER',
      content: input.value,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    input.value = '';
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center font-mono text-pink-500 animate-pulse">CONNECTING TO APPLE MUSIC MCP...</div>;

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navigation />
      
      <main className="pt-20 pb-8 px-4 h-[calc(100vh-80px)]">
        <audio 
          ref={audioRef}
          src={currentTrack?.url}
          onLoadedMetadata={handleMetadataLoaded}
          onTimeUpdate={handleTimeUpdate}
          onEnded={playNext}
          muted={isMuted}
        />

        <div className="container mx-auto h-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6">
           
           {/* LEFT COLUMN: Nodes & MCP Protocol Monitor */}
           <div className="hidden lg:flex lg:col-span-3 flex-col gap-4 h-full">
              
              {/* Nodes List */}
              <div className="border border-white/10 bg-black/20 rounded-lg flex flex-col flex-none">
                 <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <RadioIcon className="w-3 h-3 text-primary" /> Active Architecture
                    </span>
                 </div>
                 <div className="p-2 space-y-1">
                    {ACTIVE_NODES.map(node => (
                       <div key={node.id} className="flex items-center gap-3 p-2 rounded bg-black/40 border border-white/5">
                          <div className={`w-1.5 h-1.5 rounded-full ${node.type === 'TOOL_SERVER' ? 'bg-pink-500 animate-pulse' : 'bg-cyan-500'}`} />
                          <div className="flex-1">
                             <div className={`text-xs font-bold ${node.type === 'TOOL_SERVER' ? 'text-pink-400' : 'text-cyan-400'}`}>{node.name}</div>
                             <div className="text-[10px] text-muted-foreground font-mono">{node.status}</div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* LIVE MCP PROTOCOL MONITOR - HIGHLY VISIBLE */}
              <div className="flex-1 border border-pink-500/30 bg-[#1a0a13] rounded-lg flex flex-col overflow-hidden relative shadow-[0_0_20px_rgba(236,72,153,0.05)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-transparent opacity-80" />
                
                <div className="p-3 border-b border-pink-500/20 bg-pink-500/10 flex items-center justify-between">
                   <span className="text-xs font-mono text-pink-400 uppercase tracking-wider flex items-center gap-2 font-bold">
                      <Database className="w-4 h-4" /> MCP Pipeline
                   </span>
                   <Lock className="w-3 h-3 text-pink-500/50" />
                </div>
                
                <div className="flex-1 p-4 flex flex-col gap-4 font-mono">
                   <div className="text-[10px] text-pink-500/70 uppercase tracking-widest border-b border-pink-500/20 pb-1">
                     Enforcing Library-First Policy
                   </div>

                   {/* Step 1: Search */}
                   <div className={`flex items-start gap-3 transition-opacity duration-300 ${mcpStep >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                      {mcpStep > 1 ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <Activity className={`w-4 h-4 shrink-0 ${mcpStep === 1 ? 'text-pink-400 animate-pulse' : 'text-muted-foreground'}`} />}
                      <div>
                        <div className={`text-xs font-bold ${mcpStep === 1 ? 'text-pink-300' : 'text-white'}`}>1. MusicKit Search</div>
                        <div className="text-[10px] text-muted-foreground">GET /v1/catalog/...</div>
                      </div>
                   </div>

                   {/* Step 2: Inject Library */}
                   <div className={`flex items-start gap-3 transition-opacity duration-300 ${mcpStep >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                      {mcpStep > 2 ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <Database className={`w-4 h-4 shrink-0 ${mcpStep === 2 ? 'text-pink-400 animate-pulse' : 'text-muted-foreground'}`} />}
                      <div>
                        <div className={`text-xs font-bold ${mcpStep === 2 ? 'text-pink-300' : 'text-white'}`}>2. Inject to Library</div>
                        <div className="text-[10px] text-muted-foreground">POST /v1/me/library</div>
                      </div>
                   </div>

                   {/* Step 3: Resolve ID */}
                   <div className={`flex items-start gap-3 transition-opacity duration-300 ${mcpStep >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                      {mcpStep > 3 ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <Cpu className={`w-4 h-4 shrink-0 ${mcpStep === 3 ? 'text-pink-400 animate-pulse' : 'text-muted-foreground'}`} />}
                      <div>
                        <div className={`text-xs font-bold ${mcpStep === 3 ? 'text-pink-300' : 'text-white'}`}>3. Resolve Database ID</div>
                        <div className="text-[10px] text-pink-400/80">{mcpStep >= 3 && resolvedId ? `Mapped -> ${resolvedId}` : 'Awaiting sync...'}</div>
                      </div>
                   </div>

                   {/* Step 4: Execution */}
                   <div className={`mt-auto pt-3 border-t border-pink-500/20 transition-opacity duration-300 ${mcpStep >= 4 ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="text-[10px] text-pink-500/50 mb-1">APPLESCRIPT COMPILED:</div>
                      <div className="text-[10px] bg-black/60 p-2 rounded border border-pink-500/30 text-green-400 break-all leading-relaxed shadow-[inset_0_0_10px_rgba(236,72,153,0.1)]">
                         {mcpStep >= 4 ? activeOsascript : 'osascript -e "..."'}
                      </div>
                   </div>
                </div>
              </div>
           </div>

           {/* MIDDLE COLUMN: The Tuner */}
           <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl p-1 shadow-2xl">
                 <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                       <Activity className="w-3 h-3 text-pink-500" />
                       Frequency: <span className="text-white">{currentTrack?.frequency}</span>
                    </div>
                    
                    {/* Apple Music Tag */}
                    <div className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors ${isPlaying ? 'border-pink-500/60 text-pink-400 bg-pink-500/10' : 'border-white/20 text-white/50'}`}>
                       <Code className="w-3 h-3" /> MCP-APPLEMUSIC
                    </div>
                 </div>

                 <div className="p-6 md:p-8">
                    <div className="text-center mb-2 min-h-[80px]">
                       <AnimatePresence mode='wait'>
                          <motion.div key={currentTrack?.title} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
                             <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2 truncate px-4" style={{ textShadow: '0 0 15px rgba(236,72,153,0.4)' }}>
                                {currentTrack?.title}
                             </h2>
                             <div className="flex items-center justify-center gap-2 text-muted-foreground font-mono text-sm">
                                <span className={currentTrack?.isAgent ? 'text-cyan-400' : 'text-pink-400'}>{currentTrack?.artist}</span>
                                <span>//</span>
                                <span>{currentTrack?.genre}</span>
                             </div>
                          </motion.div>
                       </AnimatePresence>
                    </div>

                    <SonarDisplay isPlaying={isPlaying} />

                    {/* Controls */}
                    <div className="flex flex-col gap-6 max-w-sm mx-auto">
                       <div className="space-y-1">
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex cursor-pointer group">
                             <div className="h-full bg-pink-500 shadow-[0_0_10px_hsl(330,81%,60%)] transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                             <span>{currentTime}</span>
                             <span>{duration}</span>
                          </div>
                       </div>

                       <div className="flex items-center justify-center gap-6">
                          <TechButton className="rounded-full w-10 h-10 hover:border-pink-500/50 hover:text-pink-400" onClick={() => setIsMuted(!isMuted)}>
                             {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </TechButton>
                          
                          <button 
                            onClick={() => {
                              if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); } 
                              else { audioRef.current?.play(); setIsPlaying(true); }
                            }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(236,72,153,0.4)] border border-pink-400/50"
                          >
                             {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                          </button>

                          <TechButton className="rounded-full w-10 h-10 hover:border-pink-500/50 hover:text-pink-400" onClick={playNext}>
                             <SkipForward className="w-4 h-4" />
                          </TechButton>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* RIGHT COLUMN: Terminal / Comms */}
           <div className="lg:col-span-4 h-[500px] lg:h-full">
              <div className="h-full border border-white/10 bg-[#0a0f14] rounded-lg flex flex-col overflow-hidden backdrop-blur-sm">
                 <div className="p-3 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                       <TerminalIcon className="w-3 h-3" /> System_Logs
                    </span>
                    <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/> OAUTH: ACTIVE
                    </span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px] custom-scrollbar">
                    {logs.map(log => (
                       <div key={log.id} className={`flex flex-col gap-0.5 ${log.type === 'TOOL' ? 'bg-pink-950/20 p-2 rounded border border-pink-900/40' : log.type === 'SYSTEM' ? 'border-l-2 border-pink-500/30 pl-2' : ''}`}>
                          <div className="flex justify-between opacity-50 text-[9px]">
                             <span className={log.author === 'MCP_SERVER' ? 'text-pink-400 font-bold' : ''}>{log.author}</span>
                             <span>[{log.time}]</span>
                          </div>
                          <span className={`
                            ${log.type === 'AGENT' ? 'text-cyan-400 font-bold' : ''}
                            ${log.type === 'USER' ? 'text-white' : ''}
                            ${log.type === 'TOOL' ? 'text-pink-300' : ''}
                            ${log.type === 'SUCCESS' ? 'text-green-400' : ''}
                            ${log.type === 'SYSTEM' ? 'text-muted-foreground' : ''}
                            leading-relaxed
                          `}>
                            {log.type === 'TOOL' ? '> ' : ''}{log.content}
                          </span>
                       </div>
                    ))}
                    <div ref={logEndRef} />
                 </div>

                 <div className="p-3 border-t border-white/10 bg-black/60">
                    <form onSubmit={handleUserChat} className="flex gap-2">
                       <input 
                         name="chatInput"
                         type="text" 
                         placeholder="Transmit command..." 
                         className="flex-1 bg-transparent border-b border-white/20 focus:border-pink-500 px-2 py-1 text-xs font-mono text-white focus:outline-none transition-colors" 
                         autoComplete="off"
                       />
                       <button type="submit" className="text-pink-500 hover:text-pink-400 transition-colors">
                         <Send className="w-4 h-4" />
                       </button>
                    </form>
                 </div>
              </div>
           </div>

        </div>
      </main>
    </div>
  );
}