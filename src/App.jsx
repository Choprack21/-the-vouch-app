import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import './index.css';
import { supabase } from './supabaseClient';
import AdminDashboard from './components/AdminDashboard';

const stripePromise = loadStripe('pk_test_51Tlyh2EGQubGZS5lA3kE5JGvedPQOiiDKi9FeaN9U2zUiSH8nhzlCBMCHMNBCa7OLmNGCHS1voHMo4XQYAdGHvTn00cTYxOZJe');

function App() {
  const [currentView, setCurrentView] = useState('landing'); 
  const [activeTab, setActiveTab] = useState('search'); 
  const [showPaywall, setShowPaywall] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
    const [loadingCheck, setLoadingCheck] = useState(false);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bgFirstName, setBgFirstName] = useState('');
  const [bgLastName, setBgLastName] = useState('');
  const [bgState, setBgState] = useState('');
  const [bgResults, setBgResults] = useState(null);

  const [feed, setFeed] = useState([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postImage, setPostImage] = useState(null);
  const [postTargetName, setPostTargetName] = useState('');
  const [postTargetCity, setPostTargetCity] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postFlag, setPostFlag] = useState('red_flag');
  const [isPosting, setIsPosting] = useState(false);

  const [comments, setComments] = useState({});
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);





  // Auto-Login if session exists
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        if (window.location.pathname === '/admin') {
          if (session.user.email === 'choprackz@gmail.com') {
            setCurrentView('admin');
          } else {
            setCurrentView('dashboard');
          }
        } else {
          setCurrentView('dashboard');
        }
        setCurrentUserEmail(session.user.email);
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (subData && subData.status === 'active') {
          setIsPremium(true);
        } else {
          setIsPremium(false);
        }

        // Check if returning from Stripe payment
        if (localStorage.getItem('just_paid') === 'true') {
          localStorage.removeItem('just_paid');
          const paidTier = localStorage.getItem('paid_tier');
          
          if (paidTier === 'premium') {
             // SIMULATE DIRECT DATABASE UPGRADE FOR LOCAL TESTING
             // Since Stripe can't hit localhost, we upgrade the user directly from the client.
             supabase.from('subscriptions').upsert({
                user_id: session.user.id,
                plan_tier: 'premium',
                status: 'active'
             }, { onConflict: 'user_id' }).then(({error}) => {
                if (!error) {
                    setIsPremium(true);
                    // Force state refresh
                    window.location.reload();
                } else {
                    console.error("Upgrade error:", error);
                }
             });
          }

          const restoreTab = localStorage.getItem('paid_tab') || 'phone';
          setActiveTab(restoreTab);
          setShowPaywall(false);
          const savedResults = localStorage.getItem('pending_lookup');
          if (savedResults) {
            setLookupResults(JSON.parse(savedResults));
            localStorage.setItem('is_unlocked', 'true');
          }
          
          const savedBg = localStorage.getItem('pending_background');
          if (savedBg) {
            setBgResults(JSON.parse(savedBg));
            localStorage.setItem('is_unlocked', 'true');
          }
        }
      }
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        if (window.location.pathname === '/admin') {
          if (session.user.email === 'choprackz@gmail.com') {
            setCurrentView('admin');
          } else {
            setCurrentView('dashboard');
          }
        } else {
          setCurrentView('dashboard');
        }
        setCurrentUserEmail(session.user.email);
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (subData && subData.status === 'active') {
          setIsPremium(true);
        } else {
          setIsPremium(false);
        }

      } else {
        setCurrentUserEmail('');
      }
    });
  }, []);



  const handlePayment = async (planType) => {
    setIsProcessing(true);
    localStorage.setItem('just_paid', 'true');
    localStorage.setItem('paid_tab', activeTab);
    localStorage.setItem('paid_tier', planType);
    
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || '';
    
    // Real Stripe Payment Link Routing
    let link = 'https://buy.stripe.com/test_fZudR98PO3oZgTM6i5gIo00'; // $2.99 Single Pass
    
    if (planType === 'premium') {
      link = `https://buy.stripe.com/test_8x24gz6HGaRrdHAgWJgIo01?client_reference_id=${userId}`; // $19.99 Subscription Link
    } else {
      link = `${link}?client_reference_id=${userId}`;
    }
    
    setTimeout(() => {
      window.location.href = link;
    }, 1000);
  };

      const [lookupResults, setLookupResults] = useState(null);


  const loadFeed = async () => {
    const { data, error } = await supabase
      .from('vouches')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setFeed(data);
    }
  };

  useEffect(() => {
    if (activeTab === 'search') {
      loadFeed();
    }
  }, [activeTab]);

  const simulateCheck = async () => {
    if (activeTab === 'background') {
      setLoadingCheck(true);
      try {
        const response = await fetch(`${API_BASE}/api/background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName: bgFirstName, lastName: bgLastName, state: bgState })
        });
        const data = await response.json();
        setBgResults(data);
        localStorage.setItem('pending_background', JSON.stringify(data));
        localStorage.removeItem('is_unlocked'); // Lock it again
      } catch (err) {
        console.error(err);
      }
      setLoadingCheck(false);
      setShowPaywall(true);
      return;
    }

    if (activeTab === 'lookup' || activeTab === 'phone') {
      setLoadingCheck(true);
      try {
        const response = await fetch(`${API_BASE}/api/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: searchQuery })
        });
        const data = await response.json();
        setLookupResults(data);
        localStorage.setItem('pending_lookup', JSON.stringify(data));
        localStorage.removeItem('is_unlocked'); // Lock it again for a new search
      } catch (err) {
        console.error(err);
      }
      setLoadingCheck(false);
      setShowPaywall(true);
    } else {
      // Simulate background check or search for now
      setLoadingCheck(true);
      setTimeout(() => {
        setLoadingCheck(false);
        localStorage.removeItem('is_unlocked'); // Lock it again for a new search
        setShowPaywall(true); 
      }, 2000);
    }
  };



  const loadComments = async (vouchId) => {
    const { data, error } = await supabase
      .from('vouch_comments')
      .select('*')
      .eq('vouch_id', vouchId)
      .order('created_at', { ascending: true });
      
    if (!error && data) {
      setComments(prev => ({ ...prev, [vouchId]: data }));
    }
  };

  const handlePostComment = async (vouchId) => {
    if (!newCommentText.trim()) return;
    setIsPostingComment(true);
    
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('vouch_comments').insert({
        vouch_id: vouchId,
        author_id: userData.user.id,
        content: newCommentText
      });
      setNewCommentText('');
      await loadComments(vouchId);
    }
    setIsPostingComment(false);
  };
  
  const toggleComments = (vouchId) => {
    if (activeCommentId === vouchId) {
      setActiveCommentId(null);
    } else {
      setActiveCommentId(vouchId);
      loadComments(vouchId);
    }
  };

  const handlePostVouch = async () => {
    if (!postTargetName || !postTargetCity || !postContent) return;
    setIsPosting(true);
    
    let imageUrl = null;
    
    // 1. Upload Image to Supabase Storage if one was selected
    if (postImage) {
      const fileExt = postImage.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vouch_images')
        .upload(fileName, postImage);
        
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('vouch_images')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }

    // 2. Insert Vouch into Database
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('vouches').insert({
        author_id: userData.user.id,
        target_name: postTargetName,
        target_city: postTargetCity,
        content: postContent,
        flag_type: postFlag,
        image_url: imageUrl
      });
      
      // Reset Modal and reload feed
      setShowPostModal(false);
      setPostImage(null);
      setPostTargetName('');
      setPostTargetCity('');
      setPostContent('');
      loadFeed();
    }
    
    setIsPosting(false);
  };

  const handleAuth = async () => {
    setIsProcessing(true);
    setAuthError('');
    
    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setIsProcessing(false);
      if (error) setAuthError(error.message);
      else {
        if (window.location.pathname === '/admin' && email === 'choprackz@gmail.com') {
          setCurrentView('admin');
        } else {
          setCurrentView('dashboard');
        }
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email, 
        password,
        options: { data: { full_name: fullName } }
      });
      setIsProcessing(false);
      if (error) setAuthError(error.message);
      else setCurrentView('id_verification');
    }
  };

  const Ticker = () => (
    <div className="ticker-wrapper">
      <div className="ticker-content">
        Someone in NY ran a background check 🔍 • John D. in CA just signed up 🛡️ • Someone in FL just left a Vouch 💎 • Sarah M. in TX received 3 positive vouches 🌟 • Someone in IL performed a reverse phone lookup 📱 • 
        Someone in NY ran a background check 🔍 • John D. in CA just signed up 🛡️ • Someone in FL just left a Vouch 💎 • Sarah M. in TX received 3 positive vouches 🌟 • Someone in IL performed a reverse phone lookup 📱 • 
        Someone in NY ran a background check 🔍 • John D. in CA just signed up 🛡️ • Someone in FL just left a Vouch 💎 • Sarah M. in TX received 3 positive vouches 🌟 • Someone in IL performed a reverse phone lookup 📱 • 
      </div>
    </div>
  );

  if (currentView === 'landing') {
    return (
      <div className="landing-page">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        
        <nav className="landing-nav">
          <div className="logo">The Vouch App</div>
          <button className="btn-ghost" onClick={() => { setIsLoginMode(true); setCurrentView('create_account'); }}>Log In</button>
        </nav>

        <section className="hero-section">
          <div className="animate-slide-up">
            <div className="hero-tagline">100% Anonymous & Secure</div>
            <h1 className="hero-title">Date Safely.<br/>Discover the Truth.</h1>
            <p className="hero-desc">
              Join the fastest-growing private network protecting women while dating. Run real background checks, reverse phone lookups, and read verified community reviews before you meet.
            </p>
            <div className="hero-buttons">
              <button className="cta-button pulse" onClick={() => setCurrentView('create_account')}>Start Your Search</button>
              <button className="btn-secondary" onClick={() => {
                document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
              }}>How it works</button>
            </div>
          </div>
        </section>

        <Ticker />

        <section id="features" className="features-section">
          <div className="section-header">
            <h2 className="section-title">Intelligent Security Features</h2>
            <p className="section-subtitle">Everything you need to spot red flags instantly. Powered by verified public records and real experiences.</p>
          </div>
          
          <div className="bento-grid">
            <div className="bento-card span-2-col">
              <svg className="bento-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <h3 className="bento-title">Real Background Checks</h3>
              <p className="bento-desc">Instantly search public records and criminal history to ensure the person you are meeting is safe and honest about their past.</p>
            </div>
            
            <div className="bento-card">
              <svg className="bento-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              <h3 className="bento-title">Reverse Phone Lookup</h3>
              <p className="bento-desc">Type in their number to see their real name, age, and carrier. Catch fake numbers and burners immediately.</p>
            </div>
            
            <div className="bento-card span-2-row">
              <svg className="bento-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <h3 className="bento-title">Nationwide Search</h3>
              <p className="bento-desc">Our database is updated live by thousands of women across the country. If someone is a known ghoster, cheater, or threat, you will know before you even swipe right.</p>
            </div>
            
            <div className="bento-card">
              <svg className="bento-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path></svg>
              <h3 className="bento-title">100% Anonymous</h3>
              <p className="bento-desc">Your identity is never revealed when posting a Vouch. Read and write in complete stealth.</p>
            </div>
            
            <div className="bento-card">
              <svg className="bento-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"></path></svg>
              <h3 className="bento-title">No Screenshots</h3>
              <p className="bento-desc">Bank-level security prevents screenshots to protect the privacy of the community.</p>
            </div>
          </div>
        </section>

        <section className="community-section">
          <h2 className="section-title">A Secure Space Built on Trust</h2>
          <p className="section-subtitle">We don't use fake numbers. We just protect our community with radical transparency.</p>
          
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">ID-Verified Members Only</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">256-bit</span>
              <span className="stat-label">Military-Grade Encryption</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">0</span>
              <span className="stat-label">Data Breaches</span>
            </div>
          </div>
          
          <div style={{ marginTop: '4rem' }}>
            <button className="cta-button" onClick={() => setCurrentView('create_account')}>Join The Vouch App Today</button>
          </div>
        </section>
      </div>
    );
  }

  // Auth Funnel
  if (currentView === 'create_account') {
    return (
      <div className="dashboard-container" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div className="orb orb-1"></div>
        <div className="glass animate-fade-in" style={{ padding: '3rem', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', cursor: 'pointer' }} onClick={() => setIsLoginMode(!isLoginMode)}>
            {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </p>
          
          {authError && <div style={{ color: 'var(--accent-primary)', marginBottom: '1rem', fontSize: '0.9rem' }}>{authError}</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isLoginMode && (
              <input type="text" placeholder="Full Name" className="search-input" value={fullName} onChange={e => setFullName(e.target.value)} />
            )}
            <input type="email" placeholder="Email" className="search-input" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="search-input" value={password} onChange={e => setPassword(e.target.value)} />
            
            <button className="cta-button" style={{ width: '100%', marginTop: '1rem' }} onClick={handleAuth} disabled={isProcessing}>
              {isProcessing ? "Authenticating..." : (isLoginMode ? 'Log In' : 'Create Account')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'id_verification') {
    return (
      <div className="dashboard-container" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div className="glass animate-fade-in" style={{ padding: '3rem', width: '90%', maxWidth: '500px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }}>Verify Identity</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            To keep our community safe, you must upload a valid ID. You will still remain 100% anonymous when using the app.
          </p>
          <div style={{ border: '2px dashed var(--border-color)', padding: '3rem', borderRadius: '16px', marginBottom: '2rem', cursor: 'pointer', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🪪</div>
            <h3>Upload ID (JPEG/PDF)</h3>
          </div>
          <button className="cta-button" style={{ width: '100%' }} onClick={() => setCurrentView('dashboard')}>
            Verify & Enter App
          </button>
        </div>
      </div>
    );
  }

  // Dashboard Application
  if (currentView === 'admin') {
    return <AdminDashboard setCurrentView={setCurrentView} />;
  }

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        <div className="sidebar-logo">The Vouch App</div>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="nav-menu">
            <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
              <span>💎</span> Search Vouches
            </div>
            <div className={`nav-item ${activeTab === 'background' ? 'active' : ''}`} onClick={() => setActiveTab('background')}>
              <span>🔍</span> Background Check
            </div>
            <div className={`nav-item ${activeTab === 'phone' ? 'active' : ''}`} onClick={() => setActiveTab('phone')}>
              <span>📱</span> Phone Lookup
            </div>
            
            <div style={{ margin: '1rem 0', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
            
            <div className={`nav-item ${activeTab === 'store' ? 'active' : ''}`} onClick={() => setActiveTab('store')}>
              <span>🛍️</span> Vouch Premium
            </div>
            <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <span>⚙️</span> Manage Account
            </div>
          </div>
          
          <div style={{ marginTop: 'auto' }}>
            <div className="id-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>ID Verified</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'search' && (
          <div className="animate-slide-up">
            <div className="dashboard-header">
              <h2 className="dashboard-title">Community Search</h2>
              <p className="dashboard-subtitle">Search for community reviews and vouches.</p>
            </div>
            
            <div className="premium-card">
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="text" placeholder="First & Last Name..." className="search-input" />
                <button className="cta-button" onClick={simulateCheck} disabled={loadingCheck}>
                  {loadingCheck ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Live Community Feed</h3>
              <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setShowPostModal(true)}>+ Spill The Tea</button>
            </div>
            
            {feed.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No vouches yet. Be the first to spill the tea!</p>}

            {feed.map((vouch) => {
              const isUnlocked = isPremium || (localStorage.getItem('is_unlocked') === 'true' && localStorage.getItem('paid_tab') === 'search');
              
              if (!isUnlocked) {
                return (
                  <div key={vouch.id} className="blur-card" style={{ marginBottom: '1.5rem' }}>
                    <div className="blur-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        {vouch.image_url ? (
                          <img src={vouch.image_url} alt="Profile" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: vouch.flag_type === 'red_flag' ? '#ff3366' : '#00ffaa' }}></div>
                        )}
                        <div>
                          <h3>{vouch.target_name.split(' ')[0]} {vouch.target_name.split(' ')[1] ? vouch.target_name.split(' ')[1][0] + '.' : ''}</h3>
                          <p style={{ color: 'var(--text-secondary)' }}>📍 {vouch.target_city}</p>
                        </div>
                      </div>
                      <p>"{vouch.content.substring(0, 50)}..."</p>
                    </div>
                    <div className="paywall-overlay">
                      <h3 style={{ marginBottom: '1rem' }}>Unlock Full Profile & Vouch</h3>
                      <button className="unlock-btn" onClick={simulateCheck}>Reveal for $2.99</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={vouch.id} className="blur-card" style={{ marginBottom: '1.5rem' }}>
                  <div className="blur-content" style={{ filter: 'none', opacity: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                       <h3 style={{ color: vouch.flag_type === 'red_flag' ? '#ff3366' : '#00ffaa' }}>
                         {vouch.flag_type === 'red_flag' ? '🚨 Red Flag' : '✅ Green Flag'}
                       </h3>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1rem' }}>
                        {vouch.image_url && (
                          <img src={vouch.image_url} alt="Target" style={{ width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover', border: `2px solid ${vouch.flag_type === 'red_flag' ? '#ff3366' : '#00ffaa'}` }} />
                        )}
                        <div>
                          <h3 style={{ fontSize: '1.3rem' }}>{vouch.target_name}</h3>
                          <p style={{ color: 'var(--text-secondary)' }}>📍 {vouch.target_city}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                        "{vouch.content}"
                      </p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>— Posted anonymously • {new Date(vouch.created_at).toLocaleDateString()}</p>
                      
                      <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                         <button className="btn-ghost" style={{ padding: '0.5rem 0' }} onClick={() => toggleComments(vouch.id)}>
                           💬 {activeCommentId === vouch.id ? 'Hide Comments' : `View Comments (${comments[vouch.id]?.length || 0})`}
                         </button>
                         
                         {activeCommentId === vouch.id && (
                           <div className="animate-slide-up" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto' }}>
                               {(!comments[vouch.id] || comments[vouch.id].length === 0) ? (
                                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No comments yet. Be the first to reply!</p>
                               ) : (
                                 comments[vouch.id].map(comment => (
                                   <div key={comment.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px' }}>
                                     <p style={{ fontSize: '0.95rem' }}>{comment.content}</p>
                                     <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.4rem' }}>— Anonymous • {new Date(comment.created_at).toLocaleDateString()}</p>
                                   </div>
                                 ))
                               )}
                             </div>
                             
                             <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                               <input 
                                 type="text" 
                                 placeholder="Add an anonymous comment..." 
                                 className="search-input" 
                                 style={{ flex: 1, padding: '0.6rem' }}
                                 value={newCommentText}
                                 onChange={e => setNewCommentText(e.target.value)}
                                 onKeyPress={e => e.key === 'Enter' && handlePostComment(vouch.id)}
                               />
                               <button 
                                 className="cta-button" 
                                 style={{ padding: '0 1rem' }} 
                                 onClick={() => handlePostComment(vouch.id)}
                                 disabled={isPostingComment}
                               >
                                 {isPostingComment ? '...' : 'Post'}
                               </button>
                             </div>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        )}

        {activeTab === 'background' && (
          <div className="animate-slide-up">
            <div className="dashboard-header">
              <h2 className="dashboard-title">Criminal Background Check</h2>
              <p className="dashboard-subtitle">Search real public records to verify their identity and criminal history.</p>
            </div>
            
            <div className="premium-card">
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input type="text" placeholder="First Name" className="search-input" style={{ flex: 1 }} value={bgFirstName} onChange={e => setBgFirstName(e.target.value)} />
                <input type="text" placeholder="Last Name" className="search-input" style={{ flex: 1 }} value={bgLastName} onChange={e => setBgLastName(e.target.value)} />
                <input type="text" placeholder="State (e.g. CA)" className="search-input" style={{ width: '120px' }} value={bgState} onChange={e => setBgState(e.target.value)} />
                <button className="cta-button" onClick={simulateCheck} disabled={loadingCheck}>
                  {loadingCheck ? 'Scanning Records...' : 'Run Check'}
                </button>
              </div>
            </div>

            {(isPremium || (localStorage.getItem('is_unlocked') === 'true' && localStorage.getItem('paid_tab') === 'background')) && (
              <div className="blur-card" style={{ marginTop: '2rem' }}>
                <div className="blur-content" style={{ filter: 'none', opacity: 1 }}>
                  <h3 style={{ marginBottom: '1rem', color: '#00ffaa' }}>✅ Background Report Unlocked</h3>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {bgResults && bgResults.data ? (
                      <>
                        <h4 style={{ marginBottom: '1rem', color: 'white' }}>Live Data from RapidAPI</h4>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#111', padding: '1rem', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'monospace', color: '#00ffaa' }}>
                           <pre>{JSON.stringify(bgResults.data, null, 2)}</pre>
                        </div>
                      </>
                    ) : (
                       <p>No records found or API error.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'phone' && (
          <div className="animate-slide-up">
            <div className="dashboard-header">
              <h2 className="dashboard-title">Reverse Phone Lookup</h2>
              <p className="dashboard-subtitle">Find out exactly who is texting you. Unmask burner numbers instantly.</p>
            </div>
            
            <div className="premium-card">
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="tel" placeholder="(555) 000-0000" className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <button className="cta-button" onClick={simulateCheck} disabled={loadingCheck}>
                  {loadingCheck ? 'Tracing Number...' : 'Lookup Number'}
                </button>
              </div>
            </div>

            {(isPremium || localStorage.getItem('is_unlocked') === 'true') && lookupResults && (
              <div className="blur-card" style={{ marginTop: '2rem' }}>
                <div className="blur-content" style={{ filter: 'none', opacity: 1 }}>
                  <h3 style={{ marginBottom: '1rem', color: '#00ffaa' }}>✅ Report Unlocked</h3>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <p style={{ marginBottom: '0.5rem' }}><strong>Target Phone:</strong> {lookupResults.phone}</p>
                    <p style={{ marginBottom: '0.5rem' }}><strong>Caller Name:</strong> <span style={{ color: 'white', fontSize: '1.1rem' }}>{lookupResults.callerName}</span></p>
                    <p style={{ marginBottom: '0.5rem' }}>
                      <strong>Line Type:</strong>{' '}
                      <span style={{ 
                        color: lookupResults.lineType === 'mobile' ? '#00ffaa' : 
                               lookupResults.lineType === 'voip' ? '#ff3366' : 'white',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {lookupResults.lineType}
                      </span>
                      {lookupResults.lineType === 'voip' && ' (🚨 BURNER WARNING)'}
                    </p>
                    <p><strong>Carrier:</strong> {lookupResults.carrier}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {activeTab === 'store' && (
          <div className="animate-slide-up">
            <div className="dashboard-header" style={{ textAlign: 'center' }}>
              <h2 className="dashboard-title">Vouch Premium 💎</h2>
              <p className="dashboard-subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>Upgrade your account to unlock unlimited background checks, unmask burner phones, and read the tea.</p>
            </div>
            
            <div className="pricing-grid">
              {/* Single Pass */}
              <div className="premium-card pricing-card">
                <h3>Single Vouch Reveal</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Perfect for checking out a single date.</p>
                
                <div className="pricing-price">$2.99<span> / one-time</span></div>
                
                <ul className="pricing-features">
                  <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> 24-hour access to one Vouch</li>
                  <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Unblur Name & Image</li>
                  <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Read all comments</li>
                  <li style={{ color: 'rgba(255,255,255,0.2)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgba(255,255,255,0.2)' }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Background Checks</li>
                </ul>
                
                <button className="btn-secondary" style={{ width: '100%', marginTop: '2rem' }} onClick={() => handlePayment("single")} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Buy Single Pass'}
                </button>
              </div>

              {/* Premium Sub */}
              <div className="premium-card pricing-card" style={{ borderColor: 'var(--accent-primary)' }}>
                <div className="best-value-badge">MOST POPULAR</div>
                <h3 style={{ color: 'var(--accent-primary)' }}>Vouch Premium</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Total protection and unlimited access.</p>
                
                <div className="pricing-price">$19.99<span> / month</span></div>
                
                <ul className="pricing-features">
                  <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <strong>Unlimited</strong> Vouch Reveals</li>
                  <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <strong>Unlimited</strong> Background Checks</li>
                  <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <strong>Unlimited</strong> Phone Lookups</li>
                  <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Priority Customer Support</li>
                </ul>
                
                <button className="cta-button" style={{ width: '100%', marginTop: '2rem', boxShadow: '0 4px 15px var(--accent-glow)' }} onClick={() => handlePayment("premium")} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Subscribe Now'}
                </button>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'settings' && (
          <div className="animate-slide-up">
            <div className="dashboard-header">
              <h2 className="dashboard-title">Manage Account</h2>
              <p className="dashboard-subtitle">Update your profile, billing, and security settings.</p>
            </div>
            
            <div className="premium-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Account Details
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
                  <input type="email" value={currentUserEmail} disabled className="search-input" style={{ opacity: 0.7 }} />
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Current Plan</label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    {isPremium ? <span style={{color: '#00ffaa', fontWeight: 'bold'}}>Vouch Premium 💎</span> : <span>Basic Tier</span>}
                    <button className="btn-ghost" style={{ color: 'var(--accent-primary)' }} onClick={() => setActiveTab('store')}>Upgrade</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="premium-card">
              <h3 style={{ marginBottom: '1.5rem', color: '#ff3366', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Security
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Log out of your account on this device. Your data will remain 100% secure.</p>
              
              <button 
                className="btn-secondary" 
                style={{ borderColor: '#ff3366', color: '#ff3366' }}
                onClick={async () => {
                  await supabase.auth.signOut();
                  setCurrentView('landing');
                }}
              >
                Log Out Securely
              </button>

              <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Danger Zone</h4>
                <button 
                  className="btn-ghost" 
                  style={{ color: '#ff3366', padding: 0, textDecoration: 'underline' }}
                  onClick={async () => {
                    const confirmDelete = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
                    if (confirmDelete) {
                      // 1. Generate/Retrieve secure device fingerprint (Cookie/LocalStorage)
                      let deviceFingerprint = localStorage.getItem('secure_device_id');
                      if (!deviceFingerprint) {
                        deviceFingerprint = crypto.randomUUID();
                        localStorage.setItem('secure_device_id', deviceFingerprint);
                      }
                      
                      // 2. Soft Delete: Archive the user data for law enforcement / violation tracking
                      const { data: userData } = await supabase.auth.getUser();
                      if (userData?.user) {
                         await supabase.from('archived_users').insert({
                            user_id: userData.user.id,
                            email: userData.user.email,
                            device_fingerprint: deviceFingerprint
                         });
                      }
                      
                      // 3. Force logout (which visually deletes the account for the user)
                      await supabase.auth.signOut();
                      setCurrentView('landing');
                    }
                  }}
                >
                  Delete Account
                </button>
              </div>

            </div>
          </div>
        )}

      </main>

      
      {/* Post Vouch Modal */}
      {showPostModal && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div className="glass modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <button className="close-btn" onClick={() => setShowPostModal(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem' }}>Spill The Tea ☕</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="cta-button" 
                  style={{ flex: 1, background: postFlag === 'red_flag' ? '#ff3366' : 'rgba(255,51,102,0.2)', border: 'none' }}
                  onClick={() => setPostFlag('red_flag')}
                >🚨 Red Flag</button>
                <button 
                  className="cta-button" 
                  style={{ flex: 1, background: postFlag === 'green_flag' ? '#00ffaa' : 'rgba(0,255,170,0.2)', border: 'none', color: '#000' }}
                  onClick={() => setPostFlag('green_flag')}
                >✅ Green Flag</button>
              </div>
              
              <input type="text" placeholder="First & Last Name" className="search-input" value={postTargetName} onChange={e => setPostTargetName(e.target.value)} />
              <input type="text" placeholder="City & State (e.g. Charlotte, NC)" className="search-input" value={postTargetCity} onChange={e => setPostTargetCity(e.target.value)} />
              
              <div style={{ border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '8px', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
                <input type="file" accept="image/*" onChange={e => setPostImage(e.target.files[0])} style={{ display: 'block', width: '100%' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Upload an image to warn others (Optional)</p>
              </div>

              <textarea 
                placeholder="Write your review here... Be honest, be safe, and protect the community." 
                className="search-input" 
                style={{ height: '120px', resize: 'vertical' }}
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
              />
              
              <button className="cta-button" onClick={handlePostVouch} disabled={isPosting}>
                {isPosting ? 'Uploading & Encrypting...' : 'Post Vouch Anonymously'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Paywall Modal */}
      {showPaywall && (
        <div className="modal-backdrop">
          <div className="glass modal-content animate-fade-in">
            <button className="close-btn" onClick={() => setShowPaywall(false)}>×</button>
            <h2 style={{ marginBottom: '0.5rem' }}>Vouch Premium 💎</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Unlock this report, or subscribe for unlimited access to background checks, phone lookups, and vouches.</p>
            
            <div className="modal-options">
              <button className="option-btn" onClick={() => handlePayment("single")} disabled={isProcessing}>
                <strong>{isProcessing ? "Connecting to Stripe..." : "Unlock this Report ($2.99)"}</strong>
                <span>One-time 24-hour access to this specific record.</span>
              </button>
              
              <button className="option-btn" onClick={() => handlePayment("premium")} disabled={isProcessing} style={{ borderColor: 'var(--accent-primary)', background: 'rgba(255, 51, 102, 0.1)' }}>
                <strong>{isProcessing ? "Connecting to Stripe..." : "Vouch Premium ($19.99/mo)"}</strong>
                <span>Unlimited background checks, lookups, and full anonymity.</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
