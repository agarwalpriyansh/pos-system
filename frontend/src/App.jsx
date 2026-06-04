import React, { useState, useEffect } from 'react'
import HomePage from './components/HomePage'
import BillingInterface from './components/BillingInterface'

// Patch history API to dispatch global 'locationchange' event on pushState/replaceState
const patchHistory = () => {
  if (typeof window === 'undefined') return;

  const pushState = window.history.pushState;
  window.history.pushState = function (...args) {
    pushState.apply(window.history, args);
    window.dispatchEvent(new Event('pushstate'));
    window.dispatchEvent(new Event('locationchange'));
  };

  const replaceState = window.history.replaceState;
  window.history.replaceState = function (...args) {
    replaceState.apply(window.history, args);
    window.dispatchEvent(new Event('replacestate'));
    window.dispatchEvent(new Event('locationchange'));
  };

  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('locationchange'));
  });
};

patchHistory();

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/')

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname || '/')
    }
    window.addEventListener('locationchange', handleLocationChange)
    
    if (!window.location.pathname || window.location.pathname === '') {
      window.history.replaceState(null, '', '/')
    }

    return () => window.removeEventListener('locationchange', handleLocationChange)
  }, [])

  const showHome = currentPath === '/' || currentPath === '/home' || currentPath === ''

  return (
    showHome ? (
      <HomePage />
    ) : (
      <BillingInterface currentPath={currentPath} />
    )
  )
}

export default App

