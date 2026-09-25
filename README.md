# TCS - Traffic Congestion System

A full-stack, AI-powered system designed to detect and manage traffic congestion in real time using **YOLOv8** and **ByteTrack**. It features a modern React-based web dashboard and a robust Python backend that processes video streams, detects vehicle counts, and automatically sends alert notifications.

## 🌟 Key Features

- **Real-Time Video Analytics**: Captures live video feeds (or processes files) and applies YOLOv8 inference to detect vehicles with high accuracy.
- **Intelligent Tracking**: Uses ByteTrack to assign consistent IDs to vehicles, ensuring reliable counting.
- **Dynamic Thresholding**: The system actively monitors vehicle volume over time to accurately flag traffic jams.
- **Automated Alerts**: When congestion exceeds customizable thresholds, the system captures an evidence snapshot and immediately emails local authorities with incident details (time, location, and snapshot).
- **Persistent Audit Log**: All congestion events are recorded in an SQLite database, accessible through the Alert History dashboard.
- **Modern Web Dashboard**: A responsive, beautifully designed React dashboard (Vite) that streams live footage alongside key metrics and historic alerts.
- **Dynamic System Settings**: Configure alert thresholds and notification emails directly from the web interface in real time.

## 🏗️ Architecture

The project is split into two primary environments:

- **`/backend` (Python / Flask)**
  - Runs the heavy AI inference loop using OpenCV and Ultralytics YOLOv8.
  - Streams multipart MJPEG video directly to the frontend.
  - Manages SQLite (`tcs_alerts.db`) and email dispatches.
  - Exposes REST APIs for system status, alert history, and settings configuration.

- **`/frontend` (React / Vite / TypeScript)**
  - An interactive dashboard built for high performance and clean UI/UX.
  - Polls backend state and dynamically updates metrics.
  - Allows camera toggling, setting configurations, and browsing full-resolution alert snapshots.

## 🚀 Getting Started

### 1. Initial Setup (One-Time)

```bash
# Navigate to the root directory
cd TCS_Traffic_Congestion_System

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install ALL dependencies (Python backend + Node frontend)
npm run install:all

# Configure your environment (copy and edit the .env file)
# On Mac/Linux:
cp .env.example .env
# On Windows:
copy .env.example .env
# Then open .env and fill in your credentials (email password, Telegram token, etc.)
```

### 2. Run the Full System (Single Command)

```bash
# Activate venv (if not already active), then:
npm run dev
```

This single command launches **both** the Flask backend (port 5001) and the Vite frontend (port 5173) simultaneously with color-coded output.

> **Other available commands:**
> - `npm run dev:backend` — Start only the backend API server
> - `npm run dev:frontend` — Start only the frontend dashboard
> - `npm run build` — Build the frontend for production

## ⚙️ Configuration

- **System Settings**: You can easily change the vehicle congestion threshold and the recipient email address for alerts via the **"System Settings"** button in the dashboard navigation bar. These changes are applied instantly to the running AI pipeline.
- **Email Sender Setup**: If you wish to change the system sender email, update the `sender_email` and `app_password` credentials in `backend/server.py` (`send_email_alert` function).

## 🚧 Challenges Faced

During the development and architectural migration of this project, several key challenges were addressed:
- **Real-Time Full-Stack Integration:** Separating the heavy YOLOv8 OpenCV video processing loop from the frontend without introducing latency. This was solved by streaming a multipart MJPEG feed via Flask directly to the React application.
- **Accurate Object Tracking:** Raw object detection can cause flickering and miscounts. Integrating ByteTrack enabled consistent ID assignment for vehicles across frames, ensuring the volume metric is reliable.
- **State Synchronization:** Decoupling the UI from the backend meant the frontend needed to poll for metric updates (vehicle count, thresholds) asynchronously so as not to block the AI inference loop.
- **Dynamic Congestion Evaluation:** Preventing false positives (e.g. cars stopped briefly at a light). We developed a robust algorithm (`congestion_logic.py`) that requires the vehicle threshold to be exceeded for a sustained duration before triggering an alert.

## 📁 File Structure Overview

```
TCS_Traffic_Congestion_System/
├── backend/
│   ├── congestion_images/      # Auto-generated alert snapshots
│   ├── server.py               # Flask API and main tracking thread
│   ├── tracker.py              # YOLOv8 ByteTrack wrapper
│   ├── congestion_logic.py     # Threshold and duration algorithms
│   ├── database.py             # SQLite integration
│   ├── location_service.py     # IP-based geolocator
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main React application
│   │   ├── index.css           # UI Styling and Design System
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 🛠️ Tech Stack
- **AI / Vision**: Ultralytics YOLOv8, OpenCV, ByteTrack
- **Backend**: Python, Flask, SQLite3
- **Frontend**: React, Vite, TypeScript, Lucide Icons
