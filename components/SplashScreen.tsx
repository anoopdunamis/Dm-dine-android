
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-orange-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>

      <div className="relative flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-3xl shadow-2xl shadow-indigo-500/50 flex items-center justify-center mb-6 rotate-12">
           <span className="text-white text-5xl font-black -rotate-12">D</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
          Dyna-Menu
        </h1>
        <p className="text-slate-400 font-medium tracking-widest text-xs uppercase">
          Waiter Assistant Pro
        </p>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center">
        <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
           <div className="h-full bg-indigo-500 w-1/2 animate-[progress_1.5s_ease-in-out_infinite]"></div>
        </div>
        <span className="text-[10px] text-slate-500 mt-4 font-bold tracking-widest">v2.4.0-STABLE</span>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
