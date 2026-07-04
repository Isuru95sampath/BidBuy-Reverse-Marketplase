import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, FileText, Gavel, Trash2, ShieldAlert, BarChart3, Database, Search, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../config';

const AdminDashboard = ({ user }) => {
  // If user is not admin, deny access immediately
  if (!user || user.role !== 'admin') {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <ShieldAlert size={64} style={{ color: 'var(--accent-rose)', marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '450px' }}>
          This area is restricted to system administrators. Please log in with an authorized administrator account to continue.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'requests', 'bids'
  const [stats, setStats] = useState({
    total_users: 0,
    total_customers: 0,
    total_sellers: 0,
    total_requests: 0,
    total_bids: 0,
    total_reviews: 0,
    total_messages: 0,
    db_size_kb: 0.0
  });

  const [usersList, setUsersList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [bidsList, setBidsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch admin overview stats
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/stats`);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch admin stats', err);
    }
  };

  // Fetch list of users
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`);
      setUsersList(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch list of requests
  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/requests`);
      setRequestsList(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch list of bids
  const fetchBids = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/bids`);
      setBidsList(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchRequests(), fetchBids()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Delete User handler
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete user @${username}? This will delete all their requests, bids, reviews, and chat messages.`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/users/${userId}`);
      alert(`User @${username} deleted successfully.`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  // Delete Request handler
  const handleDeleteRequest = async (reqId, title) => {
    if (!window.confirm(`Are you sure you want to delete request "${title}"? This will also delete all bids submitted for this request.`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/requests/${reqId}`);
      alert('Request deleted successfully.');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete request.');
    }
  };

  // Delete Bid handler
  const handleDeleteBid = async (bidId, price, shopName) => {
    if (!window.confirm(`Are you sure you want to delete the bid of Rs. ${price.toLocaleString()} from "${shopName}"?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/bids/${bidId}`);
      alert('Bid deleted successfully.');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete bid.');
    }
  };

  // Table filter logic
  const getFilteredData = () => {
    const query = searchQuery.toLowerCase();
    if (activeTab === 'users') {
      return usersList.filter(u => 
        u.username.toLowerCase().includes(query) || 
        (u.shop_name && u.shop_name.toLowerCase().includes(query)) ||
        u.role.toLowerCase().includes(query)
      );
    }
    if (activeTab === 'requests') {
      return requestsList.filter(r => 
        r.title.toLowerCase().includes(query) || 
        r.description.toLowerCase().includes(query) ||
        r.customer_name.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query)
      );
    }
    if (activeTab === 'bids') {
      return bidsList.filter(b => 
        b.request_title.toLowerCase().includes(query) || 
        b.seller_name.toLowerCase().includes(query) ||
        b.shop_name.toLowerCase().includes(query) ||
        b.notes.toLowerCase().includes(query)
      );
    }
    return [];
  };

  const filteredData = getFilteredData();

  return (
    <div className="container">
      {/* Header Banner */}
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={28} style={{ color: 'var(--primary)' }} />
            System Control Panel
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Admin Dashboard to monitor analytics, manage user databases, and moderate marketplace activities.
          </p>
        </div>
      </div>

      {/* Admin Tab Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', marginBottom: '2rem' }}>
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
          { id: 'users', label: 'Manage Users', icon: <Users size={16} /> },
          { id: 'requests', label: 'Manage Requests', icon: <FileText size={16} /> },
          { id: 'bids', label: 'Manage Bids', icon: <Gavel size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
            className={`nav-link`}
            style={{
              background: 'none',
              border: 'none',
              borderRadius: '0',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              padding: '1rem 1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Gathering system metrics...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="grid-3">
                {/* Metric User Card */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>System Active Users</span>
                    <Users size={20} style={{ color: 'var(--primary)' }} />
                  </div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.total_users}</h2>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Customers: <strong>{stats.total_customers}</strong></span>
                    <span>Sellers: <strong>{stats.total_sellers}</strong></span>
                  </div>
                </div>

                {/* Metric Requests Card */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Buyer Requests</span>
                    <FileText size={20} style={{ color: 'var(--accent-amber)' }} />
                  </div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.total_requests}</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total bidding pipelines created by clients.</p>
                </div>

                {/* Metric Bids Card */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Submitted Bids</span>
                    <Gavel size={20} style={{ color: 'var(--accent-cyan)' }} />
                  </div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.total_bids}</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total quotes submitted by verified local shops.</p>
                </div>
              </div>

              {/* Server Stats Block */}
              <div className="grid-2">
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={16} style={{ color: 'var(--primary)' }} />
                    Database File Diagnostics
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>SQLite Database File</span>
                    <strong style={{ color: 'var(--text-primary)' }}>database.db</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Database File Size</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{stats.db_size_kb} KB</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>● Online & Active</span>
                  </div>
                </div>

                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={16} style={{ color: 'var(--accent-emerald)' }} />
                    Platform Activity Summary
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Completed Reviews</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{stats.total_reviews} reviews</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Chat Messages</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{stats.total_messages}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Bids per Request Ratio</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {stats.total_requests > 0 ? (stats.total_bids / stats.total_requests).toFixed(1) : 0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2, 3, 4: Data Moderation Tables */}
          {activeTab !== 'overview' && (
            <div>
              {/* Search Toolbar */}
              <div className="glass-card" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Search size={18} style={{ position: 'absolute', left: '2rem', color: 'var(--text-muted)' }} />
              </div>

              {filteredData.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No matching details found.
                </div>
              ) : (
                <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15, 23, 42, 0.02)', borderBottom: '1px solid var(--surface-border)' }}>
                        {activeTab === 'users' && (
                          <>
                            <th style={{ padding: '1rem' }}>User ID</th>
                            <th style={{ padding: '1rem' }}>Username</th>
                            <th style={{ padding: '1rem' }}>Role</th>
                            <th style={{ padding: '1rem' }}>Shop Name</th>
                            <th style={{ padding: '1rem' }}>Requests Count</th>
                            <th style={{ padding: '1rem' }}>Bids Count</th>
                            <th style={{ padding: '1rem', textRight: 'right' }}>Actions</th>
                          </>
                        )}
                        {activeTab === 'requests' && (
                          <>
                            <th style={{ padding: '1rem' }}>ID</th>
                            <th style={{ padding: '1rem' }}>Title</th>
                            <th style={{ padding: '1rem' }}>Category</th>
                            <th style={{ padding: '1rem' }}>Budget</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem' }}>Posted By</th>
                            <th style={{ padding: '1rem' }}>Bids Received</th>
                            <th style={{ padding: '1rem', textRight: 'right' }}>Actions</th>
                          </>
                        )}
                        {activeTab === 'bids' && (
                          <>
                            <th style={{ padding: '1rem' }}>ID</th>
                            <th style={{ padding: '1rem' }}>Item Request</th>
                            <th style={{ padding: '1rem' }}>Bid Amount</th>
                            <th style={{ padding: '1rem' }}>Seller Username</th>
                            <th style={{ padding: '1rem' }}>Shop Name</th>
                            <th style={{ padding: '1rem' }}>Notes</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem', textRight: 'right' }}>Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map(row => (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                          {activeTab === 'users' && (
                            <>
                              <td style={{ padding: '1rem' }}>#{row.id}</td>
                              <td style={{ padding: '1rem', fontWeight: 600 }}>@{row.username}</td>
                              <td style={{ padding: '1rem' }}>
                                <span className={`chip ${row.role === 'customer' ? 'chip-active' : 'chip-accepted'}`} style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                  {row.role}
                                </span>
                              </td>
                              <td style={{ padding: '1rem' }}>{row.shop_name || 'N/A'}</td>
                              <td style={{ padding: '1rem' }}>{row.requests_count} requests</td>
                              <td style={{ padding: '1rem' }}>{row.bids_count} bids</td>
                              <td style={{ padding: '1rem' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: 'var(--accent-rose)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                  onClick={() => handleDeleteUser(row.id, row.username)}
                                >
                                  <Trash2 size={14} /> Remove User
                                </button>
                              </td>
                            </>
                          )}
                          {activeTab === 'requests' && (
                            <>
                              <td style={{ padding: '1rem' }}>#{row.id}</td>
                              <td style={{ padding: '1rem', fontWeight: 600 }}>{row.title}</td>
                              <td style={{ padding: '1rem' }}>{row.category}</td>
                              <td style={{ padding: '1rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Rs. {row.budget.toLocaleString()}</td>
                              <td style={{ padding: '1rem' }}>
                                <span className={`chip ${row.status === 'active' ? 'chip-active' : 'chip-accepted'}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td style={{ padding: '1rem' }}>@{row.customer_name}</td>
                              <td style={{ padding: '1rem' }}>{row.bid_count} bids</td>
                              <td style={{ padding: '1rem' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: 'var(--accent-rose)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                  onClick={() => handleDeleteRequest(row.id, row.title)}
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </td>
                            </>
                          )}
                          {activeTab === 'bids' && (
                            <>
                              <td style={{ padding: '1rem' }}>#{row.id}</td>
                              <td style={{ padding: '1rem', fontWeight: 600 }}>{row.request_title}</td>
                              <td style={{ padding: '1rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Rs. {row.price.toLocaleString()}</td>
                              <td style={{ padding: '1rem' }}>@{row.seller_name}</td>
                              <td style={{ padding: '1rem' }}>{row.shop_name}</td>
                              <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.notes || '-'}
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span className={`chip ${
                                  row.status === 'accepted' ? 'chip-accepted' : 
                                  row.status === 'rejected' ? 'chip-rejected' : 'chip-pending'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: 'var(--accent-rose)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                  onClick={() => handleDeleteBid(row.id, row.price, row.shop_name)}
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
