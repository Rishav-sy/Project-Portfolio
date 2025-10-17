from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from flask import jsonify

def require_auth(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({'error': 'Invalid token'}), 401
        return f(current_user_id, *args, **kwargs)
    return decorated_function
