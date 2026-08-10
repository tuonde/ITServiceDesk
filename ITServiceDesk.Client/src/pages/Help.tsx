import React from 'react';

const Help: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
      <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h2 className="text-3xl font-bold text-slate-800 mb-3">Yardım Sayfası Yakında...</h2>
      <p className="text-slate-500 max-w-md text-lg">
        Bu sayfa şu anda yapım aşamasındadır. Yakında size daha iyi destek verebilmek için burada detaylı yardım içerikleri sunacağız.
      </p>
    </div>
  );
};

export default Help;
