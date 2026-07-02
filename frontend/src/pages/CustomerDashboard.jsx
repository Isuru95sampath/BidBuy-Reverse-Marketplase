import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Tag, Gavel, DollarSign, Clock, MessageSquare, AlertCircle, Star } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import { API_BASE_URL } from '../config';

const CATEGORY_IMAGES = {
  'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  'Clothing & Fashion': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  'Furniture & Home': 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  'Sports & Outdoors': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  'Automotive & Parts': 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  'Books & Education': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  'Groceries & Food': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  'Toys & Hobbies': 'https://images.unsplash.com/photo-1539627831859-a911cf04b3cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  'Health & Beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  'Other / General': 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
};

const CATEGORY_KEYS = [
  'Electronics',
  'Clothing & Fashion',
  'Furniture & Home',
  'Sports & Outdoors',
  'Automotive & Parts',
  'Books & Education',
  'Groceries & Food',
  'Toys & Hobbies',
  'Health & Beauty',
  'Other / General'
];

// Reusable Countdown Timer Component
export const CountdownTimer = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('No Expiry');
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt.replace(' ', 'T') + 'Z') - new Date();
      if (difference <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      let timeString = '';
      if (days > 0) timeString += `${days}d `;
      if (hours > 0 || days > 0) timeString += `${hours}h `;
      timeString += `${minutes}m ${seconds}s`;

      setTimeLeft(timeString);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const isExpired = timeLeft === 'Expired';
  return (
    <span className="chip" style={{ 
      background: isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
      border: isExpired ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
      color: isExpired ? 'var(--accent-rose)' : 'var(--accent-amber)',
      fontSize: '0.8rem',
      fontWeight: 600
    }}>
      {isExpired ? ' expired' : `⏰ ${timeLeft}`}
    </span>
  );
};

const CustomerDashboard = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form states for creating a request
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other / General');
  const [budget, setBudget] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  const [customImage, setCustomImage] = useState('');

  // Selected Request details for viewing bids
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [bids, setBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [bidsSortOption, setBidsSortOption] = useState('price'); // 'price', 'delivery', 'rating'

  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSellerId, setReviewSellerId] = useState(null);
  const [reviewRequestId, setReviewRequestId] = useState(null);
  const [reviewShopName, setReviewShopName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Seller History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySellerName, setHistorySellerName] = useState('');
  const [historyReviews, setHistoryReviews] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const renderStars = (rating) => {
    const stars = [];
    const rounded = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          size={14} 
          fill={i <= rounded ? "currentColor" : "none"} 
          style={{ color: i <= rounded ? "var(--accent-amber)" : "var(--text-muted)" }} 
        />
      );
    }
    return <div className="rating-stars" style={{ display: 'inline-flex', gap: '0.15rem' }}>{stars}</div>;
  };  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/reviews`, {
        request_id: reviewRequestId,
        seller_id: reviewSellerId,
        customer_id: user.id,
        rating: reviewRating,
        comment: reviewComment
      });
      alert('Thank you! Review submitted successfully.');
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
      
      fetchRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to submit review.');
    }
  };

  // Open seller review history modal
  const handleViewSellerHistory = async (sellerId, shopName) => {
    setHistorySellerName(shopName);
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/seller/${sellerId}/rating`);
      setHistoryReviews(response.data.reviews || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load reviews history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch customer's requests
  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/requests/customer/${user.id}`);
      setRequests(response.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user.id]);

  // Fetch bids for a selected request
  const handleViewBids = async (req) => {
    setSelectedRequest(req);
    setLoadingBids(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/requests/${req.id}/bids`);
      setBids(response.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load bids.');
    } finally {
      setLoadingBids(false);
    }
  };

  // Handle image upload and convert to base64
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    const finalImage = customImage || CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Other / General'];

    try {
      await axios.post(`${API_BASE_URL}/requests`, {
        customer_id: user.id,
        title,
        description,
        budget: parseFloat(budget),
        category,
        image: finalImage,
        expiry_hours: expiryHours ? parseInt(expiryHours) : null
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('Other / General');
      setBudget('');
      setExpiryHours('24');
      setCustomImage('');
      setShowModal(false);
      
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert('Error creating request. Please try again.');
    }
  };

  // Accept bid
  const handleAcceptBid = async (bidId) => {
    if (!window.confirm('Are you sure you want to accept this seller\'s offer? This will close your request.')) return;
    
    try {
      await axios.post(`${API_BASE_URL}/bids/${bidId}/accept`);
      
      const acceptedBid = bids.find(b => b.id === bidId);
      if (acceptedBid) {
        setReviewSellerId(acceptedBid.seller_id);
        setReviewRequestId(acceptedBid.request_id);
        setReviewShopName(acceptedBid.shop_name);
        setShowReviewModal(true);
      }
      
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert('Failed to accept bid.');
    }
  };};

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          req.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || req.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort Bids logic
  const sortedBids = [...bids].sort((a, b) => {
    if (bidsSortOption === 'price') {
      return a.price - b.price;
    } else if (bidsSortOption === 'delivery') {
      return a.delivery_days - b.delivery_days;
    } else if (bidsSortOption === 'rating') {
      return b.avg_rating - a.avg_rating;
    }
    return 0;
  });

  // Calculate review stars distribution breakdown
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  historyReviews.forEach(r => {
    if (ratingCounts[r.rating] !== undefined) {
      ratingCounts[r.rating]++;
    }
  });
  const totalRev = historyReviews.length;

  return (
    <div className="container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">My Requests</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Post and manage the items you are searching for.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Post New Request
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', padding: '0.75rem', borderRadius: '8px', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Search requests..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 2, minWidth: '200px' }}
        />
        <select 
          className="form-control" 
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ flex: 1, minWidth: '150px' }}
        >
          <option value="All">All Categories</option>
          {CATEGORY_KEYS.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select 
          className="form-control" 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ flex: 1, minWidth: '150px' }}
        >
          <option value="All">All Statuses</option>
          <option value="active">Active / Open</option>
          <option value="accepted">Deal Completed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Main Grid */}
      <div className="grid-2" style={{ gridTemplateColumns: selectedRequest ? '1.1fr 0.9fr' : '1fr' }}>
        
        {/* Left Side: Requests List */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <AlertCircle size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
              <h3>No Requests Found</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                Post what you want to buy, or adjust filters to find your items.
              </p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                Post a Request Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredRequests.map((req) => (
                <div 
                  key={req.id} 
                  className={`glass-card`} 
                  style={{ 
                    cursor: 'pointer',
                    borderLeft: selectedRequest?.id === req.id ? '4px solid var(--primary)' : '1px solid var(--surface-border)',
                    padding: '1.5rem',
                    display: 'flex',
                    gap: '1.25rem'
                  }}
                  onClick={() => handleViewBids(req)}
                >
                  <img src={req.image} alt={req.title} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`chip ${
                          req.status === 'active' ? 'chip-active' : 
                          req.status === 'accepted' ? 'chip-accepted' : 'chip-rejected'
                        }`}>
                          {req.status === 'active' ? 'Active' : req.status === 'accepted' ? 'Deal Completed' : 'Expired'}
                        </span>
                        {req.status === 'active' && req.expires_at && (
                          <CountdownTimer expiresAt={req.expires_at} />
                        )}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', marginTop: '0.5rem' }}>{req.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      Category: {req.category}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '1.05rem' }}>
                          Budget: Rs. {req.budget.toLocaleString()}
                        </span>
                        {req.status === 'accepted' && req.accepted_price && (
                          <div style={{ fontSize: '0.825rem', color: 'var(--accent-emerald)', fontWeight: 700, marginTop: '0.15rem' }}>
                            Saved: Rs. {(req.budget - req.accepted_price).toLocaleString()} ({(((req.budget - req.accepted_price) / req.budget) * 100).toFixed(0)}%)!
                          </div>
                        )}
                      </div>
                      <span className="request-bids-count">
                        <Gavel size={14} /> {req.bid_count} {req.bid_count === 1 ? 'bid' : 'bids'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Request Details and Seller Bids */}
        {selectedRequest && (
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Offers for: {selectedRequest.title}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Target Budget: <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Rs. {selectedRequest.budget.toLocaleString()}</span>
                </p>
              </div>
              <button 
                className="modal-close" 
                onClick={() => setSelectedRequest(null)}
                style={{ padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.3)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Item Description:</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>{selectedRequest.description || "No description provided."}</p>
            </div>

            {/* Bids Header and Sort Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Shop Bids ({bids.length})</h3>
              {bids.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sort by:</span>
                  <select 
                    className="form-control" 
                    value={bidsSortOption}
                    onChange={(e) => setBidsSortOption(e.target.value)}
                    style={{ width: '130px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}
                  >
                    <option value="price">Lowest Price</option>
                    <option value="delivery">Fastest Delivery</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>
              )}
            </div>

            {loadingBids ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Retrieving bids...</div>
            ) : bids.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: 'rgba(15,23,42,0.2)', borderRadius: '12px' }}>
                <Gavel size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                <p>No bids have been submitted yet.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>We will notify you here when local shops submit competitive offers.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sortedBids.map((bid) => (
                  <div 
                    key={bid.id} 
                    className="glass-card" 
                    style={{ 
                      padding: '1.25rem', 
                      background: bid.status === 'accepted' ? 'rgba(37, 99, 235, 0.04)' : 'rgba(15, 23, 42, 0.4)',
                      borderColor: bid.status === 'accepted' ? 'var(--primary)' : 'var(--surface-border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div className="bid-shop-name">{bid.shop_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: '0.2rem 0' }}>
                          {renderStars(bid.avg_rating)}
                          <span 
                            style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => handleViewSellerHistory(bid.seller_id, bid.shop_name)}
                          >
                            ({bid.avg_rating.toFixed(1)} • {bid.rating_count} reviews)
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Placed by @{bid.seller_name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="bid-price" style={{ color: bid.status === 'accepted' ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }}>
                          Rs. {bid.price.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                          <Clock size={12} /> {bid.delivery_days} days
                        </div>
                      </div>
                    </div>

                    {bid.notes && (
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <MessageSquare size={14} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--text-muted)' }} />
                        <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{bid.notes}"</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                      <span className={`chip ${
                        bid.status === 'accepted' ? 'chip-accepted' : 
                        bid.status === 'rejected' ? 'chip-rejected' : 'chip-pending'
                      }`}>
                        Offer {bid.status.toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button"
                          className="btn btn-outline btn-sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChat({
                              request: selectedRequest,
                              receiverId: bid.seller_id,
                              receiverName: bid.shop_name
                            });
                          }}
                        >
                          <MessageSquare size={14} /> Chat
                        </button>
                        {selectedRequest.status === 'active' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleAcceptBid(bid.id)}>
                            Accept Offer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post New Request Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Post New Item Request</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">What item are you looking for?</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. PlayStation 5 Slim Edition"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORY_KEYS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Budget (Rs.)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 150000"
                      value={budget} 
                      onChange={(e) => setBudget(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Bidding Time Limit (Expiry)</label>
                    <select 
                      className="form-control"
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(e.target.value)}
                    >
                      <option value="12">12 Hours</option>
                      <option value="24">24 Hours (1 Day)</option>
                      <option value="72">72 Hours (3 Days)</option>
                      <option value="168">168 Hours (7 Days)</option>
                      <option value="">No Expiry Limit</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Item Photo (Optional)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="form-control" 
                      onChange={handleImageChange} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Specifications & Additional Details</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Describe condition requirements, color, preferred locations, delivery methods..."
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    style={{ minHeight: '120px' }}
                  />
                </div>

                {customImage && (
                  <div style={{ marginTop: '1rem', position: 'relative', width: 'fit-content' }}>
                    <img src={customImage} alt="Selected preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} />
                    <button 
                      type="button" 
                      onClick={() => setCustomImage('')}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--accent-rose)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Post Request</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeChat && (
        <ChatWindow 
          request={activeChat.request}
          sender={user}
          receiverId={activeChat.receiverId}
          receiverName={activeChat.receiverName}
          onClose={() => setActiveChat(null)}
        />
      )}

      {showReviewModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Complete Deal & Rate Seller</h2>
              <button type="button" className="modal-close" onClick={() => setShowReviewModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleReviewSubmit}>
              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                  Your request is closed! Share your experience with <strong>{reviewShopName}</strong> to help other buyers.
                </p>
                
                <div className="form-group" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.75rem' }}>Your Rating</label>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={32} 
                        fill={star <= reviewRating ? "currentColor" : "none"} 
                        className="rating-star-interactive"
                        style={{ color: star <= reviewRating ? "var(--accent-amber)" : "var(--text-muted)" }} 
                        onClick={() => setReviewRating(star)}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Review Comment</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Describe product quality, delivery speed, seller communication..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowReviewModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit Review</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seller Reviews History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" style={{ zIndex: 1250 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{historySellerName} - Past Reviews</h2>
              <button type="button" className="modal-close" onClick={() => setShowHistoryModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading reviews...</div>
              ) : (
                <>
                  {/* Rating distribution breakdown bar chart */}
                  {totalRev > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--surface-border)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>Rating Distribution</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {[5, 4, 3, 2, 1].map(stars => {
                          const count = ratingCounts[stars] || 0;
                          const percent = totalRev > 0 ? ((count / totalRev) * 100).toFixed(0) : 0;
                          return (
                            <div key={stars} className="rating-dist-row">
                              <span style={{ width: '45px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                                {stars} <Star size={10} fill="currentColor" style={{ color: 'var(--accent-amber)' }} />
                              </span>
                              <div className="rating-dist-bar">
                                <div className="rating-dist-fill" style={{ width: `${percent}%` }} />
                              </div>
                              <span style={{ width: '55px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {count} ({percent}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {historyReviews.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No reviews submitted for this shop yet.
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
                          <div style={{ marginBottom: '0.5rem' }}>
                            {renderStars(rev.rating)}
                          </div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>
                            "{rev.comment}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
