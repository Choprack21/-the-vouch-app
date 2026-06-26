import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './ui/Button.css';

export default function AdminDashboard({ setCurrentView }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`);
      const data = await res.json();
      
      if (data.users) {
        const enrichedUsers = data.users.map(u => {
          const sub = data.subscriptions?.find(s => s.user_id === u.id);
          return {
            ...u,
            plan: sub ? sub.plan_tier : 'Free',
            status: sub ? sub.status : 'None'
          };
        });
        setUsers(enrichedUsers);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBanUser = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently BAN this user?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        alert("Failed to ban user.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '2rem', color: '#fff', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard 👑</h1>
        <button className="cta-button" onClick={() => setCurrentView('dashboard')}>Exit Admin</button>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-color)' }}>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Joined</th>
                <th style={{ padding: '1rem' }}>Plan Tier</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{user.email}</td>
                  <td style={{ padding: '1rem' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: user.plan === 'premium' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.1)',
                      color: user.plan === 'premium' ? 'var(--accent-glow)' : '#ccc'
                    }}>
                      {user.plan}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => handleBanUser(user.id)}
                      style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Ban User
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
