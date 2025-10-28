from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config.config import Config

app = Flask(__name__)
CORS(app, supports_credentials=True)

# JWT Config
app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = Config.JWT_ACCESS_TOKEN_EXPIRES
jwt = JWTManager(app)

# Import blueprints
from routes.holdings import holdings_bp
from routes.watchlist import watchlist_bp
from routes.stocks import stocks_bp
from routes.auth import auth_bp  # NEW!

# Register blueprints
app.register_blueprint(holdings_bp)
app.register_blueprint(watchlist_bp)
app.register_blueprint(stocks_bp)
app.register_blueprint(auth_bp)  # NEW!

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
