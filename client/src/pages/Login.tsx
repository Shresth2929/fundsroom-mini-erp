import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, user, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    clearError();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError('Invalid email format');
      return;
    }
    if (!password) {
      setLocalError('Password is required');
      return;
    }

    try {
      setSubmitting(true);
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      // Handled by context state
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-card-header">
          <h1 className="login-title">FundsRoom Portal</h1>
          <p className="login-subtitle">Sign in to manage ERP & CRM operations</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {(localError || error) && (
            <div className="alert alert-danger">
              {localError || error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="e.g. admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="form-control"
            />
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="login-card-footer">
          <p className="demo-credentials-info">Use these accounts to explore role-based access:</p>
          <div className="demo-accounts-grid">
            <div className="demo-account-item">
              <strong>Admin:</strong> <span>admin@example.com / admin123</span>
            </div>
            <div className="demo-account-item">
              <strong>Sales:</strong> <span>sales@example.com / sales123</span>
            </div>
            <div className="demo-account-item">
              <strong>Warehouse:</strong> <span>warehouse@example.com / warehouse123</span>
            </div>
            <div className="demo-account-item">
              <strong>Accounts:</strong> <span>accounts@example.com / accounts123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
