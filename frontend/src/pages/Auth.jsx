import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { LogIn, UserPlus } from 'lucide-react';

const Auth = ({ setLoggedUser, mode = 'login' }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer'); // 'customer' or 'seller'
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'register') {
        // Register API Call
        const payload = { username, password, role };
        if (role === 'seller') {
          payload.shop_name = shopName || `${username}'s Shop`;
        }
        await axios.post('http://localhost:5080/api/auth/register', payload);
        
        setSuccess('Registration successful! Please login.');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        // Login API Call
        const response = await axios.post('http://localhost:5080/api/auth/login', {
          username,
          password
        });
        
        const loggedInUser = response.data.user;
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        setLoggedUser(loggedInUser);
        
        if (loggedInUser.role === 'customer') {
          navigate('/dashboard');
        } else {
          navigate('/market');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="glass-card auth-container">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontWeight: 800, fontSize: '1.75rem' }}>
          {mode === 'register' ? 'Create an Account' : 'Welcome Back'}
        </h2>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Join as a:</label>
              <div className="role-selectors">
                <div 
                  className={`role-card ${role === 'customer' ? 'selected' : ''}`}
                  onClick={() => setRole('customer')}
                >
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>Customer</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>I want to request items</span>
                </div>
                <div 
                  className={`role-card ${role === 'seller' ? 'selected' : ''}`}
                  onClick={() => setRole('seller')}
                >
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>Seller/Shop</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>I want to place price quotes</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Enter username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required
            />
          </div>

          {mode === 'register' && role === 'seller' && (
            <div className="form-group">
              <label className="form-label">Shop/Business Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Lanka Techs" 
                value={shopName} 
                onChange={(e) => setShopName(e.target.value)} 
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Processing...' : mode === 'register' ? (
              <>
                <UserPlus size={18} /> Register Now
              </>
            ) : (
              <>
                <LogIn size={18} /> Log In
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {mode === 'register' ? (
            <>
              Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Log In</Link>
            </>
          ) : (
            <>
              New to BidBuy? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Register here</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Auth;
