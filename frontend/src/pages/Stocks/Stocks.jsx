import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, YAxis } from 'recharts';

const API_BASE = "http://localhost:5000/api";

const StatItem = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground uppercase">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const HoldingCard = ({ holding, onDelete }) => {
  const [livePrice, setLivePrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 30000);
    return () => clearInterval(interval);
  }, [holding.ticker]);

  useEffect(() => {
    if (holding.avgPrice) {
      const basePrice = parseFloat(holding.avgPrice);
      const currentPriceValue = livePrice?.current_price || basePrice;
      
      setChartData([
        { value: basePrice * 0.97 },
        { value: basePrice * 0.98 },
        { value: basePrice * 0.99 },
        { value: basePrice * 1.00 },
        { value: basePrice * 1.01 },
        { value: basePrice * 1.02 },
        { value: currentPriceValue }
      ]);
    }
  }, [holding.avgPrice, livePrice]);

  const fetchLivePrice = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/stocks/price/${holding.ticker}`);
      const data = await response.json();
      if (!data.error) {
        setLivePrice(data);
      }
    } catch (error) {
      console.error("Error fetching price:", error);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${holding.name}?`)) {
      try {
        await fetch(`${API_BASE}/holdings/${holding.id}`, {
          method: "DELETE",
        });
        onDelete();
      } catch (error) {
        console.error("Error deleting holding:", error);
      }
    }
  };

  const currentPrice = livePrice?.current_price || 0;
  const priceChangePercent = livePrice?.price_change_percent || 0;

  const currentValue = currentPrice * holding.quantity;
  const pnl = currentValue - parseFloat(holding.invested);
  const isProfitable = pnl > 0;

  const yMin = chartData.length > 0 ? Math.min(...chartData.map(d => d.value)) * 0.995 : 0;
  const yMax = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) * 1.005 : 100;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 min-w-[380px]">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-xl">{holding.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold">
                  {loading ? "..." : `₹ ${currentPrice.toFixed(2)}`}
                </span>
                {livePrice && (
                  <span
                    className={`text-sm font-medium flex items-center gap-1 ${
                      priceChangePercent >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {priceChangePercent >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {priceChangePercent >= 0 ? "+" : ""}
                    {priceChangePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              {livePrice && !livePrice.market_open && (
                <span className="text-xs text-muted-foreground">Market Closed</span>
              )}
            </div>

            {/* Area Chart with Gradient */}
            <div className="w-32 h-16">
              {chartData.length > 0 ? (
                <AreaChart width={128} height={64} data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs>
                    <linearGradient id={`gradient-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop 
                        offset="0%" 
                        stopColor={priceChangePercent >= 0 ? "#22c55e" : "#ef4444"} 
                        stopOpacity={0.3}
                      />
                      <stop 
                        offset="100%" 
                        stopColor={priceChangePercent >= 0 ? "#22c55e" : "#ef4444"} 
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <YAxis domain={[yMin, yMax]} hide />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={priceChangePercent >= 0 ? "#22c55e" : "#ef4444"}
                    strokeWidth={2}
                    fill={`url(#gradient-${holding.id})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <div className="w-full h-full bg-muted/30 rounded flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Chart</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-8 flex-grow justify-center">
            <StatItem
              label="Invested"
              value={`₹ ${parseFloat(holding.invested).toLocaleString("en-IN")}`}
            />
            <StatItem
              label="Current"
              value={`₹ ${currentValue.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}`}
            />
            <StatItem
              label="P & L"
              value={
                <span className={isProfitable ? "text-green-500" : "text-red-500"}>
                  ₹ {pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              }
            />
            <StatItem
              label="Avg. Price"
              value={`₹ ${parseFloat(holding.avgPrice).toFixed(2)}`}
            />
            <StatItem label="Quantity" value={holding.quantity} />
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-600"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WatchlistCard = ({ stock, onDelete }) => {
  const [livePrice, setLivePrice] = useState(null);

  useEffect(() => {
    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 30000);
    return () => clearInterval(interval);
  }, [stock.ticker]);

  const fetchLivePrice = async () => {
    try {
      const response = await fetch(`${API_BASE}/stocks/price/${stock.ticker}`);
      const data = await response.json();
      if (!data.error) {
        setLivePrice(data);
      }
    } catch (error) {
      console.error("Error fetching price:", error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Remove ${stock.name} from watchlist?`)) {
      try {
        await fetch(`${API_BASE}/watchlist/${stock.id}`, {
          method: "DELETE",
        });
        onDelete();
      } catch (error) {
        console.error("Error removing from watchlist:", error);
      }
    }
  };

  return (
    <Card>
      <CardContent className="p-4 flex justify-between items-center">
        <div className="flex-grow">
          <span className="font-semibold text-lg">{stock.name}</span>
          <div className="text-sm text-muted-foreground">{stock.ticker}</div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-lg">
            {livePrice ? `₹ ${livePrice.current_price}` : "..."}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const SearchResultItem = ({ stock, onSelect }) => {
  const [livePrice, setLivePrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`${API_BASE}/stocks/price/${stock.ticker}`);
        const data = await response.json();
        if (!data.error) {
          setLivePrice(data);
        }
      } catch (error) {
        console.error("Error fetching price:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrice();
  }, [stock.ticker]);

  const priceChangePercent = livePrice?.price_change_percent || 0;

  return (
    <div
      className="p-4 hover:bg-accent/50 cursor-pointer transition-colors border-b last:border-b-0"
      onClick={() => onSelect(stock)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-grow">
          <div className="font-semibold text-base">{stock.name}</div>
          <div className="text-sm text-muted-foreground">{stock.ticker}</div>
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : livePrice ? (
            <div className="text-right">
              <div className="font-semibold">₹ {livePrice.current_price}</div>
              <div
                className={`text-sm flex items-center gap-1 ${
                  priceChangePercent >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {priceChangePercent >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {priceChangePercent >= 0 ? "+" : ""}
                {priceChangePercent.toFixed(2)}%
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          )}
        </div>
      </div>
    </div>
  );
};

const Stocks = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [holdings, setHoldings] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHoldings();
    fetchWatchlist();
  }, []);

  const fetchHoldings = async () => {
    try {
      const response = await fetch(`${API_BASE}/holdings`);
      const data = await response.json();
      setHoldings(data);
    } catch (error) {
      console.error("Error fetching holdings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const response = await fetch(`${API_BASE}/watchlist`);
      const data = await response.json();
      setWatchlist(data);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
    }
  };

  const handleSearch = async (value) => {
    setSearchQuery(value);

    if (value.trim().length > 0) {
      try {
        const response = await fetch(`${API_BASE}/stocks/search?q=${value}`);
        const data = await response.json();
        setSearchResults(data);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectStock = async (stock) => {
    const action = window.confirm(
      `Add ${stock.name} to Holdings? (Cancel to add to Watchlist instead)`
    );

    if (action) {
      const quantity = prompt("Enter quantity:");
      const avgPrice = prompt("Enter average price:");

      if (quantity && avgPrice) {
        const invested = parseFloat(quantity) * parseFloat(avgPrice);

        try {
          await fetch(`${API_BASE}/holdings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stock_id: stock.id,
              quantity: parseInt(quantity),
              avg_price: parseFloat(avgPrice),
              invested_amount: invested,
            }),
          });
          fetchHoldings();
        } catch (error) {
          console.error("Error adding to holdings:", error);
        }
      }
    } else {
      try {
        await fetch(`${API_BASE}/watchlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock_id: stock.id }),
        });
        fetchWatchlist();
      } catch (error) {
        console.error("Error adding to watchlist:", error);
      }
    }

    setShowResults(false);
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <Tabs defaultValue="holdings" className="w-full">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-auto sm:min-w-[400px]">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search stocks..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
              />
              <Button type="submit" size="icon" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {showResults && searchResults.length > 0 && (
              <Card className="absolute top-full mt-2 w-full min-w-[400px] z-10 max-h-96 overflow-y-auto shadow-lg">
                <CardContent className="p-0">
                  {searchResults.map((stock) => (
                    <SearchResultItem
                      key={stock.id}
                      stock={stock}
                      onSelect={handleSelectStock}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <TabsContent value="holdings" className="mt-6">
          <div className="space-y-4">
            {holdings.length > 0 ? (
              holdings.map((holding) => (
                <HoldingCard
                  key={holding.id}
                  holding={holding}
                  onDelete={fetchHoldings}
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No holdings found. Search and add stocks to get started.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="watchlist" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.length > 0 ? (
              watchlist.map((stock) => (
                <WatchlistCard
                  key={stock.id}
                  stock={stock}
                  onDelete={fetchWatchlist}
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8 col-span-full">
                No stocks in watchlist.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Stocks;
