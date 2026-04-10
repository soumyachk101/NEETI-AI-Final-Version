import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';


export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-neeti-bg relative overflow-hidden">
      <div className="ambient-orb ambient-orb-primary w-[400px] h-[400px] top-[-10%] right-[10%] z-0 opacity-40" />

      <header className="sticky top-0 z-30 glass-header">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-5">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-ink-ghost hover:text-ink-secondary transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-display font-semibold text-ink-primary tracking-tight">Privacy Policy</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-10 relative z-10">
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">Data Collection</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Neeti AI collects minimal personal data necessary to provide our interview evaluation services.
              This includes your email address, full name, and role (recruiter or candidate) during registration.
              During interview sessions, audio, video, and code submissions are processed by our AI agents for
              evaluation purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">Data Usage</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              All collected data is used exclusively for interview evaluation and platform improvement.
              We do not sell your personal information to third parties. AI-processed evaluation data is
              stored securely and accessible only to authorized recruiters and the evaluated candidate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">Data Retention</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Interview session data is retained for 90 days after the session concludes, after which it is
              automatically purged. Account information is retained until you request deletion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-ink-primary mb-3">Your Rights</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              You have the right to access, correct, or delete your personal data at any time by contacting
              our support team. You may also request a copy of all data associated with your account.
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

 
