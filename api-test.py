import yfinance as yf

# Test TCS
stock = yf.Ticker("TCS.NS")
data = stock.history(period="1mo")
print("Data length:", len(data))
print("\nLast 5 rows:")
print(data.tail())
print("\nLast close:", data['Close'].iloc[-1])
