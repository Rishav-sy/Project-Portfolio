import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Pencil, Trash2, TrendingUp, TrendingDown, X } from "lucide-react";
import { AreaChart, Area, YAxis } from 'recharts';
import api from '../../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
};

const AddEditModal = ({ isOpen, onClose, onSave, stock, initialData = null }) => {
  const [invested, setInvested] = useState(initialData?.invested || '');
  const [quantity, setQuantity] = useState(initialData?.quantity || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const investedAmount = parseFloat(invested);
    const qty = parseInt(quantity);
    if (investedAmount > 0 && qty > 0) {
      onSave({
        invested: investedAmount,
        quantity: qty,
        avg_price: investedAmount / qty
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Holding" : `Add ${stock?.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="invested">Total Amount Invested (₹)</Label>
          <Input
            id="invested"
            type="number"
            step="0.01"
            value={invested}
            onChange={(e) => setInvested(e.target.value)}
            placeholder="e.g., 1476"
            required
          />
        </div>
        <div>
          <Label htmlFor="quantity">Number of Shares</Label>
          <Input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g., 12"
            required
          />
        </div>
        {invested && quantity && parseFloat(invested) > 0 && parseInt(quantity) > 0 && (
          <div className="text-sm text-muted-foreground">
            Average Price: ₹{(parseFloat(invested) / parseInt(quantity)).toFixed(2)}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{initialData ? 'Update' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  );
};

const DeleteModal = ({ isOpen, onClose, onConfirm, itemName }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Delete">
      <p className="mb-6">Are you sure you want to delete <strong>{itemName}</strong>?</p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={onConfirm}>Delete</Button>
      </div>
    </Modal>
  );
};

const StatItem = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground uppercase">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const HoldingCard = ({ holding, onDelete, onEdit }) => {
  const [livePrice, setLivePrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 60000);
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

  const currentPrice = livePrice?.current_price || parseFloat(holding.avgPrice);
  const priceChangePercent = livePrice?.price_change_percent || 0;
  const isPriceAvailable = !!livePrice?.current_price;

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
                {isPriceAvailable && livePrice && (
                  <span className={`text-sm font-medium flex items-center gap-1 ${priceChangePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {priceChangePercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {priceChangePercent >= 0 ? "+" : ""}
                    {priceChangePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              {!isPriceAvailable ? (
                <span className="text-xs text-muted-foreground">Using avg price (Market Closed)</span>
              ) : livePrice && !livePrice.market_open && (
                <span className="text-xs text-muted-foreground">Market Closed</span>
              )}
            </div>

            <div className="w-32 h-16">
              {chartData.length > 0 ? (
                <AreaChart width={128} height={64} data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs>
                    <linearGradient id={`gradient-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={priceChangePercent >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={priceChangePercent >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={[yMin, yMax]} hide />
                  <Area type="monotone" dataKey="value" stroke={priceChangePercent >= 0 ? "#22c55e" : "#ef4444"} strokeWidth={2} fill={`url(#gradient-${holding.id})`} isAnimationActive={false} />
                </AreaChart>
              ) : (
                <div className="w-full h-full bg-muted/30 rounded flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Chart</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-8 flex-grow justify-center">
            <StatItem label="Invested" value={`₹ ${parseFloat(holding.invested).toLocaleString("en-IN")}`} />
            <StatItem label="Current" value={`₹ ${currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <StatItem
              label="P & L"
              value={
                <span className={isProfitable ? "text-green-500" : pnl < 0 ? "text-red-500" : ""}>
                  ₹ {pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              }
            />
            <StatItem label="Avg. Price" value={`₹ ${parseFloat(holding.avgPrice).toFixed(2)}`} />
            <StatItem label="Quantity" value={holding.quantity} />
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={onDelete}>
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
    const interval = setInterval(fetchLivePrice, 60000);
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

  return (
    <Card>
      <CardContent className="p-4 flex justify-between items-center">
        <div className="flex-grow">
          <span className="font-semibold text-lg">{stock.name}</span>
          <div className="text-sm text-muted-foreground">{stock.ticker}</div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-lg">{livePrice ? `₹ ${livePrice.current_price}` : "..."}</span>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={onDelete}>
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
    fetchPrice();
  }, [stock.ticker]);

  const fetchPrice = async () => {
    try {
      const priceResponse = await fetch(`${API_BASE}/stocks/price/${stock.ticker}`);
      const priceData = await priceResponse.json();
      
      if (!priceData.error) {
        setLivePrice(priceData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const priceChangePercent = livePrice?.price_change_percent || 0;

  return (
    <div
      className="px-4 py-3 hover:bg-accent/50 cursor-pointer transition-all border-b last:border-b-0 flex items-center justify-between gap-4"
      onClick={() => onSelect(stock)}
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-base truncate">{stock.name}</div>
        <div className="text-sm text-muted-foreground">{stock.ticker}</div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : livePrice ? (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-semibold text-base">₹ {livePrice.current_price}</div>
            <div className={`text-xs flex items-center gap-1 ${priceChangePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
              {priceChangePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {priceChangePercent >= 0 ? "+" : ""}
              {priceChangePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">N/A</div>
      )}
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
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [editingHolding, setEditingHolding] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  useEffect(() => {
    fetchHoldings();
    fetchWatchlist();
  }, []);

  const fetchHoldings = async () => {
    try {
      const response = await api.get('/holdings');
      setHoldings(response.data);
    } catch (error) {
      console.error("Error fetching holdings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const response = await api.get('/watchlist');
      setWatchlist(response.data);
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

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setShowAddModal(true);
    setShowResults(false);
    setSearchQuery("");
  };

  const handleAddHolding = async (data) => {
  try {
    await api.post('/holdings', {
      ticker: selectedStock.ticker,  // Changed from stock_id
      quantity: data.quantity,
      invested: data.invested  // Changed from invested_amount
    });
    fetchHoldings();
    setShowAddModal(false);
  } catch (error) {
    console.error("Error adding holding:", error);
    alert("Failed to add stock. Please try again.");
  }
};


  const handleEditHolding = async (data) => {
  try {
    await api.put(`/holdings/${editingHolding.id}`, {
      quantity: data.quantity,
      invested: data.invested  // Changed from invested_amount
    });
    fetchHoldings();
    setShowEditModal(false);
  } catch (error) {
    console.error("Error updating holding:", error);
    alert("Failed to update. Please try again.");
  }
};


  const handleDeleteConfirm = async () => {
    try {
      if (deletingItem.type === 'holding') {
        await api.delete(`/holdings/${deletingItem.id}`);
        fetchHoldings();
      } else {
        await api.delete(`/watchlist/${deletingItem.id}`);
        fetchWatchlist();
      }
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting:", error);
    }
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

          <div className="relative w-full sm:w-auto sm:min-w-[450px]">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search stocks..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 250)}
              />
              <Button type="submit" size="icon" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {showResults && searchResults.length > 0 && (
              <Card className="absolute top-full mt-2 w-full min-w-[450px] z-50 max-h-96 overflow-y-auto shadow-xl border-2">
                <CardContent className="p-0">
                  {searchResults.map((stock) => (
                    <SearchResultItem key={stock.id} stock={stock} onSelect={handleSelectStock} />
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
                  onEdit={() => {
                    setEditingHolding(holding);
                    setShowEditModal(true);
                  }}
                  onDelete={() => {
                    setDeletingItem({ id: holding.id, name: holding.name, type: 'holding' });
                    setShowDeleteModal(true);
                  }}
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
                  onDelete={() => {
                    setDeletingItem({ id: stock.id, name: stock.name, type: 'watchlist' });
                    setShowDeleteModal(true);
                  }}
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

      <AddEditModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddHolding}
        stock={selectedStock}
      />

      <AddEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditHolding}
        stock={editingHolding}
        initialData={editingHolding ? { invested: editingHolding.invested, quantity: editingHolding.quantity } : null}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        itemName={deletingItem?.name}
      />
    </div>
  );
};

export default Stocks;
