import React from 'react';

export default function PosView({
  adminMode,
  editingProduct,
  selectProductForEditing,
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  setSelectedCategory,
  productsLoading,
  filteredProducts,
  getProductWeight,
  cart,
  addToCart,
  getMultiplier,
  clearAdminForm,
  handleAdminSubmit,
  loading,
  adminName,
  setAdminName,
  adminSku,
  setAdminSku,
  adminPrice,
  setAdminPrice,
  adminStock,
  setAdminStock,
  adminCategory,
  handleDeleteProduct,
  showMobileCart,
  setShowMobileCart,
  customerPhone,
  setCustomerPhone,
  customerName,
  setCustomerName,
  customerEmail,
  setCustomerEmail,
  updateQuantity,
  billingTotals,
  paymentMethod,
  setPaymentMethod,
  handleCheckout,
  enteringCustomFor,
  setEnteringCustomFor,
  handleInlineCustomWeightSubmit,
  setSelectedWeights,
  selectedWeights,
  triggerNotification
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
      {/* Catalog Selector */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        {adminMode && (
          <div className="bg-indigo-955/40 border border-indigo-500/30 p-4 rounded-2xl flex items-center gap-4 backdrop-blur-sm animate-pulse">
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="text-sm font-extrabold text-indigo-300">Catalog Editor Active</p>
              <p className="text-xs text-indigo-455/90 mt-0.5 font-medium">
                Click any product card below to populate the edit form and update prices, stock, or delete the item.
              </p>
            </div>
          </div>
        )}

        {/* Filter Tools */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-500 transition font-medium"
            />
            <span className="absolute left-4 top-3.5 text-sm text-slate-555">🔍</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4.5 py-2 rounded-full text-sm font-extrabold whitespace-nowrap active:scale-95 transition duration-150 ${
                  selectedCategory === cat
                    ? adminMode ? 'bg-indigo-500 text-slate-950 font-black' : 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        {productsLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-900/10 border border-dashed border-slate-800/80 rounded-2xl min-h-[300px]">
            <span className="text-4xl mb-3">📦</span>
            <p className="text-slate-400 font-extrabold text-sm sm:text-base">No active products found</p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 font-semibold">
              Add items via the Catalog Manager to populate your store catalog.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map(product => {
              const selectedWeight = getProductWeight(product._id);
              const cartQty = cart.find(i => i.productId === product._id && i.weightChoice === selectedWeight)?.quantity || 0;
              
              // Calculate remaining stock
              const stockUsedInCart = cart
                .filter(item => item.productId === product._id)
                .reduce((sum, item) => sum + (item.quantity * getMultiplier(item.weightChoice)), 0);
              const remainingStock = parseFloat((product.stock - stockUsedInCart).toFixed(2));
              
              const isOutOfStock = remainingStock <= 0;
              const isBeingEdited = editingProduct && editingProduct._id === product._id;

              const multiplier = getMultiplier(selectedWeight);
              const displayedPrice = product.price * multiplier;

              return (
                <div
                  key={product._id}
                  onClick={() => {
                    if (adminMode) {
                      selectProductForEditing(product);
                    } else if (!isOutOfStock) {
                      addToCart(product, selectedWeight);
                    }
                  }}
                  className={`group relative flex flex-col justify-between p-4.5 rounded-2xl border transition duration-200 cursor-pointer select-none bg-slate-900/40 hover:bg-slate-900/80 active:scale-98 ${
                    adminMode 
                      ? isBeingEdited 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-950/15' 
                        : 'border-slate-800 hover:border-indigo-500/50' 
                      : isOutOfStock 
                        ? 'border-slate-900 opacity-50 cursor-not-allowed' 
                        : 'border-slate-800 hover:border-emerald-500/50'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-slate-100 font-extrabold text-sm sm:text-base leading-snug group-hover:text-emerald-400 transition">
                        {product.name}
                      </h3>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-800 font-bold whitespace-nowrap">
                        {product.sku}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span>Stock Status:</span>
                      {isOutOfStock ? (
                        <span className="text-rose-500 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                          Out of stock
                        </span>
                      ) : (
                        <span className="font-mono text-slate-300 font-bold">{remainingStock} kg left</span>
                      )}
                    </div>

                    {/* Weight choice triggers inside shopping mode */}
                    {!adminMode && (
                      enteringCustomFor[product._id] ? (
                        <div className="flex mt-3.5 gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            autoFocus
                            placeholder="Grams..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-100 placeholder-slate-550 focus:outline-none focus:border-emerald-500 font-mono"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInlineCustomWeightSubmit(product, e.target.value);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              const inputVal = e.currentTarget.previousSibling.value;
                              handleInlineCustomWeightSubmit(product, inputVal);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2.5 py-1 rounded text-xs active:scale-95 transition"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEnteringCustomFor(prev => ({ ...prev, [product._id]: false }))}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 py-1 rounded text-xs border border-slate-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex bg-slate-950/60 p-1 rounded-lg border border-slate-800 mt-3.5 gap-1" onClick={(e) => e.stopPropagation()}>
                          {['1kg', '500g', '250g'].map((wt) => (
                            <button
                              key={wt}
                              type="button"
                              onClick={() => setSelectedWeights(prev => ({ ...prev, [product._id]: wt }))}
                              className={`flex-1 text-xs font-black py-1.5 rounded transition duration-150 ${
                                selectedWeight === wt
                                  ? 'bg-emerald-500 text-slate-950 font-black'
                                  : 'text-slate-455 hover:text-slate-200 hover:bg-slate-900/40'
                              }`}
                            >
                              {wt}
                            </button>
                          ))}
                          
                          {!['1kg', '500g', '250g'].includes(selectedWeight) && (
                            <button
                              type="button"
                              className="flex-1 text-xs font-black py-1.5 rounded bg-emerald-500 text-slate-950 font-black"
                            >
                              {selectedWeight}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setEnteringCustomFor(prev => ({ ...prev, [product._id]: true }))}
                            className="flex-1 text-xs font-black py-1.5 rounded transition duration-150 text-slate-455 hover:text-slate-200 hover:bg-slate-900/40"
                          >
                            Custom
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-auto pt-4">
                    <span className={`${adminMode ? 'text-indigo-400' : 'text-emerald-400'} font-black text-base sm:text-xl font-mono`}>
                      ₹{displayedPrice.toFixed(2)}
                    </span>
                    
                    {adminMode ? (
                      <span className={`text-xs px-3 py-1.5 rounded-xl font-extrabold uppercase transition ${
                        isBeingEdited ? 'bg-indigo-600 text-slate-100 border border-indigo-500 shadow-md' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isBeingEdited ? 'Editing' : 'Manage'}
                      </span>
                    ) : cartQty > 0 ? (
                      <span className="bg-emerald-500 text-slate-955 font-black text-sm h-8 px-3.5 rounded-full flex items-center justify-center">
                        {cartQty}x
                      </span>
                    ) : (
                      <span className="bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-955 text-slate-300 font-extrabold text-sm h-8 w-8 rounded-full flex items-center justify-center transition duration-150">
                        +
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form / Invoice Cart details container */}
      <div className="lg:col-span-1 flex flex-col">
        {adminMode ? (
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 sticky top-6">
            <div className="pb-3 border-b border-slate-800/80 flex justify-between items-center">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                🛠️ Product Manager
              </h2>
              {editingProduct && (
                <button
                  type="button"
                  onClick={clearAdminForm}
                  className="text-xs px-3 py-1 bg-slate-950 text-slate-450 hover:text-slate-200 border border-slate-800 rounded-lg transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleAdminSubmit} className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                {editingProduct ? '✏️ Update Catalog Item' : '✨ Add New Product'}
              </h3>

              <div className="flex flex-col gap-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Organic Almonds"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-105 placeholder-slate-550 transition font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={adminSku}
                    onChange={(e) => setAdminSku(e.target.value)}
                    placeholder="e.g. ALM-01"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-105 placeholder-slate-550 transition font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Price per 1kg (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={adminPrice}
                      onChange={(e) => setAdminPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-105 placeholder-slate-550 transition font-medium font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Stock in kg *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={adminStock}
                      onChange={(e) => setAdminStock(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-105 placeholder-slate-550 transition font-medium font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={adminCategory}
                    onChange={(e) => setAdminCategory(e.target.value)}
                    placeholder="e.g. Premium, Classic, Regular"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-105 placeholder-slate-550 transition font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-slate-100 font-bold text-xs uppercase tracking-widest rounded-xl transition duration-155 shadow-lg shadow-indigo-500/10"
                >
                  {loading ? 'Processing...' : editingProduct ? '💾 Save Changes' : '✨ Create Product'}
                </button>

                {editingProduct && (
                  <button
                    type="button"
                    onClick={handleDeleteProduct}
                    disabled={loading}
                    className="w-full py-2.5 bg-rose-955/40 hover:bg-rose-900/40 text-rose-455 hover:text-rose-350 font-bold text-xs uppercase tracking-widest rounded-xl border border-rose-500/20 hover:border-rose-500/40 transition duration-155"
                  >
                    🗑️ Delete Product
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          // CASHIER BILLING CART
          <div className={`flex-1 flex flex-col ${showMobileCart ? 'fixed inset-0 z-40 bg-slate-950 p-5 overflow-y-auto' : 'hidden md:flex'}`}>
            <div className="md:hidden flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-slate-205">POS Billing Cart</h2>
              <button
                type="button"
                onClick={() => setShowMobileCart(false)}
                className="text-sm px-4 py-2 bg-slate-900 text-slate-450 border border-slate-800 rounded-xl"
              >
                ✕ Close Cart
              </button>
            </div>

            <form onSubmit={handleCheckout} className="flex-1 flex flex-col gap-5 sticky top-6">
              {/* Customer details */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
                <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-2">
                  👤 Customer Profile
                </h2>
                <div className="flex flex-col gap-3">
                  <div className="relative flex items-center w-full">
                    <span className="absolute left-4 text-sm text-slate-455 font-mono font-bold select-none pointer-events-none">+91</span>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setCustomerPhone(val);
                      }}
                      placeholder="WhatsApp Mobile Number (10 digits) *"
                      className="w-full pl-14 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm sm:text-base focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-500 transition font-mono font-bold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name *"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-550 transition font-medium"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email Address (Optional for E-billing)"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-550 transition font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Selected Cart Items */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex-1 flex flex-col min-h-[240px]">
                <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-slate-400 mb-3.5 flex justify-between items-center">
                  <span>🛒 Cart Selection</span>
                  <span className="text-xs font-mono font-bold lowercase text-slate-500">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)} choices
                  </span>
                </h2>

                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
                    <span className="text-3xl mb-1.5 opacity-70">🛒</span>
                    <p className="text-xs sm:text-sm text-slate-500 font-bold">POS Cart is empty.</p>
                    <p className="text-[10px] sm:text-xs text-slate-600 mt-1 font-semibold">Select items in the catalog to begin invoice.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-[260px] pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800">
                    {cart.map(item => (
                      <div key={`${item.productId}-${item.weightChoice}`} className="flex justify-between items-center bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                        <div className="flex-1 pr-2">
                          <p className="text-sm font-bold text-slate-200 line-clamp-1">
                            {item.name}
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-850 text-slate-400 font-extrabold ml-1.5 uppercase font-mono">
                              {item.weightChoice}
                            </span>
                          </p>
                          <p className="text-xs text-slate-455 mt-0.5 font-bold font-mono">₹{item.price.toFixed(2)} each</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.weightChoice, -1)}
                            className="h-7 w-7 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-xs active:scale-90 font-black"
                          >
                            -
                          </button>
                          <span className="text-sm font-mono font-bold w-4 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.weightChoice, 1)}
                            className="h-7 w-7 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-xs active:scale-90 font-black"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-200">₹{billingTotals.subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-black text-slate-100 pt-3 border-t border-dashed border-slate-800">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-400 text-base sm:text-lg lg:text-xl font-black">₹{billingTotals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment and checkout triggers */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">
                    💵 Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'Card', 'UPI'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 rounded-xl text-xs font-bold border transition duration-150 ${
                          paymentMethod === method
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/60 shadow-inner'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-455'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:pointer-events-none text-slate-955 font-black text-xs sm:text-sm uppercase tracking-widest rounded-xl transition duration-150 shadow-xl shadow-emerald-500/15"
                >
                  {loading ? 'Processing POS Bill...' : '⚡ Generate & Dispatch Receipt'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
