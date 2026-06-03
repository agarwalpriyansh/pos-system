import React, { useState, useEffect } from 'react'
import HomePage from './components/HomePage'
import BillingInterface from './components/BillingInterface'

function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/')

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/')
    }
    window.addEventListener('hashchange', handleHashChange)
    
    if (!window.location.hash) {
      window.location.hash = '#/'
    }

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const showHome = currentHash === '#/' || currentHash === '#/home' || currentHash === ''

  return (
    showHome ? (
      <HomePage />
    ) : (
      <BillingInterface currentHash={currentHash} />
    )
  )
}

export default App

