import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import {
  Github,
  Twitter,
  Linkedin,
  Mail,
  ExternalLink,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { FlickeringGrid } from './ui/flickering-grid';

const CURRENT_YEAR = new Date().getFullYear();

const PLATFORM_LINKS = [
  { label: 'How It Works', to: '/about#how-it-works' },
  { label: 'Security', to: '/about#security' },
  { label: 'Multi-Agent System', to: '/about#agents' },
  { label: 'For Recruiters', to: '/register' },
  { label: 'For Candidates', to: '/join' },
];

const RESOURCE_LINKS = [
  { label: 'FAQ', to: '/faq' },
  { label: 'Troubleshooting', to: '/troubleshooting' },
  { label: 'API Reference', to: '/about#api' },
  { label: 'Documentation', href: 'https://github.com/sukrit-89/Anti-cheat-interview-system', external: true },
  { label: 'Release Notes', href: 'https://github.com/sukrit-89/Anti-cheat-interview-system/releases', external: true },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Cookie Policy', to: '/cookies' },
  { label: 'Responsible AI', to: '/about#responsible-ai' },
];

export const Footer: React.FC = () => {
  return (
    <footer className="relative w-full bg-[#030303] overflow-hidden border-t border-white/[0.05]">
      {/* Flickering Grid Background */}
      <div className="absolute inset-0 z-0">
        <FlickeringGrid 
          squareSize={4}
          gridGap={6}
          flickerChance={0.2}
          color="rgb(181, 146, 88)" 
          maxOpacity={0.15}
          className="opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-transparent to-[#030303]/80" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="py-20 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
          
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-8">
            <div className="inline-block group cursor-pointer">
              <Logo size="lg" showWordmark showTagline linkTo="/" />
              <div className="h-px w-0 group-hover:w-full bg-bronze transition-all duration-500 mt-1" />
            </div>

            <p className="text-sm text-white/50 leading-relaxed max-w-sm font-light">
              Advancing technical assessment through autonomous, evidence-backed evaluation protocols. Neeti AI ensures integrity and depth in the digital age.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 border border-emerald-500/20 bg-emerald-500/5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">
                  Nodes Online
                </span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex gap-4">
                {[
                  { icon: Github, href: "https://github.com/sukrit-89" },
                  { icon: Twitter, href: "https://x.com/sukritmotion" },
                  { icon: Linkedin, href: "https://www.linkedin.com/in/sukrit-goswami-5558a5321" }
                ].map((social, i) => (
                  <motion.a
                    key={i}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, translateY: -2 }}
                    className="text-white/30 hover:text-bronze transition-colors"
                  >
                    <social.icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {/* Platform */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-white/20 uppercase tracking-[0.3em] mb-8">
                  / Protocol
                </h4>
                <ul className="space-y-4">
                  {PLATFORM_LINKS.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="group flex items-center text-sm text-white/40 hover:text-white transition-all"
                      >
                        <ChevronRight className="w-3 h-3 text-bronze opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                        <span>{link.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-white/20 uppercase tracking-[0.3em] mb-8">
                  / Knowledge
                </h4>
                <ul className="space-y-4">
                  {RESOURCE_LINKS.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center text-sm text-white/40 hover:text-white transition-all"
                        >
                          <ChevronRight className="w-3 h-3 text-bronze opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                          <span>{link.label}</span>
                          <ExternalLink className="w-3 h-3 ml-2 opacity-20" />
                        </a>
                      ) : (
                        <Link
                          to={link.to!}
                          className="group flex items-center text-sm text-white/40 hover:text-white transition-all"
                        >
                          <ChevronRight className="w-3 h-3 text-bronze opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                          <span>{link.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support & Legal */}
              <div className="col-span-2 md:col-span-1">
                <h4 className="text-[11px] font-mono font-bold text-white/20 uppercase tracking-[0.3em] mb-8">
                  / Secure
                </h4>
                <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-bronze" />
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Support</span>
                    </div>
                    <a
                      href="mailto:neetiatsupport@gmail.com"
                      className="block text-xs text-white/60 hover:text-bronze transition-colors font-mono"
                    >
                      neetiatsupport@gmail.com
                    </a>
                  </div>
                  
                  <ul className="space-y-3 pt-4 border-t border-white/[0.05]">
                    {LEGAL_LINKS.map((link) => (
                      <li key={link.label}>
                        <Link to={link.to} className="text-[11px] text-white/30 hover:text-white uppercase tracking-wider transition-colors">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-10 border-t border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/20 tracking-[0.2em]">
              <span>© {CURRENT_YEAR} NEETI AI</span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span>STABLE_RELDISP_4.2.0</span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-white/20 tracking-[0.2em] group">
              <Shield className="w-3 h-3 group-hover:text-bronze transition-colors" />
              <span>PROTOCOL_ENCRYPT_ACTIVE</span>
            </div>
            <p className="text-[10px] font-mono text-white/10 tracking-[0.4em] uppercase">
              // Technical Judgment Evidence
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

