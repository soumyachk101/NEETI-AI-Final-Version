import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { useSessionStore } from '../store/useSessionStore';
import { useAuthStore } from '../store/useAuthStore';
import { useWebSocket } from '../lib/websocket';
import { CodeEditor } from '../components/CodeEditor';
import { Button } from '../components/Button';
import { LogOut, Code, Maximize2, Minimize2, FileText, Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

const LIVEKIT_WS_URL = import.meta.env.VITE_LIVEKIT_WS_URL;

import { WebSocketMessage } from '../lib/websocket';
import { useAuthStore } from '../store/useAuthStore';

const InterviewTimer: React.FC = () => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsedTime(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return <span className="font-mono tabular-nums text-sm font-semibold text-ink-primary">{fmt(elapsedTime)}</span>;
};

const WorkspaceEditor: React.FC<{ sessionId: number; language: string; lastMessage: WebSocketMessage | null }> = ({ sessionId, language, lastMessage }) => {
  const [currentCode, setCurrentCode] = useState('');
  const { user } = useAuthStore();
  const isRecruiter = user?.role === 'recruiter';

  useEffect(() => {
    if (isRecruiter && lastMessage) {
      if (lastMessage.type === 'code_changed' || lastMessage.type === 'code_executed') {
        if (lastMessage.data?.code) {
          setCurrentCode(lastMessage.data.code as string);
        }
      }
    }
  }, [lastMessage, isRecruiter]);

  const handleChange = (val: string) => {
    setCurrentCode(val);
  };

  return (
    <>
      <div className="flex-1 p-3">
        <CodeEditor value={currentCode} onChange={handleChange} language={language} sessionId={sessionId} lastMessage={lastMessage} />
      </div>

      <div className="border-t border-neeti-border bg-neeti-surface/60 px-4 py-2">
        <div className="flex items-center gap-4 text-[10px] text-ink-ghost">
          <span>Lines: <span className="font-mono text-ink-secondary">{currentCode.split('\n').length}</span></span>
          <span>Lang: <span className="font-mono text-ink-secondary">{language.toUpperCase()}</span></span>
          <span className="ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success inline-block mr-1 align-middle animate-pulse-dot" />
            AI Monitoring Active
          </span>
        </div>
      </div>
    </>
  );
};

export const InterviewRoom: React.FC = () => {
  const navigate = useNavigate();
  const { currentSession, roomToken, fetchRoomToken } = useSessionStore();
  const { user } = useAuthStore();
  const isRecruiter = user?.role === 'recruiter';
  const { isConnected, lastMessage } = useWebSocket(currentSession?.id || null);

  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [language, setLanguage] = useState('typescript');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  useEffect(() => {
    if (!currentSession) { navigate(isRecruiter ? '/dashboard' : '/join'); return; }
    if (!roomToken) {
      fetchRoomToken(currentSession.id).catch(() => navigate('/dashboard'));
    }
  }, [currentSession, roomToken, navigate, fetchRoomToken]);

  if (!currentSession || !roomToken) {
    return (
      <div className="min-h-screen bg-neeti-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-ink-ghost text-sm font-mono">Connecting to interview room…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neeti-bg overflow-hidden relative">
      <div className="ambient-orb ambient-orb-primary w-[400px] h-[400px] top-[-15%] right-[5%] z-0 opacity-40" />
      <div className="ambient-orb ambient-orb-blue w-[300px] h-[300px] bottom-[10%] left-[-5%] z-0 opacity-30" />

      <header className="glass-header px-5 py-3 shrink-0 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-sm font-display font-semibold text-ink-primary leading-tight">
                  {currentSession.title}
                </h1>
                <p className="text-[10px] text-ink-ghost font-mono">
                  Code: {currentSession.join_code}
                </p>
              </div>
            </div>

            {/* Recording indicator */}
            <div className="rec-indicator">
              <span className="rec-dot" />
              <span className="text-[10px] font-mono font-semibold text-status-critical tracking-wider">REC</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-ink-tertiary">
              <Clock className="w-3.5 h-3.5" />
              <InterviewTimer />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neeti-border bg-neeti-surface">
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-status-success" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-status-critical" />
              )}
              <span className="text-[10px] uppercase tracking-wider text-ink-ghost font-mono">
                {isConnected ? 'Connected' : 'Reconnecting'}
              </span>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setIsCodeExpanded(!isCodeExpanded)}
              icon={isCodeExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}>
              {isCodeExpanded ? 'Minimize' : 'Expand'}
            </Button>

            <Button variant="critical" size="sm" onClick={() => setShowLeaveDialog(true)} icon={<LogOut className="w-4 h-4" />}>
              Leave
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${isCodeExpanded ? 'w-1/2' : 'w-2/3'} border-r border-neeti-border flex flex-col transition-all duration-300`}>
          <div className="flex-1 p-3">
            <LiveKitRoom token={roomToken} serverUrl={LIVEKIT_WS_URL} connectOptions={{ autoSubscribe: true }}>
              <VideoConference className="h-full" />
              <RoomAudioRenderer />
            </LiveKitRoom>
          </div>

          <div className="border-t border-neeti-border bg-neeti-surface/60 px-4 py-2">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-3">
                <span className="text-ink-ghost">Status:</span>
                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${
                  currentSession.status === 'live'
                    ? 'bg-status-critical/10 text-status-critical border-status-critical/20'
                    : 'bg-neeti-elevated text-ink-secondary border-neeti-border'
                }`}>
                  {currentSession.status === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-critical animate-pulse mr-1 align-middle" />}
                  {currentSession.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-ink-ghost">
                <span>Language:</span>
                <span className="font-mono text-ink-secondary">{language.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`${isCodeExpanded ? 'w-1/2' : 'w-1/3'} flex flex-col transition-all duration-300`}>
          <div className="border-b border-neeti-border bg-neeti-surface/60 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-ink-primary">Code Editor</span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-xs bg-neeti-bg border border-neeti-border rounded-md px-2 py-1 text-ink-secondary focus:outline-none focus:border-primary transition-colors"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>

          <WorkspaceEditor sessionId={currentSession?.id || 0} language={language} lastMessage={lastMessage} />
        </div>
      </div>

      {showLeaveDialog && (
        <div className="dialog-overlay">
          <div className="dialog-panel max-w-md w-full mx-4 p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-warning/10">
                <AlertTriangle className="w-5 h-5 text-status-warning" />
              </div>
              <h2 className="text-lg font-display font-semibold text-ink-primary">Leave Interview?</h2>
            </div>
            <p className="text-sm text-ink-secondary">
              Your progress has been saved but the interview session will remain active.
            </p>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setShowLeaveDialog(false)}>Stay</Button>
              <Button variant="critical" className="flex-1" onClick={() => { setShowLeaveDialog(false); navigate('/dashboard'); }}>
                Leave Interview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
