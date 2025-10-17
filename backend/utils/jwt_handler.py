from flask_jwt_extended import create_access_token
from datetime import timedelta
from config.config import Config

def generate_token(user_id):
    return create_access_token(
        identity=user_id,
        expires_delta=timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)
    )
