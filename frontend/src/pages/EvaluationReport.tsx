import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { EvidenceBlock } from '../components/EvidenceBlock';
import { Card } from '../components/Card';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { ScrollReveal } from '../components/ScrollReveal';
import { FileText, Download, Gavel, AlertTriangle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { evaluationApi, type Evaluation } from '../lib/api';

type Verdict = 'QUALIFIED' | 'REJECTED' | 'INCONCLUSIVE';

function toVerdict(rec: string): Verdict {
  const r = rec.toUpperCase().replace(/[\s-]/g, '_');
  if (r === 'HIRE' || r === 'STRONG_HIRE') return 'QUALIFIED';
  if (r === 'NO_HIRE' || r === 'REJECT') return 'REJECTED';
  return 'INCONCLUSIVE';
}

const VERDICT_CFG = {
  QUALIFIED:    { border: 'border-status-success', text: 'text-status-success', bg: 'bg-status-success', label: 'VERDICT: QUALIFIED', icon: '✓' },
  REJECTED:     { border: 'border-status-critical', text: 'text-status-critical', bg: 'bg-status-critical', label: 'VERDICT: REJECTED', icon: '✗' },
  INCONCLUSIVE: { border: 'border-status-warning', text: 'text-status-warning', bg: 'bg-status-warning', label: 'VERDICT: INCONCLUSIVE', icon: '?' },
} as const;

function ScoreBar({ label, score, delay = 0, agentId }: { label: string; score: number; delay?: number; agentId: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);

  const barColor = score >= 80 ? 'bg-status-success' : score >= 60 ? 'bg-primary' : score >= 40 ? 'bg-status-warning' : 'bg-status-critical';

  return (
    <Card interactive className="group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">📊</span>
        <span className="text-[9px] font-mono text-ink-ghost uppercase">AGT_{agentId.toString().padStart(2, '0')}</span>
      </div>
      <p className="text-[10px] text-ink-secondary uppercase font-medium tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-mono font-bold text-ink-primary tabular-nums">
        <AnimatedNumber value={score} duration={1400} delay={delay + 300} />
      </p>
      <div className="h-1.5 bg-neeti-elevated rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: mounted ? `${score}%` : '0%', transitionDelay: `${delay + 400}ms` }}
        />
      </div>
    </Card>
  );
}

export const EvaluationReport = () => {
  const { id } = useParams<{ id: string }>();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const ev = await evaluationApi.getEvaluation(parseInt(id));
        setEvaluation(ev);
      } catch (err: any) {
        setError(err?.response?.status === 404
          ? 'Evaluation not available yet.'
          : 'Failed to load evaluation.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neeti-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Logo size="md" className="animate-pulse-subtle" />
          <p className="text-ink-ghost text-sm font-mono">Compiling forensic report…</p>
          <div className="w-48 h-1 bg-neeti-elevated rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-progress-fill" style={{ width: '80%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="min-h-screen bg-neeti-bg flex items-center justify-center">
        <Card className="max-w-md text-center p-8 animate-fade-up">
          <AlertTriangle className="w-8 h-8 text-status-warning mx-auto mb-4" />
          <p className="text-ink-secondary text-sm mb-4">{error || 'No data available.'}</p>
          <Link to="/dashboard"><Button variant="secondary" size="sm">Back to Dashboard</Button></Link>
        </Card>
      </div>
    );
  }

  const verdict = toVerdict(evaluation.recommendation);
  const cfg = VERDICT_CFG[verdict];
  const confidencePct = evaluation.confidence_level ? Math.round(evaluation.confidence_level * 100) : 85;

  const agents = [
    { id: 1, name: 'Code Quality',   score: Math.round(evaluation.coding_score ?? 0) },
    { id: 2, name: 'Reasoning',      score: Math.round(evaluation.reasoning_score ?? 0) },
    { id: 3, name: 'Communication',  score: Math.round(evaluation.communication_score ?? 0) },
    { id: 4, name: 'Engagement',     score: Math.round(evaluation.engagement_score ?? 0) },
    { id: 5, name: 'Overall',        score: Math.round(evaluation.overall_score) },
  ];

  const evidence: { type: 'success' | 'warning'; title: string; content: string; level: string }[] = [];
  for (const s of evaluation.strengths) {
    evidence.push({ type: 'success', title: s, content: s, level: 'STRENGTH' });
  }
  for (const w of evaluation.weaknesses) {
    evidence.push({ type: 'warning', title: w, content: w, level: 'ADVISORY' });
  }
  if (evidence.length === 0 && evaluation.key_findings) {
    for (const f of evaluation.key_findings as any[]) {
      evidence.push({
        type: (f.severity === 'high' ? 'warning' : 'success'),
        title: f.message || f.type || 'Finding',
        content: f.message || String(f),
        level: f.severity === 'high' ? 'ADVISORY' : 'STRENGTH',
      });
    }
  }

  const analysis = evaluation.detailed_report || evaluation.summary || 'No detailed analysis available.';

  return (
    <div className="min-h-screen bg-neeti-bg relative overflow-hidden">
      <div className="ambient-orb ambient-orb-primary w-[500px] h-[500px] top-[-10%] left-[20%] z-0 opacity-50" />
      <div className="ambient-orb ambient-orb-blue w-[400px] h-[400px] bottom-[10%] right-[-5%] z-0 opacity-35" />
      <div className="ambient-orb ambient-orb-warm w-[300px] h-[300px] top-[40%] right-[15%] z-0 opacity-25" />

      <header className="sticky top-0 z-30 glass-header px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo size="md" linkTo="/" />
          <div>
            <h2 className="text-base font-display font-semibold text-ink-primary">
              Neeti AI <span className="text-ink-ghost font-normal">|</span> Forensic Report
            </h2>
            <div className="flex items-center gap-3 text-[10px] text-ink-ghost font-mono">
              <span>SESSION: {evaluation.session_id}</span>
              <span className="text-ink-ghost/40">•</span>
              <span>{evaluation.evaluated_at ? new Date(evaluation.evaluated_at).toLocaleDateString() : 'Pending'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}
            onClick={() => {
              // CRIT-9 FIX: Generate downloadable forensic report
              const reportText = [
                `Neeti AI — Forensic Evaluation Report`,
                `Session ID: ${evaluation.session_id}`,
                `Evaluated: ${evaluation.evaluated_at ? new Date(evaluation.evaluated_at).toLocaleString() : 'Pending'}`,
                `Verdict: ${cfg.label}`,
                `Confidence: ${confidencePct}%`,
                ``,
                `Agent Scores:`,
                ...agents.map(ag => `  ${ag.name}: ${ag.score}/100`),
                ``,
                `Strengths:`,
                ...evaluation.strengths.map(s => `  ✓ ${s}`),
                ``,
                `Areas for Improvement:`,
                ...evaluation.weaknesses.map(w => `  ✗ ${w}`),
                ``,
                `Analysis: ${analysis}`,
                ``,
                `Generated by Neeti AI Platform`,
              ].join('\n');
              const blob = new Blob([reportText], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `neeti-forensic-report-${evaluation.session_id}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >Export Report</Button>
          <Button variant="primary" size="sm" icon={<Gavel className="w-4 h-4" />}
            onClick={() => {
              // CRIT-9 FIX: Placeholder for hire authorization workflow
              alert(`Authorize hire decision for Session ${evaluation.session_id}? This feature requires admin approval workflow.`);
            }}
          >Authorize Hire</Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Verdict banner */}
          <ScrollReveal variant="scale" duration={800}>
            <div className={`bg-neeti-surface border-l-4 ${cfg.border} rounded-lg p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 verdict-stamp`}>
              <div>
                <p className="text-[10px] text-ink-ghost font-mono uppercase tracking-widest mb-1">Final Determination</p>
                <h1 className={`text-3xl font-bold font-display tracking-tight ${cfg.text}`}>{cfg.label}</h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-ink-ghost font-mono uppercase tracking-widest mb-1">Aggregate Confidence</p>
                <p className={`text-3xl font-mono font-bold ${cfg.text} tabular-nums`}>
                  <AnimatedNumber value={confidencePct} duration={1600} delay={500} suffix="%" />
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Agent scores */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {agents.map((ag, i) => (
              <ScoreBar key={ag.id} label={ag.name} score={ag.score} delay={i * 150} agentId={ag.id} />
            ))}
          </div>

          {/* Evidence */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Evidence Breakdown</h2>
            {evidence.map((item, idx) => (
              <ScrollReveal key={idx} variant="fade-left" delay={idx * 80}>
                <EvidenceBlock type={item.type} title={item.title} label={item.level}>
                  {item.content}
                </EvidenceBlock>
              </ScrollReveal>
            ))}
          </section>

          <ScrollReveal variant="fade-up" delay={200}>
            <Card>
              <h2 className="text-sm font-display font-semibold text-ink-primary mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Comprehensive Analysis
              </h2>
              <p className="text-sm text-ink-secondary leading-relaxed font-display italic">{analysis}</p>
            </Card>
          </ScrollReveal>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-24 space-y-5">
            <ScrollReveal variant="fade-right" delay={100}>
              <Card>
                <p className="text-[10px] text-ink-ghost font-mono uppercase tracking-widest mb-4">Evaluation Summary</p>
                <div className="space-y-2 text-sm border-t border-neeti-border pt-4">
                  {[
                    ['Overall Score', `${Math.round(evaluation.overall_score)}/100`],
                    ['Recommendation', evaluation.recommendation.toUpperCase()],
                    ['Confidence', `${confidencePct}%`],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-ink-ghost">{l}</span>
                      <span className="text-ink-primary font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </ScrollReveal>

            <ScrollReveal variant="fade-right" delay={200}>
              <Card>
                <p className="text-[10px] text-ink-ghost font-mono uppercase tracking-widest mb-4">Session Metadata</p>
                <div className="space-y-2 text-sm">
                  {[
                    ['Session ID', String(evaluation.session_id)],
                    ['Evaluated',  evaluation.evaluated_at ? new Date(evaluation.evaluated_at).toLocaleString() : 'Pending'],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-ink-ghost">{l}</span>
                      <span className="text-ink-primary font-mono text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </ScrollReveal>

            <Link to="/dashboard">
              <Button variant="secondary" className="w-full">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

// Synced for GitHub timestamp
