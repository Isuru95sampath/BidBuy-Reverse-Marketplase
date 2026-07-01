import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Gavel, DollarSign, Calendar, Sparkles, X, HeartHandshake, Star, TrendingUp, BarChart2, CheckCircle, AlertTriangle } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import { CountdownTimer } from './CustomerDashboard';

const SellerDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'my-bids', or 'analytics'
  
  // Market Feed States
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // My Bids States
  const [myBids, setMyBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(true);

  // Bidding Modal States
  const [selectedReq, setSelectedReq] = useState(null);
  const [bidPrice, setBidPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [activeChat, setActiveChat] = useState(null);

  // Seller Rating Info
  const [ratingInfo, setRatingInfo] = useState({ avg_rating: 0.0, rating_count: 0 });

  // Seller Reviews History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyReviews, setHistoryReviews] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchSellerRating = async () => {
    try {
      const response = await axios.get(`http://localhost:5080/api/seller/${user.id}/rating`);
      setRatingInfo({
        avg_rating: response.data.avg_rating,
        rating_count: response.data.rating_count
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewHistory = async () => {
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const response = await axios.get(`http://localhost:5080/api/seller/${user.id}/rating`);
      setHistoryReviews(response.data.reviews);
    } catch (err) {
      console.error(err);
      alert('Failed to load reviews history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch all active requests
  const fetchMarketFeed = async () => {
    setLoadingFeed(true);
    try {
      const response = await axios.get('http://localhost:5080/api/requests');
      setRequests(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFeed(false);
    }
  };

  // Fetch bids placed by this seller
  const fetchMyBids = async () => {
    setLoadingBids(true);
    try {
      const response = await axios.get(`http://localhost:5080/api/seller/${user.id}/bids`);
      setMyBids(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBids(false);
    }
  };

  useEffect(() => {
    fetchMarketFeed();
    fetchMyBids();
    fetchSellerRating();
  }, [user.id]);

  // Apply filters
  useEffect(() => {
    let result = requests;
    
    if (categoryFilter !== 'All') {
      result = result.filter(r => r.category === categoryFilter);
    }
    
    if (search.trim() !== '') {
      result = result.filter(r => 
        r.title.toLowerCase().includes(search.toLowerCase()) || 
        r.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredRequests(result);
  }, [search, categoryFilter, requests]);

  // Handle place bid
  const handlePlaceBid = async (e) => {
    e.preventDefault();
    setSubmittingBid(true);
    try {
      await axios.post(`http://localhost:5080/api/requests/${selectedReq.id}/bids`, {
        seller_id: user.id,
        price: parseFloat(bidPrice),
        delivery_days: parseInt(deliveryDays),
        notes: bidNotes
      });
      
      alert('Bid submitted successfully!');
      setSelectedReq(null);
      setBidPrice('');
      setDeliveryDays('');
      setBidNotes('');
      
      fetchMarketFeed();
      fetchMyBids();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to place bid.');
    } finally {
      setSubmittingBid(false);
    }
  };

  // Stats Calculations
  const wonBids = myBids.filter(b => b.status === 'accepted');
  const pendingBids = myBids.filter(b => b.status === 'pending');
  const rejectedBids = myBids.filter(b => b.status === 'rejected');
  const totalEarnings = wonBids.reduce((sum, b) => sum + b.price, 0);
  const winRate = myBids.length > 0 ? ((wonBids.length / myBids.length) * 100).toFixed(1) : '0';

  // Category Distribution for Analytics
  const categoryStats = wonBids.reduce((acc, bid) => {
    const cat = bid.category || 'General';
    acc[cat] = (acc[cat] || 0) + bid.price;
    return acc;
  }, {});

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt.replace(' ', 'T') + 'Z') < new Date();
  };

  return (
    <div className="container">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Seller Hub</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Store: <strong style={{ color: 'var(--primary)' }}>{user.shop_name}</strong>
            {ratingInfo.rating_count > 0 && (
              <span 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--accent-amber)', fontSize: '0.9rem', marginLeft: '0.5rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={handleViewHistory}
              >
                ★ {ratingInfo.avg_rating.toFixed(1)} ({ratingInfo.rating_count} reviews)
              </span>
            )}
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HeartHandshake style={{ color: 'var(--accent-emerald)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Deals Won</div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{wonBids.length}</div>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <DollarSign style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Earnings</div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-emerald)' }}>Rs. {totalEarnings.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', marginBottom: '2rem' }}>
        <button 
          className={`nav-link`} 
          style={{ 
            background: 'none', 
            border: 'none', 
            borderRadius: '0',
            borderBottom: activeTab === 'feed' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'feed' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            padding: '1rem 1.5rem',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('feed')}
        >
          Active Item Feed ({requests.length})
        </button>
        <button 
          className={`nav-link`} 
          style={{ 
            background: 'none', 
            border: 'none', 
            borderRadius: '0',
            borderBottom: activeTab === 'my-bids' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'my-bids' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            padding: '1rem 1.5rem',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('my-bids')}
        >
          My Placed Bids ({myBids.length})
        </button>
        <button 
          className={`nav-link`} 
          style={{ 
            background: 'none', 
            border: 'none', 
            borderRadius: '0',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            padding: '1rem 1.5rem',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={16} style={{ marginRight: '0.25rem', display: 'inline' }} /> Analytics
        </button>
      </div>

      {/* TABS CONTAINER */}

      {/* TAB A: Active Feed */}
      {activeTab === 'feed' && (
        <div>
          {/* Filters Banner */}
          <div className="glass-card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem', padding: '1.25rem' }}>
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search item requests..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <select 
                className="form-control" 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="All">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Furniture">Furniture</option>
                <option value="Sports">Sports</option>
                <option value="Automotive">Automotive</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {loadingFeed ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>Loading active item feed...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)' }}>
              <Sparkles size={48} style={{ color: 'var(--primary)', marginBottom: '1.5rem', opacity: 0.8 }} />
              <h3>Feed is Currently Clear</h3>
              <p style={{ marginTop: '0.5rem' }}>There are no active item requests matching your search or filters at the moment.</p>
            </div>
          ) : (
            <div className="grid-3">
              {filteredRequests.map((req) => {
                const expired = isExpired(req.expires_at);
                return (
                  <div key={req.id} className="glass-card request-card">
                    <img src={req.image} alt={req.title} className="request-image" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <span className="chip chip-active">{req.category}</span>
                        {req.expires_at && (
                          <CountdownTimer expiresAt={req.expires_at} />
                        )}
                      </div>
                      <h3 className="request-title">{req.title}</h3>
                      <p className="request-desc">{req.description}</p>
                      
                      <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                        Posted by @{req.customer_name}
                      </div>

                      <div className="request-meta" style={{ marginTop: 'auto' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Target Budget</div>
                          <div className="request-budget">Rs. {req.budget.toLocaleString()}</div>
                        </div>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => setSelectedReq(req)}
                          disabled={expired}
                          style={{
                            background: expired ? 'var(--surface-border)' : 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)',
                            color: expired ? 'var(--text-muted)' : 'white',
                            cursor: expired ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {expired ? 'Expired' : 'Bid on Item'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB B: My Placed Bids */}
      {activeTab === 'my-bids' && (
        <div>
          {loadingBids ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>Loading your bids...</div>
          ) : myBids.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)' }}>
              <Gavel size={48} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }} />
              <h3>No Bids Placed</h3>
              <p style={{ marginTop: '0.5rem' }}>You haven't submitted any bids yet. Head over to the active feed to browse client requests!</p>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '0' }}>
              {myBids.map((bid) => (
                <div key={bid.id} className="bid-row">
                  <div className="bid-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{bid.request_title}</strong>
                      <span className="chip" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>{bid.category}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Customer Budget: <span style={{ color: 'var(--text-primary)' }}>Rs. {bid.target_budget.toLocaleString()}</span>
                    </div>
                    {bid.notes && (
                      <p className="bid-notes" style={{ marginTop: '0.5rem' }}>"{bid.notes}"</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="bid-price" style={{ color: bid.status === 'accepted' ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }}>
                        Rs. {bid.price.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        Delivery in {bid.delivery_days} days
                      </div>
                    </div>

                    <div>
                      <span className={`chip ${
                        bid.status === 'accepted' ? 'chip-accepted' : 
                        bid.status === 'rejected' ? 'chip-rejected' : 'chip-pending'
                      }`} style={{ textTransform: 'uppercase', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                        {bid.status}
                      </span>
                    </div>

                    <div>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => setActiveChat({
                          request: { id: bid.request_id, title: bid.request_title },
                          receiverId: bid.customer_id,
                          receiverName: bid.customer_username
                        })}
                      >
                        Chat with Buyer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB C: Analytics */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Row of Metrics Cards */}
          <div className="grid-3">
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Bidding Win Rate</span>
                <TrendingUp size={20} style={{ color: 'var(--accent-emerald)' }} />
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{winRate}%</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Percentage of bids accepted by customers.</p>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Bid Success Count</span>
                <CheckCircle size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{wonBids.length} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {myBids.length} total</span></h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pendingBids.length} pending bids awaiting client decision.</p>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Bidding Activity</span>
                <BarChart2 size={20} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{pendingBids.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{rejectedBids.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rejected</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{wonBids.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accepted</div>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Distribution of your bidding outcomes.</p>
            </div>
          </div>

          {/* Revenue Breakdown by Category */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem' }}>Revenue Contribution by Category</h3>
            {wonBids.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem' }}>
                No revenue earned yet. Win bids to populate category statistics!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {Object.keys(categoryStats).map((cat, idx) => {
                  const catEarnings = categoryStats[cat];
                  const percentage = ((catEarnings / totalEarnings) * 100).toFixed(0);
                  const colors = ['var(--primary)', 'var(--secondary)', 'var(--accent-cyan)', 'var(--accent-emerald)', 'var(--accent-amber)'];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                        <strong>{cat}</strong>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Rs. {catEarnings.toLocaleString()} ({percentage}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: barColor, borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bidding Modal Overlay */}
      {selectedReq && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Submit Quote: {selectedReq.title}</h2>
              <button className="modal-close" onClick={() => setSelectedReq(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePlaceBid}>
              <div className="modal-body">
                <div style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid var(--surface-border)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Customer's Target Budget:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.15rem' }}>
                    Rs. {selectedReq.budget.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Specifications: {selectedReq.description || "No specs details."}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">My Bidding Quote (Rs.)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 145000"
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Time (Days)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 3"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Warranty / Product Condition Notes</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Provide details about condition (brand new, box-opened), warranty duration, and store policy..."
                    value={bidNotes}
                    onChange={(e) => setBidNotes(e.target.value)}
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setSelectedReq(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submittingBid}>
                    {submittingBid ? 'Submitting...' : 'Submit Quote Bid'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Chat Component */}
      {activeChat && (
        <ChatWindow 
          request={activeChat.request}
          sender={user}
          receiverId={activeChat.receiverId}
          receiverName={activeChat.receiverName}
          onClose={() => setActiveChat(null)}
        />
      )}

      {/* Seller Reviews History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" style={{ zIndex: 1250 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>My Store Reviews</h2>
              <button type="button" className="modal-close" onClick={() => setShowHistoryModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading reviews...</div>
              ) : historyReviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No reviews submitted for your store yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {historyReviews.map((rev) => (
                    <div key={rev.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>@{rev.customer_name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(rev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.15rem', color: 'var(--accent-amber)' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            fill={i < rev.rating ? "currentColor" : "none"} 
                            style={{ color: i < rev.rating ? "var(--accent-amber)" : "var(--text-muted)" }} 
                          />
                        ))}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>
                        "{rev.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
