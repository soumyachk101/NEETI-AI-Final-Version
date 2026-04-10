import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-neeti-bg relative overflow-hidden">
      <div className="ambient-orb ambient-orb-blue w-[400px] h-[400px] top-[-10%] left-[10%] z-0 opacity-40" />

      <header className="sticky top-0 z-30 glass-header">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-5">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-ink-ghost hover:text-ink-secondary transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-display font-semibold text-ink-primary tracking-tight">Terms of Service</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-10 relative z-10">
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">Acceptance of Terms</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              By accessing and using Neeti AI, you accept and agree to be bound by these Terms of Service.
              If you do not agree to these terms, you should not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">Platform Usage</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Neeti AI provides AI-assisted interview evaluation services. Recruiters may create and manage
              interview sessions, while candidates participate in evaluations. All users must provide accurate
              information and use the platform in good faith.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">AI Evaluation Disclaimer</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              AI-generated evaluations are provided as decision-support tools and should not be the sole
              basis for hiring decisions. Recruiters are responsible for final hiring decisions and should
              use AI evaluations alongside their own professional judgment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">Account Responsibility</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for
              all activities that occur under your account.
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

 
