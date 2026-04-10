import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Briefcase, User, Cpu, Network, Terminal, Lock } from 'lucide-react';

import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { Input } from '../components/Input';
import { Logo } from '../components/Logo';
import { motion, type Variants } from 'framer-motion';

function getPasswordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
};

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'recruiter' as 'recruiter' | 'candidate',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const navigate = useNavigate();
  const { register, isAuthenticated, error, clearError } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  useEffect(() => () => clearError(), [clearError]);

  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (formData.password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await register(formData.email, formData.password, formData.full_name, formData.role);
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const set = (key: string, value: string) => setFormData((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed flex items-center justify-center p-4 sm:p-8 w-full relative overflow-hidden" style={{ backgroundImage: 'url("/bg-landing.png")' }}>
      {/* Ambient glass blur layer */}
      <div className="absolute inset-0 bg-[#0E0E11]/30 backdrop-blur-[2px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(76,130,251,0.15),rgba(255,255,255,0))] pointer-events-none" />
      
      {/* Unified Modal */}
      <motion.div 
        variants={fadeUp} 
        initial="hidden" 
        animate="visible"
        className="w-full max-w-[1100px] flex flex-col lg:flex-row bg-[#0E0E11]/40 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-[0_0_80px_-20px_rgba(76,130,251,0.25)] relative z-10 overflow-hidden"
      >
        {/* Left Data/Info Pane */}
        <div className="w-full lg:w-5/12 p-8 sm:p-10 lg:p-12 bg-white/[0.02] border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col relative overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(76,130,251,.5) 1px,transparent 1px), linear-gradient(90deg,rgba(76,130,251,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <div className="relative z-10 h-full flex flex-col">
            <Logo size="lg" showWordmark linkTo="/" className="mb-10 sm:mb-16" />
            
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-auto">
              <motion.div variants={fadeUp}>
                <h3 className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-4">System Initialization</h3>
                <h2 className="text-2xl sm:text-3xl font-display font-medium text-white mb-6 leading-tight tracking-tight">
                  Deploy Your Infrastructure
                </h2>
                <p className="text-white/50 text-sm leading-relaxed mb-8">
                  Provision your account to access enterprise-grade technical interview evaluation. Ensure all credentials are set correctly before initializing a new active node.
                </p>
              </motion.div>

              <div className="space-y-5">
                {[
                  { icon: Cpu, text: 'Multi-agent evaluation framework ready' },
                  { icon: Network, text: 'Real-time candidate execution linked' },
                  { icon: Terminal, text: 'Secure evidence trails active' },
                ].map((item, idx) => (
                  <motion.div key={idx} variants={fadeUp} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/50 transition-all">
                      <item.icon className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-mono text-xs text-white/60 group-hover:text-white transition-colors">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-10 pt-8 border-t border-white/[0.05]">
              <p className="text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
                Node_Registration_v2.1 :: Secure_Channel_Established
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right Auth Pane */}
        <div className="w-full lg:w-7/12 p-8 sm:p-10 lg:p-12 flex flex-col justify-center relative">
          <div className="absolute top-8 right-8 hidden sm:block">
            <p className="text-sm text-white/40">
              Existing credentials?{' '}
              <Link to="/login" className="text-white hover:text-primary font-medium transition-colors">
                Log in
              </Link>
            </p>
          </div>

          <div className="w-full max-w-[460px] mx-auto">
            <motion.div variants={fadeUp} className="mb-8">
              <h1 className="text-2xl font-display font-semibold text-white tracking-tight mb-2">Create an account</h1>
              <p className="text-sm text-white/50">Setup your Neeti workspace to start evaluating.</p>
            </motion.div>

            {(error || validationError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 rounded-md p-3 mb-6"
              >
                {validationError || (typeof error === 'string' ? error : 'Registration failed. Please try again.')}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div variants={fadeUp} className="space-y-3">
                <label className="text-xs font-medium text-white/80">Account Type</label>
                <div className="grid grid-cols-2 gap-4">
                  {(['recruiter', 'candidate'] as const).map((role) => (
                    <label key={role} className="cursor-pointer group block">
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={formData.role === role}
                        onChange={(e) => set('role', e.target.value)}
                        className="sr-only"
                      />
                      <div className={`p-4 rounded-xl border transition-all duration-300 ${
                        formData.role === role
                          ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(76,130,251,0.15)]'
                          : 'border-white/10 bg-white/[0.02] backdrop-blur-xl text-white/50 hover:bg-white/[0.04]'
                      }`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${formData.role === role ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/40'}`}>
                            {role === 'recruiter' ? <Briefcase className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <p className={`font-medium text-sm capitalize ${formData.role === role ? 'text-white' : 'text-white/60'}`}>
                            {role}
                          </p>
                        </div>
                        <p className="text-xs text-white/40 pl-[44px]">
                          {role === 'recruiter' ? 'I want to evaluate candidates' : 'I want to take an assessment'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  icon={<User className="w-4 h-4 text-white/40" />}
                  required
                  variant="skeuomorphic"
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                  variant="skeuomorphic"
                />
              </motion.div>

              <motion.div variants={fadeUp} className="space-y-4">
                <div className="relative">
                  <Input
                    label="Password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => set('password', e.target.value)}
                    icon={<Lock className="w-4 h-4 text-white/40" />}
                    required
                    variant="skeuomorphic"
                  />
                  <div className="mt-2 flex gap-1 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level} 
                        className={`flex-1 transition-all duration-500 ${
                          strength.score >= level 
                            ? strength.score <= 1 ? 'bg-red-500' 
                            : strength.score === 2 ? 'bg-orange-500'
                            : strength.score === 3 ? 'bg-primary'
                            : 'bg-green-500'
                          : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4 text-white/40" />}
                  required
                  variant="skeuomorphic"
                />
              </motion.div>

              <motion.div variants={fadeUp} className="pt-4 pb-2">
                <LiquidButton type="submit" className="w-full h-12 text-sm font-medium shadow-[0_0_15px_rgba(76,130,251,0.3)]">
                  {isLoading ? 'Initializing...' : 'Initialize Account'}
                </LiquidButton>
              </motion.div>
            </form>

            <motion.div variants={fadeUp} className="mt-6 text-center sm:hidden">
              <p className="text-sm text-white/40">
                Existing credentials?{' '}
                <Link to="/login" className="text-primary hover:text-primary-light transition-colors">
                  Log in
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Synced for GitHub timestamp
