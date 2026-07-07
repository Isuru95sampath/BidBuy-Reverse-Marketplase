import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Gavel, LogOut, User, ShoppingBag, Store, Menu, X, Sun, Moon, HelpCircle, MessageSquare, Home as HomeIcon } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from './config';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import CustomerDashboard from './pages/CustomerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';

import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Floating Support Care Widget States
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [helpMessage, setHelpMessage] = useState("Hi there! I am your BidBuy Care Assistant. Click a question below to learn how our reverse marketplace works!");

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Synthesize notification chime using Web Audio API
  const playToastChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.15);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.25);
      }, 80);
    } catch (e) {
      console.warn("Audio chime blocked or failed:", e);
    }
  };

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    playToastChime();
    
    // Auto remove after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // Background polling for notifications
  useEffect(() => {
    if (!user || user.role === 'admin') return;

    // Load initial empty keys to avoid spam alerts on initial login
    if (!localStorage.getItem('notified_bids')) {
      localStorage.setItem('notified_bids', JSON.stringify([]));
    }
    if (!localStorage.getItem('notified_accepted')) {
      localStorage.setItem('notified_accepted', JSON.stringify([]));
    }
    if (!localStorage.getItem('notified_messages')) {
      localStorage.setItem('notified_messages', JSON.stringify([]));
    }

    const checkNotifications = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/notifications/check`, {
          params: { user_id: user.id, role: user.role }
        });
        const { bids, messages } = response.data;

        // 1. Process Bids notifications
        const localNotifiedBids = JSON.parse(localStorage.getItem('notified_bids') || '[]');
        const localNotifiedAccepted = JSON.parse(localStorage.getItem('notified_accepted') || '[]');
        const updatedBidsList = [...localNotifiedBids];
        const updatedAcceptedList = [...localNotifiedAccepted];
        let bidsChanged = false;

        bids.forEach(bid => {
          if (user.role === 'customer') {
            if (!localNotifiedBids.includes(bid.id)) {
              addToast(`🔔 New bid of Rs. ${bid.price.toLocaleString()} received from ${bid.shop_name} on your request "${bid.request_title}"!`, 'info');
              updatedBidsList.push(bid.id);
              bidsChanged = true;
            }
          } else if (user.role === 'seller') {
            if (bid.status === 'accepted' && !localNotifiedAccepted.includes(bid.id)) {
              addToast(`🎉 Congratulations! Your bid of Rs. ${bid.price.toLocaleString()} for "${bid.request_title}" was accepted!`, 'success');
              updatedAcceptedList.push(bid.id);
              bidsChanged = true;
            }
          }
        });

        if (bidsChanged) {
          localStorage.setItem('notified_bids', JSON.stringify(updatedBidsList));
          localStorage.setItem('notified_accepted', JSON.stringify(updatedAcceptedList));
        }

        // 2. Process Messages notifications
        const localNotifiedMessages = JSON.parse(localStorage.getItem('notified_messages') || '[]');
        const updatedMessagesList = [...localNotifiedMessages];
        let msgChanged = false;

        messages.forEach(msg => {
          if (!localNotifiedMessages.includes(msg.id)) {
            addToast(`✉️ New message from @${msg.sender_name} for "${msg.request_title}": "${msg.message}"`, 'success');
            updatedMessagesList.push(msg.id);
            msgChanged = true;
          }
        });

        if (msgChanged) {
          localStorage.setItem('notified_messages', JSON.stringify(updatedMessagesList));
        }
      } catch (err) {
        console.error('Failed to poll system notifications', err);
      }
    };

    // Poll every 5 seconds
    checkNotifications();
    const pollInterval = setInterval(checkNotifications, 5000);
    return () => clearInterval(pollInterval);
  }, [user]);

  // Load user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Theme Sync Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleFaqOption = (option) => {
    if (option === 'bidding') {
      setHelpMessage("Buyers post item requests with a target budget and time limit. Local stores/sellers then view this feed and submit competitive bids (quotes). The buyer can chat with any store and accept the best offer!");
    } else if (option === 'fees') {
      setHelpMessage("BidBuy is 100% free for customers to post requests! For sellers, there are zero upfront fees. The platform makes it easy to win local customers directly.");
    } else if (option === 'support') {
      setHelpMessage("You can email our customer support team directly at support@bidbuy.com or call our hotline. We are active 24/7 to resolve disputes or answer queries!");
    } else if (option === 'deals') {
      setHelpMessage("Once you accept a seller's bid, the request is marked completed. You can open the chat to organize delivery/payment details directly with the store. Don't forget to leave a review!");
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <h2>Loading BidBuy...</h2>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        
        {/* Navigation Bar */}
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-brand">
              <Gavel size={26} style={{ transform: 'rotate(-45deg)', color: 'var(--primary)' }} />
              BidBuy
            </Link>

            <div className="nav-links">
              <Link to="/" className="nav-link">Home</Link>
              
              {user ? (
                <>
                  {user.role === 'customer' && (
                    <Link to="/dashboard" className="nav-link">Customer Dashboard</Link>
                  )}
                  {user.role === 'seller' && (
                    <Link to="/market" className="nav-link">Seller Marketplace</Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin" className="nav-link">Admin Panel</Link>
                  )}

                  {/* Profile Badge */}
                  <div className="user-badge">
                    {user.role === 'customer' ? (
                      <ShoppingBag size={14} style={{ color: 'var(--primary)' }} />
                    ) : user.role === 'admin' ? (
                      <User size={14} style={{ color: 'var(--accent-rose)' }} />
                    ) : (
                      <Store size={14} style={{ color: 'var(--secondary)' }} />
                    )}
                    <span style={{ color: 'var(--text-primary)' }}>
                      {user.role === 'seller' ? user.shop_name : user.username}
                    </span>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.25rem' }}>
                      {user.role}
                    </span>
                  </div>

                  {/* Logout Button */}
                  <button onClick={handleLogout} className="btn btn-outline btn-sm" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <LogOut size={14} /> Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">Log In</Link>
                  <Link to="/register" className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1rem' }}>Register</Link>
                </>
              )}

              {/* Theme Toggle Button */}
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                className="btn btn-outline" 
                style={{ 
                  borderRadius: '50%', 
                  width: '34px', 
                  height: '34px', 
                  padding: '0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'var(--surface-border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>

            {/* Hamburger Button (Mobile View) */}
            <button className="hamburger-btn" onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
              {isDrawerOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Sliding Drawer for Mobile Screen */}
          {isDrawerOpen && <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)}></div>}
          <div className={`mobile-drawer ${isDrawerOpen ? 'open' : ''}`}>
            <Link to="/" className="nav-link" onClick={() => setIsDrawerOpen(false)}>Home</Link>
            {user ? (
              <>
                {user.role === 'customer' && (
                  <Link to="/dashboard" className="nav-link" onClick={() => setIsDrawerOpen(false)}>Customer Dashboard</Link>
                )}
                {user.role === 'seller' && (
                  <Link to="/market" className="nav-link" onClick={() => setIsDrawerOpen(false)}>Seller Marketplace</Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="nav-link" onClick={() => setIsDrawerOpen(false)}>Admin Panel</Link>
                )}
                <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    User: <strong>{user.role === 'seller' ? user.shop_name : user.username}</strong>
                  </span>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Role: {user.role}
                  </span>
                </div>
                <button onClick={() => { handleLogout(); setIsDrawerOpen(false); }} className="btn btn-outline btn-sm" style={{ margin: '1rem 0', width: '100%' }}>
                  <LogOut size={14} /> Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link" onClick={() => setIsDrawerOpen(false)}>Log In</Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setIsDrawerOpen(false)} style={{ margin: '1rem 0', display: 'inline-flex' }}>Register</Link>
              </>
            )}

            {/* Mobile Theme Toggle */}
            <button 
              onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setIsDrawerOpen(false); }} 
              className="btn btn-outline" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                width: '100%', 
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {theme === 'dark' ? <><Sun size={15} /> Light Mode</> : <><Moon size={15} /> Dark Mode</>}
            </button>
          </div>
        </nav>

        {/* Route System */}
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            
            <Route 
              path="/login" 
              element={user ? <Navigate to={user.role === 'customer' ? '/dashboard' : user.role === 'admin' ? '/admin' : '/market'} /> : <Auth setLoggedUser={setUser} mode="login" />} 
            />
            
            <Route 
              path="/register" 
              element={user ? <Navigate to={user.role === 'customer' ? '/dashboard' : user.role === 'admin' ? '/admin' : '/market'} /> : <Auth setLoggedUser={setUser} mode="register" />} 
            />

            <Route 
              path="/dashboard" 
              element={
                user ? (
                  user.role === 'customer' ? <CustomerDashboard user={user} /> : user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/market" />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />

            <Route 
              path="/market" 
              element={
                user ? (
                  user.role === 'seller' ? <SellerDashboard user={user} /> : user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />

            <Route 
              path="/admin" 
              element={
                user ? (
                  user.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/" />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Floating FAQ/Help Widget */}
        {(!user || user.role !== 'admin') && (
          <>
            <button 
              className="help-widget-btn" 
              onClick={() => setShowHelpPanel(!showHelpPanel)}
              title="Need Help?"
            >
              {showHelpPanel ? <X size={22} /> : <HelpCircle size={22} />}
            </button>

            {showHelpPanel && (
              <div className="help-panel glass-card">
                <div className="help-panel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={16} />
                    <strong style={{ fontSize: '0.95rem' }}>BidBuy Support Assistant</strong>
                  </div>
                  <button 
                    onClick={() => setShowHelpPanel(false)} 
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="help-panel-body">
                  <div className="help-bubble-bot">
                    {helpMessage}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="help-option-btn" onClick={() => handleFaqOption('bidding')}>
                      ❓ How does bidding work?
                    </button>
                    <button className="help-option-btn" onClick={() => handleFaqOption('fees')}>
                      💸 Are there any platform fees?
                    </button>
                    <button className="help-option-btn" onClick={() => handleFaqOption('deals')}>
                      🤝 How do I complete a deal?
                    </button>
                    <button className="help-option-btn" onClick={() => handleFaqOption('support')}>
                      📞 How to contact customer support?
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Global Toaster Alerts */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <div className="toast-message">{t.message}</div>
              <button 
                className="toast-close" 
                onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        {user && (
          <div className="mobile-bottom-nav">
            <Link to="/" className="bottom-nav-item">
              <HomeIcon size={20} />
              <span>Home</span>
            </Link>
            {user.role === 'customer' && (
              <Link to="/dashboard" className="bottom-nav-item">
                <ShoppingBag size={20} />
                <span>Dashboard</span>
              </Link>
            )}
            {user.role === 'seller' && (
              <Link to="/market" className="bottom-nav-item">
                <Store size={20} />
                <span>Marketplace</span>
              </Link>
            )}
            {user.role === 'admin' && (
              <Link to="/admin" className="bottom-nav-item">
                <User size={20} />
                <span>Admin</span>
              </Link>
            )}
            <button onClick={handleLogout} className="bottom-nav-item" style={{ background: 'none', border: 'none', padding: '8px 12px', cursor: 'pointer' }}>
              <LogOut size={20} />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--surface-border)', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', background: 'rgba(10, 14, 23, 0.4)' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '0' }}>
            <div>&copy; {new Date().getFullYear()} BidBuy Reverse Marketplace. All rights reserved.</div>
            <div style={{ fontWeight: '500', color: 'var(--primary)', letterSpacing: '0.5px' }}>Developed by Raaz..</div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>
        </footer>

      </div>
    </Router>
  );
}

export default App;
