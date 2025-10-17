import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import "./Home.css";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Home = () => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState({
    totalInvested: 0,
    stocksInvested: 0,
    realEstateInvested: 0,
    currentValue: 0,
    stocksValue: 0,
    realEstateValue: 0,
    totalPnL: 0,
    stocksPnL: 0,
    realEstatePnL: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      const response = await api.get('/holdings');
      const holdings = response.data;
      
      if (holdings.length === 0) {
        setLoading(false);
        return;
      }

      // Get live prices for all holdings
      const tickers = holdings.map(h => h.ticker);
      const pricesPromises = tickers.map(ticker => 
        fetch(`${API_BASE}/stocks/price/${ticker}`)
          .then(r => r.json())
          .catch(() => null)
      );
      
      const prices = await Promise.all(pricesPromises);
      
      // Calculate portfolio values
      let totalInvested = 0;
      let currentValue = 0;
      
      holdings.forEach((holding, index) => {
        const invested = parseFloat(holding.invested);
        totalInvested += invested;
        
        const livePrice = prices[index];
        const currentPrice = livePrice?.current_price || parseFloat(holding.avgPrice);
        const value = currentPrice * holding.quantity;
        currentValue += value;
      });
      
      const totalPnL = currentValue - totalInvested;
      
      setPortfolio({
        totalInvested,
        stocksInvested: totalInvested,
        realEstateInvested: 0,
        currentValue,
        stocksValue: currentValue,
        realEstateValue: 0,
        totalPnL,
        stocksPnL: totalPnL,
        realEstatePnL: 0
      });
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="home-container"><div>Loading...</div></div>;
  }

  return (
    <div className="home-container">
      <div className="home-hero">
        <h1 className="home-title">Welcome, {user?.full_name || user?.email || 'User'}</h1>
        <p className="home-subtitle">Here's a snapshot of your investment portfolio.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h2 className="stat-title">Total Invested</h2>
          <div className="stat-content">
            <div className="stat-row">
              <span>Total</span>
              <span className="stat-value">
                ₹{portfolio.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="stat-row">
              <span>Stocks</span>
              <span>₹{portfolio.stocksInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="stat-row">
              <span>Real Estate</span>
              <span>₹{portfolio.realEstateInvested.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h2 className="stat-title">Current Value</h2>
          <div className="stat-content">
            <div className="stat-row">
              <span>Total</span>
              <span className="stat-value">
                ₹{portfolio.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="stat-row">
              <span>Stocks</span>
              <span>₹{portfolio.stocksValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="stat-row">
              <span>Real Estate</span>
              <span>₹{portfolio.realEstateValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h2 className="stat-title">P & L</h2>
          <div className="stat-content">
            <div className="stat-row">
              <span>Total</span>
              <span className={`stat-profit ${portfolio.totalPnL >= 0 ? 'text-green' : 'text-red'}`}>
                ₹{portfolio.totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="stat-row">
              <span>Stocks</span>
              <span className={`stat-profit ${portfolio.stocksPnL >= 0 ? 'text-green' : 'text-red'}`}>
                ₹{portfolio.stocksPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="stat-row">
              <span>Real Estate</span>
              <span className="stat-profit">
                ₹{portfolio.realEstatePnL.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
