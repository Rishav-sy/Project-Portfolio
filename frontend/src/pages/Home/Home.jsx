import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from '../../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const StatCard = ({ title, stockValue, realEstateValue }) => {
  const total = stockValue + realEstateValue;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-lg">
        <div className="flex justify-between items-center font-bold">
          <span>Total</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
        <hr className="my-1 border border-t-2" />
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Stocks</span>
          <span>₹{stockValue.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Real Estate</span>
          <span>₹{realEstateValue.toLocaleString('en-IN')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const Home = () => {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHoldings();
  }, []);

  const fetchHoldings = async () => {
    try {
      const response = await api.get('/holdings');
      const holdingsData = response.data;
      setHoldings(holdingsData);

      // Fetch live prices for all holdings
      const pricePromises = holdingsData.map(holding =>
        fetch(`${API_BASE}/stocks/price/${holding.ticker}`)
          .then(res => res.json())
          .then(data => ({ ticker: holding.ticker, price: data }))
          .catch(() => ({ ticker: holding.ticker, price: null }))
      );

      const prices = await Promise.all(pricePromises);
      const pricesMap = {};
      prices.forEach(({ ticker, price }) => {
        pricesMap[ticker] = price;
      });
      setLivePrices(pricesMap);
    } catch (error) {
      console.error('Error fetching holdings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePortfolio = () => {
    let totalInvested = 0;
    let totalCurrent = 0;

    holdings.forEach(holding => {
      const invested = parseFloat(holding.invested);
      const livePrice = livePrices[holding.ticker];
      const currentPrice = livePrice?.current_price || parseFloat(holding.avgPrice);
      const currentValue = currentPrice * holding.quantity;

      totalInvested += invested;
      totalCurrent += currentValue;
    });

    const totalPnL = totalCurrent - totalInvested;

    return {
      invested: totalInvested,
      current: totalCurrent,
      pnl: totalPnL
    };
  };

  const portfolio = calculatePortfolio();

  // Hardcoded real estate for now
  const realEstate = {
    invested: 0,
    current: 0,
    pnl: 0
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Welcome, {user?.name || 'aryan'}
        </h1>
        <p className="text-muted-foreground mt-2">Here's a snapshot of your investment portfolio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Invested" 
          stockValue={portfolio.invested}
          realEstateValue={realEstate.invested}
        />
        <StatCard 
          title="Current Value" 
          stockValue={portfolio.current}
          realEstateValue={realEstate.current}
        />
        <StatCard 
          title="P & L" 
          stockValue={portfolio.pnl}
          realEstateValue={realEstate.pnl}
        />
      </div>
    </div>
  );
};

export default Home;
