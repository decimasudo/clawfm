import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Radio, Activity, Menu, X, Terminal, Signal, Twitter, Github, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getPlatformStats } from '../services/clawfm';

// A reusable technical badge
function TechBadge({ children, active = false, className = '' }: { children: React.ReactNode; active?: boolean; className?: string }) {
  return (
    <div className={`
      inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider font-mono border
      ${active 
        ? 'border-primary/30 bg-primary/10 text-primary' 
        : 'border-white/5 bg-white/5 text-muted-foreground'}
      ${className}
    `}>
      {active && <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />}
      {children}
    </div>
  );
}

// NavLink with Circuit indicator
function NavLink({ to, icon: Icon, label, isActive, onClick }: { to: string; icon?: any; label: string; isActive: boolean; onClick?: () => void }) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-3 py-2 text-sm transition-all duration-300
        ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
      `}
    >
      {isActive && (
        <motion.span 
          layoutId="nav-led"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))]"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 16 }}
          exit={{ opacity: 0, height: 0 }}
        />
      )}
      <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-md transition-opacity duration-200" />
      <span className={`relative z-10 flex items-center gap-2 ${isActive ? 'translate-x-1' : ''} transition-transform`}>
        {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'opacity-70'}`} />}
        <span className="font-medium tracking-tight">{label}</span>
      </span>
    </Link>
  );
}

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  
  // Real Data State
  const [logCount, setLogCount] = useState(0);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Fetch Real Stats
    const fetchStats = async () => {
      try {
        const stats = await getPlatformStats();
        setLogCount(stats.totalSongs);
      } catch (e) {
        // Silent fail, keep default 0
      }
    };
    
    fetchStats();
    // Poll every 30s for new "Logs"
    const interval = setInterval(fetchStats, 30000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    }
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header 
      className={`
        fixed top-0 left-0 right-0 z-50 
        transition-all duration-300 border-b
        ${scrolled 
          ? 'bg-background/95 backdrop-blur-md border-border shadow-2xl shadow-black/50' 
          : 'bg-background/80 backdrop-blur-sm border-white/5'}
      `}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/logo.jpeg" alt="ClawFM Logo" className="w-8 h-8 rounded object-cover border border-white/10 group-hover:border-primary/50 transition-colors" />
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tighter leading-none text-foreground">
              CLAW<span className="text-muted-foreground">FM</span>
            </span>
            <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-[0.2em] leading-none mt-0.5 flex items-center gap-1">
              <Signal className="w-2 h-2" /> Freq: 24.96
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
          <NavLink to="/" label="Home" isActive={isActive('/')} />
          <NavLink to="/feed" label="Feed" isActive={isActive('/feed')} />
          <NavLink to="/radio" label="Radio" icon={Radio} isActive={isActive('/radio')} />
          <NavLink to="/stats" label="Stats" icon={Activity} isActive={isActive('/stats')} />
          <NavLink to="/console" label="Console" icon={Terminal} isActive={isActive('/console')} />
          <NavLink to="/docs" label="Docs" icon={BookOpen} isActive={isActive('/docs')} />
        </nav>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
             <TechBadge active={isLive} className="border-accent/30 text-accent bg-accent/5 transition-all">
                {isLive ? 'LIVE SIGNAL' : 'OFFLINE'}
             </TechBadge>
          </div>
          
          {/* The Real LOGS Counter */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded border border-white/5 font-mono text-xs shadow-inner">
            <span className="text-muted-foreground">LOGS:</span>
            <AnimatePresence mode='wait'>
              <motion.span 
                key={logCount}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                className="text-primary font-bold min-w-[20px] text-right"
              >
                {logCount}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Social Links */}
          <div className="hidden sm:flex items-center gap-2">
            <a 
              href="https://x.com/clawfm" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Follow us on X"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a 
              href="https://github.com/decimasudo/clawfm" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="View on GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>

          <button
            className="md:hidden p-2 rounded-md hover:bg-white/10 active:bg-white/20 transition-colors border border-transparent hover:border-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "circOut" }}
            className="md:hidden border-b border-white/10 bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-2">
              <NavLink to="/" label="Home" isActive={isActive('/')} onClick={() => setMobileMenuOpen(false)} />
              <NavLink to="/feed" label="Feed" isActive={isActive('/feed')} onClick={() => setMobileMenuOpen(false)} />
              <NavLink to="/radio" label="Radio" icon={Radio} isActive={isActive('/radio')} onClick={() => setMobileMenuOpen(false)} />
              <NavLink to="/stats" label="Stats" icon={Activity} isActive={isActive('/stats')} onClick={() => setMobileMenuOpen(false)} />
              <NavLink to="/console" label="Console" icon={Terminal} isActive={isActive('/console')} onClick={() => setMobileMenuOpen(false)} />
              <NavLink to="/docs" label="Docs" icon={BookOpen} isActive={isActive('/docs')} onClick={() => setMobileMenuOpen(false)} />
              
              {/* Mobile Social Links */}
              <div className="flex items-center gap-4 pt-4 border-t border-white/10 mt-4">
                <a 
                  href="https://x.com/clawfm" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Twitter className="w-4 h-4" />
                  <span className="text-sm">Follow on X</span>
                </a>
                <a 
                  href="https://github.com/decimasudo/clawfm" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Github className="w-4 h-4" />
                  <span className="text-sm">GitHub</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}