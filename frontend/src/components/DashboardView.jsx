import React from 'react';

const getLocalDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DashboardView({
  analytics,
  bills,
  customers,
  dashboardLoading,
  dashboardTab,
  setDashboardTab,
  billsSearch,
  setBillsSearch,
  customersSearch,
  setCustomersSearch,
  setSelectedInvoice,
  filterDate,
  setFilterDate,
  filteredBills,
  dateInputRef
}) {
  return (
    <div className="flex-1 flex flex-col gap-8">
      {dashboardLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Analytics KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200/80 p-6 rounded-2xl flex flex-col justify-between hover:border-blue-500/40 hover:shadow-md hover:shadow-blue-500/5 shadow-sm transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Cumulative Sales Revenue</span>
                <h3 className="text-3xl font-black text-slate-800 font-mono mt-1">
                  ₹{analytics?.metrics?.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                </h3>
              </div>
              <span className="text-xs text-blue-600 font-extrabold mt-4 flex items-center gap-1.5 uppercase tracking-wider">
                📈 Live Shop Billings
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 shadow-sm transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Total Transactions</span>
                <h3 className="text-3xl font-black text-slate-800 font-mono mt-1">
                  {analytics?.metrics?.totalBills || 0}
                </h3>
              </div>
              <span className="text-xs text-emerald-600 font-extrabold mt-4 flex items-center gap-1.5 uppercase tracking-wider">
                📄 Invoice count
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/40 hover:shadow-md hover:shadow-indigo-500/5 shadow-sm transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Active Customers</span>
                <h3 className="text-3xl font-black text-slate-800 font-mono mt-1">
                  {analytics?.metrics?.totalCustomers || 0}
                </h3>
              </div>
              <span className="text-xs text-indigo-600 font-extrabold mt-4 flex items-center gap-1.5 uppercase tracking-wider">
                👥 Registered clients
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 rounded-2xl flex flex-col justify-between hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-500/5 shadow-sm transition duration-200">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Delivery Success</span>
                <div className="text-xs space-y-1 mt-2 text-slate-650 font-bold">
                  <div className="flex justify-between items-center">
                    <span>WhatsApp Sent:</span>
                    <span className="font-mono text-emerald-600">
                      {bills.filter(b => b.whatsappStatus === 'Sent').length} / {bills.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Email Sent:</span>
                    <span className="font-mono text-emerald-600">
                      {bills.filter(b => b.emailStatus === 'Sent').length} / {bills.filter(b => b.emailStatus && b.emailStatus !== 'N/A').length}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-100 pt-1.5">
                ⚙️ Queue transmission rate
              </span>
            </div>
          </div>

          {/* Aggregation Charts & Data breakdown */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Payments Breakdown widget */}
              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-4">💵 Payment Methods Breakdown</h3>
                {analytics.paymentBreakdown?.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-5">No payment stats compiled yet.</p>
                ) : (
                  <div className="space-y-3.5">
                    {analytics.paymentBreakdown.map(item => {
                      const percent = (item.amount / (analytics.metrics.totalRevenue || 1)) * 100;
                      return (
                        <div key={item._id} className="space-y-1.5">
                          <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-700">
                            <span>{item._id} ({item.count} bills)</span>
                            <span className="font-mono text-blue-600">₹{item.amount.toFixed(2)} ({percent.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top selling inventory widget */}
              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-4">⭐ Top Selling Product Items</h3>
                {analytics.topProducts?.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-5">No sales inventory stats recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {analytics.topProducts.map((item, index) => (
                      <div key={item._id} className="flex justify-between py-2.5 items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-blue-600">#{index+1}</span>
                          <span className="font-bold text-slate-800">{item._id}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-600 font-mono">{item.quantity} kg sold</div>
                          <div className="text-xs text-blue-600 font-mono">₹{item.revenue.toFixed(2)} revenue</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tables panel */}
          <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col gap-5 flex-1 animate-fadeIn">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 border-b border-slate-200 pb-4">
              <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 self-start animate-fadeIn">
                <button
                  type="button"
                  onClick={() => setDashboardTab('bills')}
                  className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition duration-150 ${
                    dashboardTab === 'bills' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10 font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📜 Invoices History ({dashboardTab === 'bills' ? filteredBills.length : bills.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardTab('customers')}
                  className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition duration-155 ${
                    dashboardTab === 'customers' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10 font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  👥 Clients Database ({customers.length})
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
                {dashboardTab === 'bills' && (
                  <div 
                    onClick={() => {
                      try {
                        dateInputRef.current?.showPicker();
                      } catch (err) {
                        console.warn("showPicker is not supported or failed:", err);
                      }
                    }}
                    className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 focus-within:bg-white transition cursor-pointer flex-shrink-0 gap-2"
                  >
                    <span className="text-[10px] text-slate-500 font-black uppercase select-none whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                      <span>📅</span>
                      <span>Date:</span>
                    </span>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 focus:outline-none font-bold font-mono cursor-pointer scheme-light min-w-[115px] select-none"
                    />
                  </div>
                )}
                <div className="relative w-full sm:max-w-xs flex-1 sm:flex-initial min-w-[200px] sm:min-w-[260px]">
                  {dashboardTab === 'bills' ? (
                    <input
                      type="text"
                      value={billsSearch}
                      onChange={(e) => setBillsSearch(e.target.value)}
                      placeholder="Search by # or client..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 transition font-mono font-bold"
                    />
                  ) : (
                    <input
                      type="text"
                      value={customersSearch}
                      onChange={(e) => setCustomersSearch(e.target.value)}
                      placeholder="Search by name or phone..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 transition font-bold"
                    />
                  )}
                  <span className="absolute left-3 top-3 text-xs sm:text-sm text-slate-400">🔍</span>
                </div>
              </div>
            </div>

            {dashboardTab === 'bills' ? (
              <div className="flex flex-col gap-5 animate-fadeIn">
                <div className="overflow-x-auto">
                  {filteredBills.length === 0 ? (
                    <div className="text-center p-10 border border-dashed border-slate-200 rounded-2xl my-4">
                      <span className="text-4xl mb-2 block">📄</span>
                      <p className="text-slate-500 font-bold text-sm">No invoices found matching criteria.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase font-extrabold tracking-wider">
                          <th className="py-3 px-4">Invoice #</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Total</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4">WhatsApp</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-semibold">
                        {filteredBills.map(bill => (
                          <tr key={bill._id} className="hover:bg-slate-50 transition duration-150">
                            <td className="py-3.5 px-4 font-mono font-black text-blue-600">{bill.invoiceNumber}</td>
                            <td className="py-3.5 px-4 text-left">
                              <div className="font-bold text-slate-800">{bill.customer?.name || 'Walk-in'}</div>
                              <div className="text-xs text-slate-400 font-mono font-bold mt-0.5">{bill.customer?.phone}</div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-bold">
                              {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-blue-600 font-mono">₹{bill.total.toFixed(2)}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 border border-slate-200 text-slate-600">
                                {bill.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold border ${
                                bill.whatsappStatus === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                                bill.whatsappStatus === 'Failed' ? 'bg-rose-50 text-rose-700 border-rose-150' :
                                'bg-amber-50 text-amber-700 border-amber-150'
                              }`}>
                                {bill.whatsappStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold border ${
                                bill.emailStatus === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                                bill.emailStatus === 'Failed' ? 'bg-rose-50 text-rose-700 border-rose-150' :
                                bill.emailStatus === 'N/A' ? 'bg-slate-100 text-slate-400 border-transparent' :
                                'bg-amber-50 text-amber-700 border-amber-150'
                              }`}>
                                {bill.emailStatus || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(bill)}
                                className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-500/40 text-blue-600 font-bold rounded-lg transition active:scale-95 text-xs whitespace-nowrap"
                              >
                                📄 Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Navigation Arrow at the bottom for seeing prev/next day sales */}
                <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-slate-200 mt-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const current = new Date(filterDate);
                      current.setDate(current.getDate() - 1);
                      setFilterDate(getLocalDateString(current));
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-500/40 text-blue-600 font-bold transition duration-200 active:scale-95 text-xs group"
                  >
                    <span className="group-hover:-translate-x-0.5 transition duration-200">←</span>
                    <span>Previous Day's Sales</span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                      ({new Date(new Date(filterDate).setDate(new Date(filterDate).getDate() - 1)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                    </span>
                  </button>

                  <div 
                    onClick={() => {
                      try {
                        dateInputRef.current?.showPicker();
                      } catch (err) {
                        console.warn("showPicker is not supported or failed:", err);
                      }
                    }}
                    className="text-xs text-slate-550 font-mono font-bold bg-slate-50 border border-slate-200 hover:border-blue-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 select-none cursor-pointer transition"
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <span>{new Date(filterDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>

                  {filterDate !== getLocalDateString(new Date()) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const current = new Date(filterDate);
                        current.setDate(current.getDate() + 1);
                        setFilterDate(getLocalDateString(current));
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-500/40 text-blue-600 font-bold transition duration-200 active:scale-95 text-xs group"
                    >
                      <span>Next Day's Sales</span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        ({new Date(new Date(filterDate).setDate(new Date(filterDate).getDate() + 1)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                      </span>
                      <span className="group-hover:translate-x-0.5 transition duration-200">→</span>
                    </button>
                  ) : (
                    <div className="hidden sm:block w-[180px]" />
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto animate-fadeIn">
                {customers.filter(cust => {
                  const search = customersSearch.toLowerCase();
                  const nameMatches = cust.name?.toLowerCase().includes(search);
                  const phoneMatches = cust.phone?.includes(search);
                  return nameMatches || phoneMatches;
                }).length === 0 ? (
                  <div className="text-center p-10 border border-dashed border-slate-200 rounded-2xl my-4">
                    <span className="text-4xl mb-2 block">👥</span>
                    <p className="text-slate-500 font-bold text-sm">No customer records found.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase font-extrabold tracking-wider">
                        <th className="py-3 px-4">Client Name</th>
                        <th className="py-3 px-4">WhatsApp Contact</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Registered Date</th>
                        <th className="py-3 px-4 text-right">Aggregate Sales Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-semibold">
                      {customers
                        .filter(cust => {
                          const search = customersSearch.toLowerCase();
                          const nameMatches = cust.name?.toLowerCase().includes(search);
                          const phoneMatches = cust.phone?.includes(search);
                          return nameMatches || phoneMatches;
                        })
                        .map(cust => (
                          <tr key={cust._id} className="hover:bg-slate-50 transition duration-155">
                            <td className="py-3.5 px-4 font-bold text-slate-800 text-left">{cust.name}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 text-left">{cust.phone}</td>
                            <td className="py-3.5 px-4 text-slate-500 font-bold text-left">{cust.email || <em className="text-slate-400 font-medium">None</em>}</td>
                            <td className="py-3.5 px-4 text-slate-500 font-bold text-left">
                              {new Date(cust.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-blue-600 font-mono text-sm sm:text-base">
                              ₹{(cust.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
