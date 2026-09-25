import cv2
import time
import threading
import os
import smtplib
import ssl
from email.message import EmailMessage
import certifi
# pyrefly: ignore [missing-import]
from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime
import numpy as np

# Import from existing scripts
from tracker import VehicleTracker
from congestion_logic import CongestionDetector
from location_service import get_device_location
from database import init_db, save_alert, get_all_alerts, get_user_by_email, seed_default_admin, create_user
from auth import hash_password, verify_password, create_token, require_auth, get_current_user_from_request
from telegram_service import send_telegram_photo, send_telegram_message, get_latest_chat_id

app = Flask(__name__)
CORS(app)

# Global State
global_state = {
    "vehicle_count": 0,
    "is_congested": False,
    "latitude": 0.0,
    "longitude": 0.0,
    "map_link": "",
    "camera_active": False,
    "camera_error": None,
    "last_alert_time": 0,
    "settings": {
        "threshold": 10,
        "receiver_email": "rajharsh.23.cse@iite.indusuni.ac.in, rakeshjena.23.cse@iite.indusuni.ac.in",
        "telegram_chat_id": "8711760988",
        "telegram_bot_token": "8837015866:AAGkEkLK2kZaUh1e6OlrpQe1GyLX1Mun8zE"
    }
}

# The latest frame encoded as JPEG
latest_frame_jpeg = None

# Professional Color Theme (BGR)
COLOR_BG = (30, 30, 30)
COLOR_TEXT = (255, 255, 255)
COLOR_NORMAL = (0, 200, 0)
COLOR_ALERT = (0, 0, 255)
COLOR_PANEL = (50, 50, 50)

def save_congestion_image(frame):
    folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "congestion_images")
    if not os.path.exists(folder):
        os.makedirs(folder)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Add timestamp text on image
    cv2.putText(frame, f"Time: {timestamp}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    lat = global_state["latitude"]
    lon = global_state["longitude"]
    cv2.putText(frame, f"Lat: {lat}  Lon: {lon}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    filename = f"{folder}/congestion_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.jpg"
    cv2.imwrite(filename, frame)
    print(f"📸 Image saved: {filename}")
    return filename

def send_email_alert(image_path, vehicle_count):
    sender_email = "jenarakeshku@gmail.com"
    app_password = "xbxv bbkb jrdh tpwz".replace(" ", "")
    raw_receiver = global_state["settings"]["receiver_email"]
    
    recipients = [e.strip() for e in raw_receiver.replace(';', ',').split(',') if e.strip()]
    receiver_string = ", ".join(recipients) if recipients else "rajharsh.23.cse@iite.indusuni.ac.in"

    msg = EmailMessage()
    msg["Subject"] = "🚨 Traffic Congestion Alert - TCS"
    msg["From"] = sender_email
    msg["To"] = receiver_string

    latitude = global_state["latitude"]
    longitude = global_state["longitude"]
    map_link = global_state["map_link"]

    msg.set_content(f"""
🚨 Traffic Congestion Detected

Vehicle Count: {vehicle_count}
Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

📍 Coordinates
Latitude: {latitude}
Longitude: {longitude}

🗺 Google Maps
{map_link}

See attached congestion image.
""")

    with open(image_path, "rb") as f:
        msg.add_attachment(f.read(), maintype="image", subtype="jpeg", filename=f.name)

    context = ssl.create_default_context(cafile=certifi.where())
    email_sent = False
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(sender_email, app_password)
            server.send_message(msg)
        print(f"📧 Email alert sent successfully to {receiver_string}!")
        global_state["last_alert_time"] = time.time()
        email_sent = True
    except Exception as e:
        print(f"❌ Failed to send email alert: {e}")
    
    # Dispatch Telegram Alert (Photo with Caption)
    try:
        telegram_chat_id = global_state["settings"].get("telegram_chat_id")
        telegram_bot_token = global_state["settings"].get("telegram_bot_token")
        
        caption = f"""🚨 <b>Traffic Congestion Alert - TCS</b>

🚗 <b>Vehicle Count:</b> {vehicle_count}
⏰ <b>Time:</b> {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
📍 <b>Latitude:</b> {latitude}
📍 <b>Longitude:</b> {longitude}
🗺 <a href="{map_link}">View on Google Maps</a>"""

        send_telegram_photo(
            image_path=image_path,
            caption=caption,
            chat_id=telegram_chat_id,
            bot_token=telegram_bot_token
        )
    except Exception as e:
        print(f"❌ Failed to send Telegram alert: {e}")

    # Save to database regardless of email success/failure
    try:
        save_alert(
            vehicle_count=vehicle_count,
            latitude=latitude,
            longitude=longitude,
            map_link=map_link,
            image_path=image_path,
            email_sent=email_sent
        )
    except Exception as e:
        print(f"❌ Failed to save alert to database: {e}")


def get_offline_frame():
    # Create a black frame with "CAMERA OFFLINE" text
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(frame, "CAMERA OFFLINE", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (100, 100, 100), 3)
    ret, buffer = cv2.imencode('.jpg', frame)
    return buffer

def generate_frames():
    global latest_frame_jpeg
    while True:
        if global_state["camera_active"]:
            if latest_frame_jpeg is not None:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + latest_frame_jpeg.tobytes() + b'\r\n')
        else:
            offline_buffer = get_offline_frame()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + offline_buffer.tobytes() + b'\r\n')
        
        time.sleep(0.05) # ~20 FPS emit rate

@app.route('/')
def home():
    return jsonify({
        "message": "Traffic Congestion System (TCS) API Server is running",
        "endpoints": {
            "status": "/api/status",
            "video_feed": "/video_feed",
            "toggle_camera": "/api/camera/toggle"
        },
        "state": global_state
    })

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/status')
def status():
    return jsonify(global_state)

@app.route('/api/alerts')
def alerts():
    """Return all recorded congestion alerts as JSON."""
    try:
        all_alerts = get_all_alerts()
        return jsonify({"alerts": all_alerts, "count": len(all_alerts)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/alerts/images/<path:filename>')
def alert_image(filename):
    """Serve congestion images so the frontend can display them."""
    image_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "congestion_images")
    return send_from_directory(image_dir, filename)

# ===== Authentication Endpoints =====
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required."}), 400

    user = get_user_by_email(email)
    if not user or not verify_password(password, user['password']):
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    token = create_token(user['id'], user['role'])
    user_data = {
        "id": user['id'],
        "username": user['username'],
        "email": user['email'],
        "role": user['role']
    }
    return jsonify({"success": True, "token": token, "user": user_data})


@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me():
    user = request.current_user
    user_data = {
        "id": user['id'],
        "username": user['username'],
        "email": user['email'],
        "role": user['role']
    }
    return jsonify({"success": True, "user": user_data})


@app.route('/api/auth/register', methods=['POST'])
@require_auth
def register():
    if request.current_user['role'] != 'admin':
        return jsonify({"success": False, "error": "Forbidden. Admin access required."}), 403

    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'operator').strip()

    if not username or not email or not password:
        return jsonify({"success": False, "error": "Username, email, and password are required."}), 400

    try:
        pass_hash = hash_password(password)
        user_id = create_user(username, email, pass_hash, role)
        return jsonify({"success": True, "user_id": user_id, "message": f"User {username} created."})
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    return jsonify({"success": True, "message": "Logged out successfully."})


@app.route('/api/camera/toggle', methods=['POST'])
@require_auth
def toggle_camera():
    data = request.get_json(silent=True) or {}
    if 'active' not in data:
        return jsonify({"success": False, "error": "The active state is required."}), 400

    active = bool(data['active'])
    if active:
        # Verify the device before reporting the camera as active. Without this,
        # an unavailable webcam leaves the dashboard stuck in a misleading state.
        camera = cv2.VideoCapture(0)
        available = camera.isOpened()
        camera.release()
        if not available:
            message = "No camera is available at device index 0. Connect or enable a webcam, then try again."
            global_state["camera_active"] = False
            global_state["camera_error"] = message
            return jsonify({"success": False, "camera_active": False, "error": message}), 503

    global_state["camera_active"] = active
    global_state["camera_error"] = None
    return jsonify({"success": True, "camera_active": active})

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'POST':
        user = get_current_user_from_request()
        if not user:
            return jsonify({"success": False, "error": "Unauthorized. Token required."}), 401
        data = request.get_json() or {}
        if 'threshold' in data:
            global_state["settings"]["threshold"] = int(data["threshold"])
        if 'receiver_email' in data:
            global_state["settings"]["receiver_email"] = str(data["receiver_email"])
        if 'telegram_chat_id' in data:
            global_state["settings"]["telegram_chat_id"] = str(data["telegram_chat_id"]).strip()
        if 'telegram_bot_token' in data:
            global_state["settings"]["telegram_bot_token"] = str(data["telegram_bot_token"]).strip()
        return jsonify({"success": True, "settings": global_state["settings"]})
    return jsonify(global_state["settings"])


@app.route('/api/telegram/test', methods=['POST'])
@require_auth
def test_telegram():
    data = request.get_json(silent=True) or {}
    chat_id = (data.get("telegram_chat_id") or global_state["settings"].get("telegram_chat_id") or "").strip()
    bot_token = (data.get("telegram_bot_token") or global_state["settings"].get("telegram_bot_token") or "").strip()

    if not chat_id:
        auto_id = get_latest_chat_id(bot_token)
        if auto_id:
            chat_id = auto_id
            global_state["settings"]["telegram_chat_id"] = auto_id

    message = """🚨 <b>Traffic Congestion System (TCS)</b>

Telegram notification channel is connected successfully!
Test message dispatched by TCS System Admin."""

    res = send_telegram_message(message, chat_id=chat_id, bot_token=bot_token)
    if res.get("ok"):
        return jsonify({"success": True, "message": "Telegram test message sent successfully!", "result": res})
    else:
        err_msg = res.get("description") or res.get("error") or "Failed to send Telegram message"
        return jsonify({"success": False, "error": err_msg, "result": res}), 200


@app.route('/api/email/test', methods=['POST'])
@require_auth
def test_email():
    sender_email = "jenarakeshku@gmail.com"
    app_password = "xbxv bbkb jrdh tpwz".replace(" ", "")
    raw_receiver = global_state["settings"]["receiver_email"]
    
    recipients = [e.strip() for e in raw_receiver.replace(';', ',').split(',') if e.strip()]
    receiver_string = ", ".join(recipients) if recipients else "rajharsh.23.cse@iite.indusuni.ac.in"

    msg = EmailMessage()
    msg["Subject"] = "🚨 TCS Test Email Dispatch"
    msg["From"] = sender_email
    msg["To"] = receiver_string

    msg.set_content(f"""
🚨 Traffic Congestion System - Test Email

This is a test notification from the TCS API Server.
Recipients: {receiver_string}
Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
""")

    context = ssl.create_default_context(cafile=certifi.where())
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(sender_email, app_password)
            server.send_message(msg)
        return jsonify({"success": True, "message": f"Email alert sent successfully to {receiver_string}!"})
    except Exception as e:
        return jsonify({"success": False, "error": f"SMTP Authentication or Network Error: {str(e)}"}), 400


def tracking_thread():
    global latest_frame_jpeg, global_state
    
    cap = None
    tracker = VehicleTracker() 
    detector = CongestionDetector(threshold=global_state["settings"]["threshold"], duration=10)
    
    frame_skip = 2
    frame_count = 0
    current_vehicles = []
    
    # Init location
    lat, lon, m_link = get_device_location()
    global_state["latitude"] = lat
    global_state["longitude"] = lon
    global_state["map_link"] = m_link

    while True:
        if not global_state["camera_active"]:
            if cap is not None:
                cap.release()
                cap = None
            time.sleep(0.5)
            # Reset metrics while offline
            global_state["vehicle_count"] = 0
            global_state["is_congested"] = False
            continue

        if cap is None:
            cap = cv2.VideoCapture(0)
            
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.1)
            continue
            
        frame_count += 1
        height, width, _ = frame.shape

        if frame_count % (frame_skip + 1) == 0:
            results = tracker.track(frame, tracker="bytetrack.yaml", persist=True, verbose=False)
            current_vehicles = []
            
            if results.boxes is not None and len(results.boxes) > 0:
                boxes = results.boxes.xyxy.cpu().numpy()
                track_ids = results.boxes.id.cpu().numpy() if results.boxes.id is not None else list(range(1, len(boxes) + 1))
                
                for box, track_id in zip(boxes, track_ids):
                    x1, y1, x2, y2 = map(int, box)
                    current_vehicles.append((x1, y1, x2, y2, int(track_id), "vehicle"))

            # Update detector threshold dynamically
            detector.threshold = global_state["settings"]["threshold"]
            
            jam = detector.update(len(current_vehicles))
            
            # Send Email Alert if newly jammed
            if jam and not detector.alert_sent:
                print("🚨 Traffic Jam Detected! Sending Email...")
                image_path = save_congestion_image(frame)
                # Send email in a separate thread so it doesn't block the video stream!
                threading.Thread(target=send_email_alert, args=(image_path, len(current_vehicles)), daemon=True).start()
                detector.alert_sent = True
            
            # Update Global State for API
            global_state["vehicle_count"] = len(current_vehicles)
            global_state["is_congested"] = jam

        # Visualization (Draw on every frame to stream it)
        status_color = COLOR_ALERT if global_state["is_congested"] else COLOR_NORMAL
        box_color = COLOR_ALERT if len(current_vehicles) > 10 else COLOR_NORMAL

        # Draw bounding boxes
        for item in current_vehicles:
            x1, y1, x2, y2, track_id = item[0], item[1], item[2], item[3], item[4]
            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 3)
            cv2.putText(frame, f"ID: {track_id}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_color, 2)
            
        # Optional: draw warning banner if jam
        if global_state["is_congested"]:
            cv2.rectangle(frame, (0, 0), (width, 60), COLOR_ALERT, -1)
            cv2.putText(frame, "TRAFFIC CONGESTION DETECTED", (width//4, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)

        # Encode frame to JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            latest_frame_jpeg = buffer

if __name__ == '__main__':
    # Initialize the database
    init_db()
    seed_default_admin(hash_password)
    
    # Start tracking loop in a background thread
    t = threading.Thread(target=tracking_thread, daemon=True)
    t.start()
    
    print("🚀 Starting API Server on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, threaded=True, debug=False)
