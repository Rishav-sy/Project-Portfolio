from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
import psycopg2
from config.config import Config
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from jwt.exceptions import PyJWTError

watchlist_bp = Blueprint('watchlist', __name__)

def get_db_connection():
    return psycopg2.connect(
        dbname=Config.DB_NAME, user=Config.DB_USER,
        password=Config.DB_PASSWORD, host=Config.DB_HOST, port=Config.DB_PORT
    )

def get_user_id():
    """Get user ID from JWT with guest fallback"""
    try:
        # Verify JWT token exists and is valid
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        
        if user_id:
            print(f"🔐 JWT User ID: {user_id}")
            return int(user_id)
    except Exception as e:
        print(f"❌ JWT Error: {e}")
    
    # GUEST MODE (default when no JWT)
    print("👤 Using Guest user (id=1)")
    return 1



@watchlist_bp.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    user_id = get_user_id()
    
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    print(f"✅ GET Watchlist for user: {user_id}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT w.id, s.stock_name, w.ticker_symbol
        FROM watchlist w 
        JOIN stocks s ON w.ticker_symbol = s.ticker_symbol
        WHERE w.user_id = %s
    """, (user_id,))
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify([{'id': r[0], 'name': r[1], 'ticker': r[2]} for r in results])

@watchlist_bp.route('/api/watchlist', methods=['POST'])
def add_to_watchlist():
    user_id = get_user_id()
    
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    ticker = data.get('ticker')
    
    if not ticker:
        return jsonify({'error': 'Missing ticker'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM watchlist WHERE ticker_symbol = %s AND user_id = %s", (ticker, user_id))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'Already in watchlist'}), 400
    
    cur.execute("INSERT INTO watchlist (user_id, ticker_symbol) VALUES (%s, %s) RETURNING id", (user_id, ticker))
    watchlist_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'id': watchlist_id}), 201

@watchlist_bp.route('/api/watchlist/<int:watchlist_id>', methods=['DELETE'])
def remove_from_watchlist(watchlist_id):
    user_id = get_user_id()
    
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM watchlist WHERE id = %s AND user_id = %s", (watchlist_id, user_id))
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'deleted'})
