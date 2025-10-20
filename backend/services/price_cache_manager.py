import sqlite3
import json
import redis
from datetime import datetime, time
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import yfinance as yf
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PriceCacheManager:
    def __init__(self, db_path='stock_prices.db', redis_host='localhost', redis_port=6379):
        self.db_path = db_path
        self.redis_client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        self.scheduler = BackgroundScheduler()
        self.is_market_open = False
        self._init_db()
        
    def _init_db(self):
        """Initialize SQLite database for persistent storage"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create price history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS price_cache (
                ticker TEXT PRIMARY KEY,
                current_price REAL,
                previous_close REAL,
                change_percent REAL,
                last_updated TIMESTAMP,
                market_cap REAL,
                volume INTEGER
            )
        ''')
        
        # Create update log table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS update_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                update_time TIMESTAMP,
                tickers_updated INTEGER,
                status TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Price cache database initialized")
    
    def is_us_market_open(self) -> bool:
        """Check if US stock market is currently open"""
        eastern = pytz.timezone('US/Eastern')
        now = datetime.now(eastern)
        
        # Market is closed on weekends
        if now.weekday() >= 5:  # Saturday = 5, Sunday = 6
            return False
        
        # Market hours: 9:30 AM - 4:00 PM EST
        market_open = time(9, 30)
        market_close = time(16, 0)
        current_time = now.time()
        
        return market_open <= current_time <= market_close
    
    def get_all_tracked_tickers(self) -> List[str]:
        """Get all unique tickers from holdings and watchlist"""
        try:
            from app import app
            from flask_sqlalchemy import SQLAlchemy
            
            with app.app_context():
                from models.models import Stock
                
                # Get all unique tickers from the stocks table
                stocks = Stock.query.all()
                tickers = [stock.ticker_symbol for stock in stocks]
                
                logger.info(f"Found {len(tickers)} tickers to track: {tickers}")
                return tickers
        except Exception as e:
            logger.error(f"Error fetching tickers: {e}")
            return []
    
    def fetch_price_data(self, ticker: str) -> Optional[Dict]:
        """Fetch price data for a single ticker"""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            current_price = info.get('currentPrice') or info.get('regularMarketPrice')
            previous_close = info.get('previousClose')
            
            if not current_price:
                logger.warning(f"No current price found for {ticker}")
                return None
            
            change_percent = 0
            if previous_close and previous_close > 0:
                change_percent = ((current_price - previous_close) / previous_close) * 100
            
            data = {
                'ticker': ticker,
                'current_price': current_price,
                'previous_close': previous_close,
                'change_percent': change_percent,
                'market_cap': info.get('marketCap'),
                'volume': info.get('volume'),
                'last_updated': datetime.now().isoformat()
            }
            
            return data
            
        except Exception as e:
            logger.error(f"Error fetching price for {ticker}: {e}")
            return None
    
    def update_all_prices(self):
        """Update prices for all tracked stocks"""
        logger.info("Starting price update cycle...")
        
        tickers = self.get_all_tracked_tickers()
        if not tickers:
            logger.warning("No tickers to update")
            return
        
        self.is_market_open = self.is_us_market_open()
        successful_updates = 0
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for ticker in tickers:
            try:
                # Add delay to avoid rate limiting
                import time
                time.sleep(1)  # 1 second delay between requests
                
                price_data = self.fetch_price_data(ticker)
                
                if price_data:
                    # Store in SQLite (persistent backup)
                    cursor.execute('''
                        INSERT OR REPLACE INTO price_cache 
                        (ticker, current_price, previous_close, change_percent, last_updated, market_cap, volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        price_data['ticker'],
                        price_data['current_price'],
                        price_data['previous_close'],
                        price_data['change_percent'],
                        price_data['last_updated'],
                        price_data['market_cap'],
                        price_data['volume']
                    ))
                    
                    # Store in Redis (fast access cache)
                    redis_key = f"stock_price:{ticker}"
                    self.redis_client.setex(
                        redis_key,
                        3600,  # 1 hour expiry
                        json.dumps(price_data)
                    )
                    
                    successful_updates += 1
                    logger.info(f"Updated {ticker}: ${price_data['current_price']}")
                    
            except Exception as e:
                logger.error(f"Failed to update {ticker}: {e}")
        
        # Log the update
        cursor.execute('''
            INSERT INTO update_log (update_time, tickers_updated, status)
            VALUES (?, ?, ?)
        ''', (datetime.now().isoformat(), successful_updates, 'completed'))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Price update completed: {successful_updates}/{len(tickers)} successful")
    
    def get_price(self, ticker: str) -> Optional[Dict]:
        """Get price from cache (Redis first, then SQLite, then fetch)"""
        # Try Redis first
        redis_key = f"stock_price:{ticker}"
        cached = self.redis_client.get(redis_key)
        
        if cached:
            logger.info(f"Price for {ticker} retrieved from Redis cache")
            return json.loads(cached)
        
        # Try SQLite backup
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM price_cache WHERE ticker = ?',
            (ticker,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            data = {
                'ticker': row[0],
                'current_price': row[1],
                'previous_close': row[2],
                'change_percent': row[3],
                'last_updated': row[4],
                'market_cap': row[5],
                'volume': row[6]
            }
            
            # Restore to Redis
            self.redis_client.setex(redis_key, 3600, json.dumps(data))
            logger.info(f"Price for {ticker} retrieved from SQLite backup and restored to Redis")
            return data
        
        # Fetch fresh if not in cache
        logger.info(f"Price for {ticker} not in cache, fetching fresh data")
        data = self.fetch_price_data(ticker)
        
        if data:
            # Store in both caches
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO price_cache 
                (ticker, current_price, previous_close, change_percent, last_updated, market_cap, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['ticker'], data['current_price'], data['previous_close'],
                data['change_percent'], data['last_updated'], data['market_cap'], data['volume']
            ))
            conn.commit()
            conn.close()
            
            self.redis_client.setex(redis_key, 3600, json.dumps(data))
        
        return data
    
    def start_scheduler(self):
        """Start the background scheduler for automatic updates"""
        
        # Update every 60 seconds during market hours (9:30 AM - 4:00 PM EST, Mon-Fri)
        self.scheduler.add_job(
            func=self.update_all_prices,
            trigger=CronTrigger(
                day_of_week='mon-fri',
                hour='9-15',  # 9 AM to 3:59 PM
                minute='*',  # Every minute
                second='0',
                timezone='US/Eastern'
            ),
            id='market_hours_update',
            name='Update prices during market hours',
            replace_existing=True
        )
        
        # Final update at market close (4:00 PM EST)
        self.scheduler.add_job(
            func=self.update_all_prices,
            trigger=CronTrigger(
                day_of_week='mon-fri',
                hour='16',
                minute='0',
                second='0',
                timezone='US/Eastern'
            ),
            id='market_close_update',
            name='Update prices at market close',
            replace_existing=True
        )
        
        # Off-hours update (once at 8:00 PM EST for after-hours data)
        self.scheduler.add_job(
            func=self.update_all_prices,
            trigger=CronTrigger(
                day_of_week='mon-fri',
                hour='20',
                minute='0',
                second='0',
                timezone='US/Eastern'
            ),
            id='after_hours_update',
            name='Update prices after hours',
            replace_existing=True
        )
        
        # Run initial update
        self.update_all_prices()
        
        # Start scheduler
        self.scheduler.start()
        logger.info("Price update scheduler started")
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        self.scheduler.shutdown()
        logger.info("Price update scheduler stopped")
    
    def get_cache_stats(self) -> Dict:
        """Get statistics about the cache"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM price_cache')
        total_cached = cursor.fetchone()[0]
        
        cursor.execute('SELECT last_updated FROM price_cache ORDER BY last_updated DESC LIMIT 1')
        last_update = cursor.fetchone()
        
        cursor.execute('SELECT COUNT(*) FROM update_log WHERE date(update_time) = date("now")')
        updates_today = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_cached_stocks': total_cached,
            'last_update': last_update[0] if last_update else None,
            'updates_today': updates_today,
            'market_status': 'open' if self.is_us_market_open() else 'closed'
        }

# Global instance
price_cache = None

def init_price_cache(app):
    """Initialize the price cache manager with Flask app"""
    global price_cache
    price_cache = PriceCacheManager()
    
    # Import app context for database access
    with app.app_context():
        price_cache.start_scheduler()
    
    return price_cache
