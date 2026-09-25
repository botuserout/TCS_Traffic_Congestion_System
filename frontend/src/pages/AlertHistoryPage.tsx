import { useState, useEffect } from 'react';
import { Database, ExternalLink, CheckCircle, XCircle, Search, Download } from 'lucide-react';

interface AlertRecord {
  id: number;
  timestamp: string;
  vehicle_count: number;
  latitude: number;
  longitude: number;
  map_link: string;
  image_path: string;
  email_sent: boolean;
}

const ImageModal = ({ src, onClose }: { src: string; onClose: () => void }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }}
    onClick={onClose}
  >
    <button
      onClick={onClose}
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        color: 'white',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        fontSize: '24px',
        cursor: 'pointer'
      }}
    >
      ×
    </button>
    <img
      src={src}
      alt="Congestion Snapshot"
      style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      onClick={(e) => e.stopPropagation()}
    />
  </div>
);

export const AlertHistoryPage = () => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/alerts');
        if (response.ok) {
          const data = await response.json();
          setAlerts(data.alerts || []);
        }
      } catch (err) {
        console.error("Could not fetch alerts from backend:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 8000);
    return () => clearInterval(interval);
  }, []);

  const getImageUrl = (imagePath: string) => {
    const filename = imagePath.split(/[/\\]/).pop() || imagePath;
    return `http://localhost:5001/api/alerts/images/${filename}`;
  };

  const filteredAlerts = alerts.filter(a =>
    a.timestamp.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.vehicle_count.toString().includes(searchTerm) ||
    a.latitude.toString().includes(searchTerm) ||
    a.longitude.toString().includes(searchTerm)
  );

  const exportCSV = () => {
    const headers = "ID,Timestamp,Vehicle Count,Latitude,Longitude,Email Sent,Map Link\n";
    const rows = alerts.map(a => 
      `${a.id},"${a.timestamp}",${a.vehicle_count},${a.latitude},${a.longitude},${a.email_sent},"${a.map_link}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tcs_alerts_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div>
      {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Alert History & Logs</h1>
          <p className="page-description">Complete audit log of congestion events captured by the TCS engine.</p>
        </div>

        <button className="btn-secondary" onClick={exportCSV} disabled={alerts.length === 0}>
          <Download size={16} />
          Export CSV Log
        </button>
      </div>

      {/* Filter and Table Container */}
      <div className="card-glass" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--surface-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search by time or count..."
              style={{ height: '38px', paddingLeft: '38px', fontSize: '13px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} color="var(--muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          </div>

          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Showing <strong>{filteredAlerts.length}</strong> of <strong>{alerts.length}</strong> total records
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
            <Database size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontSize: '16px', fontWeight: 500 }}>No alert records found</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Alerts will automatically populate here when traffic threshold is breached.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th># ID</th>
                  <th>Timestamp</th>
                  <th>Vehicle Count</th>
                  <th>Geographic Location</th>
                  <th>Map Link</th>
                  <th>Evidence Snapshot</th>
                  <th>Notification Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td style={{ fontFamily: 'var(--font-code)', fontSize: '13px', color: 'var(--muted)' }}>
                      #{alert.id}
                    </td>
                    <td style={{ fontFamily: 'var(--font-code)', fontSize: '13px' }}>
                      {alert.timestamp}
                    </td>
                    <td style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                      {alert.vehicle_count}
                    </td>
                    <td style={{ fontFamily: 'var(--font-code)', fontSize: '12px' }}>
                      {typeof alert.latitude === 'number' ? alert.latitude.toFixed(4) : parseFloat(alert.latitude || 0).toFixed(4)}, {typeof alert.longitude === 'number' ? alert.longitude.toFixed(4) : parseFloat(alert.longitude || 0).toFixed(4)}
                    </td>
                    <td>
                      {alert.map_link ? (
                        <a href={alert.map_link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                          View Map <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>N/A</span>
                      )}
                    </td>
                    <td>
                      <img
                        src={getImageUrl(alert.image_path)}
                        alt={`Alert #${alert.id}`}
                        style={{
                          width: '54px',
                          height: '38px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          border: '1px solid var(--surface-border)'
                        }}
                        onClick={() => setModalImage(getImageUrl(alert.image_path))}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </td>
                    <td>
                      {alert.email_sent ? (
                        <span className="status-pill success">
                          <CheckCircle size={12} /> Dispatched
                        </span>
                      ) : (
                        <span className="status-pill error">
                          <XCircle size={12} /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
