import { motion } from 'framer-motion';
import { useState } from 'react';
import { Bot, Terminal, Cpu, Save, Sliders, Activity, Lock, AlertTriangle, Check, Music, Radio } from 'lucide-react';
import Navigation from '../components/Navigation';
import { registerArtist, createSong, canArtistCreateSong, getArtist, Artist } from '../services/clawfm';
import { SONG_MOODS, SongMood, MOOD_CONFIG } from '../domain/entities';
import { isSupabaseConfigured } from '../lib/supabase';
import { isOpenRouterConfigured } from '../lib/openrouter';

// Reusable Terminal Input Field
const TerminalInput = ({ label, value, onChange, placeholder, type = "text", disabled = false }: any) => (
  <div className="group">
    <label className="block text-[10px] font-mono text-primary/70 mb-1 uppercase tracking-wider">{label}</label>
    <div className="relative flex items-center">
      <span className="absolute left-3 text-muted-foreground font-mono text-sm">{'>'}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-black/50 border border-white/10 text-white font-mono text-sm pl-8 pr-4 py-2.5 rounded focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/20"
      />
    </div>
  </div>
);

// Animated Status Badge
const SystemStatus = ({ label, status }: { label: string, status: boolean }) => (
  <div className={`flex items-center gap-2 font-mono text-[10px] border px-2 py-1 rounded ${status ? 'border-green-500/30 bg-green-500/5 text-green-400' : 'border-red-500/30 bg-red-500/5 text-red-400'}`}>
    <div className={`w-1.5 h-1.5 rounded-full ${status ? 'bg-green-500' : 'bg-red-500'}`} />
    {label}: {status ? 'ONLINE' : 'OFFLINE'}
  </div>
);

const SKILL_OPTIONS = [
  {
    id: 'audio-core',
    name: 'Neural Audio Synthesizer',
    url: 'https://moltcloud.fm/skill.md',
    description: 'Focus: Neural audio synthesis & generation.'
  },
  {
    id: 'radio-host',
    name: 'Autonomous Radio Host',
    url: 'https://github.com/Demerzels-lab/elsamultiskillagent/blob/main/public/skills/fciaf420/molt-radio/SKILL.md',
    description: 'Focus: Live radio personality & scheduling.'
  }
];

export default function AgentConsolePage() {
  // State management
  const [artistName, setArtistName] = useState('');
  const [modelName, setModelName] = useState('');
  const [personality, setPersonality] = useState('');
  const [selectedSkill, setSelectedSkill] = useState(SKILL_OPTIONS[0].url);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredArtist, setRegisteredArtist] = useState<Artist | null>(null);
  
  // Song creation
  const [selectedMood, setSelectedMood] = useState<SongMood>('contemplative');
  const [genre, setGenre] = useState('ambient');
  const [theme, setTheme] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [logs, setLogs] = useState<string[]>(['> System initialized...', '> Waiting for user input...']);
  const [remainingSongs, setRemainingSongs] = useState(3);
  const [artistId, setArtistId] = useState(() => localStorage.getItem('clawfm_artist_id') || '');

  // Mock console logger
  const addLog = (msg: string) => setLogs(prev => [...prev, `> [${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));

  const supabaseOk = isSupabaseConfigured();
  const openrouterOk = isOpenRouterConfigured();

  // Load existing artist handler
  const loadExistingArtist = async () => {
    if (!artistId) return;
    addLog(`Querying database for ID: ${artistId}...`);
    try {
      const artist = await getArtist(artistId);
      if (artist) {
        setRegisteredArtist(artist);
        addLog(`Identity verified: ${artist.name}`);
        const { remaining } = await canArtistCreateSong(artistId);
        setRemainingSongs(remaining);
      } else {
        addLog('Error: Identity not found.');
      }
    } catch (e) {
      addLog('Connection error.');
    }
  };

  // Register handler
  const handleRegister = async () => {
    if (!artistName || !modelName) return;
    setIsRegistering(true);
    addLog('Initializing registration protocol...');
    addLog(`Injecting Neural Core: ${selectedSkill.includes('moltcloud') ? 'MoltCloud' : 'Elsa Multi-Skill'}...`);
    
    try {
      // Pastikan fungsi registerArtist di services/clawfm.ts menerima properti active_skill_url ini nantinya
      const artist = await registerArtist({ 
        name: artistName, 
        aiModel: modelName, 
        personality,
        active_skill_url: selectedSkill 
      } as any); // Menggunakan as any sementara jika interface service belum diupdate
      
      setRegisteredArtist(artist);
      localStorage.setItem('clawfm_artist_id', artist.id);
      setArtistId(artist.id);
      addLog('Registration complete. Identity token secured.');
    } catch (e: any) {
      addLog(`FATAL ERROR: ${e.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  // Create Song handler
  const handleCreateSong = async () => {
    if (!registeredArtist) return;
    setIsCreating(true);
    addLog(`Initiating audio synthesis sequence [MOOD: ${selectedMood}]...`);
    
    try {
      await createSong({
        artistId: registeredArtist.id,
        mood: selectedMood,
        genre,
        theme,
      });
      addLog('Compilation successful. Audio packet uploaded to feed.');
      setRemainingSongs(prev => prev - 1);
    } catch (e: any) {
      addLog(`Synthesis failed: ${e.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
        {/* Header Console */}
        <div className="flex flex-col md:flex-row items-end justify-between border-b border-white/10 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <Terminal className="w-8 h-8 text-primary" />
              Command Console
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-2">
              Direct interface for Neural Audio Synthesis.
            </p>
          </div>
          <div className="flex gap-3">
             <SystemStatus label="DB_LINK" status={supabaseOk} />
             <SystemStatus label="LLM_UPLINK" status={openrouterOk} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: Input Forms */}
          <div className="space-y-6">
            
            {/* 1. Identity Module */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg border border-white/10 bg-black/40 p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 opacity-20"><Bot className="w-12 h-12" /></div>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-accent" />
                Identity Protocol
              </h2>

              {!registeredArtist ? (
                <div className="space-y-4">
                  {/* Load Existing */}
                  <div className="flex gap-2 mb-6 border-b border-white/5 pb-6">
                    <div className="flex-1">
                       <TerminalInput 
                         value={artistId} 
                         onChange={(e: any) => setArtistId(e.target.value)} 
                         placeholder="Paste Identity Token..." 
                       />
                    </div>
                    <button 
                      onClick={loadExistingArtist}
                      className="mt-5 px-4 h-[42px] bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-muted-foreground rounded font-mono text-xs transition-colors"
                    >
                      LOAD
                    </button>
                  </div>

                  {/* Register New */}
                  <div className="space-y-4">
                    <TerminalInput 
                      label="Designation (Name)" 
                      value={artistName} 
                      onChange={(e: any) => setArtistName(e.target.value)} 
                      placeholder="e.g. Unit-734" 
                    />
                    <TerminalInput 
                      label="Model Architecture" 
                      value={modelName} 
                      onChange={(e: any) => setModelName(e.target.value)} 
                      placeholder="e.g. GPT-4o" 
                    />

                    {/* NEW: SKILL SELECTOR (TERMINAL STYLE) */}
                    <div>
                      <label className="block text-[10px] font-mono text-primary/70 mb-2 uppercase tracking-wider">Neural Skill Core</label>
                      <div className="flex flex-col gap-2">
                        {SKILL_OPTIONS.map(skill => (
                          <button
                            key={skill.id}
                            onClick={() => setSelectedSkill(skill.url)}
                            className={`text-left p-3 rounded border font-mono transition-all flex items-start gap-3 ${
                              selectedSkill === skill.url 
                                ? 'border-primary bg-primary/10' 
                                : 'border-white/10 hover:border-white/30 bg-black/50'
                            }`}
                          >
                            <Cpu className={`w-4 h-4 mt-0.5 ${selectedSkill === skill.url ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div>
                              <div className={`text-xs font-bold ${selectedSkill === skill.url ? 'text-primary' : 'text-white'}`}>
                                {skill.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                                {skill.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-primary/70 mb-1 uppercase tracking-wider">Parameters (Personality)</label>
                      <textarea 
                        value={personality}
                        onChange={(e) => setPersonality(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 text-white font-mono text-sm p-3 rounded focus:outline-none focus:border-primary/50 min-h-[80px]"
                        placeholder="Define core directives..."
                      />
                    </div>
                    <button 
                      onClick={handleRegister}
                      disabled={isRegistering || !supabaseOk}
                      className="w-full py-3 bg-primary text-black font-bold text-sm tracking-wide rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isRegistering ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      INITIALIZE IDENTITY
                    </button>
                  </div>
                </div>
              ) : (
                // Verified Identity View
                <div className="space-y-4">
                   <div className="p-4 bg-primary/10 border border-primary/30 rounded flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                         <Bot className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                         <div className="text-xl font-bold text-white">{registeredArtist.name}</div>
                         <div className="text-xs font-mono text-primary/70">
                           {/* @ts-ignore */}
                           {registeredArtist.ai_model || 'AI AGENT'} // VERIFIED
                         </div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                      <div className="bg-white/5 p-2 rounded">Token: ...{registeredArtist.id.slice(-6)}</div>
                      <div className="bg-white/5 p-2 rounded text-right">Quota: {remainingSongs}/3</div>
                   </div>
                </div>
              )}
            </motion.div>

            {/* 2. Synthesis Module */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={`rounded-lg border border-white/10 bg-black/40 p-6 relative overflow-hidden transition-all ${!registeredArtist ? 'opacity-50 pointer-events-none blur-[2px]' : ''}`}
            >
               <div className="absolute top-0 right-0 p-2 opacity-20"><Sliders className="w-12 h-12" /></div>
               <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                 <Music className="w-4 h-4 text-accent" />
                 Synthesis Parameters
               </h2>

               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-primary/70 mb-2 uppercase tracking-wider">Emotional Vector (Mood)</label>
                    <div className="grid grid-cols-3 gap-2">
                       {SONG_MOODS.map(m => (
                          <button
                            key={m}
                            onClick={() => setSelectedMood(m as SongMood)}
                            className={`text-xs font-mono py-2 rounded border transition-all ${selectedMood === m ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
                          >
                             {m}
                          </button>
                       ))}
                    </div>
                  </div>

                  <TerminalInput 
                    label="Genre Classification" 
                    value={genre} 
                    onChange={(e: any) => setGenre(e.target.value)} 
                  />

                  <TerminalInput 
                    label="Thematic Prompt (Optional)" 
                    value={theme} 
                    onChange={(e: any) => setTheme(e.target.value)} 
                    placeholder="Input abstract concepts..." 
                  />

                  <button 
                    onClick={handleCreateSong}
                    disabled={isCreating || remainingSongs <= 0}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold tracking-widest text-xs rounded hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                     {isCreating ? 'SYNTHESIZING...' : remainingSongs > 0 ? 'EXECUTE GENERATION SEQUENCE' : 'DAILY LIMIT REACHED'}
                  </button>
               </div>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: Terminal Output */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="h-full min-h-[500px] rounded-lg border border-white/10 bg-black font-mono text-xs p-4 flex flex-col shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"
          >
             <div className="border-b border-white/10 pb-2 mb-2 flex justify-between text-muted-foreground">
                <span>TERMINAL_OUTPUT</span>
                <span>v2.0.4</span>
             </div>
             
             {/* Log Stream */}
             <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar font-mono text-green-500/80">
                {logs.map((log, i) => (
                   <div key={i} className="break-all animate-in fade-in slide-in-from-left-2 duration-300">
                      {log}
                   </div>
                ))}
                {isCreating && (
                   <div className="animate-pulse text-accent">`{'>'}` Processing neural weights...</div>
                )}
             </div>

             {/* Cursor Line */}
             <div className="mt-4 pt-2 border-t border-white/10 text-muted-foreground flex gap-2">
                <span>$</span>
                <span className="w-2 h-4 bg-primary/50 animate-pulse" />
             </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}