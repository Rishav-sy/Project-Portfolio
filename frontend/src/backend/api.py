from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import yfinance as yf
from datetime import datetime, time
import pytz

app = Flask(__name__)
CORS(app)

# Database connection
def get_db_connection():
    return psycopg2.connect(
        dbname="stock_portfolio",
        user="admin",
        password="sp123",
        host="localhost",
        port="5432"
    )

# Check if NSE is currently open
def is_market_open():
    """
    NSE trading hours: 9:15 AM - 3:30 PM IST (Monday-Friday)
    """
    ist = pytz.timezone('Asia/Kolkata')
    current_time = datetime.now(ist)
    
    if current_time.weekday() >= 5:  # Saturday or Sunday
        return False
    
    market_open = time(9, 15)
    market_close = time(15, 30)
    current = current_time.time()
    
    return market_open <= current <= market_close

# Search stocks by name or ticker
@app.route('/api/stocks/search', methods=['GET'])
def search_stocks():
    query = request.args.get('q', '')
    
    if not query:
        return jsonify([])
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, stock_name, ticker_symbol 
        FROM stocks 
        WHERE stock_name ILIKE %s OR ticker_symbol ILIKE %s
        LIMIT 10
    """, (f'%{query}%', f'%{query}%'))
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    stocks = [
        {
            'id': row[0],
            'name': row[1],
            'ticker': row[2]
        } for row in results
    ]
    
    return jsonify(stocks)

# Get all user holdings
@app.route('/api/holdings', methods=['GET'])
def get_holdings():
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT h.id, s.stock_name, s.ticker_symbol, h.quantity, h.avg_price, h.invested_amount
        FROM holdings h
        JOIN stocks s ON h.stock_id = s.id
    """)
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    holdings = [
        {
            'id': row[0],
            'name': row[1],
            'ticker': row[2],
            'quantity': row[3],
            'avgPrice': row[4],
            'invested': row[5]
        } for row in results
    ]
    
    return jsonify(holdings)

# Add new holding
@app.route('/api/holdings', methods=['POST'])
def add_holding():
    data = request.json
    stock_id = data.get('stock_id')
    quantity = data.get('quantity')
    avg_price = data.get('avg_price')
    invested_amount = data.get('invested_amount')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        INSERT INTO holdings (stock_id, quantity, avg_price, invested_amount)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """, (stock_id, quantity, avg_price, invested_amount))
    
    holding_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'id': holding_id, 'message': 'Holding added successfully'}), 201

# Update holding
@app.route('/api/holdings/<int:holding_id>', methods=['PUT'])
def update_holding(holding_id):
    data = request.json
    quantity = data.get('quantity')
    avg_price = data.get('avg_price')
    invested_amount = data.get('invested_amount')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        UPDATE holdings 
        SET quantity = %s, avg_price = %s, invested_amount = %s
        WHERE id = %s
    """, (quantity, avg_price, invested_amount, holding_id))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'Holding updated successfully'})

# Delete holding
@app.route('/api/holdings/<int:holding_id>', methods=['DELETE'])
def delete_holding(holding_id):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("DELETE FROM holdings WHERE id = %s", (holding_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'Holding deleted successfully'})

# Get watchlist
@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT w.id, s.stock_name, s.ticker_symbol
        FROM watchlist w
        JOIN stocks s ON w.stock_id = s.id
    """)
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    watchlist = [
        {
            'id': row[0],
            'name': row[1],
            'ticker': row[2]
        } for row in results
    ]
    
    return jsonify(watchlist)

# Add to watchlist
@app.route('/api/watchlist', methods=['POST'])
def add_to_watchlist():
    data = request.json
    stock_id = data.get('stock_id')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Check if already in watchlist
    cur.execute("SELECT id FROM watchlist WHERE stock_id = %s", (stock_id,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'message': 'Stock already in watchlist'}), 400
    
    cur.execute("""
        INSERT INTO watchlist (stock_id)
        VALUES (%s)
        RETURNING id
    """, (stock_id,))
    
    watchlist_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'id': watchlist_id, 'message': 'Added to watchlist'}), 201

# Remove from watchlist
@app.route('/api/watchlist/<int:watchlist_id>', methods=['DELETE'])
def remove_from_watchlist(watchlist_id):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("DELETE FROM watchlist WHERE id = %s", (watchlist_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'Removed from watchlist'})

# Get live price for a stock
@app.route('/api/stocks/price/<ticker>', methods=['GET'])
def get_stock_price(ticker):
    try:
        market_open = is_market_open()
        
        stock = yf.Ticker(ticker + ".NS")
        period = "1d" if market_open else "5d"
        data = stock.history(period=period)
        
        if data.empty:
            return jsonify({'error': 'No data found'}), 404
        
        current_price = data['Close'].iloc[-1]
        open_price = data['Open'].iloc[-1]
        high_price = data['High'].iloc[-1]
        low_price = data['Low'].iloc[-1]
        volume = data['Volume'].iloc[-1]
        prev_close = data['Close'].iloc[-2] if len(data) > 1 else current_price
        
        price_change = current_price - prev_close
        price_change_percent = (price_change / prev_close) * 100
        
        return jsonify({
            'ticker': ticker,
            'current_price': round(current_price, 2),
            'open': round(open_price, 2),
            'high': round(high_price, 2),
            'low': round(low_price, 2),
            'volume': int(volume),
            'price_change': round(price_change, 2),
            'price_change_percent': round(price_change_percent, 2),
            'market_open': market_open,
            'timestamp': datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get multiple stock prices at once
@app.route('/api/stocks/prices', methods=['POST'])
def get_multiple_prices():
    tickers = request.json.get('tickers', [])
    market_open = is_market_open()
    
    results = []
    for ticker in tickers:
        try:
            stock = yf.Ticker(ticker + ".NS")
            period = "1d" if market_open else "5d"
            data = stock.history(period=period)
            
            if not data.empty:
                current_price = data['Close'].iloc[-1]
                prev_close = data['Close'].iloc[-2] if len(data) > 1 else current_price
                change = current_price - prev_close
                change_percent = (change / prev_close) * 100
                
                results.append({
                    'ticker': ticker,
                    'price': round(current_price, 2),
                    'change': round(change, 2),
                    'change_percent': round(change_percent, 2)
                })
        except:
            continue
    
    return jsonify({
        'stocks': results,
        'market_open': market_open
    })

# Check market status
@app.route('/api/market/status', methods=['GET'])
def market_status():
    return jsonify({
        'is_open': is_market_open(),
        'timestamp': datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
