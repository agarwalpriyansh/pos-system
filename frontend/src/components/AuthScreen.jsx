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
  notification,
  onBackToHome
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

  // List of states in India for the dropdown
  const indianStates = [
    'Rajasthan', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 
    'Gujarat', 'Uttar Pradesh', 'West Bengal', 'Kerala', 'Andhra Pradesh', 
    'Telangana', 'Punjab', 'Haryana', 'Madhya Pradesh', 'Bihar'
  ];

  // List of business types for the dropdown
  const businessTypes = [
    'Supermarket & Groceries', 'Apparel & Footwear', 'Pharma & Healthcare', 
    'Electrical & Electronics', 'Lifestyle & Fashion', 'Specialized Retail', 
    'Multi-Chain operations', 'Other Retail Store'
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans selection:bg-orange-500/20 selection:text-orange-600 relative">
      
      {/* Back Button */}
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="absolute top-6 left-6 sm:top-8 sm:left-8 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-orange-600 transition duration-150 flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer"
        >
          ← Back to home
        </button>
      )}

      {/* Top Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl bg-emerald-900 text-emerald-100 border border-emerald-500/30 animate-slideIn">
          <span className="text-sm sm:text-base font-bold">{notification.message}</span>
        </div>
      )}

      {/* Top Header Section */}
      <header className="max-w-7xl w-full mx-auto flex flex-col items-center gap-4 text-center mt-2">
        <div className="flex items-center gap-2 select-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-orange-500/20">
            R
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            Retail<span className="text-orange-600">Easy</span>
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-slate-600 font-bold text-sm sm:text-base">
            Your business should make you richer and happier
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            A comprehensive ERP system - Try Free
          </h2>
        </div>
      </header>

      {/* Split Cards Grid */}
      <main className="max-w-5xl w-full mx-auto grid md:grid-cols-2 gap-8 my-8 items-stretch">
        
        {/* Left Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-100/70 border border-slate-100/80 flex flex-col gap-6 justify-between">
          
          {authMode === 'google-setup' ? (
            // Google OAuth setup profile
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl space-y-1.5 text-left">
                <h3 className="text-xs font-extrabold text-emerald-800 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Google Login Authenticated
                </h3>
                <div className="text-xs text-slate-600 font-medium leading-relaxed">
                  <p>Account Name: <span className="text-slate-900 font-bold">{googleUserPayload?.name}</span></p>
                  <p>Email: <span className="text-slate-900 font-bold">{googleUserPayload?.email}</span></p>
                </div>
              </div>

              <form onSubmit={handleGoogleRegisterSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Business Type</label>
                  <select 
                    value={authShopDesc}
                    onChange={(e) => setAuthShopDesc(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white text-slate-800 transition"
                  >
                    {businessTypes.map((type, i) => (
                      <option key={i} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={authShopName}
                    onChange={(e) => setAuthShopName(e.target.value)}
                    placeholder="e.g. Priyansh General Stores"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white text-slate-800 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Store Contact (Phone) *</label>
                  <div className="flex gap-2">
                    <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 select-none">
                      🇮🇳 +91
                    </div>
                    <input
                      type="tel"
                      required
                      value={authShopContact}
                      onChange={(e) => setAuthShopContact(e.target.value)}
                      placeholder="81234 56789"
                      className="flex-grow px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white text-slate-800 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Priyansh Agarwal"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white text-slate-800 transition"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest shadow-md transition disabled:opacity-50"
                  >
                    {loading ? 'Launching...' : '🚀 Launch ERP'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // Tabs toggle: Try Free vs Sign In
            <div className="flex flex-col gap-5">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-lg transition duration-150 uppercase tracking-wider ${
                    authMode === 'register' ? 'bg-white text-orange-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Try it for free
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-lg transition duration-150 uppercase tracking-wider ${
                    authMode === 'login' ? 'bg-white text-orange-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
              </div>

              {/* Core Forms */}
              <form onSubmit={handleAuthSubmit} className="space-y-6 text-left">
                {authMode === 'register' ? (
                  // TRY FOR FREE REGISTRATION FORM
                  <>
                    {/* Select your business */}
                    <div className="relative border-b border-slate-200 focus-within:border-red-500 transition">
                      <select 
                        required
                        value={authShopDesc}
                        onChange={(e) => setAuthShopDesc(e.target.value)}
                        className={`w-full py-3.5 bg-transparent text-base font-normal focus:outline-none appearance-none cursor-pointer pr-10 ${authShopDesc ? 'text-slate-900' : 'text-slate-400'}`}
                      >
                        <option value="" disabled hidden>Select your business</option>
                        {businessTypes.map((type, i) => (
                          <option key={i} value={type} className="text-slate-800 font-normal">{type}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-4 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Enter your business name */}
                    <div className="border-b border-slate-200 focus-within:border-red-500 transition">
                      <input
                        type="text"
                        required
                        value={authShopName}
                        onChange={(e) => setAuthShopName(e.target.value)}
                        placeholder="Enter your business name"
                        className="w-full py-3.5 bg-transparent text-base text-slate-900 placeholder-slate-400 font-normal focus:outline-none"
                      />
                    </div>

                    {/* Enter owner name */}
                    <div className="border-b border-slate-200 focus-within:border-red-500 transition">
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Enter owner name"
                        className="w-full py-3.5 bg-transparent text-base text-slate-900 placeholder-slate-400 font-normal focus:outline-none"
                      />
                    </div>

                    {/* Enter your email address */}
                    <div className="border-b border-slate-200 focus-within:border-red-500 transition">
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full py-3.5 bg-transparent text-base text-slate-900 placeholder-slate-400 font-normal focus:outline-none"
                      />
                    </div>

                    {/* Enter your mobile number */}
                    <div className="flex items-end">
                      <div className="flex items-center gap-1.5 bg-slate-100 border-b border-slate-200 px-3 py-3.5 text-slate-700 text-sm rounded-t-lg font-normal select-none mr-2">
                        <span>🇮🇳</span>
                        <span>+91</span>
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div className="flex-grow border-b border-slate-200 focus-within:border-red-500 transition">
                        <input
                          type="tel"
                          required
                          value={authShopContact}
                          onChange={(e) => setAuthShopContact(e.target.value)}
                          placeholder="Enter your mobile number"
                          className="w-full py-3.5 bg-transparent text-base text-slate-900 placeholder-slate-400 font-normal focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Terms of Service */}
                    <div className="flex items-start gap-2.5 py-1">
                      <input 
                        type="checkbox" 
                        required 
                        id="terms" 
                        className="mt-1 h-4 w-4 text-[#e30613] focus:ring-[#e30613] border-slate-300 rounded" 
                      />
                      <label htmlFor="terms" className="text-[11px] text-slate-500 leading-tight">
                        I agree to the <span className="text-[#e30613] font-bold hover:underline cursor-pointer">Terms of Service</span> and <span className="text-[#e30613] font-bold hover:underline cursor-pointer">Privacy Policy</span>.
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-[#e30613] hover:bg-[#c20510] text-white font-extrabold text-sm uppercase tracking-widest rounded-xl transition duration-150 shadow-md hover:shadow-lg active:scale-95 transform mt-2 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Try it for free'}
                    </button>
                  </>
                ) : (
                  // LOGIN SIGN IN FORM
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="merchant@retaileasy.com"
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-800 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Password *</label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-800 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-[#e30613] hover:bg-[#c20510] text-white font-extrabold text-sm uppercase tracking-widest rounded-xl transition duration-150 shadow-md hover:shadow-lg active:scale-95 transform mt-2"
                    >
                      {loading ? 'Processing...' : 'Sign In'}
                    </button>
                  </>
                )}
              </form>

              <div className="relative flex items-center justify-center my-1.5">
                <div className="absolute w-full border-t border-slate-150"></div>
                <span className="relative px-3 bg-white text-[10px] uppercase font-bold tracking-wider text-slate-400">Or continue with</span>
              </div>

              {/* Google Actions */}
              <div className="flex flex-col items-center gap-3">
                {googleClientId && !googleClientId.startsWith('your-google-client-id-here') ? (
                  <div id="google-signin-btn" className="w-full flex justify-center py-0.5 min-h-[40px]"></div>
                ) : (
                  <button 
                    onClick={handleGoogleOAuthSimulate}
                    className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.137 4.114-3.466 0-6.277-2.85-6.277-6.36 0-3.51 2.811-6.36 6.277-6.36 1.497 0 2.87.525 3.957 1.4l3.14-3.14C19.012 2.21 15.858 1 12.24 1 5.966 1 1 5.97 1 12.04c0 6.07 4.967 11.04 11.24 11.04 6.787 0 11.396-4.76 11.396-11.59 0-.496-.046-.975-.12-1.44H12.24z"/>
                    </svg>
                    Simulate Google Login
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side Image Presentation */}
        <div className="bg-white rounded-3xl p-6 flex items-center justify-center shadow-xl shadow-slate-100/70 border border-slate-100/80 relative overflow-hidden">
          <img 
            src="/register-hero.png" 
            alt="RetailEasy POS Features Overview" 
            className="w-full h-auto object-contain max-h-[520px] scale-105 transform transition duration-300 hover:scale-110"
          />
        </div>
      </main>
    </div>
  );
}
