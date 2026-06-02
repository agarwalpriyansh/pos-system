import React from 'react';

export default function InvoiceModal({
  selectedInvoice,
  setSelectedInvoice,
  shop
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl flex flex-col gap-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Branded Receipt Title */}
        <div className="text-center pb-5 border-b border-dashed border-slate-300">
          <h2 className="text-2xl font-black tracking-widest text-slate-800 uppercase leading-none">{shop?.name || 'SaaS POS'}</h2>
          <p className="text-xs text-slate-505 font-bold uppercase tracking-wider mt-1">{shop?.description || 'Invoice Receipt'}</p>
          <p className="text-xs text-slate-550 font-semibold mt-0.5">Contact: {shop?.contact || 'support@saaspos.com'}</p>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-slate-650">
          <div className="flex justify-between">
            <span className="font-bold">Invoice Number:</span>
            <span className="font-mono font-black text-slate-800">{selectedInvoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Date & Time:</span>
            <span className="font-bold text-slate-800">
              {new Date(selectedInvoice.createdAt).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Payment Method:</span>
            <span className="font-extrabold text-slate-800">{selectedInvoice.paymentMethod}</span>
          </div>
          
          <div className="border-t border-slate-200 pt-3.5 mt-3">
            <div className="flex justify-between">
              <span className="font-bold">Customer Name:</span>
              <span className="font-extrabold text-slate-800">{selectedInvoice.customer?.name || 'Walk-in Customer'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">WhatsApp Number:</span>
              <span className="font-mono font-extrabold text-slate-800">{selectedInvoice.customer?.phone}</span>
            </div>
            {selectedInvoice.customer?.email && (
              <div className="flex justify-between">
                <span className="font-bold">Email:</span>
                <span className="text-slate-800 font-semibold">{selectedInvoice.customer.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Breakdown */}
        <div className="border-t border-slate-200 pt-4 mt-1">
          <span className="text-xs font-black uppercase text-slate-455 tracking-wider block mb-3">Itemized Breakdown</span>
          <div className="space-y-3">
            {selectedInvoice.items?.map((item, idx) => (
              <div key={item._id || idx} className="flex justify-between items-start text-xs sm:text-sm">
                <div className="flex-1 pr-4">
                  <span className="font-bold text-slate-800 block leading-tight">
                    {item.name}
                    {item.weightChoice && (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded font-bold ml-2 font-mono uppercase">
                        {item.weightChoice}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-505 font-bold">{item.quantity}x @ ₹{item.price.toFixed(2)}</span>
                </div>
                <span className="font-mono font-black text-slate-800">₹{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calculations & Grand Total */}
        <div className="border-t border-dashed border-slate-350 pt-4 mt-3 space-y-2">
          <div className="flex justify-between text-xs sm:text-sm text-slate-550 font-bold">
            <span>Subtotal Amount:</span>
            <span className="font-mono">₹{selectedInvoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm sm:text-base text-slate-800 font-black border-t border-slate-200 pt-3 mt-1">
            <span>Grand Total:</span>
            <span className="font-mono text-emerald-650 text-xl sm:text-2xl font-black">₹{selectedInvoice.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Broadcast Status */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-505 space-y-1.5 mt-1 font-semibold">
          <span className="font-black uppercase tracking-wider text-slate-400 text-[10px] block">Broadcast Statuses</span>
          <div className="flex justify-between">
            <span>WhatsApp Notification:</span>
            <span className={`font-black ${
              selectedInvoice.whatsappStatus === 'Sent' ? 'text-emerald-600' :
              selectedInvoice.whatsappStatus === 'Failed' ? 'text-rose-600' : 'text-amber-600'
            }`}>{selectedInvoice.whatsappStatus}</span>
          </div>
          <div className="flex justify-between">
            <span>Email Invoice:</span>
            <span className={`font-black ${
              selectedInvoice.emailStatus === 'Sent' ? 'text-emerald-600' :
              selectedInvoice.emailStatus === 'Failed' ? 'text-rose-600' : 'text-amber-600'
            }`}>{selectedInvoice.emailStatus || 'N/A'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSelectedInvoice(null)}
          className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-slate-100 font-bold text-xs sm:text-sm uppercase tracking-widest rounded-xl transition duration-150"
        >
          ✕ Close Receipt
        </button>
      </div>
    </div>
  );
}
