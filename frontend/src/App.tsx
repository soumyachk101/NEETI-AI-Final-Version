import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, Suspense, type ReactNode } from 'react';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { SessionCreate } from './pages/SessionCreate';
import { SessionDetail } from './pages/SessionDetail';
import { SessionJoin } from './pages/SessionJoin';
import { InterviewRoom } from './pages/InterviewRoom';
import SessionMonitor from './pages/SessionMonitor';
import SessionResults from './pages/SessionResults';
import { EvaluationReport } from './pages/EvaluationReport';
import { About } from './pages/About';
import { FAQ } from './pages/FAQ';
import { Troubleshooting } from './pages/Troubleshooting';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Cookies } from './pages/Cookies';
import { useAuthStore } from './store/useAuthStore';
import { ToastProvider } from './components/Toast';
import { Logo } from './components/Logo';
import './index.css';

import { Component, type ErrorInfo } from 'react';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-neeti-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <Logo size="lg" className="animate-pulse-subtle" />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '200ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '400ms' }} />
        </div>
        <p className="text-xs font-mono text-ink-ghost tracking-widest uppercase">Initializing System</p>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neeti-bg flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6 animate-fade-up">
            <div className="text-6xl font-mono text-status-critical">!</div>
            <h1 className="text-2xl font-display text-ink-primary">Something went wrong</h1>
            <p className="text-ink-secondary">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * CRIT-11 FIX: ProtectedRoute now shows a loading state while auth is being validated.
 * This prevents the flash-redirect where a user with a valid session briefly sees
 * a redirect to /login before their auth state is hydrated from localStorage/Supabase.
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) {
    return <LoadingFallback />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function RecruiterRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const role = useAuthStore(s => s.user?.role);

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (role !== 'recruiter') return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="min-h-screen bg-neeti-bg flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6 animate-fade-up">
        <div className="text-8xl font-mono text-primary/40">404</div>
        <h1 className="text-2xl font-display text-ink-primary">Page Not Found</h1>
        <p className="text-ink-secondary">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

function App() {
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Router>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/troubleshooting" element={<Troubleshooting />} />
              {/* CRIT-10 FIX: Proper legal pages instead of phantom redirects to About */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/join" element={<SessionJoin />} />
              <Route path="/sessions/join" element={<SessionJoin />} />
              <Route path="/interview" element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>} />
              <Route path="/sessions/:id/interview" element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>} />
              <Route
                path="/dashboard"
                element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
              />
              <Route
                path="/sessions/create"
                element={<RecruiterRoute><SessionCreate /></RecruiterRoute>}
              />
              <Route
                path="/sessions/:id"
                element={<ProtectedRoute><SessionDetail /></ProtectedRoute>}
              />
              <Route
                path="/sessions/:sessionId/monitor"
                element={<RecruiterRoute><SessionMonitor /></RecruiterRoute>}
              />
              <Route
                path="/sessions/:sessionId/results"
                element={<ProtectedRoute><SessionResults /></ProtectedRoute>}
              />
              <Route
                path="/evaluation/:id"
                element={<ProtectedRoute><EvaluationReport /></ProtectedRoute>}
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
