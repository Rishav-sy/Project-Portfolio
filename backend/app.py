from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config.config import Config
from routes.auth import auth_bp
from routes.holdings import holdings_bp
from routes.stocks import stocks_bp
from routes.watchlist import watchlist_bp

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY

# Fix CORS to allow Authorization header
CORS(app, resources={
    r"/api/*": {
        "origins": [Config.FRONTEND_URL],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

jwt = JWTManager(app)

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(holdings_bp, url_prefix='/api/holdings')
app.register_blueprint(stocks_bp, url_prefix='/api/stocks')
app.register_blueprint(watchlist_bp, url_prefix='/api/watchlist')

@app.route('/api/health', methods=['GET'])
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)
