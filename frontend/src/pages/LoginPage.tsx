import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@tcs.local');
  const [password, setPassword] = useState('Admin@TCS123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Invalid credentials');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="login-container">
      {/* Left Visual Panel */}
      <div className="login-left">
        <div className="radar-wrapper">
          <div className="radar-ring" />
          <div className="radar-ring" />
          <div className="radar-ring" />
        </div>

        <div className="login-brand">
          <div className="login-brand-icon">
            <Activity size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 700 }}>TCS AI Vision</h3>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Traffic Congestion System</span>
          </div>
        </div>

        <div className="login-hero-text">
          <h1>Intelligent Real-Time Traffic Management</h1>
          <p>
            Powered by YOLOv8 deep learning and ByteTrack object identification. 
            Monitors vehicle density, detects traffic jams instantly, and notifies local authorities.
          </p>
        </div>

        <div className="login-footer-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="var(--primary)" />
            <span>Secure JWT Authentication</span>
          </div>
          <div>•</div>
          <div>System v2.4 Active</div>
        </div>
      </div>

      {/* Right Login Card Panel */}
      <div className="login-right">
        <div className="login-card">
          <h2>Sign In to TCS</h2>
          <p>Enter your system operator credentials to access the live control room.</p>

          {error && (
            <div style={{
              backgroundColor: 'var(--error-glow)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
              padding: '12px 16px',
              borderRadius: 'var(--rounded-md)',
              marginBottom: '20px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '42px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@tcs.local"
                  required
                />
                <Mail size={18} color="var(--muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '42px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Lock size={18} color="var(--muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--hairline)',
            fontSize: '12px',
            color: 'var(--muted)',
            textAlign: 'center'
          }}>
            Default Admin Login: <strong style={{ color: 'var(--ink)' }}>admin@tcs.local</strong> / <strong style={{ color: 'var(--ink)' }}>Admin@TCS123</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
