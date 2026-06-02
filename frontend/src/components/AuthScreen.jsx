import React from 'react';

export default function AuthScreen({
  authMode,
  setAuthMode,
  authShopName,
  setAuthShopName,
  authShopDesc,
  setAuthShopDesc,
  authShopContact,
  setAuthShopContact,
  authName,
  setAuthName,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  loading,
  handleAuthSubmit,
  handleGoogleOAuthSimulate,
  notification
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 sm:p-8 font-sans">
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl bg-emerald-955 text-emerald-305 border border-emerald-500/40">
          <span className="text-base font-bold">{notification.message}</span>
        </div>
      )}

      <div className="w-full max-w-lg bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-10 backdrop-blur-md shadow-2xl flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
            SaaS POS Portal
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">Premium Multi-Tenant SaaS Billing Platform</p>
        </div>

        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-850">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition duration-150 ${
              authMode === 'login' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition duration-150 ${
              authMode === 'register' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            Register Business
          </button>
        </div>

        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-5">
          {authMode === 'register' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase pl-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={authShopName}
                  onChange={(e) => setAuthShopName(e.target.value)}
                  placeholder="e.g. Agarwal Stores"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-650 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase pl-1">Description</label>
                  <input
                    type="text"
                    value={authShopDesc}
                    onChange={(e) => setAuthShopDesc(e.target.value)}
                    placeholder="e.g. Dry fruits"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-650 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase pl-1">Store Contact</label>
                  <input
                    type="text"
                    value={authShopContact}
                    onChange={(e) => setAuthShopContact(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-650 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase pl-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. Priyansh Agarwal"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-650 transition"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase pl-1">Email Address *</label>
            <input
              type="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="merchant@example.com"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-650 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase pl-1">Password *</label>
            <input
              type="password"
              required
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-650 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-955 font-extrabold text-sm sm:text-base uppercase tracking-widest rounded-xl transition duration-155 shadow-xl shadow-emerald-500/10 disabled:opacity-40"
          >
            {loading ? 'Processing...' : authMode === 'login' ? '🔐 Sign In' : '🚀 Setup Shop Tenant'}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-2">
          <div className="absolute w-full border-t border-slate-800"></div>
          <span className="relative px-4 bg-slate-900 text-xs uppercase font-extrabold tracking-wider text-slate-500">Or Continue With</span>
        </div>

        {/* OAuth simulation for fast sandbox logins */}
        <button
          type="button"
          onClick={handleGoogleOAuthSimulate}
          disabled={loading}
          className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl flex items-center justify-center gap-3 transition duration-150 active:scale-98 shadow-md text-sm sm:text-base font-extrabold text-slate-200"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-xs text-rose-500 font-extrabold font-mono">G</span>
          <span>Google Sign-In (Sandbox)</span>
        </button>
      </div>
    </div>
  );
}
