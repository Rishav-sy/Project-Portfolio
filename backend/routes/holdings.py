from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import psycopg2
from config.config import Config

holdings_bp = Blueprint('holdings', __name__)

def get_db_connection():
    return psycopg2.connect(
        dbname=Config.DB_NAME, user=Config.DB_USER,
        password=Config.DB_PASSWORD, host=Config.DB_HOST, port=Config.DB_PORT
    )

@holdings_bp.route('', methods=['GET'])

def get_holdings():
    user_id = 3
    print(f"✅ GET Holdings for user: {user_id}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT h.id, s.stock_name, s.ticker_symbol, h.quantity, h.avg_price, h.invested_amount
        FROM holdings h JOIN stocks s ON h.stock_id = s.id
        WHERE h.user_id = %s
    """, (user_id,))
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify([
        {'id': r[0], 'name': r[1], 'ticker': r[2], 'quantity': r[3], 'avgPrice': str(r[4]), 'invested': str(r[5])}
        for r in results
    ])

@holdings_bp.route('', methods=['POST'])

def add_holding():
    user_id = 3
    data = request.json
    print(f"✅ ADD Holding for user: {user_id}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "INSERT INTO holdings (user_id, stock_id, quantity, avg_price, invested_amount) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (user_id, data['stock_id'], data['quantity'], data['avg_price'], data['invested_amount'])
    )
    holding_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'id': holding_id}), 201

@holdings_bp.route('/<int:holding_id>', methods=['PUT'])

def update_holding(holding_id):
    user_id = 3
    data = request.json
    print(f"✅ UPDATE Holding {holding_id} for user: {user_id}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "UPDATE holdings SET quantity = %s, avg_price = %s, invested_amount = %s WHERE id = %s AND user_id = %s",
        (data['quantity'], data['avg_price'], data['invested_amount'], holding_id, user_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'updated'})

@holdings_bp.route('/<int:holding_id>', methods=['DELETE'])

def delete_holding(holding_id):
    user_id = 3
    print(f"✅ DELETE Holding {holding_id} for user: {user_id}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM holdings WHERE id = %s AND user_id = %s", (holding_id, user_id))
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'message': 'deleted'})
