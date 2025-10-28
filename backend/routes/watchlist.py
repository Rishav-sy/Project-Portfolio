from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import psycopg2
from config.config import Config

watchlist_bp = Blueprint('watchlist', __name__)

def get_db_connection():
    return psycopg2.connect(
        dbname=Config.DB_NAME, user=Config.DB_USER,
        password=Config.DB_PASSWORD, host=Config.DB_HOST, port=Config.DB_PORT
    )

@watchlist_bp.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    user_id = 3
    print(f"✅ GET Watchlist for user: {user_id}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT w.id, s.stock_name, s.ticker_symbol
        FROM watchlist w JOIN stocks s ON w.stock_id = s.id
        WHERE w.user_id = %s
    """, (user_id,))
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify([{'id': r[0], 'name': r[1], 'ticker': r[2]} for r in results])

@watchlist_bp.route('/api/watchlist', methods=['POST'])
def add_to_watchlist():
    user_id = 3
    data = request.json
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM watchlist WHERE stock_id = %s AND user_id = %s", (data['stock_id'], user_id))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'Already in watchlist'}), 400
    
    cur.execute("INSERT INTO watchlist (user_id, stock_id) VALUES (%s, %s) RETURNING id", (user_id, data['stock_id']))
    watchlist_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'id': watchlist_id}), 201

@watchlist_bp.route('/api/watchlist/<int:watchlist_id>', methods=['DELETE'])
def remove_from_watchlist(watchlist_id):
    user_id = 3
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM watchlist WHERE id = %s AND user_id = %s", (watchlist_id, user_id))
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'deleted'})
