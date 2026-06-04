import React, { useState, useEffect, useMemo } from 'react';
import AuthScreen from './AuthScreen';
import Header from './Header';
import SuperAdminPortal from './SuperAdminPortal';
import SettingsView from './SettingsView';
import PosView from './PosView';
import DashboardView from './DashboardView';
import InvoiceModal from './InvoiceModal';

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

const getLocalDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BillingInterface({ currentPath }) {
  const onBackToHome = () => {
    window.history.pushState(null, '', '/');
  };
  // Authentication & Session State
  const [token, setToken] = useState(localStorage.getItem('pos_saas_token') || '');
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);

  // Derive authMode and currentView from browser path
  const authMode = currentPath === '/register' ? 'register' : currentPath === '/google-setup' ? 'google-setup' : 'login';
  const setAuthMode = (mode) => {
    window.history.pushState(null, '', `/${mode}`);
  };

  const currentView = currentPath === '/dashboard' ? 'dashboard' : currentPath === '/admin' ? 'admin' : currentPath === '/settings' ? 'settings' : 'pos';
  const setCurrentView = (view) => {
    window.history.pushState(null, '', `/${view}`);
  };

  // Protect internal routes and automatically redirect based on session token
  useEffect(() => {
    if (!token) {
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/google-setup') {
        window.history.pushState(null, '', '/login');
      }
    } else {
      if (currentPath === '/login' || currentPath === '/register') {
        window.history.pushState(null, '', '/pos');
      }
    }
  }, [token, currentPath]);
  
  // Auth Form Inputs
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authShopName, setAuthShopName] = useState('');
  const [authShopDesc, setAuthShopDesc] = useState('');
  const [authShopContact, setAuthShopContact] = useState('');

  // Google OAuth Real-login States
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleIdToken, setGoogleIdToken] = useState('');
  const [googleUserPayload, setGoogleUserPayload] = useState(null);

  // Fetch Google client configuration
  useEffect(() => {
    const fetchGoogleConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/google-config`);
        if (res.ok) {
          const data = await res.json();
          setGoogleClientId(data.googleClientId);
        }
      } catch (err) {
        console.warn('[Google Config Fetch Error]:', err);
      }
    };
    fetchGoogleConfig();
  }, []);

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
  const [filterDate, setFilterDate] = useState(getLocalDateString(new Date()));
  const dateInputRef = React.useRef(null);

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

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const search = billsSearch.toLowerCase();
      const invMatches = bill.invoiceNumber?.toLowerCase().includes(search);
      const nameMatches = bill.customer?.name?.toLowerCase().includes(search);
      const phoneMatches = bill.customer?.phone?.includes(search);
      
      const billDateStr = getLocalDateString(new Date(bill.createdAt));
      const dateMatches = billDateStr === filterDate;
      
      return (invMatches || nameMatches || phoneMatches) && dateMatches;
    });
  }, [bills, billsSearch, filterDate]);

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
          password: authPassword || authShopContact || '123456'
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

  // Real Google Sign-in Handler
  const handleGoogleLogin = async (idToken) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.isNewUser) {
          // New user registration flow
          setGoogleIdToken(idToken);
          setGoogleUserPayload({
            email: data.email,
            name: data.name,
            googleId: data.googleId
          });
          setAuthName(data.name);
          setAuthMode('google-setup');
          triggerNotification('info', 'Authenticated with Google. Please set up your store details.');
        } else {
          // Existing user logged in
          localStorage.setItem('pos_saas_token', data.token);
          setToken(data.token);
          setUser(data.user);
          setShop(data.shop);
          triggerNotification('success', 'Logged in successfully via Google!');
        }
      } else {
        throw new Error(data.error || 'Google login failed');
      }
    } catch (err) {
      triggerNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete Google Registration with Shop details
  const handleGoogleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!googleIdToken) {
      triggerNotification('error', 'Google session expired. Please sign in again.');
      return;
    }
    if (!authShopName || !authName) {
      triggerNotification('error', 'Shop Name and Owner Name are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: googleIdToken,
          shopName: authShopName,
          shopDescription: authShopDesc,
          shopContact: authShopContact,
          ownerName: authName
        })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('pos_saas_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShop(data.shop);
        triggerNotification('success', 'Business registered successfully via Google!');
        
        // Clear all fields
        setGoogleIdToken('');
        setGoogleUserPayload(null);
        setAuthMode('login');
        setAuthEmail('');
        setAuthPassword('');
        setAuthName('');
        setAuthShopName('');
        setAuthShopDesc('');
        setAuthShopContact('');
      } else {
        throw new Error(data.error || 'Google registration failed');
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
    if (onBackToHome) {
      onBackToHome();
    }
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

  // RENDER AUTHENTICATION VIEW IF NOT LOGGED IN
  if (!token) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authShopName={authShopName}
        setAuthShopName={setAuthShopName}
        authShopDesc={authShopDesc}
        setAuthShopDesc={setAuthShopDesc}
        authShopContact={authShopContact}
        setAuthShopContact={setAuthShopContact}
        authName={authName}
        setAuthName={setAuthName}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        loading={loading}
        handleAuthSubmit={handleAuthSubmit}
        handleGoogleOAuthSimulate={handleGoogleOAuthSimulate}
        googleClientId={googleClientId}
        handleGoogleLogin={handleGoogleLogin}
        handleGoogleRegisterSubmit={handleGoogleRegisterSubmit}
        googleUserPayload={googleUserPayload}
        notification={notification}
        onBackToHome={onBackToHome}
      />
    );
  }

  // RENDER SUPER ADMIN PORTAL IF THE ROLE IS SUPERADMIN
  if (user && user.role === 'SuperAdmin') {
    return (
      <SuperAdminPortal
        superAdminLoading={superAdminLoading}
        superAdminMetrics={superAdminMetrics}
        superAdminShops={superAdminShops}
        fetchSuperAdminData={fetchSuperAdminData}
        handleLogout={handleLogout}
        handleToggleShopStatus={handleToggleShopStatus}
      />
    );
  }

  // CORE SAAS APP CONTENT (CASHIER / MERCHANT SUITE)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-8 flex flex-col">
      {/* Dynamic Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl bg-emerald-950 text-emerald-305 border border-emerald-500/30 animate-slideIn">
          <span className="text-sm sm:text-base font-bold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <Header
        shop={shop}
        currentView={currentView}
        setCurrentView={setCurrentView}
        clearAdminForm={clearAdminForm}
        handleLogout={handleLogout}
        showMobileCart={showMobileCart}
        setShowMobileCart={setShowMobileCart}
        cart={cart}
        onBackToHome={onBackToHome}
      />

      {/* RENDER VIEWS */}
      {currentView === 'settings' ? (
        <SettingsView
          shop={shop}
          settingsShopName={settingsShopName}
          setSettingsShopName={setSettingsShopName}
          settingsShopDesc={settingsShopDesc}
          setSettingsShopDesc={setSettingsShopDesc}
          settingsShopContact={settingsShopContact}
          setSettingsShopContact={setSettingsShopContact}
          handleShopSettingsUpdate={handleShopSettingsUpdate}
          loading={loading}
        />
      ) : currentView !== 'dashboard' ? (
        <PosView
          adminMode={adminMode}
          editingProduct={editingProduct}
          selectProductForEditing={selectProductForEditing}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          productsLoading={productsLoading}
          filteredProducts={filteredProducts}
          getProductWeight={getProductWeight}
          cart={cart}
          addToCart={addToCart}
          getMultiplier={getMultiplier}
          clearAdminForm={clearAdminForm}
          handleAdminSubmit={handleAdminSubmit}
          loading={loading}
          adminName={adminName}
          setAdminName={setAdminName}
          adminSku={adminSku}
          setAdminSku={setAdminSku}
          adminPrice={adminPrice}
          setAdminPrice={setAdminPrice}
          adminStock={adminStock}
          setAdminStock={setAdminStock}
          adminCategory={adminCategory}
          setAdminCategory={setAdminCategory}
          handleDeleteProduct={handleDeleteProduct}
          showMobileCart={showMobileCart}
          setShowMobileCart={setShowMobileCart}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerEmail={customerEmail}
          setCustomerEmail={setCustomerEmail}
          updateQuantity={updateQuantity}
          billingTotals={billingTotals}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          handleCheckout={handleCheckout}
          enteringCustomFor={enteringCustomFor}
          setEnteringCustomFor={setEnteringCustomFor}
          handleInlineCustomWeightSubmit={handleInlineCustomWeightSubmit}
          setSelectedWeights={setSelectedWeights}
          selectedWeights={selectedWeights}
          triggerNotification={triggerNotification}
        />
      ) : (
        <DashboardView
          analytics={analytics}
          bills={bills}
          customers={customers}
          dashboardLoading={dashboardLoading}
          dashboardTab={dashboardTab}
          setDashboardTab={setDashboardTab}
          billsSearch={billsSearch}
          setBillsSearch={setBillsSearch}
          customersSearch={customersSearch}
          setCustomersSearch={setCustomersSearch}
          setSelectedInvoice={setSelectedInvoice}
          filterDate={filterDate}
          setFilterDate={setFilterDate}
          filteredBills={filteredBills}
          dateInputRef={dateInputRef}
        />
      )}

      {/* Invoice Modal Popup for Detailed Receipt print layout */}
      {selectedInvoice && (
        <InvoiceModal
          selectedInvoice={selectedInvoice}
          setSelectedInvoice={setSelectedInvoice}
          shop={shop}
        />
      )}
    </div>
  );
}
