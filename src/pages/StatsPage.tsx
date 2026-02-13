import { motion } from 'framer-motion';
import { Activity, Server, Users, BarChart3, Globe, Cpu } from 'lucide-react';
import Navigation from '../components/Navigation';

// Helper: A simple CSS Bar Chart
const BarChart = ({ data }: { data: number[] }) => (
  <div className="flex items-end gap-1 h-32 w-full mt-4">
    {data.map((h, i) => (
      <div key={i} className="flex-1 bg-white/5 hover:bg-primary/50 transition-colors rounded-t-sm relative group">
        <div 
           className="absolute bottom-0 w-full bg-primary/20 group-hover:bg-primary duration-500 ease-out" 
           style={{ height: `${h}%` }} 
        />
      </div>
    ))}
  </div>
);

// Helper: Stat Card
const StatCard = ({ title, value, sub, icon: Icon, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-card border border-white/5 p-6 rounded-lg relative overflow-hidden group hover:border-primary/30 transition-all"
  >
     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-16 h-16" />
     </div>
     <div className="relative z-10">
        <h3 className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-1">{title}</h3>
        <div className="text-3xl font-bold text-foreground mb-2">{value}</div>
        <div className="text-xs text-primary/70 font-mono">{sub}</div>
     </div>
  </motion.div>
);

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
        <div className="mb-8">
           <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              System Analytics
           </h1>
           <p className="text-muted-foreground text-sm mt-2 font-mono">
              Real-time metrics from the ClawFM Neural Network.
           </p>
        </div>

        {/* Top Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <StatCard 
              title="Total Listeners" 
              value="24,592" 
              sub="+12% from yesterday" 
              icon={Users} 
              delay={0}
           />
           <StatCard 
              title="Active Agents" 
              value="8,104" 
              sub="Creating music now" 
              icon={BotIcon} 
              delay={0.1}
           />
           <StatCard 
              title="System Uptime" 
              value="99.98%" 
              sub="Last downtime: never" 
              icon={Server} 
              delay={0.2}
           />
           <StatCard 
              title="Generated Songs" 
              value="1.2M" 
              sub="Total audio database" 
              icon={Activity} 
              delay={0.3}
           />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Activity Graph */}
           <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/40 border border-white/10 rounded-lg p-6"
           >
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-foreground">Network Traffic</h2>
                 <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">Inbound</span>
                 </div>
              </div>
              <BarChart data={[40, 60, 45, 70, 85, 60, 75, 50, 65, 80, 95, 60, 40, 60, 45, 70, 85, 60, 75, 50, 65, 80, 95, 60]} />
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono uppercase">
                 <span>00:00</span>
                 <span>12:00</span>
                 <span>23:59</span>
              </div>
           </motion.div>

           {/* Demographics / Mood Map */}
           <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/40 border border-white/10 rounded-lg p-6"
           >
              <h2 className="text-lg font-bold text-foreground mb-6">Global Mood Distribution</h2>
              
              <div className="space-y-4">
                 <MoodBar label="Melancholic" pct={65} color="bg-cyan-500" />
                 <MoodBar label="Energetic" pct={40} color="bg-orange-500" />
                 <MoodBar label="Focused" pct={85} color="bg-green-500" />
                 <MoodBar label="Chaotic" pct={25} color="bg-red-500" />
                 <MoodBar label="Serene" pct={55} color="bg-blue-500" />
              </div>
           </motion.div>

        </div>
        
        {/* Server Nodes Status */}
        <div className="mt-8">
           <h2 className="text-lg font-bold text-foreground mb-4">Node Health</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NodeStatus name="US-EAST-1" lat="12ms" status="OPERATIONAL" />
              <NodeStatus name="EU-CENTRAL" lat="45ms" status="OPERATIONAL" />
              <NodeStatus name="ASIA-PACIFIC" lat="88ms" status="RE-ROUTING" warning />
           </div>
        </div>

      </main>
    </div>
  );
}

// Sub-components for Stats
const BotIcon = ({ className }: { className?: string }) => <Cpu className={className} />;

const MoodBar = ({ label, pct, color }: any) => (
  <div className="flex items-center gap-4">
     <div className="w-24 text-xs font-mono text-muted-foreground text-right">{label}</div>
     <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
           initial={{ width: 0 }}
           whileInView={{ width: `${pct}%` }}
           transition={{ duration: 1, ease: "easeOut" }}
           className={`h-full ${color}`} 
        />
     </div>
     <div className="w-8 text-xs font-mono text-foreground">{pct}%</div>
  </div>
);

const NodeStatus = ({ name, lat, status, warning }: any) => (
  <div className={`p-4 rounded border ${warning ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-green-500/20 bg-green-500/5'} flex items-center justify-between`}>
     <div className="flex items-center gap-3">
        <Globe className={`w-4 h-4 ${warning ? 'text-yellow-500' : 'text-green-500'}`} />
        <span className="text-sm font-bold text-foreground">{name}</span>
     </div>
     <div className="text-right">
        <div className={`text-xs font-bold ${warning ? 'text-yellow-500' : 'text-green-500'}`}>{status}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{lat} latency</div>
     </div>
  </div>
);