from flask import Blueprint, request, jsonify
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import psycopg2
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.config import Config
from utils.password_handler import hash_password, verify_password
from utils.jwt_handler import generate_token

auth_bp = Blueprint('auth', __name__)

def get_db_connection():
    return psycopg2.connect(
        dbname=Config.DB_NAME, user=Config.DB_USER,
        password=Config.DB_PASSWORD, host=Config.DB_HOST, port=Config.DB_PORT
    )

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    full_name = data.get('full_name', '').strip()
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({'error': 'User already exists'}), 409
        
        # Create user
        password_hash = hash_password(password)
        cur.execute(
            "INSERT INTO users (email, password_hash, full_name) VALUES (%s, %s, %s) RETURNING id",
            (email, password_hash, full_name if full_name else None)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        
        # Generate token
        token = generate_token(user_id)
        return jsonify({
            'token': token,
            'user': {'id': user_id, 'email': email, 'full_name': full_name}
        }), 201
    
    except Exception as e:
        conn.rollback()
        print(f"Signup error: {str(e)}")  # Log to console
        return jsonify({'error': 'Failed to create account. Please try again.'}), 500
    finally:
        cur.close()
        conn.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT id, email, password_hash, full_name FROM users WHERE email = %s",
            (email,)
        )
        user = cur.fetchone()
        
        if not user or not verify_password(password, user[2]):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        token = generate_token(user[0])
        return jsonify({
            'token': token,
            'user': {'id': user[0], 'email': user[1], 'full_name': user[3]}
        })
    finally:
        cur.close()
        conn.close()

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    data = request.json
    credential = data.get('credential')
    
    if not credential:
        return jsonify({'error': 'Google credential required'}), 400
    
    try:
        idinfo = id_token.verify_oauth2_token(
            credential, google_requests.Request(), Config.GOOGLE_CLIENT_ID
        )
        
        google_id = idinfo['sub']
        email = idinfo['email'].lower()
        full_name = idinfo.get('name', '')
        profile_picture = idinfo.get('picture')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM users WHERE google_id = %s OR email = %s", (google_id, email))
        user = cur.fetchone()
        
        if user:
            user_id = user[0]
            cur.execute("UPDATE users SET google_id = %s WHERE id = %s", (google_id, user_id))
            conn.commit()
        else:
            cur.execute(
                "INSERT INTO users (email, google_id, full_name, profile_picture) VALUES (%s, %s, %s, %s) RETURNING id",
                (email, google_id, full_name, profile_picture)
            )
            user_id = cur.fetchone()[0]
            conn.commit()
        
        cur.close()
        conn.close()
        
        token = generate_token(user_id)
        return jsonify({
            'token': token,
            'user': {'id': user_id, 'email': email, 'full_name': full_name, 'profile_picture': profile_picture}
        })
    except ValueError:
        return jsonify({'error': 'Invalid Google token'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT id, email, full_name, profile_picture FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': user[0], 'email': user[1], 'full_name': user[2], 'profile_picture': user[3]
        })
    finally:
        cur.close()
        conn.close()

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    user_id = get_jwt_identity()
    return jsonify({
        'message': 'Token is valid',
        'user_id': user_id
    })
