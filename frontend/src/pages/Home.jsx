import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, Gavel, CheckCircle, ChevronDown, ChevronUp, Star, Award, ShieldCheck, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';

const FAQ_DATA = [
  {
    q: "How does the reverse bidding process work?",
    a: "Instead of searching multiple websites, you simply post what product you want along with your budget. Local verified shops browse this feed and bid their best competitive price quotes and delivery options. You compare and select the best deal."
  },
  {
    q: "Is registration free for both buyers and sellers?",
    a: "Yes! Registration is 100% free. Customers can post unlimited requests, and sellers can submit unlimited bids without any hidden fees."
  },
  {
    q: "How do I ensure the quality of the products offered by sellers?",
    a: "Sellers can leave details (warranty, condition) in their bids. Additionally, you can inspect their average star ratings and read reviews left by other customers before accepting any offer."
  },
  {
    q: "Can I chat with sellers before choosing the best quote?",
    a: "Absolutely! Next to each bid in your dashboard, there is a 'Chat with Shop' button. You can negotiate, request real product photos, or clarify delivery terms in real-time."
  }
];

const CATEGORIES = [
  { name: 'Electronics', count: '14 Active Tenders', icon: '💻', color: 'rgba(6, 182, 212, 0.1)', border: 'var(--accent-cyan)' },
  { name: 'Clothing', count: '9 Active Tenders', icon: '👔', color: 'rgba(139, 92, 246, 0.1)', border: 'var(--secondary)' },
  { name: 'Furniture', count: '5 Active Tenders', icon: '🛋️', color: 'rgba(245, 158, 11, 0.1)', border: 'var(--accent-amber)' },
  { name: 'Sports & Gear', count: '7 Active Tenders', icon: '⚽', color: 'rgba(16, 185, 129, 0.1)', border: 'var(--accent-emerald)' }
];

const TESTIMONIALS = [
  {
    name: "Saman Kumara",
    role: "Customer",
    review: "I posted a request for an iPhone 15 Pro. Within 4 hours, three local shops bid lower than standard retail. Highly recommended!",
    rating: 5
  },
  {
    name: "Kapila Fashions",
    role: "Seller",
    review: "As a custom tailor, BidBuy helps us find buyers actively searching for suits. It has increased our sales by 25% this month.",
    rating: 5
  },
  {
    name: "Nimal Perera",
    role: "Customer",
    review: "Saved Rs. 4,000 on my office chair. I chatted with the seller first to verify the hydraulic warranty. Excellent system!",
    rating: 4
  }
];

const Home = ({ user }) => {
  const [stats, setStats] = useState({
    active_requests: 0,
    completed_deals: 0,
    registered_sellers: 0,
    total_bids: 0,
    savings_rate: '15%'
  });
  const [openFaq, setOpenFaq] = useState(null);

  // Fetch live stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/stats/dashboard`);
        setStats(response.data);
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    };
    fetchStats();
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-tag">
          <Zap size={14} style={{ marginRight: '0.25rem', fill: 'currentColor' }} /> 
          Smart Reverse Marketplace
        </div>
        <h1 className="hero-title">
          Don't Search for Shops.<br />
          Let <span>Shops Come to You.</span>
        </h1>
        <p className="hero-subtitle">
          Post the item you want, set your budget, and watch local shops bid to offer you the lowest competitive price. Get what you need with maximum savings.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {user ? (
            <Link to={user.role === 'customer' ? '/dashboard' : '/market'} className="btn btn-primary">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
              <Link to="/login" className="btn btn-outline">Sign In</Link>
            </>
          )}
        </div>
      </section>

      {/* Live Stats Banner */}
      <section className="container" style={{ paddingTop: '0', paddingBottom: '4rem' }}>
        <div className="stats-banner">
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>BidBuy Platform in Numbers</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Real-time statistics fetched directly from our marketplace database.</p>
          <div className="stats-grid">
            <div className="stat-item">
              <h3>{stats.active_requests}</h3>
              <p>Active Requests</p>
            </div>
            <div className="stat-item">
              <h3>{stats.total_bids}</h3>
              <p>Total Bids Submitted</p>
            </div>
            <div className="stat-item">
              <h3>{stats.completed_deals}</h3>
              <p>Completed Deals</p>
            </div>
            <div className="stat-item" style={{ borderRight: 'none' }}>
              <h3>{stats.savings_rate}</h3>
              <p>Average Savings</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container" style={{ paddingBottom: '6rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.2rem', marginBottom: '1rem', fontWeight: 800 }}>
          Three Simple Steps
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3.5rem' }}>
          How BidBuy matches customer demands with competitive local sellers.
        </p>
        <div className="grid-3">
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginBottom: '1.25rem' }}>
              <FileText size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 700 }}>1. Post What You Need</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Describe the specifications, choose your category, set your maximum target budget, and upload a reference image.
            </p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', marginBottom: '1.25rem' }}>
              <Gavel size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 700 }}>2. Shops Place Bids</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Verified sellers browse the live active feed and submit custom bids with their best pricing quotes and delivery times.
            </p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '1.25rem' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 700 }}>3. Chat & Accept</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Chat with sellers directly to clear up details, and accept the best price quote to complete the deal.
            </p>
          </div>
        </div>
      </section>

      {/* Category Showcase Section */}
      <section className="container" style={{ paddingBottom: '6rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.2rem', marginBottom: '1rem', fontWeight: 800 }}>
          Trending Categories
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3.5rem' }}>
          Explore the popular fields where buyers are securing major savings.
        </p>
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {CATEGORIES.map((cat, idx) => (
            <div key={idx} className="category-card" style={{ borderLeft: `4px solid ${cat.border}` }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{cat.icon}</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{cat.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{cat.count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container" style={{ paddingBottom: '6rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.2rem', marginBottom: '1rem', fontWeight: 800 }}>
          User Reviews
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3.5rem' }}>
          See what customers and sellers say about their experiences.
        </p>
        <div className="grid-3">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.25rem', color: 'var(--accent-amber)', marginBottom: '1rem' }}>
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  "{t.review}"
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>{t.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.role}</span>
                </div>
                <div style={{ display: 'inline-flex', padding: '0.35rem 0.75rem', borderRadius: '9999px', background: 'rgba(59,130,246,0.05)', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Verified
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section className="container" style={{ paddingBottom: '8rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.2rem', marginBottom: '1rem', fontWeight: 800 }}>
          Frequently Asked Questions
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3.5rem' }}>
          Got questions? We have the answers.
        </p>
        <div className="faq-container">
          {FAQ_DATA.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaq(idx)}>
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                <div className="faq-answer">
                  {faq.a}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Home;
