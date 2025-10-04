from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
# import psycopg2
# import yfinance as yf
# from datetime import datetime


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://admin:sp123@localhost/stock_portfolio'
CORS(app)

db = SQLAlchemy(app)

class Stock(db.Model):
    __tablename__ = 'stocks'
    id = db.Column(db.Integer, primary_key=True)
    stock_name = db.Column(db.String(100))
    ticker_symbol = db.Column(db.String(10))
    exchange = db.Column(db.String(50))
    created_at = db.Column(db.DateTime)

    def as_dict(self):
        return {
            "id": self.id,
            "stock_name": self.stock_name,
            "ticker_symbol": self.ticker_symbol,
            "exchange": self.exchange,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

@app.route('/')
def index():
    return 'hi'

# @app.route('/stocks')
# def info():
#     stocks = Stock.query.all()
#     stocks_list = [stock.as_dict() for stock in stocks]
#     return jsonify(stocks_list) 
    
@app.route('/stocks/search')
def search_stocks():
 q = request.args.get('q', '').lower()
 if not q:
    return jsonify([])
 
 results = Stock.query.filter(
    (Stock.stock_name.ilike(f'%{q}%')) |
    (Stock.ticker_symbol.ilike(f'%{q}%'))
 ).limit(20).all()

 return jsonify([stock.as_dict() for stock in results])


if __name__ == '__main__':
    app.run(debug=True)