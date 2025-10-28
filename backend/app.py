from flask import Flask, jsonify
from flask_cors import CORS
from routes.auth import auth_bp
from routes.stocks import stocks_bp
from routes.holdings import holdings_bp
from routes.watchlist import watchlist_bp

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(stocks_bp)
app.register_blueprint(holdings_bp)
app.register_blueprint(watchlist_bp)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)