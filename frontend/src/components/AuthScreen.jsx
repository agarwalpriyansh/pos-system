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
  googleClientId,
  handleGoogleLogin,
  handleGoogleRegisterSubmit,
  googleUserPayload,
  notification
}) {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id && googleClientId) {
      if (authMode !== 'google-setup') {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response && response.credential) {
              handleGoogleLogin(response.credential);
            }
          }
        });

        const btnDiv = document.getElementById('google-signin-btn');
        if (btnDiv) {
          window.google.accounts.id.renderButton(btnDiv, {
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: btnDiv.offsetWidth || 320
          });
        }
      }
    }
  }, [googleClientId, authMode]);
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

        {authMode === 'google-setup' ? (
          // Google Register/Setup Business details form
          <div className="flex flex-col gap-6">
            <div className="bg-slate-955/80 border border-slate-800/80 p-4 rounded-2xl space-y-2">
              <h2 className="text-sm font-extrabold text-emerald-450 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                Google Account Authenticated
              </h2>
              <div className="text-xs text-slate-300 font-medium space-y-1">
                <p>Name: <span className="text-slate-100 font-semibold">{googleUserPayload?.name}</span></p>
                <p>Email: <span className="text-slate-100 font-semibold">{googleUserPayload?.email}</span></p>
              </div>
              <p className="text-xs text-slate-500 italic pt-1">
                Configure your business details below to finalize your SaaS tenant shop.
              </p>
            </div>

            <form onSubmit={handleGoogleRegisterSubmit} className="flex flex-col gap-5">
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

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="flex-1 py-3.5 bg-slate-955 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs sm:text-sm uppercase tracking-wider font-extrabold rounded-xl transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-955 font-extrabold text-xs sm:text-sm uppercase tracking-widest rounded-xl transition duration-155 shadow-xl shadow-emerald-500/10 disabled:opacity-40"
                >
                  {loading ? 'Setting up...' : '🚀 Launch Shop'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          // Regular Sign In / Register Shop Forms
          <>
            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-850">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition duration-150 ${
                  authMode === 'login' ? 'bg-emerald-500 text-slate-955 font-black' : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition duration-150 ${
                  authMode === 'register' ? 'bg-emerald-500 text-slate-955 font-black' : 'text-slate-450 hover:text-slate-200'
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

            {/* Real Google Sign-In SDK button container or warning */}
            <div className="w-full flex flex-col items-center gap-3">
              {googleClientId && !googleClientId.startsWith('your-google-client-id-here') ? (
                <div id="google-signin-btn" className="w-full flex justify-center py-0.5 min-h-[40px]"></div>
              ) : (
                <div className="w-full py-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center text-xs font-bold text-slate-500 select-none cursor-not-allowed">
                  🔒 Real Google Sign-In Pending Server Config
                </div>
              )}

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
          </>
        )}
      </div>
    </div>
  );
}
