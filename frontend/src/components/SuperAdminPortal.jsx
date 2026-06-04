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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 md:p-8 flex flex-col gap-6 text-left">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-none">
              Platform Admin Panel
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-widest">
              Super Admin
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-500 mt-1.5 font-semibold">Track registered business shops and manage platform access status</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={fetchSuperAdminData}
            className="flex-1 lg:flex-initial px-5 py-2.5 text-xs font-extrabold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 shadow-sm transition"
          >
            🔄 Refresh Platform Data
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 lg:flex-initial px-5 py-2.5 text-xs font-extrabold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-sm transition"
          >
            Logout Control Room
          </button>
        </div>
      </header>

      {superAdminLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Platform metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/50 shadow-sm transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">Total Registered Shops</span>
                <h3 className="text-3xl font-black text-slate-900 font-mono mt-1">
                  {superAdminMetrics?.totalShops || 0}
                </h3>
              </div>
              <span className="text-xs text-indigo-600 font-extrabold mt-4 uppercase tracking-wider block">
                🏢 Tenant Registry Count
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-500/50 shadow-sm transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">Active Store Access</span>
                <h3 className="text-3xl font-black text-slate-900 font-mono mt-1">
                  {superAdminMetrics?.activeShops || 0}
                </h3>
              </div>
              <span className="text-xs text-emerald-600 font-extrabold mt-4 uppercase tracking-wider block">
                🟢 Logins Allowed
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-rose-500/50 shadow-sm transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">Suspended Access</span>
                <h3 className="text-3xl font-black text-slate-900 font-mono mt-1">
                  {superAdminMetrics?.suspendedShops || 0}
                </h3>
              </div>
              <span className="text-xs text-rose-600 font-extrabold mt-4 uppercase tracking-wider block">
                🔴 Access Denied
              </span>
            </div>
          </div>

          {/* Shop access management grid */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-sm">
            <div className="border-b border-slate-200 pb-4 mb-4">
              <h3 className="text-xs sm:text-sm font-black uppercase text-indigo-600 tracking-wider">🏢 Registered Shops & Merchant Info</h3>
            </div>

            <div className="overflow-x-auto">
              {superAdminShops.length === 0 ? (
                <div className="text-center p-10 border border-dashed border-slate-200 rounded-2xl my-4">
                  <span className="text-4xl mb-2 block">🏢</span>
                  <p className="text-slate-500 font-bold text-sm">No registered tenant shops registered on this SaaS platform.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase font-extrabold tracking-wider bg-slate-50/50">
                      <th className="py-3.5 px-4 rounded-l-xl">Store Name & Info</th>
                      <th className="py-3.5 px-4">Tenant ID</th>
                      <th className="py-3.5 px-4">Owner Profile</th>
                      <th className="py-3.5 px-4">Business Contact</th>
                      <th className="py-3.5 px-4">Registered Date</th>
                      <th className="py-3.5 px-4 text-center rounded-r-xl">System Access Switch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-semibold">
                    {superAdminShops.map(s => (
                      <tr key={s.shopId} className="hover:bg-slate-50 transition duration-150">
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800 text-sm sm:text-base">{s.name}</div>
                          <div className="text-xs text-slate-400 font-medium mt-0.5">{s.description || 'No description'}</div>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-indigo-600">{s.shopId}</td>
                        <td className="py-4 px-4">
                          <div className="text-slate-800 font-bold">{s.owner?.name || 'N/A'}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{s.owner?.email || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-700">
                          <div className="font-bold">{s.contact || <span className="text-slate-400 font-medium italic">None</span>}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-600 font-bold">
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
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
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
