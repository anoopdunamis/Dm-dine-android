import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (user: string, pass: string) => Promise<boolean>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
        setError('Please enter both username and password');
        return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
        const success = await onLogin(username, password);
        if (!success) {
          setError('Invalid credentials. Please try again.');
          setIsSubmitting(false);
        }
    } catch (err: any) {
        setError(err.message || 'Connection failed. Please try again.');
        setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('z1');
    setPassword('911');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl mb-6">
             <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Waiter Login</h2>
          <p className="text-slate-500 mt-2 font-medium">Enter credentials to start your shift</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 text-rose-600 text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in zoom-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="flex-1">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                placeholder="Restaurant ID"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl shadow-xl shadow-slate-200 active:scale-[0.98] hover:bg-slate-800 transition-all text-lg flex items-center justify-center gap-3 disabled:bg-slate-700"
            >
              {isSubmitting && (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
              )}
              {isSubmitting ? 'Verifying...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleFillDemo}
              disabled={isSubmitting}
              className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 active:scale-95 transition-all"
            >
              Use Sample Account (z1 / 911)
            </button>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em]">
                Dyna-Menu Security Protocol
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;