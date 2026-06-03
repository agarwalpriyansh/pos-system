import React from 'react';

export default function Header({
  shop,
  currentView,
  setCurrentView,
  clearAdminForm,
  handleLogout,
  showMobileCart,
  setShowMobileCart,
  cart,
  onBackToHome
}) {
  return (
    <header className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-slate-900/60 border border-slate-800 p-5 sm:p-6 rounded-2xl backdrop-blur-md">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
            {shop?.name || 'SaaS POS'}
          </h1>
          <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {shop?.shopId}
          </span>
        </div>
        <p className="text-sm sm:text-base text-slate-400 mt-1 font-medium">
          {shop?.description || 'A Premium Multi-Tenant POS SaaS Instance'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className="flex-1 sm:flex-initial text-sm px-5 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 font-extrabold rounded-xl transition duration-155 active:scale-95"
          >
            🏠 Home
          </button>
        )}
        {/* Navigation Tab Toggles */}
        <button
          type="button"
          onClick={() => {
            setCurrentView('pos');
            clearAdminForm();
          }}
          className={`flex-1 sm:flex-initial text-sm px-5 py-2.5 font-extrabold rounded-xl transition duration-155 active:scale-95 border ${
            currentView === 'pos'
              ? 'bg-emerald-600 border-emerald-500 text-slate-955 shadow-md shadow-emerald-500/10 font-black'
              : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          🛒 Cashier POS
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentView('dashboard');
            clearAdminForm();
          }}
          className={`flex-1 sm:flex-initial text-sm px-5 py-2.5 font-extrabold rounded-xl transition duration-155 active:scale-95 border ${
            currentView === 'dashboard'
              ? 'bg-cyan-600 border-cyan-500 text-slate-100 shadow-md shadow-cyan-500/10 font-black'
              : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          📊 Analytics & Sales
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentView('admin');
            clearAdminForm();
          }}
          className={`flex-1 sm:flex-initial text-sm px-5 py-2.5 font-extrabold rounded-xl transition duration-155 active:scale-95 border ${
            currentView === 'admin'
              ? 'bg-indigo-600 border-indigo-500 text-slate-100 shadow-md shadow-indigo-500/10 font-black'
              : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          🛠️ Catalog Manager
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentView('settings');
            clearAdminForm();
          }}
          className={`flex-1 sm:flex-initial text-sm px-5 py-2.5 font-extrabold rounded-xl transition duration-155 active:scale-95 border ${
            currentView === 'settings'
              ? 'bg-indigo-600 border-indigo-500 text-slate-100 shadow-md shadow-indigo-500/10 font-black'
              : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          ⚙️ Store Settings
        </button>

        {/* Logout Trigger */}
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2.5 text-sm font-extrabold rounded-xl border border-rose-500/25 bg-rose-950/20 hover:bg-rose-900/30 text-rose-455 transition duration-150 active:scale-95"
        >
          Logout
        </button>

        {/* Mobile Cart Button */}
        {currentView === 'pos' && (
          <button
            type="button"
            onClick={() => setShowMobileCart(!showMobileCart)}
            className="md:hidden flex-1 flex items-center justify-center gap-2 text-sm px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl active:scale-95 transition"
          >
            🛒 Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        )}
      </div>
    </header>
  );
}
