import React, { useState, useEffect } from 'react';

export default function HomePage() {
  // Navigation active state based on scroll
  const [activeNav, setActiveNav] = useState('hero');
  // Mobile navbar open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // FAQ accordion toggle state
  const [openFaq, setOpenFaq] = useState(null);
  // Check if token exists to change CTA text
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const onStartBilling = () => {
    window.history.pushState(null, '', isLoggedIn ? '/pos' : '/register');
  };
  const onStartLogin = () => {
    window.history.pushState(null, '', isLoggedIn ? '/pos' : '/login');
  };

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('pos_saas_token'));
    
    const handleScroll = () => {
      const sections = ['hero', 'features', 'verticals', 'faqs'];
      const scrollPosition = window.scrollY + 100;
      
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveNav(section);
            break;
          }
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Content definitions
  const features = [
    {
      id: 1,
      title: 'Faster checkouts',
      description: 'Speed up checkouts with a fast and reliable retail POS billing software that works offline. Handle barcode scanning, multi-mode payments, and cashier shifts effortlessly to ensure smooth transactions even during peak hours.',
      icon: (
        <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 2,
      title: 'Prevent stockouts',
      description: 'Automate stock tracking, reduce waste, and avoid shortages with real-time inventory control. Get instant alerts for low stock, slow-moving items, and expiring products to optimize purchases.',
      icon: (
        <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      id: 3,
      title: 'Better margin control',
      description: 'Streamline procurement with automated purchase orders and vendor price comparisons. Track supplier-wise pricing, manage purchase approvals, and reduce stock mismatches easily.',
      icon: (
        <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 4,
      title: 'Gain and retain new customers',
      description: 'Identify and retain customers with personalized promotions, automated reminders, and loyalty rewards. Track purchase history and send offers via SMS, WhatsApp, and email to boost repeat sales.',
      icon: (
        <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 5,
      title: 'Integrated accounting & GST compliance',
      description: 'Eliminate manual bookkeeping with built-in accounting and automated GST/VAT calculations. Easily track expenses, profits, and online payments without the need for external accounting software.',
      icon: (
        <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 6,
      title: 'Make data-driven decisions',
      description: 'Gain a 360-degree view of your business with 350+ real-time reports on sales, inventory, and profit margins. Access mobile-friendly reports to track trends and make informed decisions anytime.',
      icon: (
        <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  const verticals = [
    { name: 'Apparel & Footwear', icon: '👔', bg: 'from-amber-500/10 to-orange-500/10' },
    { name: 'Electrical & Electronics', icon: '⚡', bg: 'from-blue-500/10 to-indigo-500/10' },
    { name: 'Hypermarket & Departmental', icon: '🏬', bg: 'from-emerald-500/10 to-teal-500/10' },
    { name: 'Lifestyle & Fashion', icon: '👜', bg: 'from-pink-500/10 to-rose-500/10' },
    { name: 'Pharma & Healthcare', icon: '💊', bg: 'from-cyan-500/10 to-sky-500/10' },
    { name: 'Supermarket & Groceries', icon: '🛒', bg: 'from-green-500/10 to-lime-500/10' },
    { name: 'Specialized Retail', icon: '🎁', bg: 'from-purple-500/10 to-fuchsia-500/10' },
    { name: 'Multi-Chain operations', icon: '🌐', bg: 'from-violet-500/10 to-purple-500/10' }
  ];

  const faqs = [
    {
      q: 'What is retail software, and how does it help businesses?',
      a: 'Retail POS software is a complete business solution that helps retailers manage billing, inventory, customer engagement, reporting, and accounting. It eliminates manual errors, automates workflows, and improves efficiency, allowing businesses to scale easily.'
    },
    {
      q: 'What are the essential features of RetailEasy\'s retail POS?',
      a: 'RetailEasy\'s retail POS provides: Fast and accurate billing with barcode scanning and multiple payment options; Real-time inventory tracking to prevent stockouts and overstock; Integrated CRM and loyalty programs to improve customer retention; Multi-store management with centralized control over stock and pricing; Automated accounting with GST/VAT compliance for stress-free tax filing; Business intelligence with real-time reports for data-driven decisions.'
    },
    {
      q: 'What types of retail businesses can use RetailEasy POS?',
      a: 'RetailEasy\'s POS software is suitable for various retail formats, including Supermarkets and grocery stores, Pharma and Healthcare, Fashion and apparel stores, Bookstores and stationery shops, Jewelry stores, Convenience stores, and more. It is fully customizable to the requirements of each industry.'
    },
    {
      q: 'How do I choose the right retail POS for my business?',
      a: 'When selecting a retail POS system, consider: Business size and growth plans (Does it support both single and multi-outlet operations?); Inventory capabilities (Can it track stock, automate reordering, and manage expiry?); Omnichannel support (Does it integrate with ecommerce sites and marketplaces?); Ease of use and support (Is it user-friendly with strong customer support?); Cost and scalability (Is it affordable and capable of growing with your business?).'
    },
    {
      q: 'What platforms support RetailEasy\'s retail POS?',
      a: 'RetailEasy\'s POS is available across multiple platforms: On-premise POS installed locally for offline access and full control, Cloud-based POS accessible anytime, anywhere with automatic updates, Mobile POS for transactions on tablets or smartphones, and Hybrid POS which combines offline durability with cloud analytics.'
    },
    {
      q: 'Can RetailEasy\'s POS integrate with ecommerce and marketplaces?',
      a: 'Yes, RetailEasy seamlessly integrates with online stores, marketplaces, accounting services, and SMS/WhatsApp notification channels to sync inventory, manage orders from a single dashboard, and unify payment processing.'
    },
    {
      q: 'How does RetailEasy POS help with inventory management?',
      a: 'RetailEasy\'s inventory management features include automated stock replenishment alerts to prevent stockouts, expiry and slow-moving stock alerts to reduce waste, and batch-wise tracking for absolute stock accuracy.'
    },
    {
      q: 'Is RetailEasy POS suitable for multi-store retail businesses?',
      a: 'Yes, RetailEasy\'s multi-outlet POS system provides real-time monitoring of stock, sales, and performance across stores; standardized pricing and promotions across locations; and consolidated reporting for centralized business insight.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-orange-500/20 selection:text-orange-600">
      
      {/* Navbar Section */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-orange-500/20">
              R
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Retail<span className="text-orange-600">Easy</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection('features')} 
              className={`font-semibold text-sm transition-colors duration-200 ${activeNav === 'features' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Why Choose Us
            </button>
            <button 
              onClick={() => scrollToSection('verticals')} 
              className={`font-semibold text-sm transition-colors duration-200 ${activeNav === 'verticals' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Verticals
            </button>

            <button 
              onClick={() => scrollToSection('faqs')} 
              className={`font-semibold text-sm transition-colors duration-200 ${activeNav === 'faqs' ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              FAQs
            </button>
          </nav>

          {/* Nav CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={onStartLogin} 
              className="text-slate-700 hover:text-slate-950 font-bold text-sm transition duration-150"
            >
              {isLoggedIn ? 'Go to App' : 'Sign In'}
            </button>
            <button 
              onClick={onStartBilling}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-sm transition duration-200 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 transform"
            >
              {isLoggedIn ? 'Launch POS Console' : 'Try it for free'}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white py-4 px-6 space-y-3 shadow-xl">
            <button 
              onClick={() => scrollToSection('features')} 
              className="block w-full text-left py-2 font-medium text-slate-600 hover:text-orange-600"
            >
              Why Choose Us
            </button>
            <button 
              onClick={() => scrollToSection('verticals')} 
              className="block w-full text-left py-2 font-medium text-slate-600 hover:text-orange-600"
            >
              Verticals
            </button>

            <button 
              onClick={() => scrollToSection('faqs')} 
              className="block w-full text-left py-2 font-medium text-slate-600 hover:text-orange-600"
            >
              FAQs
            </button>
            <hr className="border-slate-100 my-2" />
            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={onStartLogin} 
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-center text-sm transition"
              >
                {isLoggedIn ? 'Launch POS Console' : 'Sign In'}
              </button>
              <button 
                onClick={onStartBilling}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-extrabold rounded-xl text-center text-sm shadow transition"
              >
                {isLoggedIn ? 'Go to Dashboard' : 'Try it for free'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-orange-50/20">
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-orange-200/50 blur-3xl"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-blue-100/50 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-6 space-y-6 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 font-bold text-xs border border-orange-200/50">
              🚀 High Performance POS System
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Point of Sale (POS) Software for Retail Shop
            </h1>
            <p className="text-lg text-slate-600 max-w-xl">
              Power your retail business with an all-in-one retail software that goes beyond billing. From checkout to stock management and CRM to analytics, get a fully integrated POS software for retail that helps you operate smarter, scale faster, and serve customers better.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={onStartBilling}
                className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-orange-500/15 hover:shadow-orange-500/25 active:scale-95 transform transition duration-150"
              >
                {isLoggedIn ? 'Launch POS Dashboard' : 'Try it for free'}
              </button>
              <button 
                onClick={() => scrollToSection('features')}
                className="px-8 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-950 font-bold text-base rounded-2xl shadow-sm hover:shadow active:scale-95 transform transition duration-150"
              >
                Explore Features
              </button>
            </div>
            <div className="flex items-center gap-6 text-slate-500 text-xs font-semibold pt-4">
              <div className="flex items-center gap-1.5">
                <span className="text-orange-500">✓</span> No credit card required
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-orange-500">✓</span> Free 14-day trial
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-orange-500">✓</span> Multi-store support
              </div>
            </div>
          </div>

          {/* 3D Tilted Dashboard Presentation Mockup */}
          <div className="md:col-span-6 relative [perspective:1200px] flex justify-center items-center mt-8 md:mt-0">
            {/* Soft background glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-[2rem] blur-3xl opacity-15 -rotate-3 scale-105 z-0"></div>
            
            <img 
              src="/hero-dashboard.png" 
              alt="RetailEasy POS Dashboard Presentation" 
              className="relative z-10 w-full max-w-lg md:max-w-xl [transform:rotateY(-20deg)_rotateX(10deg)_rotateZ(-2deg)] shadow-2xl rounded-2xl border border-slate-100/50 bg-white transition-all duration-700 hover:[transform:rotateY(-8deg)_rotateX(4deg)_rotateZ(-1deg)] hover:shadow-orange-500/20"
            />
          </div>
        </div>
      </section>

      {/* Feature Grid / Why Us */}
      <section id="features" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-orange-600 font-extrabold text-xs uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full">
              Value Proposition
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Why choose RetailEasy retail POS software?
            </h2>
            <p className="text-slate-600 text-base">
              Streamline operations, automate processes, and give cashier personnel the easiest tools to scale revenue and margins.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
            {features.map((feat) => (
              <div 
                key={feat.id}
                className="group border border-slate-100 p-8 rounded-2xl hover:border-orange-500/20 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 bg-white hover:-translate-y-1 transform text-left space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                  <span className="group-hover:text-white text-orange-600">
                    {feat.icon}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-slate-900 group-hover:text-orange-600 transition">
                  {feat.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4 mt-12">
            <button 
              onClick={onStartBilling}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-sm rounded-xl shadow-md transition"
            >
              Get Started Now
            </button>
            <button 
              onClick={() => scrollToSection('verticals')}
              className="px-6 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl transition"
            >
              Explore Supported Verticals
            </button>
          </div>
        </div>
      </section>

      {/* Verticals Section */}
      <section id="verticals" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-orange-600 font-extrabold text-xs uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full">
              Industry Verticals
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Verticals supported by our retail management software
            </h2>
            <p className="text-slate-600 text-base">
              Tailored workflows and customized inventory templates designed to run specific business types.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {verticals.map((vert, idx) => (
              <div 
                key={idx}
                className="group p-6 rounded-2xl bg-white border border-slate-100 hover:border-orange-500/20 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-3 cursor-pointer"
                onClick={onStartBilling}
              >
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${vert.bg} flex items-center justify-center text-3xl group-hover:scale-110 transition duration-300`}>
                  {vert.icon}
                </div>
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-orange-600 transition">
                  {vert.name}
                </h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-outlet Management Section */}
      <section id="multiout" className="py-20 bg-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5 relative">
            <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-2xl opacity-40"></div>
            {/* Visual multioutlet graph illustration */}
            <div className="relative border border-slate-200 bg-slate-50 p-6 rounded-3xl shadow-xl flex flex-col gap-6 text-left">
              <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase mb-1">Central Admin Portal</span>
                <span className="text-base font-extrabold text-slate-900">RetailEasy Cloud Control</span>
                <div className="mt-2 text-xs flex justify-center gap-3">
                  <span className="text-emerald-500 font-medium">● 4 Outlets Connected</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-blue-500 font-medium">Global SKU Catalog</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
                  <span className="text-xl">🏬</span>
                  <div className="leading-tight">
                    <span className="font-bold text-xs text-slate-800 block">Downtown</span>
                    <span className="text-[10px] text-emerald-500 font-medium">Active</span>
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
                  <span className="text-xl">🏬</span>
                  <div className="leading-tight">
                    <span className="font-bold text-xs text-slate-800 block">East Mall</span>
                    <span className="text-[10px] text-emerald-500 font-medium">Active</span>
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
                  <span className="text-xl">🏬</span>
                  <div className="leading-tight">
                    <span className="font-bold text-xs text-slate-800 block">Highway Store</span>
                    <span className="text-[10px] text-emerald-500 font-medium">Active</span>
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
                  <span className="text-xl">🏬</span>
                  <div className="leading-tight">
                    <span className="font-bold text-xs text-slate-800 block">Airport kiosk</span>
                    <span className="text-[10px] text-emerald-500 font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 space-y-6 text-left">
            <span className="text-orange-600 font-extrabold text-xs uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full">
              Multi-Outlet Retail Management
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Expand with ease, manage with confidence
            </h2>
            <p className="text-slate-600">
              Keep your stores running smoothly with a centralized retail POS system. Set uniform outlet-wise pricing, track stock movement, and oversee sales and purchases across all locations in real time, all from a single web portal. Grow your business into a brand instead of managing each store as a branch.
            </p>
            <div className="space-y-3 pt-2">
              {[
                'Centralized pricing rules across multiple outlets',
                'Global stock monitoring & quick warehouse transfer options',
                'Aggregated financial analysis and sales breakdown reports',
                'Role-based access permissions for cashier and store managers'
              ].map((point, idx) => (
                <div key={idx} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs">✓</span>
                  {point}
                </div>
              ))}
            </div>
            <div className="pt-4 flex flex-wrap gap-4">
              <button 
                onClick={onStartBilling}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-sm rounded-xl shadow-md transition"
              >
                Register for Free Trial
              </button>

            </div>
          </div>
        </div>
      </section>



      {/* Customer Testimonials */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-orange-600 font-extrabold text-xs uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full">
              Success Stories
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              How do aspiring businesses use RetailEasy to grow their brands?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between space-y-6">
              <p className="text-slate-600 text-sm leading-relaxed italic">
                "With RetailEasy, we turned retail challenges into structured growth. From managing 10,000+ products to streamlining inventory, billing, and multi-outlet visibility, our pharmacy now runs with clarity and confidence."
              </p>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Mr. Jayakumar, CEO and Founder</h4>
                <span className="text-xs text-orange-600 font-bold">Sarumam Pharmacy</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between space-y-6">
              <p className="text-slate-600 text-sm leading-relaxed italic">
                "We faced various challenges for 20 years due to tiresome manual entries. Implementing RetailEasy resolved 90% of our problems. We can complete billing and reordering within a few seconds, which used to take 10 minutes."
              </p>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Mr. Chandrakant Ravaria, Owner</h4>
                <span className="text-xs text-orange-600 font-bold">Nikita Stores</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between space-y-6">
              <p className="text-slate-600 text-sm leading-relaxed italic">
                "Handling over 18K SKUs across 4 outlets, and ensuring seamless billing across 28 counters isn't easy. But Latta Supermarket simplifies it all with RetailEasy, managing billing easily, transferring stock systematically, and repacking bulk items efficiently."
              </p>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Mr. Paulsam Vijayakumar, Proprietor</h4>
                <span className="text-xs text-orange-600 font-bold">Latta Supermarket</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations & Peripherals Section */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 space-y-6 text-left">
            <span className="text-orange-600 font-extrabold text-xs uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full">
              SaaS Integrations
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Effortless integrations for a smarter retail operation
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Connect your retail POS billing software with ecommerce sites, accounting software, payment gateways, suppliers, CRM, and ERP systems to automate operations and streamline workflows. Sync inventory in real time, manage online and in-store sales effortlessly, and enhance customer experiences with seamless integrations.
            </p>
            <div className="flex gap-4 pt-2">
              <button onClick={onStartBilling} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs rounded-xl shadow transition">
                Integrate Now
              </button>
            </div>
          </div>

          <div className="md:col-span-5 relative flex justify-center">
            {/* A graphic showcasing connections */}
            <div className="border border-slate-150 p-6 rounded-3xl bg-slate-50/50 shadow-md w-full max-w-sm space-y-3 text-left">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Ready Integrations</h4>
              <div className="grid grid-cols-3 gap-2">
                {['Shopify', 'WooCommerce', 'WhatsApp', 'Stripe', 'Razorpay', 'QuickBooks', 'SMS Alert', 'Paytm', 'Pinelabs'].map((intg, idx) => (
                  <div key={idx} className="p-2 bg-white border border-slate-200 rounded-lg text-center text-[10px] font-bold text-slate-600">
                    {intg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="faqs" className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <span className="text-orange-600 font-extrabold text-xs uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full">
              Support Center
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Overview of Retail Store Software
            </h2>
            <p className="text-slate-600">
              Find answers to common questions about RetailEasy implementation, capabilities, and compatibility.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm transition duration-300"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-extrabold text-slate-900 hover:text-orange-600 transition"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <span className="text-xl ml-4">
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed border-t border-slate-50 pt-4 animate-slideDown text-left">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign-off CTA Banner */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-600/20 via-slate-950/20 to-slate-950 opacity-40"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Get started with RetailEasy’s retail POS today!
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Experience a free trial of RetailEasy’s retail POS software and see how it simplifies billing, inventory, and business operations.
          </p>
          <div className="pt-2">
            <button 
              onClick={onStartBilling}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-orange-600/30 hover:shadow-orange-600/50 hover:scale-105 active:scale-95 transform transition duration-150"
            >
              {isLoggedIn ? 'Launch POS Workspace' : 'Try it for free'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8 text-left text-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-black text-base shadow">
                R
              </div>
              <span className="text-lg font-black text-white">RetailEasy</span>
            </div>
            <p className="text-slate-500 text-xs">
              Complete point of sale and inventory manager designed for small, medium, and multi-outlet retail enterprises.
            </p>
            <p className="text-slate-500 text-xs">
              &copy; {new Date().getFullYear()} RetailEasy Inc. All rights reserved.
            </p>
          </div>

          <div>
            <h4 className="font-extrabold text-white mb-4 text-xs tracking-wider uppercase">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition">Features</button></li>
              <li><button onClick={() => scrollToSection('verticals')} className="hover:text-white transition">Verticals</button></li>

            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-white mb-4 text-xs tracking-wider uppercase">Contact & Support</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-500">Support Hours:</span> 24/7 Helpline</li>
              <li><span className="text-slate-500">Phone:</span> +1 (800) 555-RETAIL</li>
              <li><span className="text-slate-500">Email:</span> support@retaileasy.com</li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-white mb-4 text-xs tracking-wider uppercase">Admin Portal</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={onStartBilling} className="hover:text-white text-orange-400 font-bold transition">Launch POS Billing Console →</button></li>
            </ul>
          </div>
        </div>
      </footer>

    </div>
  );
}
