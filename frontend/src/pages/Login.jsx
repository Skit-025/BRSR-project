import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Leaf, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide both Employee ID / Username and Password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(identifier, password);
      if (loggedUser.role === 'system_admin') {
        navigate('/admin/users');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.detail || 'Authentication failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAdmin = (u, p) => {
    setIdentifier(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="login-screen">
      <div className="login-backdrop-glow" />

      {/* Top Bar */}
      <div className="login-top-bar">
        <Link to="/landing" className="landing-logo" style={{ textDecoration: 'none' }}>
          <div className="landing-logo-icon" style={{ width: 32, height: 32 }}>
            <Leaf size={18} color="#fff" />
          </div>
          <div className="landing-logo-text">
            <span className="landing-brand-name">MEIL</span>
            <span className="landing-brand-sub">ESG PORTAL</span>
          </div>
        </Link>
        <Link to="/landing" className="btn btn-secondary btn-sm">
          ← Back to Overview
        </Link>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-badge-icon">
              <Lock size={20} color="var(--brand-400)" />
            </div>
            <h2>Sign In to MEIL BRSR</h2>
            <p>Enter your Employee ID or System Admin credentials</p>
          </div>

          {error && (
            <div className="login-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="identifier">Employee ID / Username</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  id="identifier"
                  type="text"
                  placeholder="e.g. Skit-025 or adtshrm007"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Admin Test Section */}
          <div className="quick-access-box">
            <div className="quick-access-header">
              <Sparkles size={14} color="var(--amber-400)" />
              <span>Authorized System Admin Accounts</span>
            </div>
            <div className="quick-access-buttons">
              <button
                type="button"
                className="quick-btn"
                onClick={() => fillQuickAdmin('Skit-025', 'Skit@2409006')}
              >
                <span className="quick-role">Admin 1:</span>
                <span className="quick-id">Skit-025</span>
              </button>
              <button
                type="button"
                className="quick-btn"
                onClick={() => fillQuickAdmin('adtshrm007', 'adtshrm@2409007')}
              >
                <span className="quick-role">Admin 2:</span>
                <span className="quick-id">adtshrm007</span>
              </button>
            </div>
          </div>

          <div className="login-card-footer">
            <ShieldCheck size={14} color="var(--emerald-400)" />
            <span>Encrypted with SHA-256 & Argon2id Security Rails</span>
          </div>
        </div>
      </div>
    </div>
  );
}
