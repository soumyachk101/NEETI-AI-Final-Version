import AnoAI from "@/components/ui/animated-shader-background";
import { Link } from 'react-router-dom';
import { ArrowLeft, Rocket, Shield, Brain, Infinity } from 'lucide-react';
import { motion } from 'framer-motion';

const DemoOne = () => {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center">
      {/* Shader Background */}
      <AnoAI />
      
      {/* Overlay Content */}
      <div className="relative z-10 text-center space-y-8 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-md mb-4"
        >
          <Infinity className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-xs font-mono text-primary tracking-widest uppercase">Aurora Neural Interface</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-5xl md:text-7xl font-display font-bold text-ink-primary tracking-tight"
        >
          Next-Gen <span className="text-gradient-primary">Visual Fidelity</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="max-w-xl mx-auto text-lg text-ink-secondary leading-relaxed"
        >
          This WebGL shader demonstrates the power of custom neural visualizations integrated 
          seamlessly into the Neeti AI assessment platform.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-4 pt-8"
        >
          <Link 
            to="/" 
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-all hover:shadow-glow active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Landing
          </Link>
          <div className="flex items-center gap-6 px-8 py-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
            <Rocket className="w-5 h-5 text-ink-tertiary animate-float" />
            <Shield className="w-5 h-5 text-ink-tertiary animate-float" style={{ animationDelay: '0.2s' }} />
            <Brain className="w-5 h-5 text-ink-tertiary animate-float" style={{ animationDelay: '0.4s' }} />
          </div>
        </motion.div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-primary/20" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-primary/20" />
    </div>
  );
};

export { DemoOne };
export default DemoOne;

// Synced for GitHub timestamp
