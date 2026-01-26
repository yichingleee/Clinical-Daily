import { useState } from 'react';
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn, signUp, isConfigured } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured) {
      setError('Authentication is not configured. Please set up Supabase credentials.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      onClose();
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-panel/95 border border-white/10 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.55)] w-full max-w-md mx-4 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isConfigured && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
              <p>Supabase is not configured. To enable authentication:</p>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Create a Supabase project</li>
                <li>Add credentials to .env.local</li>
                <li>Run the database migrations</li>
              </ol>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-[0.2em] text-slate-300 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-edge/80 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-[0.2em] text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-edge/80 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-[0.2em] text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-edge/80 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isConfigured}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent-500 to-medical-700 text-surface border border-accent-500/40 rounded-xl font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>

          <div className="text-center text-sm text-slate-400">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-accent-400 hover:text-accent-300 font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-accent-400 hover:text-accent-300 font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
