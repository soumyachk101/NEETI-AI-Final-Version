import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ScrollReveal } from '../components/ScrollReveal';
import {
  Terminal,
  FileCheck,
  Fingerprint,
  ArrowRight,
  CheckCircle2,
  Shield,
  Cpu,
  Zap,
  Globe,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { Footer } from '../components/Footer';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { TechOrbit } from '@/components/ui/tech-orbit';
import { TextReveal } from '@/components/ui/text-reveal';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';



const CAPABILITIES = [
  {
    icon: Terminal,
    title: 'Real-time Execution',
    desc: 'Immediate code compilation and execution across 50+ languages via Judge0 integration.',
    tag: 'EXEC_001',
  },
  {
    icon: Shield,
    title: 'Multi-Agent Analysis',
    desc: 'Specialized agents evaluate code quality, reasoning, communication, and depth.',
    tag: 'EVAL_002',
  },
  {
    icon: FileCheck,
    title: 'Evidence Collection',
    desc: 'Comprehensive session recording with code snapshots, audio, and behavioral metrics.',
    tag: 'LOG_003',
  },
  {
    icon: Fingerprint,
    title: 'Secure Protocol',
    desc: 'End-to-end encryption, authenticated access, and compliance-ready audit trails.',
    tag: 'SEC_004',
  },
];

const PHASES = [
  {
    num: '01',
    title: 'Session Initialization',
    desc: 'Configure evaluation parameters, define assessment criteria, and generate secure session credentials.',
    tag: 'INIT_SESSION',
  },
  {
    num: '02',
    title: 'Live Evaluation',
    desc: 'Real-time code execution, automated testing, and concurrent analysis by specialized AI agents.',
    tag: 'CONDUCT_EVAL',
  },
  {
    num: '03',
    title: 'Verdict Generation',
    desc: 'Comprehensive report compilation with evidence-backed assessments and quantified performance metrics.',
    tag: 'GEN_VERDICT',
  },
];

const TECH_STACK = [
  { icon: Cpu, label: 'FastAPI + Python 3.11' },
  { icon: Zap, label: 'React 19 + TypeScript' },
  { icon: Globe, label: 'LiveKit WebRTC' },
  { icon: Shield, label: 'Supabase Auth' },
];

// Typewriter hook and isolated component for performance
function useTypewriter(text: string, speed = 50, delay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          setDone(true);
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return { displayed, done };
}

function TypewriterText({ text, className }: { text: string; className?: string }) {
  const { displayed, done } = useTypewriter(text, 30, 800);
  return (
    <p className={className}>
      {displayed}
      {!done && <span className="typewriter-cursor" />}
    </p>
  );
}

function ScrollProgressBeam({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"]
  });

  return (
    <motion.div 
      className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(212,175,55,0.5)]"
      style={{ width: "100%", scaleX: scrollYProgress, originX: 0, position: 'absolute' }}
    />
  );
}

function CinematicOrbitSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Cinematic scroll effect
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  });

  // Calculate transforms
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.5, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [100, 0]);

  return (
    <motion.section 
      ref={containerRef}
      style={{ opacity }}
      className="relative py-32 overflow-hidden bg-neeti-bg border-y border-white/[0.05] shadow-2xl"
    >
      <div className="absolute inset-0 bg-neeti-bg pointer-events-none" />
      
      <motion.div 
        style={{ scale, y }} 
        className="max-w-7xl mx-auto px-6 relative z-10"
      >
        <TechOrbit 
          items={TECH_STACK} 
          radius={220}
          speed={0.005}
          centerContent={
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-mono text-primary tracking-[0.3em] uppercase opacity-60">Engineered with</span>
              <h4 className="text-xl font-display font-bold text-white tracking-widest uppercase">
                Architecture
              </h4>
              <div className="w-12 h-0.5 bg-primary/30 rounded-full" />
            </div>
          }
        />
      </motion.div>
    </motion.section>
  );
}

// Staggered grid container for capabilities/infrastructure cards
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 100, damping: 15 } 
  },
};

export const Landing = () => {
  const protocolRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex w-full flex-col min-h-screen overflow-x-hidden">
      
      <main className="relative z-10 w-full bg-cover bg-center bg-no-repeat bg-fixed shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ backgroundImage: 'url("/bg-landing.png")' }}>
        <header className="glass-header sticky top-0 z-50">
          {/* ... existing header content ... */}
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <Logo size="md" showWordmark showTagline linkTo="/" />

            <div className="flex items-center gap-3">
              <Link
                to="/about"
                className="hidden sm:inline-block text-sm text-ink-secondary hover:text-ink-primary transition-colors"
              >
                About
              </Link>
              <Link
                to="/faq"
                className="hidden sm:inline-block text-sm text-ink-secondary hover:text-ink-primary transition-colors"
              >
                FAQ
              </Link>
              <Link
                to="/join"
                className="px-5 py-2 text-ink-secondary hover:text-ink-primary text-sm font-medium transition-colors"
              >
                Join Interview
              </Link>
              <Link
                to="/login"
                className="px-5 py-2 border border-neeti-border hover:border-primary/50 bg-neeti-elevated text-ink-primary text-sm font-medium rounded-md transition-all duration-200 hover:shadow-glow"
              >
                Access System
              </Link>
            </div>

          </div>
        </header>

        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center pt-24 pb-20 px-6 max-w-7xl mx-auto w-full transition-all duration-500">
          <Card className="w-full min-h-[600px] bg-[#0E0E11]/[0.85] backdrop-blur-3xl relative overflow-hidden rounded-[2.5rem] border border-primary/20 shadow-[0_0_80px_-20px_rgba(76,130,251,0.25)]">
            <Spotlight size={800} />
            
            <div className="flex flex-col lg:flex-row h-full min-h-[600px]">
              {/* Left content */}
              <div className="flex-1 p-8 md:p-14 relative z-10 flex flex-col justify-center">
                <div className="inline-flex flex-shrink-0 items-center gap-2 px-3 py-1.5 border border-primary/25 bg-primary/[0.08] rounded-full mb-8 w-fit select-none">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-mono text-primary tracking-wider">
                    TECHNICAL ASSESSMENT v2.1
                  </span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-6">
                  <span className="text-white">Evidence-Based</span> <br />
                  <span className="text-gradient-primary">Technical Judgment</span>
                </h1>
                
                <TypewriterText 
                  text="Evidence-based hiring decisions powered by five autonomous AI agents."
                  className="text-white/60 text-base md:text-lg max-w-lg mb-4 min-h-[3.5rem]" 
                />
                
                <div className="mb-10 flex flex-shrink-0 items-center gap-2 select-none">
                    <span className="relative flex h-3 w-3 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    <p className="text-xs font-medium tracking-wide text-green-500 uppercase">System Online • Ready for Interviews</p>
                </div>
                    
                <div className="flex flex-col sm:flex-row items-start gap-4"> 
                    <Link to="/register">
                      <LiquidButton variant="white" className="border border-white/20" size={'xl'}>
                        Initiate Evaluation <ArrowRight className="w-4 h-4 ml-2" />
                      </LiquidButton> 
                    </Link>
                    <Link to="/join">
                      <LiquidButton variant="secondary" className="border border-white/10" size={'xl'}>
                        Join Interview
                      </LiquidButton> 
                    </Link>
                </div> 
              </div>

              {/* Right content - The Robot Spline Scene */}
              <div className="flex-1 relative min-h-[400px] lg:min-h-full flex items-center justify-center pb-8 lg:pb-0 mix-blend-screen overflow-hidden">
                <div className="w-full h-full absolute inset-0">
                  <SplineScene 
                    scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                    className="w-full h-full object-cover select-none"
                  />
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Tech stack trust bar - Orbiting version */}
        <CinematicOrbitSection />

        <section className="py-24 max-w-7xl mx-auto px-6">
          <ScrollReveal variant="fade-up" duration={800} threshold={0.2}>
            <Card className="w-full relative overflow-hidden backdrop-blur-2xl bg-[#0E0E11]/[0.60] border border-primary/10 rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(76,130,251,0.15)] p-8 md:p-14 transition-all duration-700 hover:shadow-[0_0_80px_-15px_rgba(76,130,251,0.25)] hover:border-primary/30 group">
              <Spotlight size={800} />
              
              <div className="relative z-10">
                <div className="text-center mb-16 flex flex-col items-center">
                  <TextReveal 
                    text="Evaluation Infrastructure"
                    className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400 mb-4 tracking-tight" 
                  />
                  <p className="text-white/60 max-w-2xl mx-auto md:text-lg">
                    A comprehensive technical assessment framework built on measurable
                    criteria and automated analysis.
                  </p>
                </div>

                <motion.div 
                  className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-10%" }}
                >
                  {CAPABILITIES.map((cap) => (
                    <motion.div key={cap.tag} variants={staggerItem}>
                      <div
                        className="h-full bg-white/[0.03] border border-white/[0.05] rounded-2xl p-6 hover:bg-white/[0.08] hover:border-primary/30 hover:-translate-y-2 transition-all duration-300 flex flex-col items-start group/card cursor-default shadow-lg"
                      >
                        <div className="mb-6 relative flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 group-hover/card:bg-primary/20 transition-colors">
                          <cap.icon className="w-6 h-6 text-primary transform group-hover/card:scale-110 group-hover/card:rotate-3 transition-transform duration-300" strokeWidth={1.5} />
                        </div>
                        <h4 className="text-lg font-display font-semibold text-white/90 mb-3 group-hover/card:text-white transition-colors">
                          {cap.title}
                        </h4>
                        <p className="text-sm text-white/50 leading-relaxed mb-6 flex-grow">
                          {cap.desc}
                        </p>
                        <span className="text-[10px] font-mono text-primary/70 tracking-[0.2em] mt-auto uppercase bg-primary/10 px-2 py-1 rounded-md">
                          MOD: {cap.tag}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </Card>
          </ScrollReveal>
        </section>

        <section 
          ref={protocolRef} 
          className="py-40 relative overflow-hidden bg-black/20"
          style={{ position: 'relative' }}
        >
          {/* Advanced background elements */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-6 relative">
            <ScrollReveal variant="fade-up">
              <div className="text-center mb-32">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-[10px] font-mono font-bold text-primary uppercase tracking-[0.3em] mb-6">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  System Protocol v4.0.2
                </div>
                <div className="flex justify-center w-full">
                  <TextReveal 
                    text="Assessment Protocol"
                    className="text-5xl md:text-7xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/20 mb-8 tracking-tight"
                  />
                </div>
                <p className="text-white/40 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed font-light italic">
                  "The standard for technical integrity in the age of AI."
                </p>
              </div>
            </ScrollReveal>

            <div className="relative" style={{ position: 'relative' }}>
              {/* Scroll-tracked Progress Beam isolated in its own component for performance */}
              <div className="absolute top-[4.5rem] left-0 w-full h-[2px] bg-white/5 hidden lg:block overflow-hidden">
                <ScrollProgressBeam targetRef={protocolRef} />
              </div>

              <div className="grid lg:grid-cols-3 gap-10 relative z-10">
                {PHASES.map((phase, i) => (
                  <ScrollReveal key={phase.num} variant="fade-up" delay={i * 200}>
                    <motion.div 
                      className="group relative"
                      whileHover={{ y: -10 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {/* Step Indicator with Pulse */}
                      <div className="mb-12 flex items-center justify-center lg:justify-start">
                        <div className="w-20 h-20 rounded-[2rem] bg-black border border-white/10 flex items-center justify-center font-mono text-3xl font-bold text-primary shadow-[0_0_50px_rgba(0,0,0,0.5)] group-hover:border-primary/50 group-hover:shadow-primary/30 transition-all duration-700 relative z-20 group-hover:rotate-[10deg]">
                          {phase.num}
                          {/* Inner glow */}
                          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                          {/* Scanning light effect */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-primary/40 blur-sm opacity-0 group-hover:opacity-100 group-hover:top-full transition-all duration-1000 ease-in-out" />
                        </div>
                      </div>

                      {/* Content Card - Senior Dev Glassmorphism */}
                      <Card className="p-10 h-full bg-[#1E40AF]/5 backdrop-blur-3xl border border-primary/10 rounded-[2.5rem] hover:bg-[#1E40AF]/10 hover:border-primary/40 transition-all duration-700 relative overflow-hidden group/card shadow-[0_4px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_-10px_rgba(76,130,251,0.2)]">
                        <Spotlight size={500} />
                        
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-center gap-4 mb-6">
                            <span className="h-0.5 w-12 bg-gradient-to-r from-primary to-transparent" />
                            <code className="text-[10px] font-mono text-primary/80 tracking-[0.25em] uppercase px-2 py-0.5 border border-primary/10 rounded">
                              MOD::{phase.tag}
                            </code>
                          </div>
                          
                          <h4 className="text-3xl font-display font-bold text-white/90 mb-6 group-hover/card:text-white group-hover/card:tracking-tight transition-all duration-500">
                            {phase.title}
                          </h4>
                          
                          <p className="text-white/40 leading-relaxed text-base group-hover/card:text-white/60 transition-colors duration-500 mb-10">
                            {phase.desc}
                          </p>

                          <div className="mt-auto">
                            <div className="flex items-center justify-between pt-8 border-t border-white/5">
                              <div className="flex -space-x-1">
                                {[1, 2, 3, 4].map((dot) => (
                                  <div key={dot} className="w-2 h-2 rounded-full border border-white/20 bg-black group-hover/card:border-primary/50 group-hover/card:bg-primary/20 transition-all duration-500" style={{ transitionDelay: `${dot * 100}ms` }} />
                                ))}
                              </div>
                              <div className="p-2 rounded-xl bg-white/5 group-hover/card:bg-primary/10 transition-colors">
                                <CheckCircle2 className="w-6 h-6 text-white/5 group-hover/card:text-primary transition-all duration-700 scale-75 group-hover/card:scale-110" strokeWidth={1} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Background Data Readout (Visual Decoration) */}
                        <div className="absolute top-4 right-4 font-mono text-[8px] text-white/5 pointer-events-none select-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000">
                          {Array.from({length: 5}).map((_, i) => (
                            <div key={i}>0x42A{i}E_VALIDATED</div>
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <ScrollReveal variant="scale">
          <section className="max-w-6xl mx-auto px-6 pb-32">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0E0E11]/60 backdrop-blur-3xl border border-white/10 p-12 md:p-20 text-center shadow-[0_0_120px_-20px_rgba(76,130,251,0.25)] group">
              {/* Immersive glow background */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="absolute -top-[50%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-110" />
              
              <div className="relative z-10 space-y-8">
                <h3 className="text-3xl md:text-5xl font-display font-medium text-white tracking-tight">
                  Ready to Transform Your Hiring?
                </h3>
                <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                  Join the new era of evidence-based technical evaluation. Fair, transparent, and powered by autonomous AI agents.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
                  <Link to="/register">
                    <LiquidButton className="w-full sm:w-auto h-14 px-10 text-base font-medium shadow-[0_0_30px_-5px_rgba(76,130,251,0.5)]">
                      <span className="flex items-center">
                        Get Started Free
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </span>
                    </LiquidButton>
                  </Link>
                  <Link to="/about" className="text-sm font-medium text-white/50 hover:text-white transition-colors underline underline-offset-8 decoration-white/20 hover:decoration-white/100 duration-300">
                    Learn more about the platform
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <div className="sticky bottom-0 z-0">
        <Footer />
      </div>
    </div>

  );
};

// Synced for GitHub timestamp

 
