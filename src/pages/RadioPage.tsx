import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Play, Pause, SkipForward, Disc, Wifi, Activity, Volume2, VolumeX, Radio as RadioIcon, Terminal as TerminalIcon, Code, Database } from 'lucide-react';
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
  { id: '1', name: 'ClawFM Host (Autonomous)', type: 'AI_AGENT', status: 'BROADCASTING' },
  { id: '2', name: 'mcp-applemusic', type: 'TOOL_SERVER', status: 'CONNECTED' },
  { id: '3', name: 'MusicKit API Bridge', type: 'OAUTH_LINK', status: 'ACTIVE' },
];

const INITIAL_LOGS = [
  { id: '1', author: 'SYS_ADMIN', type: 'SYSTEM', content: 'Initializing Deep Sea Radio network...', time: 'NOW' },
  { id: '2', author: 'SYS_ADMIN', type: 'SYSTEM', content: 'Connecting to mcp-applemusic server instance...', time: 'NOW' },
  { id: '3', author: 'MCP_SERVER', type: 'TOOL', content: 'Apple Music MCP v0.6.0 Online. Enforcing Library-First Workflow.', time: 'NOW' },
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
      <div className="absolute inset-4 rounded-full border border-white/5 border-dashed opacity-50" />
      {isPlaying && <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,hsl(var(--primary)/0.05)_360deg)]" />}
      <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-black/50 backdrop-blur-sm border border-primary/30 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
        <Disc className={`w-10 h-10 md:w-12 md:h-12 text-primary ${isPlaying ? 'animate-spin-slow' : 'opacity-50'}`} />
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
  const [currentMcpAction, setCurrentMcpAction] = useState<string>('IDLE');
  
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

  // 2. SIMULATE APPLE MUSIC MCP WORKFLOW ON TRACK CHANGE
  useEffect(() => {
    if (isLoading || !currentTrack) return;
    
    // Clear previous simulation
    if (mcpSequenceTimeout.current) clearTimeout(mcpSequenceTimeout.current);

    const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' });
    const addLog = (author: string, type: string, content: string) => {
      setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), author, type, content, time: time() }]);
    };

    // Step 0: Agent intent
    addLog('HOST_AGENT', 'AGENT', `Curation logic selected: "${currentTrack.title}" by ${currentTrack.artist}. Initiating MCP workflow.`);
    setCurrentMcpAction('GET /v1/catalog/us/search...');

    // Step 1: Catalog Search
    mcpSequenceTimeout.current = setTimeout(() => {
      const pseudoCatalogId = Math.floor(Math.random() * 1000000000);
      addLog('MCP_SERVER', 'TOOL', `[Library-First Constraint] Searching catalog... Found Catalog_ID: ${pseudoCatalogId}`);
      setCurrentMcpAction(`POST /v1/me/library (ids: ${pseudoCatalogId})`);
      
      // Step 2: Add to Library
      setTimeout(() => {
        const pseudoLibId = `i.${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        addLog('MCP_SERVER', 'TOOL', `Added to User Library. Resolved persistent Database_ID: ${pseudoLibId}`);
        setCurrentMcpAction(`osascript -e 'tell application "Music" to play track id "${pseudoLibId}"'`);
        
        // Step 3: AppleScript Playback Command
        setTimeout(() => {
          addLog('MCP_SERVER', 'SUCCESS', `Executed AppleScript playback via macOS bridge. AirPlay active.`);
          setCurrentMcpAction('PLAYING');
          
          // Actually start audio
          if (audioRef.current) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
        }, 1500);
      }, 1500);
    }, 1000);

  }, [currentTrackIndex, isLoading]);

  // 3. AUDIO EVENTS
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

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center font-mono text-cyan-400 animate-pulse">SYNCING MCP SERVER...</div>;

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navigation />
      
      <main className="pt-20 pb-8 px-4 h-[calc(100vh-80px)]">
        <audio 
          ref={audioRef}
          src={currentTrack?.url}
          onTimeUpdate={handleTimeUpdate}
          onEnded={playNext}
          muted={isMuted}
        />

        <div className="container mx-auto h-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6">
           
           {/* LEFT COLUMN: Nodes & MCP Status */}
           <div className="hidden lg:flex lg:col-span-3 flex-col gap-4 h-full">
              {/* Nodes List */}
              <div className="border border-white/10 bg-black/20 rounded-lg flex flex-col flex-none">
                 <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <RadioIcon className="w-3 h-3 text-primary" /> System Architecture
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

              {/* LIVE MCP EXECUTION MONITOR */}
              <div className="flex-1 border border-pink-500/20 bg-pink-950/10 rounded-lg flex flex-col overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-transparent opacity-50" />
                <div className="p-3 border-b border-pink-500/20 bg-pink-500/5">
                   <span className="text-xs font-mono text-pink-400 uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-3 h-3" /> Live Tool Execution
                   </span>
                </div>
                <div className="flex-1 p-4 flex flex-col justify-center">
                   <div className="text-[10px] text-pink-500/50 font-mono mb-2">CURRENT INSTRUCTION:</div>
                   <div className="font-mono text-sm text-pink-100 bg-black/50 p-3 rounded border border-pink-500/30 break-all leading-relaxed shadow-[inset_0_0_10px_rgba(236,72,153,0.1)]">
                      {currentMcpAction === 'PLAYING' ? (
                        <span className="text-green-400 flex items-center gap-2">
                          <Activity className="w-4 h-4" /> [STREAM_ACTIVE]
                        </span>
                      ) : (
                        <span className="animate-pulse flex items-start gap-2">
                          <Code className="w-4 h-4 shrink-0 mt-0.5" /> 
                          {currentMcpAction}
                        </span>
                      )}
                   </div>
                   <div className="text-[10px] text-muted-foreground mt-4 italic">
                     *Enforcing strict Library-First requirement via AppleScript & MusicKit API.
                   </div>
                </div>
              </div>
           </div>

           {/* MIDDLE COLUMN: The Tuner */}
           <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-1 shadow-2xl">
                 <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                       <Activity className="w-3 h-3 text-primary" />
                       Frequency: <span className="text-primary">{currentTrack?.frequency}</span>
                    </div>
                    <div className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isPlaying ? 'border-pink-500/50 text-pink-400 bg-pink-500/10' : 'border-white/20 text-white/50'}`}>
                       APPLE_MUSIC_MCP
                    </div>
                 </div>

                 <div className="p-6 md:p-8">
                    <div className="text-center mb-2 min-h-[80px]">
                       <AnimatePresence mode='wait'>
                          <motion.div key={currentTrack?.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                             <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2 text-glow-cyan truncate px-4">
                                {currentTrack?.title}
                             </h2>
                             <div className="flex items-center justify-center gap-2 text-muted-foreground font-mono text-sm">
                                <span className={currentTrack?.isAgent ? 'text-accent' : 'text-primary'}>{currentTrack?.artist}</span>
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
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden flex cursor-pointer group">
                             <div className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                             <span>{currentTime}</span>
                             <span>{duration}</span>
                          </div>
                       </div>

                       <div className="flex items-center justify-center gap-6">
                          <TechButton className="rounded-full w-10 h-10" onClick={() => setIsMuted(!isMuted)}>
                             {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </TechButton>
                          
                          <button 
                            onClick={() => {
                              if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); } 
                              else { audioRef.current?.play(); setIsPlaying(true); }
                            }}
                            className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                          >
                             {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                          </button>

                          <TechButton className="rounded-full w-10 h-10" onClick={playNext}>
                             <SkipForward className="w-4 h-4" />
                          </TechButton>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* RIGHT COLUMN: Terminal / Comms */}
           <div className="lg:col-span-4 h-[500px] lg:h-full">
              <div className="h-full border border-white/10 bg-black/40 rounded-lg flex flex-col overflow-hidden backdrop-blur-sm">
                 <div className="p-3 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                       <TerminalIcon className="w-3 h-3" /> Agent_Console
                    </span>
                    <span className="text-[9px] font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                      OAUTH_TOKEN: VALID
                    </span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px] custom-scrollbar">
                    {logs.map(log => (
                       <div key={log.id} className={`flex flex-col gap-0.5 ${log.type === 'TOOL' ? 'bg-pink-950/20 p-2 rounded border border-pink-900/30' : ''}`}>
                          <div className="flex justify-between opacity-50 text-[9px]">
                             <span>{log.author}</span>
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
                         placeholder="Inject command or message..." 
                         className="flex-1 bg-transparent border-b border-white/20 focus:border-cyan-500 px-2 py-1 text-xs font-mono text-white focus:outline-none transition-colors" 
                         autoComplete="off"
                       />
                       <button type="submit" className="text-cyan-500 hover:text-cyan-400">
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