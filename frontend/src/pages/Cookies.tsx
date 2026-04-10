import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie } from 'lucide-react';

export const Cookies: React.FC = () => {
  return (
    <div className="min-h-screen bg-neeti-bg relative overflow-hidden">
      <div className="ambient-orb ambient-orb-warm w-[400px] h-[400px] bottom-[-10%] right-[10%] z-0 opacity-35" />

      <header className="sticky top-0 z-30 glass-header">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-5">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-ink-ghost hover:text-ink-secondary transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <div className="flex items-center gap-3">
            <Cookie className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-display font-semibold text-ink-primary tracking-tight">Cookie Policy</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-10 relative z-10">
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">What Are Cookies</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help us
              provide a better experience by remembering your preferences and session state.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">How We Use Cookies</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Neeti AI uses essential cookies for authentication and session management. We use localStorage
              to persist your login state across browser sessions. No third-party tracking cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">Managing Cookies</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              You can manage cookies through your browser settings. Please note that disabling essential
              cookies may prevent you from using certain features of the platform, including staying
              logged in between sessions.
            </p>
          </section>

          <p className="text-xs text-ink-ghost pt-6 border-t border-neeti-border">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </main>
    </div>
  );
};

// Synced for GitHub timestamp
