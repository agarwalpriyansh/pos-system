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
    <header className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-sm">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            {shop?.name || 'SaaS POS'}
          </h1>
          <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider font-extrabold bg-orange-50 text-orange-600 border border-orange-200/50">
            {shop?.shopId}
          </span>
        </div>
        <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">
          {shop?.description || 'A Premium Multi-Tenant POS SaaS Instance'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className="flex-1 sm:flex-initial text-sm px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold rounded-xl transition duration-155 active:scale-95"
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
              ? 'bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-500/10 font-black'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
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
              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/10 font-black'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
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
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/10 font-black'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
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
              ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/10 font-black'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          ⚙️ Store Settings
        </button>

        {/* Logout Trigger */}
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2.5 text-sm font-extrabold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition duration-150 active:scale-95"
        >
          Logout
        </button>

        {/* Mobile Cart Button */}
        {currentView === 'pos' && (
          <button
            type="button"
            onClick={() => setShowMobileCart(!showMobileCart)}
            className="md:hidden flex-1 flex items-center justify-center gap-2 text-sm px-5 py-2.5 bg-orange-600 text-white font-bold rounded-xl active:scale-95 transition"
          >
            🛒 Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        )}
      </div>
    </header>
  );
}
