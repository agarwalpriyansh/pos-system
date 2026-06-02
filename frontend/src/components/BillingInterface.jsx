import React, { useState, useEffect, useMemo } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getMultiplier = (weightChoice) => {
  if (!weightChoice) return 1;
  const clean = weightChoice.toLowerCase().trim();
  if (clean.endsWith('kg')) {
    return parseFloat(clean) || 1;
  }
  if (clean.endsWith('g') || clean.endsWith('gm') || clean.endsWith('gms')) {
    const val = parseFloat(clean);
    return val ? val / 1000 : 1;
  }
  const val = parseFloat(clean);
  return val ? val / 1000 : 1;
};

export default function BillingInterface() {
  // Authentication & Session State
  const [token, setToken] = useState(localStorage.getItem('pos_saas_token') || '');
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  // Auth Form Inputs
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authShopName, setAuthShopName] = useState('');
  const [authShopDesc, setAuthShopDesc] = useState('');
  const [authShopContact, setAuthShopContact] = useState('');

  // Catalog & POS Core State
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedWeights, setSelectedWeights] = useState({}); // { [productId]: '1kg' | '500g' }
  const [enteringCustomFor, setEnteringCustomFor] = useState({}); // { [productId]: boolean }

  const getProductWeight = (productId) => selectedWeights[productId] || '1kg';

  const handleInlineCustomWeightSubmit = (product, inputVal) => {
    const parsedVal = parseFloat(inputVal);
    if (!parsedVal || parsedVal <= 0) {
      triggerNotification('error', "Please enter a valid weight in grams.");
      return;
    }
    
    let formattedWeight;
    if (parsedVal >= 1000) {
      formattedWeight = `${parseFloat((parsedVal / 1000).toFixed(3))}kg`;
    } else {
      formattedWeight = `${parsedVal}g`;
    }
    
    setSelectedWeights(prev => ({ ...prev, [product._id]: formattedWeight }));
    setEnteringCustomFor(prev => ({ ...prev, [product._id]: false }));
    triggerNotification('info', `Selected weight choice: ${formattedWeight}`);
  };

  // View States
  const [currentView, setCurrentView] = useState('pos'); // 'pos', 'admin', 'dashboard', 'settings'
  const adminMode = currentView === 'admin';
  const [editingProduct, setEditingProduct] = useState(null); // null = "Add", object = "Edit"
  
  // Product Form Inputs
  const [adminName, setAdminName] = useState('');
  const [adminSku, setAdminSku] = useState('');
  const [adminPrice, setAdminPrice] = useState('');
  const [adminCategory, setAdminCategory] = useState('');
  const [adminStock, setAdminStock] = useState('');

  // Shop settings Form Inputs
  const [settingsShopName, setSettingsShopName] = useState('');
  const [settingsShopDesc, setSettingsShopDesc] = useState('');
  const [settingsShopContact, setSettingsShopContact] = useState('');

  // Dashboard / History States
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('bills'); // 'bills' | 'customers'
  const [billsSearch, setBillsSearch] = useState('');
  const [customersSearch, setCustomersSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Super Admin Platform States
  const [superAdminShops, setSuperAdminShops] = useState([]);
  const [superAdminMetrics, setSuperAdminMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [superAdminLoading, setSuperAdminLoading] = useState(false);

  // Cart & POS Billing State
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Customer Information (For invoice)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // UI States
  const [notification, setNotification] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Trigger Dynamic Notifications
  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch logged in profile details
  const fetchUserProfile = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setShop(data.shop);
        
        // Prep settings form
        setSettingsShopName(data.shop?.name || '');
        setSettingsShopDesc(data.shop?.description || '');
        setSettingsShopContact(data.shop?.contact || '');
      } else {
        // Token expired/invalid
        handleLogout();
      }
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
    }
  }, [token]);

  // Fetch product catalog per tenant
  const fetchProducts = async () => {
    if (!token || user?.role === 'SuperAdmin') return;
    try {
      setProductsLoading(true);
      const res = await fetch(`${API_BASE_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      console.warn('Error fetching products catalog:', err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.role !== 'SuperAdmin') {
      fetchProducts();
    }
  }, [token, currentView, user]);

  // Fetch Dashboard / Analytical Data
  const fetchDashboardData = async () => {
    if (!token || user?.role === 'SuperAdmin') return;
    try {
      setDashboardLoading(true);
      const [billsRes, customersRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bills`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/customers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/analytics`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        setBills(billsData);
      }
      
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Error fetching dashboard records:', err);
      triggerNotification('error', 'Failed to fetch dashboard records');
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (token && currentView === 'dashboard' && user?.role !== 'SuperAdmin') {
      fetchDashboardData();
    }
  }, [token, currentView, user]);

  // Fetch Super Admin platform statistics and registered shops
  const fetchSuperAdminData = async () => {
    if (!token || user?.role !== 'SuperAdmin') return;
    try {
      setSuperAdminLoading(true);
      const [dashRes, shopsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/super-admin/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/super-admin/shops`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setSuperAdminMetrics(dashData.metrics);
        setRecentActivity([]); // No longer tracking POS logs
      }
      
      if (shopsRes.ok) {
        const shopsData = await shopsRes.json();
        setSuperAdminShops(shopsData);
      }
    } catch (err) {
      console.error('Error loading platform dashboard:', err);
      triggerNotification('error', 'Failed to fetch platform administration data.');
    } finally {
      setSuperAdminLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.role === 'SuperAdmin') {
      fetchSuperAdminData();
    }
  }, [token, user]);

  // Toggle active suspension status for a shop
  const handleToggleShopStatus = async (shopId, currentStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/shops/${shopId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification('success', `Updated shop status successfully!`);
        // Update local UI state
        setSuperAdminShops(prev => prev.map(s => s.shopId === shopId ? { ...s, isActive: !currentStatus } : s));
        if (superAdminMetrics) {
          setSuperAdminMetrics(prev => ({
            ...prev,
            activeShops: !currentStatus ? prev.activeShops + 1 : prev.activeShops - 1
          }));
        }
      } else {
        throw new Error(data.error || 'Failed to toggle status');
      }
    } catch (err) {
      triggerNotification('error', err.message);
    }
  };

  // Autofill customer name and email if phone is registered for this shop
  useEffect(() => {
    const fetchRegisteredCustomer = async () => {
      if (customerPhone.length === 10 && token && user?.role !== 'SuperAdmin') {
        try {
          const formattedPhone = `+91 ${customerPhone}`;
          const res = await fetch(`${API_BASE_URL}/customers/search?phone=${encodeURIComponent(formattedPhone)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const customer = await res.json();
            setCustomerName(customer.name || '');
            setCustomerEmail(customer.email || '');
            triggerNotification('info', `Autofilled returning customer: ${customer.name}`);
          }
        } catch (err) {
          console.warn('Unable to query customer database', err);
        }
      }
    };
    
    fetchRegisteredCustomer();
  }, [customerPhone, token, user]);

  // --- AUTHENTICATION ACTIONS ---
  
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const payload = authMode === 'login' 
      ? { email: authEmail, password: authPassword }
      : { 
          shopName: authShopName, 
          shopDescription: authShopDesc, 
          shopContact: authShopContact, 
          ownerName: authName, 
          ownerEmail: authEmail, 
          password: authPassword 
        };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('pos_saas_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShop(data.shop);
        
        triggerNotification('success', data.message || 'Authenticated successfully!');
        
        // Reset auth fields
        setAuthEmail('');
        setAuthPassword('');
        setAuthName('');
        setAuthShopName('');
        setAuthShopDesc('');
        setAuthShopContact('');
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (err) {
      triggerNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login Simulation
  const handleGoogleOAuthSimulate = async () => {
    setLoading(true);
    const googleId = `g-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const email = `g.sandbox.${Math.floor(1000 + Math.random() * 9000)}@gmail.com`;
    const name = `OAuth Sandbox Merchant`;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/google-oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleId, email, name })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('pos_saas_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShop(data.shop);
        triggerNotification('success', 'Logged in successfully via simulated Google OAuth!');
      } else {
        throw new Error(data.error || 'Google OAuth failed');
      }
    } catch (err) {
      triggerNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pos_saas_token');
    setToken('');
    setUser(null);
    setShop(null);
    setCart([]);
    setSuperAdminShops([]);
    setSuperAdminMetrics(null);
    setRecentActivity([]);
    setCurrentView('pos');
    triggerNotification('info', 'Logged out cleanly from SaaS portal');
  };

  // --- SHOP SETTINGS ACTIONS ---
  
  const handleShopSettingsUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/shop`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: settingsShopName,
          description: settingsShopDesc,
          contact: settingsShopContact
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShop(data.shop);
        triggerNotification('success', 'Shop settings updated successfully!');
      } else {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (err) {
      triggerNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Derive categories dynamically from active products
  const categories = useMemo(() => {
    const activeProducts = products.filter(p => p.isActive !== false);
    const cats = new Set(activeProducts.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (product.isActive === false) return false;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Add Item to Cart
  const addToCart = (product, weightChoice = '1kg') => {
    const multiplier = getMultiplier(weightChoice);
    const priceForChoice = product.price * multiplier;

    // Calculate stock used by this product in the cart
    const stockUsed = cart
      .filter(item => item.productId === product._id)
      .reduce((sum, item) => sum + (item.quantity * getMultiplier(item.weightChoice)), 0);

    if (stockUsed + multiplier > product.stock) {
      triggerNotification('error', `Cannot exceed available stock of ${product.stock} kg for ${product.name}`);
      return;
    }

    const cartItemId = `${product._id}-${weightChoice}`;
    const existing = cart.find(item => `${item.productId}-${item.weightChoice}` === cartItemId);

    if (existing) {
      setCart(cart.map(item =>
        `${item.productId}-${item.weightChoice}` === cartItemId
          ? { ...item, quantity: item.quantity + 1, total: parseFloat(((item.quantity + 1) * item.price).toFixed(2)) }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product._id,
        name: product.name,
        price: priceForChoice,
        weightChoice: weightChoice,
        quantity: 1,
        total: priceForChoice
      }]);
    }
    triggerNotification('success', `Added ${product.name} (${weightChoice}) to cart`);
  };

  // Update Cart Quantity
  const updateQuantity = (productId, weightChoice, delta) => {
    const product = products.find(p => p._id === productId);
    const cartItemId = `${productId}-${weightChoice}`;
    const existing = cart.find(item => `${item.productId}-${item.weightChoice}` === cartItemId);

    if (!existing) return;

    const newQty = existing.quantity + delta;

    if (newQty <= 0) {
      setCart(cart.filter(item => `${item.productId}-${item.weightChoice}` !== cartItemId));
      triggerNotification('info', `Removed ${existing.name} (${weightChoice}) from cart`);
      return;
    }

    if (delta > 0 && product) {
      const stockUsed = cart
        .filter(item => item.productId === productId)
        .reduce((sum, item) => {
          const m = getMultiplier(item.weightChoice);
          const qty = `${item.productId}-${item.weightChoice}` === cartItemId ? newQty : item.quantity;
          return sum + (qty * m);
        }, 0);

      if (stockUsed > product.stock) {
        triggerNotification('error', `Cannot exceed available stock of ${product.stock} kg`);
        return;
      }
    }

    setCart(cart.map(item =>
      `${item.productId}-${item.weightChoice}` === cartItemId
        ? { ...item, quantity: newQty, total: parseFloat((newQty * item.price).toFixed(2)) }
        : item
    ));
  };

  // Calculate totals
  const billingTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const total = parseFloat(subtotal.toFixed(2));
    return { subtotal, tax: 0, discount: 0, total };
  }, [cart]);

  // POS sales checkout
  const handleCheckout = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      triggerNotification('error', 'Cart is empty. Please select products first.');
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
          quantity: item.quantity,
          weightChoice: item.weightChoice
        })),
        paymentMethod
      };

      const res = await fetch(`${API_BASE_URL}/bills`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        const msg = customerEmail
          ? `Invoice ${data.bill.invoiceNumber} generated! Branded receipt emailed and queued on WhatsApp.`
          : `Invoice ${data.bill.invoiceNumber} generated! WhatsApp receipt queued.`;
        triggerNotification('success', msg);
        
        // Update product inventory locally
        setProducts(prevProducts =>
          prevProducts.map(p => {
            const productCartItems = cart.filter(item => item.productId === p._id);
            if (productCartItems.length === 0) return p;

            const totalDeductedStock = productCartItems.reduce((sum, item) => {
              const m = getMultiplier(item.weightChoice);
              return sum + (item.quantity * m);
            }, 0);

            return {
              ...p,
              stock: parseFloat((p.stock - totalDeductedStock).toFixed(2))
            };
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

  // --- CATALOG MANAGER ACTIONS ---
  
  const selectProductForEditing = (product) => {
    setEditingProduct(product);
    setAdminName(product.name);
    setAdminSku(product.sku);
    setAdminPrice(product.price);
    setAdminCategory(product.category);
    setAdminStock(product.stock);
  };

  const clearAdminForm = () => {
    setEditingProduct(null);
    setAdminName('');
    setAdminSku('');
    setAdminPrice('');
    setAdminCategory('');
    setAdminStock('');
  };

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
      stock: parseFloat(adminStock)
    };

    try {
      if (editingProduct) {
        // Edit Mode: PUT /api/products/:id
        const res = await fetch(`${API_BASE_URL}/products/${editingProduct._id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
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
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
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

  const handleDeleteProduct = async () => {
    if (!editingProduct) return;

    if (!window.confirm(`Are you sure you want to permanently delete "${editingProduct.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/products/${editingProduct._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        triggerNotification('info', `Product "${editingProduct.name}" successfully deleted.`);
        setProducts(products.filter(p => p._id !== editingProduct._id));
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

  // ==========================================
  // SUPER ADMIN RENDER FUNCTION (PLATFORM PANEL OVERVIEW)
  // ==========================================
  const renderSuperAdminPortal = () => {
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
              onClick={fetchSuperAdminData}
              className="flex-1 lg:flex-initial px-5 py-2.5 text-xs font-extrabold bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition"
            >
              🔄 Refresh Platform Data
            </button>
            <button
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
                          <td className="py-4.5 px-4">
                            <div className="font-bold text-slate-200 text-sm sm:text-base">{s.name}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{s.description || 'No description'}</div>
                          </td>
                          <td className="py-4.5 px-4 font-mono font-bold text-indigo-400">{s.shopId}</td>
                          <td className="py-4.5 px-4">
                            <div className="text-slate-200 font-bold">{s.owner?.name || 'N/A'}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{s.owner?.email || 'N/A'}</div>
                          </td>
                          <td className="py-4.5 px-4 text-slate-350">
                            <div className="font-bold">{s.contact || <span className="text-slate-600 font-medium italic">None</span>}</div>
                          </td>
                          <td className="py-4.5 px-4 text-slate-450 font-bold">
                            {new Date(s.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-4.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleShopStatus(s.shopId, s.isActive)}
                              className={`px-4.5 py-1.5 rounded-xl text-xs font-extrabold uppercase transition active:scale-95 border ${
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
  };

  // RENDER AUTHENTICATION VIEW IF NOT LOGGED IN
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 sm:p-8 font-sans">
        {notification && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl bg-emerald-955 text-emerald-300 border border-emerald-500/40">
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

          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-850">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition duration-150 ${
                authMode === 'login' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition duration-150 ${
                authMode === 'register' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-450 hover:text-slate-200'
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
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm sm:text-base uppercase tracking-widest rounded-xl transition duration-155 shadow-xl shadow-emerald-500/10 disabled:opacity-40"
            >
              {loading ? 'Processing...' : authMode === 'login' ? '🔐 Sign In' : '🚀 Setup Shop Tenant'}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-2">
            <div className="absolute w-full border-t border-slate-800"></div>
            <span className="relative px-4 bg-slate-900 text-xs uppercase font-extrabold tracking-wider text-slate-500">Or Continue With</span>
          </div>

          {/* OAuth simulation for fast sandbox logins */}
          <button
            onClick={handleGoogleOAuthSimulate}
            disabled={loading}
            className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl flex items-center justify-center gap-3 transition duration-150 active:scale-98 shadow-md text-sm sm:text-base font-extrabold text-slate-200"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-xs text-rose-500 font-extrabold font-mono">G</span>
            <span>Google Sign-In (Sandbox)</span>
          </button>
        </div>
      </div>
    );
  }

  // RENDER SUPER ADMIN PORTAL IF THE ROLE IS SUPERADMIN
  if (user && user.role === 'SuperAdmin') {
    return renderSuperAdminPortal();
  }

  // CORE SAAS APP CONTENT (CASHIER / MERCHANT SUITE)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-8 flex flex-col">
      {/* Dynamic Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl bg-emerald-950 text-emerald-305 border border-emerald-500/30">
          <span className="text-sm sm:text-base font-bold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-slate-900/60 border border-slate-800 p-5 sm:p-6 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
              {shop?.name || 'SaaS POS'}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {shop?.shopId}
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-400 mt-1 font-medium">{shop?.description || 'A Premium Multi-Tenant POS SaaS Instance'}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Navigation Tab Toggles */}
          <button
            onClick={() => {
              setCurrentView('pos');
              clearAdminForm();
            }}
            className={`flex-1 sm:flex-initial text-sm px-5 py-2.5 font-extrabold rounded-xl transition duration-155 active:scale-95 border ${
              currentView === 'pos'
                ? 'bg-emerald-600 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            🛒 Cashier POS
          </button>

          <button
            onClick={() => {
              setCurrentView('dashboard');
              clearAdminForm();
            }}
            className={`flex-1 sm:flex-initial text-sm px-5 py-2.5 font-extrabold rounded-xl transition duration-155 active:scale-95 border ${
              currentView === 'dashboard'
                ? 'bg-cyan-600 border-cyan-500 text-slate-100 shadow-md shadow-cyan-500/10'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            📊 Analytics & Sales
          </button>

          <button
            onClick={() => {
              setCurrentView('admin');
              clearAdminForm();
            }}
            className={`flex-1 sm:flex-initial text-sm px-5 py-2.5 font-extrabold rounded-xl transition duration-155 active:scale-95 border ${
              currentView === 'admin'
                ? 'bg-indigo-600 border-indigo-500 text-slate-100 shadow-md shadow-indigo-500/10'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            🛠️ Catalog Manager
          </button>

          <button
            onClick={() => {
              setCurrentView('settings');
              clearAdminForm();
            }}
            className={`flex-1 sm:flex-initial text-sm px-5 py-2.5 font-extrabold rounded-xl transition duration-155 active:scale-95 border ${
              currentView === 'settings'
                ? 'bg-indigo-600 border-indigo-500 text-slate-100 shadow-md shadow-indigo-500/10'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            ⚙️ Store settings
          </button>

          {/* Logout Trigger */}
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 text-sm font-extrabold rounded-xl border border-rose-500/25 bg-rose-950/20 hover:bg-rose-900/30 text-rose-455 transition"
          >
            Logout
          </button>

          {/* Mobile Cart Button */}
          {currentView === 'pos' && (
            <button
              onClick={() => setShowMobileCart(!showMobileCart)}
              className="md:hidden flex-1 flex items-center justify-center gap-2 text-sm px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl active:scale-95 transition"
            >
              🛒 Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})
            </button>
          )}
        </div>
      </header>

      {/* RENDER VIEWS */}
      
      {currentView === 'settings' ? (
        // ==========================================
        // SETTINGS VIEW
        // ==========================================
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
        
      ) : currentView !== 'dashboard' ? (
        // ==========================================
        // POS & CATALOG VIEWS
        // ==========================================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          {/* Catalog Selector */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {adminMode && (
              <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl flex items-center gap-4 backdrop-blur-sm animate-pulse">
                <span className="text-2xl">⚙️</span>
                <div>
                  <p className="text-sm font-extrabold text-indigo-300">Catalog Editor Active</p>
                  <p className="text-xs text-indigo-450/90 mt-0.5 font-medium">Click any product card below to populate the edit form and update prices, stock, or delete the item.</p>
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
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-500 transition"
                />
                <span className="absolute left-4 top-3.5 text-sm text-slate-500">🔍</span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
                {categories.map(cat => (
                  <button
                    key={cat}
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
                <p className="text-xs sm:text-sm text-slate-600 mt-1 font-semibold">Add items via the Catalog Manager to populate your store catalog.</p>
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
                            ? 'opacity-50 border-slate-900 cursor-not-allowed' 
                            : cartQty > 0 
                              ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' 
                              : 'border-slate-800'
                      }`}
                    >
                      {/* Floating Stock Tag */}
                      <span className={`absolute top-3 right-3 px-2.5 py-1 text-[10px] sm:text-xs font-black rounded-full uppercase tracking-wider ${
                        isOutOfStock ? 'bg-rose-950/60 text-rose-455' :
                        remainingStock <= 5 ? 'bg-amber-950/60 text-amber-400' : 'bg-slate-950/60 text-slate-400'
                      }`}>
                        {isOutOfStock ? 'Sold Out' : `Stock: ${remainingStock} kg`}
                      </span>

                      <div className="mb-5 pr-12">
                        <span className="text-slate-500 text-xs font-bold uppercase font-mono tracking-wider">{product.sku}</span>
                        <h3 className={`font-black text-sm sm:text-base lg:text-lg text-slate-200 mt-1 line-clamp-2 leading-tight ${
                          adminMode ? 'group-hover:text-indigo-400' : 'group-hover:text-emerald-400'
                        }`}>
                          {product.name}
                        </h3>
                        <p className="text-slate-500 text-xs mt-2 font-semibold">{product.category}</p>

                        {/* Weight choice selector */}
                        {!adminMode && (
                          enteringCustomFor[product._id] ? (
                            <div className="flex bg-slate-950/60 p-1.5 rounded-lg border border-emerald-500/30 mt-3 gap-2 w-full items-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                autoFocus
                                placeholder="Grams..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
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
                                      : 'text-slate-450 hover:text-slate-200 hover:bg-slate-900/40'
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
                                className="flex-1 text-xs font-black py-1.5 rounded transition duration-150 text-slate-450 hover:text-slate-200 hover:bg-slate-900/40"
                              >
                                Custom
                              </button>
                            </div>
                          )
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-auto">
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
                          <span className="bg-emerald-500 text-slate-950 font-black text-sm h-8 px-3.5 rounded-full flex items-center justify-center">
                            {cartQty}x
                          </span>
                        ) : (
                          <span className="bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-300 font-extrabold text-sm h-8 w-8 rounded-full flex items-center justify-center transition duration-150">
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
                      onClick={clearAdminForm}
                      className="text-xs px-3 py-1 bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg transition"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleAdminSubmit} className="flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest pl-1">
                    {editingProduct ? '✏️ Update Catalog Item' : '✨ Add New Product'}
                  </h3>

                  <div className="flex flex-col gap-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-855">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="e.g. Organic Almonds"
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
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
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
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
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
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
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
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
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500 transition"
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
                        className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-450 hover:text-rose-350 font-bold text-xs uppercase tracking-widest rounded-xl border border-rose-500/20 hover:border-rose-500/40 transition duration-155"
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
                  <h2 className="text-xl font-bold">POS Billing Cart</h2>
                  <button
                    onClick={() => setShowMobileCart(false)}
                    className="text-sm px-4 py-2 bg-slate-900 text-slate-400 border border-slate-800 rounded-xl animate-pulse"
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
                        <span className="absolute left-4 text-sm text-slate-400 font-mono font-bold select-none pointer-events-none">+91</span>
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
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-555 transition"
                        />
                      </div>
                      <div>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="Email Address (Optional for E-billing)"
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500/80 text-slate-100 placeholder-slate-555 transition"
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
                        <p className="text-xs sm:text-sm text-slate-550 font-bold">POS Cart is empty.</p>
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
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-xs sm:text-sm uppercase tracking-widest rounded-xl transition duration-150 shadow-xl shadow-emerald-500/15"
                    >
                      {loading ? 'Processing POS Bill...' : '⚡ Generate & Dispatch Receipt'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ==========================================
        // SAAS ANALYTICS & DASHBOARD VIEW
        // ==========================================
        <div className="flex-1 flex flex-col gap-8">
          {dashboardLoading ? (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400"></div>
            </div>
          ) : (
            <>
              {/* Analytics KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-cyan-500/30 transition duration-200">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Cumulative Sales Revenue</span>
                    <h3 className="text-3xl font-black text-slate-100 font-mono mt-1">
                      ₹{analytics?.metrics?.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </h3>
                  </div>
                  <span className="text-xs text-cyan-400 font-extrabold mt-4 flex items-center gap-1.5 uppercase tracking-wider">
                    📈 Live Shop Billings
                  </span>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition duration-200">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Total Transactions</span>
                    <h3 className="text-3xl font-black text-slate-100 font-mono mt-1">
                      {analytics?.metrics?.totalBills || 0}
                    </h3>
                  </div>
                  <span className="text-xs text-emerald-400 font-extrabold mt-4 flex items-center gap-1.5 uppercase tracking-wider">
                    📄 Invoice count
                  </span>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition duration-200">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Active Customers</span>
                    <h3 className="text-3xl font-black text-slate-100 font-mono mt-1">
                      {analytics?.metrics?.totalCustomers || 0}
                    </h3>
                  </div>
                  <span className="text-xs text-indigo-400 font-extrabold mt-4 flex items-center gap-1.5 uppercase tracking-wider">
                    👥 Registered clients
                  </span>
                </div>

                <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between hover:border-amber-500/30 transition duration-200">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">Delivery Success</span>
                    <div className="text-xs space-y-1 mt-2 text-slate-300 font-bold">
                      <div className="flex justify-between items-center">
                        <span>WhatsApp Sent:</span>
                        <span className="font-mono text-emerald-400">
                          {bills.filter(b => b.whatsappStatus === 'Sent').length} / {bills.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Email Sent:</span>
                        <span className="font-mono text-emerald-400">
                          {bills.filter(b => b.emailStatus === 'Sent').length} / {bills.filter(b => b.emailStatus && b.emailStatus !== 'N/A').length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-800 pt-1.5">
                    ⚙️ Queue transmission rate
                  </span>
                </div>
              </div>

              {/* Aggregation Charts & Data breakdown */}
              {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Payments Breakdown widget */}
                  <div className="bg-slate-900/30 border border-slate-800/85 p-5 rounded-2xl">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">💵 Payment Methods Breakdown</h3>
                    {analytics.paymentBreakdown?.length === 0 ? (
                      <p className="text-sm text-slate-555 text-center py-5">No payment stats compiled yet.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {analytics.paymentBreakdown.map(item => {
                          const percent = (item.amount / (analytics.metrics.totalRevenue || 1)) * 100;
                          return (
                            <div key={item._id} className="space-y-1.5">
                              <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-300">
                                <span>{item._id} ({item.count} bills)</span>
                                <span className="font-mono text-emerald-400">₹{item.amount.toFixed(2)} ({percent.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Top selling inventory widget */}
                  <div className="bg-slate-900/30 border border-slate-800/85 p-5 rounded-2xl">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">⭐ Top Selling Product Items</h3>
                    {analytics.topProducts?.length === 0 ? (
                      <p className="text-sm text-slate-555 text-center py-5">No sales inventory stats recorded yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-800 text-xs sm:text-sm">
                        {analytics.topProducts.map((item, index) => (
                          <div key={item._id} className="flex justify-between py-2.5 items-center">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-cyan-400">#{index+1}</span>
                              <span className="font-bold text-slate-200">{item._id}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-300 font-mono">{item.quantity} kg sold</div>
                              <div className="text-xs text-emerald-400 font-mono">₹{item.revenue.toFixed(2)} revenue</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tables panel */}
              <div className="bg-slate-900/30 border border-slate-800 p-5 sm:p-6 rounded-2xl backdrop-blur-md flex flex-col gap-5 flex-1">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-850 self-start">
                    <button
                      onClick={() => setDashboardTab('bills')}
                      className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition duration-150 ${
                        dashboardTab === 'bills' ? 'bg-cyan-600 text-slate-100 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      📜 Invoices History ({bills.length})
                    </button>
                    <button
                      onClick={() => setDashboardTab('customers')}
                      className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition duration-150 ${
                        dashboardTab === 'customers' ? 'bg-cyan-600 text-slate-100 shadow-md font-black' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      👥 Clients Database ({customers.length})
                    </button>
                  </div>

                  <div className="relative w-full sm:max-w-xs">
                    {dashboardTab === 'bills' ? (
                      <input
                        type="text"
                        value={billsSearch}
                        onChange={(e) => setBillsSearch(e.target.value)}
                        placeholder="Search invoices by # or client..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-cyan-500 text-slate-100 placeholder-slate-550 transition font-mono font-bold"
                      />
                    ) : (
                      <input
                        type="text"
                        value={customersSearch}
                        onChange={(e) => setCustomersSearch(e.target.value)}
                        placeholder="Search clients by name or phone..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-cyan-500 text-slate-105 placeholder-slate-550 transition font-bold"
                      />
                    )}
                    <span className="absolute left-3 top-3 text-xs sm:text-sm text-slate-550">🔍</span>
                  </div>
                </div>

                {dashboardTab === 'bills' ? (
                  <div className="overflow-x-auto">
                    {bills.filter(bill => {
                      const search = billsSearch.toLowerCase();
                      const invMatches = bill.invoiceNumber?.toLowerCase().includes(search);
                      const nameMatches = bill.customer?.name?.toLowerCase().includes(search);
                      const phoneMatches = bill.customer?.phone?.includes(search);
                      return invMatches || nameMatches || phoneMatches;
                    }).length === 0 ? (
                      <div className="text-center p-10 border border-dashed border-slate-800 rounded-2xl my-4">
                        <span className="text-4xl mb-2 block">📄</span>
                        <p className="text-slate-405 font-bold text-sm">No invoices found matching criteria.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="border-b border-slate-850 text-slate-450 text-xs uppercase font-extrabold tracking-wider">
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
                        <tbody className="divide-y divide-slate-850 text-xs sm:text-sm font-semibold">
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
                                <td className="py-3.5 px-4 font-mono font-black text-cyan-400">{bill.invoiceNumber}</td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-200">{bill.customer?.name || 'Walk-in'}</div>
                                  <div className="text-xs text-slate-500 font-mono font-bold mt-0.5">{bill.customer?.phone}</div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-450 font-bold">
                                  {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">₹{bill.total.toFixed(2)}</td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-950 border border-slate-800 text-slate-350">
                                    {bill.paymentMethod}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold border ${
                                    bill.whatsappStatus === 'Sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    bill.whatsappStatus === 'Failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {bill.whatsappStatus}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold border ${
                                    bill.emailStatus === 'Sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    bill.emailStatus === 'Failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                    bill.emailStatus === 'N/A' ? 'bg-slate-900 text-slate-500 border-transparent' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {bill.emailStatus || 'N/A'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => setSelectedInvoice(bill)}
                                    className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 font-bold rounded-lg transition active:scale-95 text-xs whitespace-nowrap"
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
                ) : (
                  <div className="overflow-x-auto">
                    {customers.filter(cust => {
                      const search = customersSearch.toLowerCase();
                      const nameMatches = cust.name?.toLowerCase().includes(search);
                      const phoneMatches = cust.phone?.includes(search);
                      return nameMatches || phoneMatches;
                    }).length === 0 ? (
                      <div className="text-center p-10 border border-dashed border-slate-800 rounded-2xl my-4">
                        <span className="text-4xl mb-2 block">👥</span>
                        <p className="text-slate-400 font-bold text-sm">No customer records found.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-slate-850 text-slate-450 text-xs uppercase font-extrabold tracking-wider">
                            <th className="py-3 px-4">Client Name</th>
                            <th className="py-3 px-4">WhatsApp Contact</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Registered Date</th>
                            <th className="py-3 px-4 text-right">Aggregate Sales Spent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-xs sm:text-sm font-semibold">
                          {customers
                            .filter(cust => {
                              const search = customersSearch.toLowerCase();
                              const nameMatches = cust.name?.toLowerCase().includes(search);
                              const phoneMatches = cust.phone?.includes(search);
                              return nameMatches || phoneMatches;
                            })
                            .map(cust => (
                              <tr key={cust._id} className="hover:bg-slate-900/30 transition duration-150">
                                <td className="py-3.5 px-4 font-bold text-slate-200">{cust.name}</td>
                                <td className="py-3.5 px-4 font-mono text-slate-350">{cust.phone}</td>
                                <td className="py-3.5 px-4 text-slate-450 font-bold">{cust.email || <em className="text-slate-700 font-medium">None</em>}</td>
                                <td className="py-3.5 px-4 text-slate-450 font-bold">
                                  {new Date(cust.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-emerald-400 font-mono text-sm sm:text-base">
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
      )}

      {/* Invoice Modal Popup for Detailed Receipt print layout */}
      {selectedInvoice && (
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
              <span className="text-xs font-black uppercase text-slate-450 tracking-wider block mb-3">Itemized Breakdown</span>
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
                      <span className="text-[10px] sm:text-xs text-slate-500 font-bold">{item.quantity}x @ ₹{item.price.toFixed(2)}</span>
                    </div>
                    <span className="font-mono font-black text-slate-800">₹{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Grand Total */}
            <div className="border-t border-dashed border-slate-350 pt-4 mt-3 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-slate-500 font-bold">
                <span>Subtotal Amount:</span>
                <span className="font-mono">₹{selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base text-slate-800 font-black border-t border-slate-200 pt-3 mt-1">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-600 text-xl sm:text-2xl font-black">₹{selectedInvoice.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Broadcast Status */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 space-y-1.5 mt-1 font-semibold">
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
              onClick={() => setSelectedInvoice(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-100 font-bold text-xs sm:text-sm uppercase tracking-widest rounded-xl transition duration-150"
            >
              ✕ Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
