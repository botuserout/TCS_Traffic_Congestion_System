import { useState, useEffect, useRef } from 'react';
import { Camera, AlertTriangle, CheckCircle2, Activity, MapPin, Power, MailCheck } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { fetchWithAuth } from '../api/client';

const formatCoord = (val: any, decimals = 3) => {
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? '0.000' : num.toFixed(decimals);
};

export const DashboardPage = () => {
  const [vehicleCount, setVehicleCount] = useState(0);
  const [isCongested, setIsCongested] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [location, setLocation] = useState({ lat: 23.0225, lon: 72.5714 });
  const [showPopup, setShowPopup] = useState(false);
  const [settings, setSettings] = useState({ threshold: 10, receiver_email: '' });

  const lastAlertTimeRef = useRef(0);

  const handleToggleCamera = async () => {
    try {
      const newState = !isCameraActive;
      const response = await fetchWithAuth('/api/camera/toggle', {
        method: 'POST',
        body: JSON.stringify({ active: newState })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to change the camera state.');
      }
      setIsCameraActive(data.camera_active);
      setCameraError(null);
    } catch (err) {
      console.error("Failed to toggle camera:", err);
      setIsCameraActive(false);
      setCameraError(err instanceof Error ? err.message : 'Unable to change camera state.');
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/status');
        if (response.ok) {
          const data = await response.json();
          setVehicleCount(data.vehicle_count);
          setIsCongested(data.is_congested);
          if (data.camera_active !== undefined) {
            setIsCameraActive(data.camera_active);
          }
          
          if (data.last_alert_time > lastAlertTimeRef.current) {
            const wasInitialLoad = (lastAlertTimeRef.current === 0);
            lastAlertTimeRef.current = data.last_alert_time;
            
            if (!wasInitialLoad) {
              setShowPopup(true);
              setTimeout(() => setShowPopup(false), 5000);
            }
          }
          
          if (data.latitude && data.longitude) {
            setLocation({ lat: data.latitude, lon: data.longitude });
          }
          
          if (data.settings) {
            setSettings(data.settings);
          }
        }
      } catch (err) {
        console.error("Could not fetch status from backend:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Toast Notification Banner */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: 'var(--surface-card)',
          color: 'var(--ink)',
          padding: '16px 24px',
          borderRadius: 'var(--rounded-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          border: '1px solid var(--success)',
          zIndex: 9999,
          maxWidth: '400px',
        }}>
          <div style={{
            backgroundColor: 'var(--success-glow)',
            color: 'var(--success)',
            width: '40px',
            height: '40px',
            borderRadius: 'var(--rounded-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <MailCheck size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Email Alert Dispatched</div>
            <div style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '2px' }}>
              Traffic authority notified of high congestion.
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">Live Vision Feed</h1>
        <p className="page-description">Real-time video analytics, vehicle counting, and automated jam detection.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid-4">
        <StatCard
          title="Traffic Flow State"
          value={isCongested ? "Congested" : "Normal Flow"}
          subtitle={isCongested ? "Heavy jam detected at location" : "Flowing within normal parameters"}
          icon={isCongested ? AlertTriangle : CheckCircle2}
          variant={isCongested ? 'alert' : 'success'}
        />
        <StatCard
          title="Live Vehicle Count"
          value={vehicleCount}
          subtitle={`Alert Threshold: ${settings.threshold} vehicles`}
          icon={Activity}
          variant={isCongested ? 'alert' : 'normal'}
        />
        <StatCard
          title="Camera Stream"
          value={isCameraActive ? "Online" : "Offline"}
          subtitle={isCameraActive ? "Webcam Index #0 Connected" : "Stream currently paused"}
          icon={Camera}
          variant={isCameraActive ? 'success' : 'normal'}
        />
        <StatCard
          title="Location Tracker"
          value={`${formatCoord(location.lat)}, ${formatCoord(location.lon)}`}
          subtitle="IP Geolocated Intersection"
          icon={MapPin}
          variant="normal"
        />
      </div>

      {/* Camera Stream Area */}
      <div className="card-glass" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{
          padding: '16px 24px',
          backgroundColor: 'var(--surface-dark)',
          borderBottom: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--error)' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--warning)' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-code)', fontSize: '13px', color: 'var(--muted)' }}>
              camera_stream_yolov8.py
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handleToggleCamera}
              className="btn-secondary"
              style={{
                borderColor: isCameraActive ? 'var(--surface-border)' : 'var(--error)',
                color: isCameraActive ? 'var(--ink)' : 'var(--error)'
              }}
            >
              <Power size={16} />
              {isCameraActive ? 'Pause Stream' : 'Start Camera'}
            </button>
            <span className={`status-pill ${isCongested ? 'error' : 'success'}`}>
              {isCongested ? 'JAM ALERT' : 'FLOW OK'}
            </span>
          </div>
        </div>

        <div style={{
          minHeight: '520px',
          backgroundColor: '#050505',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <img
            src="http://localhost:5001/video_feed"
            alt="Live Camera Stream"
            style={{ width: '100%', height: '520px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const errElem = document.getElementById('video-err-fallback');
              if (errElem) errElem.style.display = 'flex';
            }}
            onLoad={(e) => {
              e.currentTarget.style.display = 'block';
              const errElem = document.getElementById('video-err-fallback');
              if (errElem) errElem.style.display = 'none';
            }}
          />

          <div
            id="video-err-fallback"
            style={{
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              color: 'var(--muted)',
              gap: '12px'
            }}
          >
            <Camera size={48} style={{ opacity: 0.4 }} />
            <p style={{ fontFamily: 'var(--font-code)', fontSize: '14px' }}>
              {cameraError || 'Camera feed offline or disconnected.'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--muted-soft)' }}>
              Click "Start Camera" above to initiate device video capture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
