import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../api/client';
import { registerUserApi } from '../api/auth';
import { Sliders, Mail, UserPlus, CheckCircle2, AlertCircle, Shield, Send, MessageSquare } from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();
  
  // System Settings State
  const [threshold, setThreshold] = useState(10);
  const [email, setEmail] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Telegram Test State
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramSuccess, setTelegramSuccess] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  // New Operator State (Admin Only)
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('operator');
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [registeringUser, setRegisteringUser] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/settings');
        if (res.ok) {
          const data = await res.json();
          setThreshold(data.threshold || 10);
          setEmail(data.receiver_email || '');
          if (data.telegram_chat_id !== undefined) setTelegramChatId(data.telegram_chat_id);
          if (data.telegram_bot_token) setTelegramBotToken(data.telegram_bot_token);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    setSettingsError(null);

    try {
      const res = await fetchWithAuth('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          threshold,
          receiver_email: email,
          telegram_chat_id: telegramChatId,
          telegram_bot_token: telegramBotToken
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 4000);
      } else {
        setSettingsError(data.error || 'Failed to update settings');
      }
    } catch {
      setSettingsError('Network error while saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramSuccess(null);
    setTelegramError(null);

    try {
      const res = await fetchWithAuth('/api/telegram/test', {
        method: 'POST',
        body: JSON.stringify({
          telegram_chat_id: telegramChatId,
          telegram_bot_token: telegramBotToken
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramSuccess(data.message || 'Telegram test message sent successfully!');
      } else {
        setTelegramError(data.error || 'Failed to send Telegram message');
      }
    } catch {
      setTelegramError('Network error sending Telegram test');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisteringUser(true);
    setUserSuccess(null);
    setUserError(null);

    try {
      const res = await registerUserApi({
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole
      });
      if (res.success) {
        setUserSuccess(`Operator account ${newUsername} created successfully.`);
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
      } else {
        setUserError(res.error || 'Unable to create user account');
      }
    } catch {
      setUserError('Network error registering user');
    } finally {
      setRegisteringUser(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System Settings & Controls</h1>
        <p className="page-description">Configure detection thresholds, notification channels (Email & Telegram), and operator permissions.</p>
      </div>

      <div className="grid-2">
        {/* System Threshold & Notifications Form */}
        <div className="card-glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <Sliders size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '20px' }}>Threshold & Notification Channels</h2>
          </div>

          {settingsSuccess && (
            <div style={{
              backgroundColor: 'var(--success-glow)',
              color: 'var(--success)',
              padding: '12px 16px',
              borderRadius: 'var(--rounded-md)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              <CheckCircle2 size={16} />
              Settings updated successfully!
            </div>
          )}

          {settingsError && (
            <div style={{
              backgroundColor: 'var(--error-glow)',
              color: 'var(--error)',
              padding: '12px 16px',
              borderRadius: 'var(--rounded-md)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              <AlertCircle size={16} />
              {settingsError}
            </div>
          )}

          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label className="form-label">Congestion Vehicle Cutoff</label>
              <input
                type="number"
                min="1"
                max="100"
                className="input-field"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                When vehicle count meets or exceeds this count for 10s, a jam alert is triggered.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Authority Email Recipients</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email1@domain.com, email2@domain.com"
                  required
                />
                <Mail size={16} color="var(--muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                Separate multiple emails with commas.
              </span>
            </div>

            {/* Telegram Settings Section */}
            <div style={{
              margin: '24px 0',
              padding: '20px',
              backgroundColor: 'var(--surface-dark)',
              borderRadius: 'var(--rounded-md)',
              border: '1px solid var(--surface-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <MessageSquare size={18} color="var(--accent-teal)" />
                <h3 style={{ fontSize: '15px', color: 'var(--ink)' }}>Telegram Bot Channel</h3>
              </div>

              {telegramSuccess && (
                <div style={{
                  backgroundColor: 'var(--success-glow)',
                  color: 'var(--success)',
                  padding: '10px 14px',
                  borderRadius: 'var(--rounded-sm)',
                  marginBottom: '14px',
                  fontSize: '13px'
                }}>
                  {telegramSuccess}
                </div>
              )}

              {telegramError && (
                <div style={{
                  backgroundColor: 'var(--error-glow)',
                  color: 'var(--error)',
                  padding: '10px 14px',
                  borderRadius: 'var(--rounded-sm)',
                  marginBottom: '14px',
                  fontSize: '13px'
                }}>
                  {telegramError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Telegram Chat ID</label>
                <input
                  type="text"
                  className="input-field"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. 123456789 or -100123456789"
                />
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                  Press <strong>Start</strong> in your Telegram Bot, then enter your Chat ID here.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Telegram Bot Token</label>
                <input
                  type="text"
                  className="input-field"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNO..."
                />
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleTestTelegram}
                disabled={testingTelegram}
                style={{ width: '100%', marginTop: '8px' }}
              >
                <Send size={14} />
                {testingTelegram ? 'Sending Test...' : 'Send Test Telegram Message'}
              </button>
            </div>

            <button type="submit" className="btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>
        </div>

        {/* User Management Section (Admin Only) */}
        <div className="card-glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <UserPlus size={22} color="var(--accent-teal)" />
            <h2 style={{ fontSize: '20px' }}>Register New Operator</h2>
          </div>

          {user?.role !== 'admin' ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
              <Shield size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Admin role required to create new operator credentials.</p>
            </div>
          ) : (
            <>
              {userSuccess && (
                <div style={{
                  backgroundColor: 'var(--success-glow)',
                  color: 'var(--success)',
                  padding: '12px 16px',
                  borderRadius: 'var(--rounded-md)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}>
                  <CheckCircle2 size={16} />
                  {userSuccess}
                </div>
              )}

              {userError && (
                <div style={{
                  backgroundColor: 'var(--error-glow)',
                  color: 'var(--error)',
                  padding: '12px 16px',
                  borderRadius: 'var(--rounded-md)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}>
                  <AlertCircle size={16} />
                  {userError}
                </div>
              )}

              <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="operator_name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="input-field"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="operator@tcs.local"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '28px' }}>
                  <label className="form-label">System Role</label>
                  <select
                    className="input-field"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="operator">Operator (Standard Access)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" disabled={registeringUser}>
                  {registeringUser ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
