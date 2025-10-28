from flask import Blueprint, jsonify, request
import requests

stocks_bp = Blueprint('stocks', __name__)

VM_URL = "http://100.111.63.114:5001"

@stocks_bp.route('/api/stocks/search', methods=['GET'])
def search_stocks():
    """Search stocks - public endpoint"""
    query = request.args.get('q', '')
    limit = request.args.get('limit', 20)
    
    try:
        response = requests.get(
            f"{VM_URL}/api/stocks/search",
            params={'q': query, 'limit': limit},
            timeout=10
        )
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@stocks_bp.route('/api/stocks/<ticker>', methods=['GET'])
def get_stock(ticker):
    """Get single stock"""
    try:
        response = requests.get(f"{VM_URL}/api/stocks/{ticker}", timeout=10)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@stocks_bp.route('/api/stocks/price/<ticker>', methods=['GET'])
def get_stock_price(ticker):
    """Get stock price - frontend compatibility"""
    try:
        response = requests.get(f"{VM_URL}/api/stocks/{ticker}", timeout=10)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@stocks_bp.route('/api/stocks/batch', methods=['POST'])
def get_batch_stocks():
    """Get multiple stocks"""
    try:
        response = requests.post(f"{VM_URL}/api/stocks/batch", json=request.json, timeout=10)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@stocks_bp.route('/api/stocks/stats', methods=['GET'])
def get_stats():
    """Get stats"""
    try:
        response = requests.get(f"{VM_URL}/api/stats", timeout=10)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500
