import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Shield, LayoutDashboard, BrainCircuit, LineChart } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { extractErrorMessage } from '../lib/errorUtils';
import { Button } from '../components/Button';
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
    <div className="min-h-screen bg-[#000000] flex w-full">
      {/* Left Data/Info Pane - The Senior Developer Aesthetic */}
      <div className="hidden lg:flex w-1/2 relative bg-[#09090b] border-r border-white/[0.05] flex-col justify-between overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px), linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Soft elegant glow */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-bronze/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 p-12 lg:p-16 flex flex-col h-full">
          <div className="mb-auto">
            <Logo size="lg" showWordmark linkTo="/" className="mb-16" />
            
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-12 max-w-lg">
              <motion.div variants={fadeUp}>
                <h2 className="text-3xl font-display font-medium text-white mb-4 tracking-tight">
                  Evidence-Based Assessment
                </h2>
                <p className="text-white/50 text-base leading-relaxed">
                  Enterprise technical interview evaluation infrastructure. We replace biased, manual interviews with fully autonomous, objective, and quantifiable engineering assessments.
                </p>
              </motion.div>

              <div className="space-y-8">
                {[
                  {
                    icon: BrainCircuit,
                    title: 'Objective Evaluation',
                    text: 'Multi-agent AI analysis provides standardized, bias-free technical assessments based on quantifiable metrics.',
                  },
                  {
                    icon: LayoutDashboard,
                    title: 'Real-Time Monitoring',
                    text: 'Continuous evaluation of coding ability, communication clarity, and engagement levels throughout the interview.',
                  },
                  {
                    icon: LineChart,
                    title: 'Defensible Decisions',
                    text: 'Comprehensive evidence trails and AI-powered insights create documented, justifiable hiring recommendations.',
                  },
                ].map((block, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex gap-4 group">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-bronze/10 group-hover:border-bronze/30 transition-all duration-300">
                        <block.icon className="w-5 h-5 text-white/50 group-hover:text-bronze transition-colors" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white mb-1.5">{block.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{block.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 pt-8 border-t border-white/[0.05]">
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-widest mb-6">System Capabilities</h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: '5 AI AGENTS', value: 'Autonomous' },
                { label: 'ANALYSIS', value: 'Multi-Dimensional' },
                { label: 'EVALUATION', value: 'Real-Time' },
                { label: 'REPORTING', value: 'Comprehensive' },
              ].map((m) => (
                <div key={m.label}>
                  <p className="text-[10px] font-mono text-white/40 tracking-wider mb-1">{m.label}</p>
                  <p className="text-sm font-mono text-bronze">{m.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Auth Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="w-full max-w-[420px]">
          
          <div className="lg:hidden mb-12 flex justify-center">
            <Logo size="lg" showWordmark linkTo="/" />
          </div>

          <motion.div variants={fadeUp} className="mb-10">
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
                className="bg-[#09090b] border-white/[0.08] text-white focus:border-bronze focus:ring-1 focus:ring-bronze/50 h-12"
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
                className="bg-[#09090b] border-white/[0.08] text-white focus:border-bronze focus:ring-1 focus:ring-bronze/50 h-12"
              />
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 rounded-md p-3"
              >
                {error}
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="pt-2">
              <Button type="submit" variant="primary" className="w-full h-12 text-sm font-medium" loading={isLoading}>
                Sign In
              </Button>
            </motion.div>
          </form>

          <motion.div variants={fadeUp} className="mt-10 pt-6 border-t border-white/[0.05] space-y-4">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Shield className="w-4 h-4 text-bronze/70" />
              <span className="font-medium text-white/60">Secure Authentication</span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed">
              All access is logged and monitored. This system is for authorized personnel only.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 text-center lg:hidden">
            <p className="text-sm text-white/40">
              Don't have an account?{' '}
              <Link to="/register" className="text-bronze hover:text-bronze-light transition-colors">
                Request Access
              </Link>
            </p>
          </motion.div>

        </motion.div>
      </div>

      <div className="absolute top-8 right-8 hidden lg:block z-20">
        <p className="text-sm text-white/40">
          Don't have an account?{' '}
          <Link to="/register" className="text-white hover:text-white/80 font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
