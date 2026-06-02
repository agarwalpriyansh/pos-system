import React from 'react';

export default function SuperAdminPortal({
  superAdminLoading,
  superAdminMetrics,
  superAdminShops,
  fetchSuperAdminData,
  handleLogout,
  handleToggleShopStatus
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-slate-900/60 border border-slate-800 p-5 sm:p-6 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-none">
              Platform Admin Panel
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 uppercase tracking-widest">
              Super Admin
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-400 mt-1 font-semibold">Track registered business shops and manage platform access status</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={fetchSuperAdminData}
            className="flex-1 lg:flex-initial px-5 py-2.5 text-xs font-extrabold bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition"
          >
            🔄 Refresh Platform Data
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 lg:flex-initial px-5 py-2.5 text-xs font-extrabold rounded-xl border border-rose-500/20 bg-rose-950/20 hover:bg-rose-900/30 text-rose-450 transition"
          >
            Logout Control Room
          </button>
        </div>
      </header>

      {superAdminLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
        </div>
      ) : (
        <>
          {/* Platform metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Total Registered Shops</span>
                <h3 className="text-3xl font-black text-slate-100 font-mono mt-1">
                  {superAdminMetrics?.totalShops || 0}
                </h3>
              </div>
              <span className="text-xs text-indigo-400 font-extrabold mt-4 uppercase tracking-wider block">
                🏢 Tenant Registry Count
              </span>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Active Store Access</span>
                <h3 className="text-3xl font-black text-slate-100 font-mono mt-1">
                  {superAdminMetrics?.activeShops || 0}
                </h3>
              </div>
              <span className="text-xs text-emerald-400 font-extrabold mt-4 uppercase tracking-wider block">
                🟢 Logins Allowed
              </span>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-rose-500/30 transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Suspended Access</span>
                <h3 className="text-3xl font-black text-slate-100 font-mono mt-1">
                  {superAdminMetrics?.suspendedShops || 0}
                </h3>
              </div>
              <span className="text-xs text-rose-400 font-extrabold mt-4 uppercase tracking-wider block">
                🔴 Access Denied
              </span>
            </div>
          </div>

          {/* Shop access management grid */}
          <div className="bg-slate-900/30 border border-slate-800 p-5 sm:p-6 rounded-2xl">
            <div className="border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-xs sm:text-sm font-black uppercase text-indigo-400 tracking-wider">🏢 Registered Shops & Merchant Info</h3>
            </div>

            <div className="overflow-x-auto">
              {superAdminShops.length === 0 ? (
                <div className="text-center p-10 border border-dashed border-slate-800 rounded-2xl my-4">
                  <span className="text-4xl mb-2 block">🏢</span>
                  <p className="text-slate-400 font-bold text-sm">No registered tenant shops registered on this SaaS platform.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-400 text-xs uppercase font-extrabold tracking-wider">
                      <th className="py-3.5 px-4">Store Name & Info</th>
                      <th className="py-3.5 px-4">Tenant ID</th>
                      <th className="py-3.5 px-4">Owner Profile</th>
                      <th className="py-3.5 px-4">Business Contact</th>
                      <th className="py-3.5 px-4">Registered Date</th>
                      <th className="py-3.5 px-4 text-center">System Access Switch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs sm:text-sm font-semibold">
                    {superAdminShops.map(s => (
                      <tr key={s.shopId} className="hover:bg-slate-900/30 transition duration-150">
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-200 text-sm sm:text-base">{s.name}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">{s.description || 'No description'}</div>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-indigo-400">{s.shopId}</td>
                        <td className="py-4 px-4">
                          <div className="text-slate-200 font-bold">{s.owner?.name || 'N/A'}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{s.owner?.email || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-350">
                          <div className="font-bold">{s.contact || <span className="text-slate-600 font-medium italic">None</span>}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-450 font-bold">
                          {new Date(s.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleShopStatus(s.shopId, s.isActive)}
                            className={`px-5 py-1.5 rounded-xl text-xs font-extrabold uppercase transition active:scale-95 border ${
                              s.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/30'
                            }`}
                          >
                            {s.isActive ? 'Active (Suspend)' : 'Suspended (Activate)'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
