import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Shield, LayoutDashboard, BrainCircuit } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { extractErrorMessage } from '../lib/errorUtils';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { Input } from '../components/Input';
import { Logo } from '../components/Logo';
import { motion, type Variants } from 'framer-motion';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 100, damping: 20 } 
  },
};

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Authentication failed'));
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed flex items-center justify-center p-4 sm:p-8 w-full relative overflow-hidden" style={{ backgroundImage: 'url("/bg-landing.png")' }}>
      {/* Ambient background blur */}
      <div className="absolute inset-0 bg-[#0E0E11]/30 backdrop-blur-[2px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(76,130,251,0.15),rgba(255,255,255,0))] pointer-events-none" />
      
      {/* Unified Modal */}
      <motion.div 
        variants={fadeUp} 
        initial="hidden" 
        animate="visible"
        className="w-full max-w-[1000px] flex flex-col lg:flex-row bg-[#0E0E11]/40 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-[0_0_80px_-20px_rgba(76,130,251,0.25)] relative z-10 overflow-hidden"
      >
        {/* Left Data/Info Pane */}
        <div className="w-full lg:w-5/12 p-10 lg:p-14 bg-white/[0.02] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col relative overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(76,130,251,.5) 1px,transparent 1px), linear-gradient(90deg,rgba(76,130,251,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <div className="relative z-10 h-full flex flex-col">
            <Logo size="lg" showWordmark linkTo="/" className="mb-12" />
            
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-auto">
              <motion.div variants={fadeUp}>
                <h2 className="text-2xl font-display font-medium text-white mb-4 tracking-tight">
                  Evidence-Based Assessment
                </h2>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Enterprise technical interview evaluation infrastructure. We replace biased, manual interviews with fully autonomous, objective, and quantifiable engineering assessments.
                </p>
              </motion.div>

              <div className="space-y-6">
                {[
                  {
                    icon: BrainCircuit,
                    title: 'Objective Evaluation',
                    text: 'Multi-agent AI analysis provides standardized assessments.',
                  },
                  {
                    icon: LayoutDashboard,
                    title: 'Real-Time Monitoring',
                    text: 'Continuous evaluation of coding ability and communication.',
                  },
                ].map((block, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex gap-4 group">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/50 transition-all duration-300">
                        <block.icon className="w-4 h-4 text-white/50 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white mb-1">{block.title}</h3>
                      <p className="text-xs text-white/40 leading-relaxed">{block.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Auth Pane */}
        <div className="w-full lg:w-7/12 p-8 sm:p-10 lg:p-14 flex flex-col justify-center relative">
          <div className="absolute top-8 right-8 hidden sm:block">
            <p className="text-sm text-white/40">
              Don't have an account?{' '}
              <Link to="/register" className="text-white hover:text-primary font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>

          <div className="w-full max-w-[380px] mx-auto">
            <motion.div variants={fadeUp} className="mb-8">
              <h1 className="text-2xl font-display font-semibold text-white tracking-tight mb-2">Welcome back</h1>
              <p className="text-sm text-white/50">Enter your credentials to access your dashboard.</p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div variants={fadeUp}>
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@company.com"
                  icon={<User className="w-4 h-4 text-white/40" />}
                  required
                  variant="skeuomorphic"
                />
              </motion.div>

              <motion.div variants={fadeUp}>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  icon={<Lock className="w-4 h-4 text-white/40" />}
                  required
                  variant="skeuomorphic"
                />
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                >
                  {error}
                </motion.div>
              )}

              <motion.div variants={fadeUp} className="pt-2">
                <LiquidButton type="submit" className="w-full h-12 text-sm font-medium shadow-[0_0_15px_rgba(76,130,251,0.3)]">
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                </LiquidButton>
              </motion.div>
            </form>

            <motion.div variants={fadeUp} className="mt-8 pt-6 border-t border-white/[0.05]">
              <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                <Shield className="w-4 h-4 text-primary/70" />
                <span className="font-medium text-white/60">Secure Authentication</span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">
                All access is logged and monitored. This system is for authorized personnel only.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-6 text-center sm:hidden">
              <p className="text-sm text-white/40">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:text-primary-light transition-colors">
                  Sign up
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Synced for GitHub timestamp
