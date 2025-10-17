from flask import Blueprint, request, jsonify
import yfinance as yf
from datetime import datetime, time, timedelta
import pytz
from config.config import Config
import time as time_module
import random
from requests import Session
import requests  # ADD THIS LINE
import redis
import json

stocks_bp = Blueprint('stocks', __name__)

# Redis cache setup
try:
    cache = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    cache.ping()
    print("✅ Redis cache connected")
except:
    print("⚠️  Redis not available, caching disabled")
    cache = None

ALPHA_VANTAGE_KEY = "demo"
FINNHUB_KEY = "demo"
TWELVE_DATA_KEY = "demo"

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

def is_market_open():
    ist = pytz.timezone('Asia/Kolkata')
    current_time = datetime.now(ist)
    if current_time.weekday() >= 5:
        return False
    market_open = time(9, 15)
    market_close = time(15, 30)
    return market_open <= current_time.time() <= market_close

def get_cache_ttl():
    return timedelta(seconds=30 if is_market_open() else 300)

def get_cached_price(ticker):
    if not cache:
        return None
    try:
        data = cache.get(f"price:{ticker}")
        if data:
            print(f"💾 Cache hit: {ticker}")
            return json.loads(data)
    except:
        pass
    return None

def set_cached_price(ticker, data):
    if not cache:
        return
    try:
        ttl = get_cache_ttl().total_seconds()
        cache.setex(f"price:{ticker}", int(ttl), json.dumps(data))
    except Exception as e:
        print(f"⚠️  Cache set failed: {str(e)}")

def get_cached_history(ticker):
    if not cache:
        return None
    try:
        data = cache.get(f"history:{ticker}")
        if data:
            print(f"💾 History cache hit: {ticker}")
            return json.loads(data)
    except:
        pass
    return None

def set_cached_history(ticker, data):
    if not cache:
        return
    try:
        cache.setex(f"history:{ticker}", 3600, json.dumps(data))
    except Exception as e:
        print(f"⚠️  History cache failed: {str(e)}")

def fetch_yahoo_finance(ticker):
    try:
        session = Session()
        session.headers.update({'User-Agent': random.choice(USER_AGENTS)})
        stock = yf.Ticker(ticker + ".NS", session=session)
        data = stock.history(period='5d')
        
        if not data.empty:
            current = float(data['Close'].iloc[-1])
            prev = float(data['Close'].iloc[-2]) if len(data) > 1 else current
            change = current - prev
            change_pct = (change / prev) * 100 if prev > 0 else 0
            
            print(f"✅ Yahoo Finance: {ticker} = ₹{current}")
            return {
                'current_price': round(current, 2),
                'price_change': round(change, 2),
                'price_change_percent': round(change_pct, 2),
                'source': 'Yahoo Finance'
            }
    except Exception as e:
        print(f"⚠️  Yahoo Finance failed: {str(e)}")
    return None

def fetch_stock_price(ticker):
    cached = get_cached_price(ticker)
    if cached:
        return cached
    
    result = fetch_yahoo_finance(ticker)
    if result:
        set_cached_price(ticker, result)
        return result
    
    print(f"❌ All sources failed for {ticker}")
    return None

@stocks_bp.route('/search', methods=['GET'])
def search_stocks():
    import psycopg2
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    
    conn = psycopg2.connect(
        dbname=Config.DB_NAME, user=Config.DB_USER,
        password=Config.DB_PASSWORD, host=Config.DB_HOST, port=Config.DB_PORT
    )
    cur = conn.cursor()
    cur.execute(
        "SELECT id, stock_name, ticker_symbol FROM stocks WHERE stock_name ILIKE %s OR ticker_symbol ILIKE %s LIMIT 10",
        (f'%{query}%', f'%{query}%')
    )
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify([{'id': r[0], 'name': r[1], 'ticker': r[2]} for r in results])

@stocks_bp.route('/price/<ticker>', methods=['GET'])
def get_stock_price(ticker):
    try:
        market_open = is_market_open()
        result = fetch_stock_price(ticker)
        
        if result is None:
            return jsonify({'error': 'No data available from any source'}), 404
        
        result['ticker'] = ticker
        result['market_open'] = market_open
        result['last_updated'] = datetime.now().isoformat()
        
        return jsonify(result)
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({'error': 'Failed to fetch data'}), 500

@stocks_bp.route('/history/<ticker>', methods=['GET'])
def get_stock_history(ticker):
    try:
        cached = get_cached_history(ticker)
        if cached:
            return jsonify(cached)
        
        session = Session()
        session.headers.update({'User-Agent': random.choice(USER_AGENTS)})
        stock = yf.Ticker(ticker + ".NS", session=session)
        
        data = stock.history(period='1mo')
        
        if not data.empty:
            prices = data['Close'].tail(20).tolist()
            dates = data.tail(20).index.tolist()
            
            result = {
                'ticker': ticker,
                'prices': [round(float(p), 2) for p in prices],
                'dates': [d.strftime('%Y-%m-%d') for d in dates]
            }
            
            set_cached_history(ticker, result)
            
            return jsonify(result)
        
        return jsonify({'error': 'No historical data'}), 404
    except Exception as e:
        print(f"❌ History error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@stocks_bp.route('/market/status', methods=['GET'])
def market_status():
    return jsonify({
        'is_open': is_market_open(),
        'timestamp': datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
    })
