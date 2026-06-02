import React from 'react';

export default function SettingsView({
  shop,
  settingsShopName,
  setSettingsShopName,
  settingsShopDesc,
  setSettingsShopDesc,
  settingsShopContact,
  setSettingsShopContact,
  handleShopSettingsUpdate,
  loading
}) {
  return (
    <div className="max-w-2xl mx-auto w-full bg-slate-900/40 border border-slate-800 p-8 sm:p-10 rounded-3xl backdrop-blur-md my-4 flex flex-col gap-6">
      <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
        <h2 className="text-xl font-black text-indigo-400 uppercase tracking-wider">⚙️ Store Customization</h2>
        <span className="text-xs text-slate-550 font-mono font-bold">Tenant ID: {shop?.shopId}</span>
      </div>

      <form onSubmit={handleShopSettingsUpdate} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase pl-1">Store / Shop Name *</label>
          <input
            type="text"
            required
            value={settingsShopName}
            onChange={(e) => setSettingsShopName(e.target.value)}
            placeholder="Shop Name"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm sm:text-base focus:outline-none focus:border-indigo-500 text-slate-100 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase pl-1">Tagline or Description</label>
          <input
            type="text"
            value={settingsShopDesc}
            onChange={(e) => setSettingsShopDesc(e.target.value)}
            placeholder="A Premium Dryfruits Store"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm sm:text-base focus:outline-none focus:border-indigo-500 text-slate-100 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase pl-1">Contact Email or Phone Number</label>
          <input
            type="text"
            value={settingsShopContact}
            onChange={(e) => setSettingsShopContact(e.target.value)}
            placeholder="store.contact@example.com"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm sm:text-base focus:outline-none focus:border-indigo-500 text-slate-100 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-slate-100 font-extrabold text-sm sm:text-base uppercase tracking-widest rounded-xl transition duration-150 shadow-lg shadow-indigo-500/10"
        >
          {loading ? 'Saving...' : '💾 Save Settings'}
        </button>
      </form>
      
      <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/10 text-sm text-indigo-300 leading-relaxed">
        <h4 className="font-extrabold uppercase tracking-wider text-xs mb-1.5">💡 What does this do?</h4>
        Updating your business branding dynamically rewrites your **WhatsApp sales notifications** and custom **branded HTML receipts** generated from the centralized SMTP gateway! No additional setup is required.
      </div>
    </div>
  );
}
