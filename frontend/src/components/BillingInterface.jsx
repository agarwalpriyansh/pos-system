import React, { useState, useEffect, useMemo } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function BillingInterface() {
  // Catalog & Core State
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);

  // Admin & View States
  const [currentView, setCurrentView] = useState('pos'); // 'pos', 'admin', 'dashboard'
  const adminMode = currentView === 'admin';
  const [editingProduct, setEditingProduct] = useState(null); // null = "Add Mode", object = "Edit Mode"
  const [adminName, setAdminName] = useState('');
  const [adminSku, setAdminSku] = useState('');
  const [adminPrice, setAdminPrice] = useState('');
  const [adminCategory, setAdminCategory] = useState('');
  const [adminStock, setAdminStock] = useState('');

  // Dashboard & History States
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('bills'); // 'bills' | 'customers'
  const [billsSearch, setBillsSearch] = useState('');
  const [customersSearch, setCustomersSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      const [billsRes, customersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bills`),
        fetch(`${API_BASE_URL}/customers`)
      ]);
      
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        setBills(billsData);
      }
      
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      triggerNotification('error', 'Failed to fetch dashboard records');
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'dashboard') {
      fetchDashboardData();
    }
  }, [currentView]);

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
      setProducts([]);
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

    const isTenDigits = /^\d{10}$/;
    if (!isTenDigits.test(customerPhone)) {
      triggerNotification('error', 'Please provide a valid 10-digit mobile number');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerPhone: `+91 ${customerPhone}`,
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

  // Delete Product Permanently
  const handleDeleteProduct = async () => {
    if (!editingProduct) return;

    if (!window.confirm(`Are you sure you want to permanently delete "${editingProduct.name}" from the database?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/products/${editingProduct._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        triggerNotification('info', `Product "${editingProduct.name}" successfully deleted.`);
        // Locally remove the deleted item
        setProducts(products.filter(p => p._id !== editingProduct._id));
        
        // Remove from cart if it was selected
        setCart(cart.filter(item => item.productId !== editingProduct._id));
        clearAdminForm();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete product');
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
          <p className="text-xs md:text-sm text-slate-400 mt-1">DS Dryfruits, A Premium Dryfruits store</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* View Toggles */}
          <button
            onClick={() => {
              setCurrentView('pos');
              clearAdminForm();
            }}
            className={`flex-1 sm:flex-initial text-xs px-4 py-2 font-extrabold rounded-xl transition duration-150 active:scale-95 border ${
              currentView === 'pos'
                ? 'bg-emerald-600 border-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            🛒 POS Billing
          </button>

          <button
            onClick={() => {
              setCurrentView('dashboard');
              clearAdminForm();
            }}
            className={`flex-1 sm:flex-initial text-xs px-4 py-2 font-extrabold rounded-xl transition duration-150 active:scale-95 border ${
              currentView === 'dashboard'
                ? 'bg-cyan-600 border-cyan-500 text-slate-100 font-bold shadow-md shadow-cyan-500/10'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            📊 Dashboard & History
          </button>

          <button
            onClick={() => {
              setCurrentView('admin');
              clearAdminForm();
            }}
            className={`flex-1 sm:flex-initial text-xs px-4 py-2 font-extrabold rounded-xl transition duration-150 active:scale-95 border ${
              currentView === 'admin'
                ? 'bg-indigo-600 border-indigo-500 text-slate-100 font-bold shadow-md shadow-indigo-500/10'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            🛠️ Manage Products
          </button>

          {/* Mobile floating Cart indicator toggler */}
          {currentView === 'pos' && (
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
      {currentView !== 'dashboard' ? (
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
                className="w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-500 transition duration-150"
              />
              <span className="absolute left-3.5 md:left-4 top-3 md:top-3.5 text-xs md:text-sm text-slate-500">🔍</span>
            </div>

            {/* Horizontal Scroll Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap active:scale-95 transition duration-150 ${
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
                    className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition duration-200 cursor-pointer select-none bg-slate-900/40 hover:bg-slate-900/80 active:scale-98 ${
                      adminMode 
                        ? isBeingEdited 
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-950/15' 
                          : 'border-slate-800 hover:border-indigo-500/50'
                        : isOutOfStock 
                          ? 'opacity-50 border-slate-900 cursor-not-allowed' 
                          : cartQty > 0 
                            ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' 
                            : 'border-slate-800'
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
                      <h3 className={`font-black text-xs md:text-sm lg:text-base text-slate-200 transition-colors duration-150 line-clamp-2 mt-0.5 ${
                        adminMode ? 'group-hover:text-indigo-400' : 'group-hover:text-emerald-400'
                      }`}>
                        {product.name}
                      </h3>
                      <p className="text-slate-500 text-[10px] md:text-xs mt-1 md:mt-1.5">{product.category}</p>
                    </div>

                    <div className="flex justify-between items-center mt-auto">
                      <span className={`${adminMode ? 'text-indigo-400' : 'text-emerald-400'} font-black text-sm md:text-lg lg:text-xl`}>
                        ₹{product.price.toFixed(2)}
                      </span>
                      
                      {adminMode ? (
                        <span className={`text-xs md:text-sm px-2 py-1 md:px-3 md:py-1.5 rounded font-bold uppercase transition ${
                          isBeingEdited ? 'bg-indigo-600 text-slate-100' : 'bg-slate-800 group-hover:bg-indigo-600 text-slate-450 group-hover:text-slate-100'
                        }`}>
                          {isBeingEdited ? 'Editing' : 'Select'}
                        </span>
                      ) : cartQty > 0 ? (
                        <span className="bg-emerald-500 text-slate-950 font-black text-xs md:text-sm h-7 px-2.5 md:h-8 md:px-3 rounded-full flex items-center justify-center">
                          {cartQty}x
                        </span>
                      ) : (
                        <span className="bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-300 font-bold text-xs md:text-sm h-7 w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center transition duration-150">
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

              <form onSubmit={handleAdminSubmit} className="flex flex-col gap-3">
                
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest pl-1">
                  {editingProduct ? '✏️ Edit Selected Item' : '✨ Add New Catalog Item'}
                </h3>

                {/* Form Fields */}
                <div className="flex flex-col gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Organic French Roast"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">SKU identifier *</label>
                    <input
                      type="text"
                      required
                      value={adminSku}
                      onChange={(e) => setAdminSku(e.target.value)}
                      placeholder="e.g. COF-102"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={adminPrice}
                        onChange={(e) => setAdminPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Stock Level *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={adminStock}
                        onChange={(e) => setAdminStock(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
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
                      placeholder="e.g. Coffee, Bakery, Merchandise"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
                    />
                  </div>

                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-slate-100 font-bold text-xs md:text-sm uppercase tracking-widest rounded-xl transition duration-150 shadow-lg shadow-indigo-500/10 disabled:opacity-40"
                  >
                    {loading ? 'Processing...' : editingProduct ? '💾 Save Changes' : '✨ Create Product'}
                  </button>

                  {editingProduct && (
                    <button
                      type="button"
                      onClick={handleDeleteProduct}
                      disabled={loading}
                      className="w-full py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 font-bold text-xs md:text-sm uppercase tracking-widest rounded-xl border border-rose-500/20 hover:border-rose-500/40 transition duration-150 disabled:opacity-40"
                    >
                      🗑️ Delete Product
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
                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
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
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-500 transition"
                      />
                    </div>
                    <div className="relative flex items-center w-full">
                      <span className="absolute left-3 text-xs md:text-sm text-slate-400 font-mono select-none pointer-events-none">+91</span>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setCustomerPhone(val);
                        }}
                        placeholder="WhatsApp Number (10 digits) *"
                        className="w-full pl-11 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-500 transition font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email Address (Optional)"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Selected Items */}
                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex-1 flex flex-col min-h-[220px]">
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-wider text-slate-400 mb-3 flex justify-between items-center">
                    <span>🛒 Selected Items</span>
                    <span className="text-[10px] md:text-xs font-mono lowercase text-slate-500">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                    </span>
                  </h2>

                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                      <span className="text-2xl mb-1 opacity-70">🛒</span>
                      <p className="text-xs md:text-sm text-slate-500">POS Cart is empty.</p>
                      <p className="text-[10px] md:text-xs text-slate-600 mt-0.5">Click products on the left to add items.</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto max-h-[240px] pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                      {cart.map(item => (
                        <div key={item.productId} className="flex justify-between items-center bg-slate-950/80 border border-slate-800/80 p-2.5 md:p-3 rounded-xl">
                           <div className="flex-1 pr-2">
                            <p className="text-xs md:text-sm font-bold text-slate-200 line-clamp-1">{item.name}</p>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 font-semibold">₹{item.price.toFixed(2)} each</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 md:gap-2.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="h-6 w-6 md:h-8 md:w-8 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-xs md:text-sm active:scale-90 transition font-bold"
                            >
                              -
                            </button>
                            <span className="text-xs md:text-sm font-mono font-bold w-4 md:w-5 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, 1)}
                              className="h-6 w-6 md:h-8 md:w-8 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-xs md:text-sm active:scale-90 transition font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pricing Breakdown */}
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 md:space-y-3">
                    <div className="flex justify-between text-xs md:text-sm font-semibold text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-mono text-xs md:text-sm text-slate-200">₹{billingTotals.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-xs md:text-sm font-black text-slate-100 pt-2 border-t border-dashed border-slate-800">
                      <span>Total Amount:</span>
                      <span className="font-mono text-emerald-400 text-sm md:text-lg lg:text-xl font-black">₹{billingTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
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
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
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
                    className="w-full py-2.5 md:py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs md:text-sm uppercase tracking-widest rounded-xl transition duration-150 shadow-xl shadow-emerald-500/15"
                  >
                    {loading ? 'Processing POS Bill...' : '⚡ Generate & Send Invoice'}
                  </button>
                </div>

              </form>
            </div>
          )}
        </div>
      </div>
      ) : (
        /* Render Dashboard View */
        <div className="flex-1 flex flex-col gap-6">
          {/* Dashboard Overview KPI Cards */}
          {dashboardLoading ? (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
            </div>
          ) : (
            <>
              {/* KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric: Total Revenue */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-cyan-500/30 transition duration-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Total Revenue</span>
                    <h3 className="text-2xl font-black text-slate-100">
                      ₹{bills.reduce((sum, b) => sum + (b.total || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <span className="text-xs text-cyan-400 font-semibold mt-3 flex items-center gap-1">
                    💰 Cumulative sales
                  </span>
                </div>

                {/* Metric: Total Invoices */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition duration-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Total Invoices</span>
                    <h3 className="text-2xl font-black text-slate-100">{bills.length}</h3>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold mt-3 flex items-center gap-1">
                    📄 Generated bills
                  </span>
                </div>

                {/* Metric: Total Customers */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition duration-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Total Customers</span>
                    <h3 className="text-2xl font-black text-slate-100">{customers.length}</h3>
                  </div>
                  <span className="text-xs text-indigo-400 font-semibold mt-3 flex items-center gap-1">
                    👥 Registered clients
                  </span>
                </div>

                {/* Metric: Message Broadcasts */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-amber-500/30 transition duration-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Broadcast Delivery</span>
                    <div className="text-xs space-y-1 mt-1 text-slate-300">
                      <div className="flex justify-between items-center">
                        <span>WhatsApp Sent:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {bills.filter(b => b.whatsappStatus === 'Sent').length} / {bills.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Email Sent:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {bills.filter(b => b.emailStatus === 'Sent').length} / {bills.filter(b => b.emailStatus && b.emailStatus !== 'N/A').length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-800/80 pt-1.5">
                    ⚡ WhatsApp & Email dispatch rate
                  </span>
                </div>
              </div>

              {/* Dashboard Content Panel */}
              <div className="bg-slate-900/30 border border-slate-800/80 p-4 sm:p-6 rounded-2xl backdrop-blur-md flex flex-col gap-4 flex-1">
                {/* Search, Filter, Sub-tab bar */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-800/80 pb-4">
                  {/* Left Side: Sub-tabs */}
                  <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start">
                    <button
                      onClick={() => setDashboardTab('bills')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition duration-150 whitespace-nowrap ${
                        dashboardTab === 'bills'
                          ? 'bg-cyan-600 text-slate-100 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      📜 Invoices History ({bills.length})
                    </button>
                    <button
                      onClick={() => setDashboardTab('customers')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition duration-150 whitespace-nowrap ${
                        dashboardTab === 'customers'
                          ? 'bg-cyan-600 text-slate-100 shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      👥 Customers List ({customers.length})
                    </button>
                  </div>

                  {/* Right Side: Search bar */}
                  <div className="relative w-full sm:max-w-xs">
                    {dashboardTab === 'bills' ? (
                      <input
                        type="text"
                        value={billsSearch}
                        onChange={(e) => setBillsSearch(e.target.value)}
                        placeholder="Search invoices by # or Customer..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500/80 text-slate-100 placeholder-slate-500 transition duration-150"
                      />
                    ) : (
                      <input
                        type="text"
                        value={customersSearch}
                        onChange={(e) => setCustomersSearch(e.target.value)}
                        placeholder="Search customers by name or phone..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500/80 text-slate-100 placeholder-slate-500 transition duration-150"
                      />
                    )}
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-500">🔍</span>
                  </div>
                </div>

                {/* Sub-tab view: Bills Table */}
                {dashboardTab === 'bills' ? (
                  <div className="overflow-x-auto">
                    {bills.filter(bill => {
                      const search = billsSearch.toLowerCase();
                      const invMatches = bill.invoiceNumber?.toLowerCase().includes(search);
                      const nameMatches = bill.customer?.name?.toLowerCase().includes(search);
                      const phoneMatches = bill.customer?.phone?.includes(search);
                      return invMatches || nameMatches || phoneMatches;
                    }).length === 0 ? (
                      <div className="text-center p-8 border border-dashed border-slate-800/80 rounded-2xl my-4">
                        <span className="text-3xl mb-2 block">📄</span>
                        <p className="text-slate-400 font-semibold text-xs">No invoices found matching criteria.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-[10px] md:text-xs uppercase font-extrabold tracking-wider">
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
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                          {bills
                            .filter(bill => {
                              const search = billsSearch.toLowerCase();
                              const invMatches = bill.invoiceNumber?.toLowerCase().includes(search);
                              const nameMatches = bill.customer?.name?.toLowerCase().includes(search);
                              const phoneMatches = bill.customer?.phone?.includes(search);
                              return invMatches || nameMatches || phoneMatches;
                            })
                            .map(bill => (
                              <tr key={bill._id} className="hover:bg-slate-900/30 transition duration-150">
                                <td className="py-3 px-4 font-mono font-bold text-cyan-400">{bill.invoiceNumber}</td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-200">{bill.customer?.name || 'Walk-in'}</div>
                                  <div className="text-[10px] text-slate-500">{bill.customer?.phone}</div>
                                </td>
                                <td className="py-3 px-4 text-slate-400">
                                  {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="py-3 px-4 font-bold text-emerald-400 font-mono">₹{bill.total.toFixed(2)}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-300">
                                    {bill.paymentMethod}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    bill.whatsappStatus === 'Sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    bill.whatsappStatus === 'Failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {bill.whatsappStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    bill.emailStatus === 'Sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    bill.emailStatus === 'Failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                    bill.emailStatus === 'N/A' ? 'bg-slate-900 text-slate-500 border-transparent' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {bill.emailStatus || 'N/A'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => setSelectedInvoice(bill)}
                                    className="px-3 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 font-bold rounded-lg transition active:scale-95 text-[10px] md:text-xs"
                                  >
                                    📄 View Receipt
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  /* Sub-tab view: Customers Table */
                  <div className="overflow-x-auto">
                    {customers.filter(cust => {
                      const search = customersSearch.toLowerCase();
                      const nameMatches = cust.name?.toLowerCase().includes(search);
                      const phoneMatches = cust.phone?.includes(search);
                      const emailMatches = cust.email?.toLowerCase().includes(search);
                      return nameMatches || phoneMatches || emailMatches;
                    }).length === 0 ? (
                      <div className="text-center p-8 border border-dashed border-slate-800/80 rounded-2xl my-4">
                        <span className="text-3xl mb-2 block">👥</span>
                        <p className="text-slate-400 font-semibold text-xs">No customers found matching criteria.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-[10px] md:text-xs uppercase font-extrabold tracking-wider">
                            <th className="py-3 px-4">Customer Details</th>
                            <th className="py-3 px-4">WhatsApp Contact</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Registered Date</th>
                            <th className="py-3 px-4 text-right">Total Purchase Spent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                          {customers
                            .filter(cust => {
                              const search = customersSearch.toLowerCase();
                              const nameMatches = cust.name?.toLowerCase().includes(search);
                              const phoneMatches = cust.phone?.includes(search);
                              const emailMatches = cust.email?.toLowerCase().includes(search);
                              return nameMatches || phoneMatches || emailMatches;
                            })
                            .map(cust => {
                              const isVIP = (cust.totalSpent || 0) >= 5000;
                              return (
                                <tr key={cust._id} className="hover:bg-slate-900/30 transition duration-150">
                                  <td className="py-3 px-4 font-bold text-slate-200">
                                    <div className="flex items-center gap-1.5">
                                      {cust.name}
                                      {isVIP && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest font-black flex items-center gap-0.5">
                                          👑 VIP
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-300">{cust.phone}</td>
                                  <td className="py-3 px-4 text-slate-400">{cust.email || <em className="text-slate-600">No Email</em>}</td>
                                  <td className="py-3 px-4 text-slate-400">
                                    {new Date(cust.createdAt).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </td>
                                  <td className="py-3 px-4 text-right font-black text-emerald-400 font-mono text-sm">
                                    ₹{(cust.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Invoice Detailed Receipt Modal Popup */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 border border-slate-200 font-sans max-h-[90vh] overflow-y-auto">
            {/* Header: Shop details */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <h2 className="text-lg font-black tracking-widest text-slate-800 uppercase">DS DRYFRUITS</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">A Premium Dryfruits Store</p>
              <p className="text-[10px] text-slate-500">Contact: ds.dryfruits@gmail.com</p>
            </div>

            {/* Receipt Summary */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="font-semibold">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-800">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Date & Time:</span>
                <span className="font-medium text-slate-800">
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
                <span className="font-semibold">Payment Method:</span>
                <span className="font-bold text-slate-800">{selectedInvoice.paymentMethod}</span>
              </div>
              
              <div className="border-t border-slate-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Customer Name:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.customer?.name || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">WhatsApp Number:</span>
                  <span className="font-mono text-slate-800">{selectedInvoice.customer?.phone}</span>
                </div>
                {selectedInvoice.customer?.email && (
                  <div className="flex justify-between">
                    <span className="font-semibold">Email:</span>
                    <span className="text-slate-800">{selectedInvoice.customer.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border-t border-slate-200 pt-3 mt-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Itemized Breakdown</span>
              <div className="space-y-2">
                {selectedInvoice.items?.map((item, idx) => (
                  <div key={item._id || idx} className="flex justify-between items-start text-xs">
                    <div className="flex-1 pr-4">
                      <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">{item.quantity}x @ ₹{item.price.toFixed(2)}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">₹{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations and totals */}
            <div className="border-t border-dashed border-slate-300 pt-3 mt-2 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>Subtotal Amount:</span>
                <span className="font-mono">₹{selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-800 font-black border-t border-slate-200/60 pt-2 mt-1">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-600 text-lg">₹{selectedInvoice.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Broadcast Delivery Info */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-[11px] text-slate-500 space-y-1 mt-1">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[9px] block">Broadcast Statuses</span>
              <div className="flex justify-between">
                <span>WhatsApp Broadcast:</span>
                <span className={`font-bold ${
                  selectedInvoice.whatsappStatus === 'Sent' ? 'text-emerald-600' :
                  selectedInvoice.whatsappStatus === 'Failed' ? 'text-rose-600' : 'text-amber-600'
                }`}>{selectedInvoice.whatsappStatus}</span>
              </div>
              <div className="flex justify-between">
                <span>Email Receipt Status:</span>
                <span className={`font-bold ${
                  selectedInvoice.emailStatus === 'Sent' ? 'text-emerald-600' :
                  selectedInvoice.emailStatus === 'Failed' ? 'text-rose-600' : 'text-amber-600'
                }`}>{selectedInvoice.emailStatus || 'N/A'}</span>
              </div>
            </div>

            {/* Close receipt trigger */}
            <button
              onClick={() => setSelectedInvoice(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-100 font-bold text-xs uppercase tracking-widest rounded-xl transition duration-150 shadow-md shadow-slate-900/10 active:scale-95"
            >
              ✕ Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
