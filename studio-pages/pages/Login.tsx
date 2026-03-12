import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSupabase } from '@/lib/supabase';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = location.pathname === '/signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    if (isSignup && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + '/' },
        });
        if (authError) {
          setError(authError.message);
          setLoading(false);
          return;
        }
        if (data.user) {
          if (data.session) {
            setSuccess('Account created. Taking you home…');
            setTimeout(() => navigate('/', { replace: true }), 1000);
          } else {
            setSuccess('Account created! Check your email to confirm, then log in.');
          }
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) {
          setError(authError.message);
          setLoading(false);
          return;
        }
        if (data.user) {
          setSuccess('Signed in.');
          setTimeout(() => navigate('/', { replace: true }), 500);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to studio-pages/.env');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-8 bg-relay-bg dark:bg-relay-bg-dark relative transition-colors overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary rounded-full blur-[140px] opacity-10 dark:opacity-20"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary rounded-full blur-[120px] opacity-5 dark:opacity-10"></div>
      </div>

      <div className="absolute top-8 left-6 z-20">
        <button 
          onClick={() => navigate('/')}
          className="flex size-12 items-center justify-center rounded-full bg-relay-surface/50 dark:bg-relay-surface-dark/50 backdrop-blur-xl border border-relay-border dark:border-relay-border-dark text-relay-text dark:text-relay-text-dark transition-all hover:scale-110 active-scale shadow-sm"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
      </div>

      <div className="relative w-full max-w-sm z-10">
        <div className="mb-20 text-center">
          <h1 className="font-serif text-7xl text-relay-text dark:text-relay-text-dark mb-4 tracking-tighter">Rellaey.</h1>
          <p className="text-primary text-[10px] font-bold tracking-[0.5em] animate-pulse">
            {isSignup ? 'Join Rellaey' : 'Identity Gateway'}
          </p>
        </div>

        <div className="flex flex-col gap-10 w-full">
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 border-2 border-red-500/50 rounded-xl py-3 px-4">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-600 dark:text-green-400 text-sm text-center bg-green-500/10 border-2 border-green-500/50 rounded-xl py-3 px-4">
              ✓ {success}
            </div>
          )}
          <div className="group relative">
            <div className="relative flex items-center border-b border-relay-border dark:border-relay-border-dark group-focus-within:border-primary transition-colors">
              <span className="material-symbols-outlined text-relay-muted !text-[20px]">mail</span>
              <input 
                className="block w-full py-5 pl-5 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none transition-colors text-sm font-medium tracking-tighter" 
                placeholder="Email address" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="group relative">
            <div className="relative flex items-center border-b border-relay-border dark:border-relay-border-dark group-focus-within:border-primary transition-colors">
              <span className="material-symbols-outlined text-relay-muted !text-[20px]">lock</span>
              <input 
                className="block w-full py-5 pl-5 bg-transparent text-relay-text dark:text-relay-text-dark placeholder-relay-muted focus:ring-0 focus:outline-none transition-colors text-sm font-medium tracking-tighter"
                placeholder={isSignup ? 'Password (min 6 characters)' : 'Password'} 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
              <button className="text-relay-muted hover:text-primary transition-colors" type="button">
                <span className="material-symbols-outlined !text-[20px]">visibility_off</span>
              </button>
            </div>
            {!isSignup && (
              <div className="flex justify-end mt-4">
                <button type="button" className="text-[10px] font-bold text-relay-muted hover:text-primary transition-colors tracking-[0.2em]">Forgot credentials?</button>
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-10 w-full max-w-[50%] mx-auto h-16 bg-primary text-white font-bold text-xs tracking-[0.3em] hover:opacity-90 transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 group rounded-2xl active-scale disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignup ? 'Create Account' : 'Log In'}</span>
                <span className="material-symbols-outlined !text-xl group-hover:translate-x-2 transition-transform">trending_flat</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-20 text-center">
          <p className="text-relay-muted text-[10px] font-bold tracking-[0.3em]">
            {isSignup ? 'Already have an account? ' : 'New to tech rotation? '}
            <button 
              type="button"
              onClick={() => navigate(isSignup ? '/login' : '/signup')}
              className="text-relay-text dark:text-relay-text-dark hover:text-primary ml-2 transition-colors border-b-2 border-primary/20"
            >
              {isSignup ? 'Log In' : 'Join Rellaey'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
