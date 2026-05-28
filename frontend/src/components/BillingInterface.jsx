import React, { useState, useEffect, useMemo } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function BillingInterface() {
  // Catalog & Core State
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);

  // Admin Mode States
  const [adminMode, setAdminMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null = "Add Mode", object = "Edit Mode"
  const [adminName, setAdminName] = useState('');
  const [adminSku, setAdminSku] = useState('');
  const [adminPrice, setAdminPrice] = useState('');
  const [adminCategory, setAdminCategory] = useState('');
  const [adminStock, setAdminStock] = useState('');

  // Cart & Invoice State
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Customer Information
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // UI States
  const [notification, setNotification] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Fetch products catalog
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await fetch(`${API_BASE_URL}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      console.warn('Backend offline, using fallback catalog.');
      setProducts([
        { _id: '1', name: 'Organic Espresso Blend', sku: 'ESP-001', price: 12.99, category: 'Coffee', stock: 25, isActive: true },
        { _id: '2', name: 'Cold Brew Concentrate', sku: 'CBC-002', price: 8.50, category: 'Beverages', stock: 15, isActive: true },
        { _id: '3', name: 'Premium Ceramic Mug', sku: 'MUG-003', price: 15.00, category: 'Merchandise', stock: 8, isActive: true },
        { _id: '4', name: 'Almond Croissant', sku: 'BAK-004', price: 4.25, category: 'Bakery', stock: 12, isActive: true },
        { _id: '5', name: 'Matcha Green Tea Powder', sku: 'MTC-005', price: 18.99, category: 'Tea', stock: 20, isActive: true },
        { _id: '6', name: 'Caramel Macchiato Syrup', sku: 'SYR-006', price: 6.99, category: 'Syrups', stock: 30, isActive: true }
      ]);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Show dynamic notifications
  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Derive categories list dynamically
  const categories = useMemo(() => {
    const activeProducts = products.filter(p => p.isActive !== false);
    const cats = new Set(activeProducts.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Filter active products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Filter out soft-deleted/inactive items
      if (product.isActive === false) return false;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Add Item to Cart
  const addToCart = (product) => {
    const existing = cart.find(item => item.productId === product._id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (product.stock <= currentQtyInCart) {
      triggerNotification('error', `Cannot exceed available stock of ${product.stock} units for ${product.name}`);
      return;
    }

    if (existing) {
      setCart(cart.map(item =>
        item.productId === product._id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price
      }]);
    }
    triggerNotification('success', `Added ${product.name} to invoice`);
  };

  // Update Cart Quantity
  const updateQuantity = (productId, delta) => {
    const product = products.find(p => p._id === productId);
    const existing = cart.find(item => item.productId === productId);

    if (!existing) return;

    const newQty = existing.quantity + delta;

    if (newQty <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
      triggerNotification('info', `Removed ${existing.name} from invoice`);
      return;
    }

    if (delta > 0 && product && product.stock < newQty) {
      triggerNotification('error', `Cannot exceed available stock of ${product.stock} units`);
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQty, total: newQty * item.price }
        : item
    ));
  };

  // Calculate totals
  const billingTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const total = parseFloat(subtotal.toFixed(2));
    return { subtotal, tax: 0, discount: 0, total };
  }, [cart]);

  // Handle sales checkout
  const handleCheckout = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      triggerNotification('error', 'Your POS cart is empty. Please select products first.');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(customerPhone)) {
      triggerNotification('error', 'Please provide a valid E.164 phone number (e.g. +1234567890)');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerPhone,
        customerName,
        customerEmail: customerEmail || undefined,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        tax: 0,
        discount: 0,
        paymentMethod
      };

      const res = await fetch(`${API_BASE_URL}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        triggerNotification('success', `Invoice ${data.bill.invoiceNumber} generated! WhatsApp job queued.`);
        
        // Update product inventory locally
        setProducts(prevProducts =>
          prevProducts.map(p => {
            const cartItem = cart.find(item => item.productId === p._id);
            return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
          })
        );

        // Reset cart and customer info
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setShowMobileCart(false);
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('error', `Checkout Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- ADMIN CATALOG MANAGEMENT ---
  
  // Set Product for Editing
  const selectProductForEditing = (product) => {
    setEditingProduct(product);
    setAdminName(product.name);
    setAdminSku(product.sku);
    setAdminPrice(product.price);
    setAdminCategory(product.category);
    setAdminStock(product.stock);
  };

  // Clear editing selection
  const clearAdminForm = () => {
    setEditingProduct(null);
    setAdminName('');
    setAdminSku('');
    setAdminPrice('');
    setAdminCategory('');
    setAdminStock('');
  };

  // Add or Update product
  const handleAdminSubmit = async (e) => {
    e.preventDefault();

    if (!adminName || !adminSku || adminPrice === '' || adminStock === '') {
      triggerNotification('error', 'All product fields are required.');
      return;
    }

    setLoading(true);
    const payload = {
      name: adminName,
      sku: adminSku,
      price: parseFloat(adminPrice),
      category: adminCategory || 'General',
      stock: parseInt(adminStock, 10)
    };

    try {
      if (editingProduct) {
        // Edit Mode: PUT /api/products/:id
        const res = await fetch(`${API_BASE_URL}/products/${editingProduct._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
          triggerNotification('success', `Product "${data.name}" updated successfully!`);
          setProducts(products.map(p => p._id === data._id ? data : p));
          clearAdminForm();
        } else {
          throw new Error(data.error || 'Failed to update product');
        }
      } else {
        // Create Mode: POST /api/products
        const res = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
          triggerNotification('success', `Product "${data.name}" added successfully!`);
          setProducts([...products, data]);
          clearAdminForm();
        } else {
          throw new Error(data.error || 'Failed to add product');
        }
      }
    } catch (err) {
      triggerNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Soft Delete (Deactivate) Product
  const handleDeleteProduct = async () => {
    if (!editingProduct) return;

    if (!window.confirm(`Are you sure you want to deactivate and remove "${editingProduct.name}" from active sales?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/products/${editingProduct._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        triggerNotification('info', `Product "${editingProduct.name}" deactivated.`);
        // Locally hide the deleted item or flag it
        setProducts(products.map(p => p._id === editingProduct._id ? { ...p, isActive: false } : p));
        
        // Remove from cart if it was selected
        setCart(cart.filter(item => item.productId !== editingProduct._id));
        clearAdminForm();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to deactivate product');
      }
    } catch (err) {
      triggerNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 sm:p-6 md:p-8 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 border ${
          notification.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' :
          notification.type === 'error' ? 'bg-rose-950/90 text-rose-300 border-rose-500/30' :
          'bg-cyan-950/90 text-cyan-300 border-cyan-500/30'
        }`}>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
            DS Billing
          </h1>
          <p className="text-s text-slate-400 mt-1">DS Dryfruits, A Premium Dryfruits store</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Admin Mode Toggle Button */}
          <button
            onClick={() => {
              setAdminMode(!adminMode);
              clearAdminForm();
            }}
            className={`flex-1 sm:flex-initial text-xs px-4 py-2 font-extrabold rounded-xl transition duration-150 active:scale-95 border ${
              adminMode 
                ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-slate-100 shadow-md shadow-indigo-500/10' 
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            🛠️ {adminMode ? 'Exit Admin Mode' : 'Manage Products'}
          </button>

          
          {/* Mobile floating Cart indicator toggler */}
          {!adminMode && (
            <button
              onClick={() => setShowMobileCart(!showMobileCart)}
              className="md:hidden flex-1 flex items-center justify-center gap-2 text-xs px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl active:scale-95 transition duration-150 shadow-lg shadow-emerald-500/20"
            >
              🛒 Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        
        {/* Left Side: Product Selector (Catalog) */}
        <div className="md:col-span-2 flex flex-col gap-4">
          
          {/* Info Banner when in Admin Mode */}
          {adminMode && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-2xl flex items-center gap-3 backdrop-blur-sm animate-pulse">
              <span className="text-xl">⚙️</span>
              <div>
                <p className="text-xs font-extrabold text-indigo-300">Catalog Editor Active</p>
                <p className="text-[10px] text-indigo-400/80 mt-0.5">Click any product below to populate the edit form and update prices, stock, or deactivate it.</p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-500 transition duration-150"
              />
              <span className="absolute left-3.5 top-3.5 text-slate-500">🔍</span>
            </div>

            {/* Horizontal Scroll Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap active:scale-95 transition duration-150 ${
                    selectedCategory === cat
                      ? adminMode ? 'bg-indigo-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {productsLoading ? (
            <div className="flex-1 flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900/10 border border-dashed border-slate-800/80 rounded-2xl min-h-[300px]">
              <span className="text-3xl mb-2">📦</span>
              <p className="text-slate-400 font-medium">No active products found</p>
              <p className="text-xs text-slate-600 mt-1">Try modifying your filter or create new catalog items.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const cartQty = cart.find(i => i.productId === product._id)?.quantity || 0;
                const isOutOfStock = product.stock <= 0;
                const isBeingEdited = editingProduct && editingProduct._id === product._id;

                return (
                  <div
                    key={product._id}
                    onClick={() => {
                      if (adminMode) {
                        selectProductForEditing(product);
                      } else if (!isOutOfStock) {
                        addToCart(product);
                      }
                    }}
                    className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition duration-200 cursor-pointer select-none bg-slate-900/40 hover:bg-slate-900/80 active:scale-98 ${
                      adminMode 
                        ? isBeingEdited 
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-950/15' 
                          : 'border-slate-800 hover:border-indigo-500/50'
                        : isOutOfStock 
                          ? 'opacity-50 border-slate-900 cursor-not-allowed' 
                          : cartQty > 0 
                            ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' 
                            : 'border-slate-855'
                    }`}
                  >
                    {/* Floating Stock Tag */}
                    <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-bold rounded-full uppercase tracking-wider ${
                      isOutOfStock ? 'bg-rose-950/60 text-rose-400' :
                      product.stock <= 5 ? 'bg-amber-950/60 text-amber-400' : 'bg-slate-950/60 text-slate-400'
                    }`}>
                      {isOutOfStock ? 'Sold Out' : `Qty: ${product.stock}`}
                    </span>

                    <div className="mb-4 pr-10 md:pr-12">
                      <span className="text-slate-500 text-[10px] md:text-xs uppercase font-mono tracking-wider">{product.sku}</span>
                      <h3 className={`font-black text-sm md:text-lg lg:text-xl text-slate-200 transition-colors duration-150 line-clamp-2 mt-0.5 ${
                        adminMode ? 'group-hover:text-indigo-400' : 'group-hover:text-emerald-400'
                      }`}>
                        {product.name}
                      </h3>
                      <p className="text-slate-500 text-xs md:text-sm mt-1 md:mt-1.5">{product.category}</p>
                    </div>

                    <div className="flex justify-between items-center mt-auto">
                      <span className={`${adminMode ? 'text-indigo-400' : 'text-emerald-400'} font-black text-lg md:text-2xl lg:text-3xl`}>
                        ₹{product.price.toFixed(2)}
                      </span>
                      
                      {adminMode ? (
                        <span className={`text-xs md:text-sm px-2 py-1 md:px-3 md:py-1.5 rounded font-bold uppercase transition ${
                          isBeingEdited ? 'bg-indigo-600 text-slate-100' : 'bg-slate-800 group-hover:bg-indigo-600 text-slate-450 group-hover:text-slate-100'
                        }`}>
                          {isBeingEdited ? 'Editing' : 'Select'}
                        </span>
                      ) : cartQty > 0 ? (
                        <span className="bg-emerald-500 text-slate-950 font-black text-xs md:text-base h-7 px-2.5 md:h-9 md:px-4 rounded-full flex items-center justify-center">
                          {cartQty}x
                        </span>
                      ) : (
                        <span className="bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-300 font-bold text-xs md:text-base h-7 w-7 md:h-9 md:w-9 rounded-full flex items-center justify-center transition duration-150">
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

        {/* Right Side: DYNAMIC INVOICE CART OR ADMIN PRODUCT MANAGEMENT */}
        <div className="md:col-span-1 flex flex-col">
          {adminMode ? (
            
            // ==========================================
            // ADMIN MODE: CATALOG MANAGER CONTROLS
            // ==========================================
            <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl flex flex-col gap-4 sticky top-6">
              
              <div className="pb-2 border-b border-slate-800/80 flex justify-between items-center">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <span>⚙️ Product Manager</span>
                </h2>
                {editingProduct && (
                  <button
                    onClick={clearAdminForm}
                    className="text-[10px] px-2 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg transition"
                  >
                    Clear Select
                  </button>
                )}
              </div>

              <form onSubmit={handleAdminSubmit} className="flex flex-col gap-3.5">
                
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest pl-1">
                  {editingProduct ? '✏️ Edit Selected Item' : '✨ Add New Catalog Item'}
                </h3>

                {/* Form Fields */}
                <div className="flex flex-col gap-3.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                  
                  <div>
                    <label className="text-xs md:text-base font-bold text-slate-400 block mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Organic French Roast"
                      className="w-full px-3 py-2 md:px-4 md:py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm md:text-base lg:text-lg focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-650 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs md:text-base font-bold text-slate-400 block mb-1">SKU identifier *</label>
                    <input
                      type="text"
                      required
                      value={adminSku}
                      onChange={(e) => setAdminSku(e.target.value)}
                      placeholder="e.g. COF-102"
                      className="w-full px-3 py-2 md:px-4 md:py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm md:text-base lg:text-lg focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-655 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs md:text-base font-bold text-slate-400 block mb-1">Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={adminPrice}
                        onChange={(e) => setAdminPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 md:px-4 md:py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm md:text-base lg:text-lg focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-655 transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-base font-bold text-slate-400 block mb-1">Stock Level *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={adminStock}
                        onChange={(e) => setAdminStock(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 md:px-4 md:py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm md:text-base lg:text-lg focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-655 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs md:text-base font-bold text-slate-400 block mb-1">Category *</label>
                    <input
                      type="text"
                      required
                      value={adminCategory}
                      onChange={(e) => setAdminCategory(e.target.value)}
                      placeholder="e.g. Coffee, Bakery, Merchandise"
                      className="w-full px-3 py-2 md:px-4 md:py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm md:text-base lg:text-lg focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-655 transition"
                    />
                  </div>

                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 md:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-slate-100 font-black text-xs md:text-sm lg:text-base uppercase tracking-widest rounded-xl transition duration-150 shadow-lg shadow-indigo-500/10 disabled:opacity-40"
                  >
                    {loading ? 'Processing...' : editingProduct ? '💾 Save Changes' : '✨ Create Product'}
                  </button>

                  {editingProduct && (
                    <button
                      type="button"
                      onClick={handleDeleteProduct}
                      disabled={loading}
                      className="w-full py-2.5 md:py-3.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 font-black text-xs md:text-sm lg:text-base uppercase tracking-widest rounded-xl border border-rose-500/20 hover:border-rose-500/40 transition duration-150 disabled:opacity-40"
                    >
                      🗑️ Deactivate Product
                    </button>
                  )}
                </div>

              </form>

            </div>
          ) : (

            // ==========================================
            // CASHIER MODE: DYNAMIC POS BILLING CART
            // ==========================================
            <div className={`flex-1 flex flex-col ${showMobileCart ? 'fixed inset-0 z-40 bg-slate-950 p-4 overflow-y-auto' : 'hidden md:flex'}`}>
              
              {/* Mobile Cart Toggler header */}
              <div className="md:hidden flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                <h2 className="text-lg font-bold">POS Billing Cart</h2>
                <button
                  onClick={() => setShowMobileCart(false)}
                  className="text-xs px-3 py-1.5 bg-slate-900 text-slate-400 border border-slate-800 rounded-xl"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleCheckout} className="flex-1 flex flex-col gap-4 sticky top-6">
                
                {/* Customer Details */}
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl backdrop-blur-md">
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    👤 Customer Details
                  </h2>
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer Name *"
                        className="w-full px-3 py-2.5 md:py-3 bg-slate-950 border border-slate-855 rounded-xl text-xs md:text-base focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-650 transition"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="WhatsApp Number (e.g. +1234567890) *"
                        className="w-full px-3 py-2.5 md:py-3 bg-slate-950 border border-slate-855 rounded-xl text-xs md:text-base focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-655 transition"
                      />
                      <span className="text-[10px] md:text-sm text-slate-400 mt-1 md:mt-1.5 block pl-1">Must include country code starting with '+'</span>
                    </div>
                    <div>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email Address (Optional)"
                        className="w-full px-3 py-2.5 md:py-3 bg-slate-950 border border-slate-855 rounded-xl text-xs md:text-base focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-655 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Items */}
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl flex-1 flex flex-col min-h-[220px]">
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-slate-400 mb-3 flex justify-between items-center">
                    <span>🛒 Selected Items</span>
                    <span className="text-[10px] md:text-xs font-mono lowercase text-slate-500">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                    </span>
                  </h2>

                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                      <span className="text-2xl mb-1 opacity-70">🛒</span>
                      <p className="text-xs md:text-base text-slate-500">POS Cart is empty.</p>
                      <p className="text-[10px] md:text-sm text-slate-600 mt-0.5">Click products on the left to add items.</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto max-h-[240px] pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                      {cart.map(item => (
                        <div key={item.productId} className="flex justify-between items-center bg-slate-950/80 border border-slate-850/80 p-2.5 md:p-3 rounded-xl">
                           <div className="flex-1 pr-2">
                            <p className="text-xs md:text-base font-black text-slate-200 line-clamp-1">{item.name}</p>
                            <p className="text-[10px] md:text-sm text-slate-300 mt-0.5 font-semibold">₹{item.price.toFixed(2)} each</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 md:gap-2.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="h-6 w-6 md:h-9 md:w-9 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-xs md:text-base active:scale-90 transition font-bold"
                            >
                              -
                            </button>
                            <span className="text-xs md:text-base font-mono font-bold w-4 md:w-5 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, 1)}
                              className="h-6 w-6 md:h-9 md:w-9 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-xs md:text-base active:scale-90 transition font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pricing Breakdown */}
                  <div className="mt-4 pt-4 border-t border-slate-850 space-y-2 md:space-y-3">
                    <div className="flex justify-between text-xs md:text-base font-semibold text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-mono text-xs md:text-base text-slate-200">₹{billingTotals.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm md:text-lg font-black text-slate-100 pt-2 border-t border-dashed border-slate-800">
                      <span>Total Amount:</span>
                      <span className="font-mono text-emerald-400 text-base md:text-2xl lg:text-3xl font-black">₹{billingTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
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
                              : 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-400'
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
                    className="w-full py-2.5 md:py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-xs md:text-sm uppercase tracking-widest rounded-xl transition duration-150 shadow-xl shadow-emerald-500/15"
                  >
                    {loading ? 'Processing POS Bill...' : '⚡ Generate & Send Invoice'}
                  </button>
                </div>

              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
