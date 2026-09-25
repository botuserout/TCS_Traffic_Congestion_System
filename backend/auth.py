import datetime
import jwt
import bcrypt
from functools import wraps
from flask import request, jsonify
from database import get_user_by_id

import os
SECRET_KEY = os.environ.get("TCS_JWT_SECRET", "tcs_secret_jwt_key_super_secure_987213")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRATION_HOURS = 24


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    if not password:
        raise ValueError("Password cannot be empty.")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """Safely verify a plaintext password against a bcrypt hash."""
    if not password or not hashed_password:
        return False
    try:
        pass_bytes = password.encode('utf-8') if isinstance(password, str) else password
        hash_bytes = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
        return bcrypt.checkpw(pass_bytes, hash_bytes)
    except Exception as e:
        print(f"⚠️ Password verification error: {e}")
        return False


def create_token(user_id: int, role: str) -> str:
    """Create a JWT token for a given user ID and role."""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": now + datetime.timedelta(hours=TOKEN_EXPIRATION_HOURS),
        "iat": now
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)
    # Ensure token is string (for compatibility across PyJWT versions)
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    if not token:
        raise ValueError("No token provided.")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired.")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token.")


def get_current_user_from_request():
    """Extract user payload from Authorization header or token query param."""
    auth_header = request.headers.get("Authorization")
    token = None

    if auth_header:
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    elif "token" in request.args:
        token = request.args.get("token")

    if not token:
        return None

    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            return None
        user = get_user_by_id(user_id)
        return user
    except Exception as e:
        print(f"⚠️ Auth token extraction failed: {e}")
        return None


def require_auth(f):
    """Decorator to enforce JWT authentication on API routes with CORS preflight support."""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow CORS preflight OPTIONS requests to pass through
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        
        user = get_current_user_from_request()
        if not user:
            return jsonify({"success": False, "error": "Unauthorized. Valid authentication token required."}), 401
        
        request.current_user = user
        return f(*args, **kwargs)
    return decorated
