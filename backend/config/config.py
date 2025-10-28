import os
from datetime import timedelta

class Config:
    # Database
    DB_NAME = os.getenv('DB_NAME', 'stock_portfolio')
    DB_USER = os.getenv('DB_USER', 'portfolio_user')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'sp123')
    DB_HOST = os.getenv('DB_HOST', '100.111.63.114')
    DB_PORT = os.getenv('DB_PORT', '5432')
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-key-change-this-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
