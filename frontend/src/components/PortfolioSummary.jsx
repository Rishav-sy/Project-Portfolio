import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";

const PortfolioSummary = ({ holdings, livePrices }) => {
  // Calculate total values
  const calculateTotals = () => {
    let totalInvested = 0;
    let totalCurrent = 0;
    let todayChange = 0;

    holdings.forEach(holding => {
      const invested = parseFloat(holding.invested);
      const livePrice = livePrices[holding.ticker];
      const currentPrice = livePrice?.current_price || parseFloat(holding.avgPrice);
      const currentValue = currentPrice * holding.quantity;
      const priceChange = livePrice?.price_change || 0;
      const todayStockChange = priceChange * holding.quantity;

      totalInvested += invested;
      totalCurrent += currentValue;
      todayChange += todayStockChange;
    });

    const totalPnL = totalCurrent - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const todayChangePercent = totalCurrent > 0 ? (todayChange / totalCurrent) * 100 : 0;

    return { totalInvested, totalCurrent, totalPnL, totalPnLPercent, todayChange, todayChangePercent };
  };

  // Find best and worst performers
  const getPerformers = () => {
    const performers = holdings.map(holding => {
      const livePrice = livePrices[holding.ticker];
      const changePercent = livePrice?.price_change_percent || 0;
      return {
        name: holding.name,
        changePercent,
        change: livePrice?.price_change || 0
      };
    });

    performers.sort((a, b) => b.changePercent - a.changePercent);
    
    return {
      best: performers[0],
      worst: performers[performers.length - 1]
    };
  };

  const totals = calculateTotals();
  const performers = holdings.length > 0 ? getPerformers() : null;

  const StatCard = ({ title, value, subtitle, trend, icon: Icon }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className={`text-xs flex items-center gap-1 ${
            trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <StatCard
        title="Total Portfolio Value"
        value={`₹ ${totals.totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        subtitle={`${totals.totalPnL >= 0 ? '+' : ''}₹ ${Math.abs(totals.totalPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${totals.totalPnLPercent.toFixed(2)}%)`}
        trend={totals.totalPnL}
        icon={DollarSign}
      />
      
      <StatCard
        title="Total Invested"
        value={`₹ ${totals.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        icon={PieChart}
      />
      
      <StatCard
        title="Today's Change"
        value={`₹ ${Math.abs(totals.todayChange).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        subtitle={`${totals.todayChangePercent >= 0 ? '+' : ''}${totals.todayChangePercent.toFixed(2)}%`}
        trend={totals.todayChange}
        icon={totals.todayChange >= 0 ? TrendingUp : TrendingDown}
      />
      
      {performers && performers.best && (
        <StatCard
          title="Top Performer"
          value={performers.best.name}
          subtitle={`${performers.best.changePercent >= 0 ? '+' : ''}${performers.best.changePercent.toFixed(2)}%`}
          trend={performers.best.changePercent}
          icon={TrendingUp}
        />
      )}
    </div>
  );
};

export default PortfolioSummary;
