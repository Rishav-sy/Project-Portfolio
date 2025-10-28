from flask import Blueprint, request, jsonify
import psycopg2
from config.config import Config

holdings_bp = Blueprint('holdings', __name__)

def get_db_connection():
    return psycopg2.connect(
        dbname=Config.DB_NAME, user=Config.DB_USER,
        password=Config.DB_PASSWORD, host=Config.DB_HOST, port=Config.DB_PORT
    )

@holdings_bp.route('/api/holdings', methods=['GET'])
def get_holdings():
    user_id = 3  # Dev mode
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT h.id, s.stock_name, h.ticker_symbol, h.quantity, h.avg_price, h.invested
        FROM holdings h 
        JOIN stocks s ON h.ticker_symbol = s.ticker_symbol
        WHERE h.user_id = %s
    """, (user_id,))
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify([
        {'id': r[0], 'name': r[1], 'ticker': r[2], 'quantity': r[3], 'avgPrice': str(r[4]), 'invested': str(r[5])}
        for r in results
    ])

@holdings_bp.route('/api/holdings', methods=['POST'])
def add_holding():
    user_id = 3  # Dev mode
    data = request.json
    ticker = data.get('ticker')
    quantity = data.get('quantity')
    invested = data.get('invested')
    
    if not all([ticker, quantity, invested]):
        return jsonify({'error': 'Missing fields'}), 400
    
    avg_price = float(invested) / float(quantity)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Check if already exists
    cur.execute("""
        SELECT id, quantity, invested 
        FROM holdings 
        WHERE user_id = %s AND ticker_symbol = %s
    """, (user_id, ticker))
    
    existing = cur.fetchone()
    
    if existing:
        cur.close()
        conn.close()
        return jsonify({
            'error': 'Stock already in portfolio',
            'action': 'edit',
            'holding_id': existing[0]
        }), 409
    
    # Insert new holding
    cur.execute("""
        INSERT INTO holdings (user_id, ticker_symbol, quantity, avg_price, invested, purchase_date)
        VALUES (%s, %s, %s, %s, %s, CURRENT_DATE) 
        RETURNING id
    """, (user_id, ticker, quantity, avg_price, invested))
    
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'id': new_id, 'message': 'Added successfully'}), 201

@holdings_bp.route('/api/holdings/<int:holding_id>', methods=['PUT'])
def update_holding(holding_id):
    user_id = 3
    data = request.json
    quantity = data.get('quantity')
    invested = data.get('invested')
    
    if not all([quantity, invested]):
        return jsonify({'error': 'Missing fields'}), 400
    
    avg_price = float(invested) / float(quantity)
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE holdings 
        SET quantity = %s, avg_price = %s, invested = %s
        WHERE id = %s AND user_id = %s
    """, (quantity, avg_price, invested, holding_id, user_id))
    
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        return jsonify({'error': 'Not found'}), 404
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'Updated successfully'})

@holdings_bp.route('/api/holdings/<int:holding_id>', methods=['DELETE'])
def delete_holding(holding_id):
    user_id = 3
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM holdings WHERE id = %s AND user_id = %s", (holding_id, user_id))
    
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        return jsonify({'error': 'Not found'}), 404
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'Deleted successfully'})
