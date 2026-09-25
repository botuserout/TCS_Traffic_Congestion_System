import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tcs_alerts.db")


def get_connection():
    """Get a database connection with row factory for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the congestion_alerts and users tables if they don't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS congestion_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            vehicle_count INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            map_link TEXT NOT NULL,
            image_path TEXT NOT NULL,
            email_sent INTEGER NOT NULL DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'operator',
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully.")


def create_user(username, email, password_hash, role="operator"):
    """Insert a new user record into the database."""
    conn = get_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        cursor.execute("""
            INSERT INTO users (username, email, password, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (username, email, password_hash, role, timestamp))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return user_id
    except sqlite3.IntegrityError as e:
        conn.close()
        raise ValueError("Username or email already exists.") from e


def get_user_by_email(email):
    """Retrieve user record by email."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_user_by_id(user_id):
    """Retrieve user record by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def seed_default_admin(hash_func):
    """Seed default admin account if no users exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    conn.close()

    if count == 0:
        admin_pass_hash = hash_func("Admin@TCS123")
        create_user("admin", "admin@tcs.local", admin_pass_hash, role="admin")
        print("👤 Seeded default admin user: admin@tcs.local / Admin@TCS123")


def save_alert(vehicle_count, latitude, longitude, map_link, image_path, email_sent):
    """Insert a new congestion alert record into the database."""
    conn = get_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO congestion_alerts (timestamp, vehicle_count, latitude, longitude, map_link, image_path, email_sent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (timestamp, vehicle_count, latitude, longitude, map_link, image_path, 1 if email_sent else 0))
    conn.commit()
    conn.close()
    print(f"💾 Alert saved to database (vehicles: {vehicle_count}, email_sent: {email_sent})")


def get_all_alerts():
    """Return all alerts ordered by most recent first, as a list of dicts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM congestion_alerts ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    alerts = []
    for row in rows:
        alerts.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "vehicle_count": row["vehicle_count"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "map_link": row["map_link"],
            "image_path": row["image_path"],
            "email_sent": bool(row["email_sent"]),
        })
    return alerts


def get_alert_count():
    """Return the total number of recorded alerts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM congestion_alerts")
    count = cursor.fetchone()[0]
    conn.close()
    return count
