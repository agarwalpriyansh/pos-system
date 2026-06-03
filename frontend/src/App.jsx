import React, { useState } from 'react'
import HomePage from './components/HomePage'
import BillingInterface from './components/BillingInterface'

function App() {
  const [currentPage, setCurrentPage] = useState('home')

  return (
    currentPage === 'home' ? (
      <HomePage onStartBilling={() => setCurrentPage('app')} />
    ) : (
      <BillingInterface onBackToHome={() => setCurrentPage('home')} />
    )
  )
}

export default App

