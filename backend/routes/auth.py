from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import psycopg2
from werkzeug.security import generate_password_hash, check_password_hash
from config.config import Config
from datetime import timedelta

auth_bp = Blueprint("auth", __name__)


def get_db_connection():
    return psycopg2.connect(
        dbname=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        host=Config.DB_HOST,
        port=Config.DB_PORT,
    )


@auth_bp.route("/api/auth/signup", methods=["POST"])
def signup():
    """Register new user"""
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not all([name, email, password]):
        return jsonify({"error": "Missing required fields"}), 400

    # Hash password
    password_hash = generate_password_hash(password)

    conn = get_db_connection()
    cur = conn.cursor()

    # Check if email exists
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"error": "Email already registered"}), 409

    # Insert new user
    try:
        cur.execute(
            """
            INSERT INTO users (name, email, password_hash, created_at)
            VALUES (%s, %s, %s, NOW())
            RETURNING id, name, email
        """,
            (name, email, password_hash),
        )

        user = cur.fetchone()
        conn.commit()

        # Create JWT token
        access_token = create_access_token(
            identity=str(user[0]), expires_delta=timedelta(days=7)  # Convert to string!
        )

        cur.close()
        conn.close()

        return (
            jsonify(
                {
                    "message": "User created successfully",
                    "access_token": access_token,
                    "user": {"id": user[0], "name": user[1], "email": user[2]},
                }
            ),
            201,
        )

    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    """Login user"""
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"error": "Missing email or password"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Get user by email
    cur.execute(
        """
        SELECT id, name, email, password_hash 
        FROM users 
        WHERE email = %s
    """,
        (email,),
    )

    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Check password
    if not check_password_hash(user[3], password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Create JWT token
    access_token = create_access_token(
    identity=str(user[0]),  # Convert to string!
    expires_delta=timedelta(days=7)
)

    return (
        jsonify(
            {
                "message": "Login successful",
                "access_token": access_token,
                "user": {"id": user[0], "name": user[1], "email": user[2]},
            }
        ),
        200,
    )


@auth_bp.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current logged-in user info"""
    user_id = get_jwt_identity()

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, email, created_at
        FROM users
        WHERE id = %s
    """,
        (user_id,),
    )

    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return (
        jsonify(
            {
                "user": {
                    "id": user[0],
                    "name": user[1],
                    "email": user[2],
                    "created_at": user[3].isoformat() if user[3] else None,
                }
            }
        ),
        200,
    )
