import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketsAPI } from '../services/api';

function DirectorDashboard() {
  const [stats, setStats] = useState({ waiting: 0, in_room: 0, completed: 0, total_today: 0 });
  const [waitingTickets, setWaitingTickets] = useState([]);
  const [inRoomTickets, setInRoomTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchData();
    // Auto refresh every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, waitingRes, inRoomRes] = await Promise.all([
        ticketsAPI.getStats(),
        ticketsAPI.getAll({ status: 'waiting' }),
        ticketsAPI.getAll({ status: 'in_room' })
      ]);
      setStats(statsRes.data);
      setWaitingTickets(waitingRes.data);
      setInRoomTickets(inRoomRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (ticketId, newStatus) => {
    try {
      await ticketsAPI.updateStatus(ticketId, newStatus);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal mengubah status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <h1>Dashboard Mister</h1>
          <div className="navbar-user">
            <span>Selamat datang, {user?.full_name}</span>
            <span style={{ fontSize: '12px', opacity: 0.8, marginLeft: '10px' }}>
              🔄 Auto-refresh setiap 30 detik
            </span>
            <button 
              className="btn btn-secondary" 
              onClick={fetchData}
              style={{ marginLeft: '15px', padding: '8px 16px' }}
            >
              🔄 Refresh
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Menunggu</h3>
            <div className="stat-value" style={{ color: '#3498db' }}>{stats.waiting}</div>
          </div>
          <div className="stat-card">
            <h3>Di Ruangan</h3>
            <div className="stat-value" style={{ color: '#27ae60' }}>{stats.in_room}</div>
          </div>
          <div className="stat-card">
            <h3>Selesai Hari Ini</h3>
            <div className="stat-value" style={{ color: '#95a5a6' }}>{stats.completed}</div>
          </div>
          <div className="stat-card">
            <h3>Total Hari Ini</h3>
            <div className="stat-value" style={{ color: '#9b59b6' }}>{stats.total_today}</div>
          </div>
        </div>

        {/* Menunggu Section */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>
            Tamu Menunggu ({waitingTickets.length})
          </h2>
          {waitingTickets.length === 0 ? (
            <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Tidak ada tamu yang menunggu.</p>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '20px' 
            }}>
              {waitingTickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    padding: '24px',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    transition: 'transform 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{ticket.guest_name}</h3>
                    {ticket.company && (
                      <p style={{ margin: '0 0 4px 0', opacity: 0.9, fontSize: '14px' }}>
                        🏢 {ticket.company}
                      </p>
                    )}
                    {ticket.phone && (
                      <p style={{ margin: '0 0 4px 0', opacity: 0.9, fontSize: '14px' }}>
                        📞 {ticket.phone}
                      </p>
                    )}
                    <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                      🕐 {formatDateTime(ticket.appointment_time)}
                    </p>
                  </div>
                  
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: '8px', 
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                      <strong>Keperluan:</strong><br />
                      {ticket.purpose}
                    </p>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    marginTop: '16px'
                  }}>
                    <button
                      onClick={() => handleStatusUpdate(ticket.id, 'in_room')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#27ae60',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#229954'}
                      onMouseLeave={(e) => e.target.style.background = '#27ae60'}
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(ticket.id, 'rejected')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#e74c3c',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#c0392b'}
                      onMouseLeave={(e) => e.target.style.background = '#e74c3c'}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Di Ruangan Section */}
        <div>
          <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>
            Tamu Di Ruangan ({inRoomTickets.length})
          </h2>
          {inRoomTickets.length === 0 ? (
            <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Tidak ada tamu di ruangan.</p>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '20px' 
            }}>
              {inRoomTickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  style={{
                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    borderRadius: '12px',
                    padding: '24px',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(17, 153, 142, 0.4)',
                    transition: 'transform 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{ticket.guest_name}</h3>
                    {ticket.company && (
                      <p style={{ margin: '0 0 4px 0', opacity: 0.9, fontSize: '14px' }}>
                        🏢 {ticket.company}
                      </p>
                    )}
                    {ticket.phone && (
                      <p style={{ margin: '0 0 4px 0', opacity: 0.9, fontSize: '14px' }}>
                        📞 {ticket.phone}
                      </p>
                    )}
                    <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                      🕐 {formatDateTime(ticket.appointment_time)}
                    </p>
                  </div>
                  
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: '8px', 
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                      <strong>Keperluan:</strong><br />
                      {ticket.purpose}
                    </p>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    marginTop: '16px'
                  }}>
                    <button
                      onClick={() => handleStatusUpdate(ticket.id, 'completed')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#3498db',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#2980b9'}
                      onMouseLeave={(e) => e.target.style.background = '#3498db'}
                    >
                      ✓ Complete
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(ticket.id, 'rejected')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#e74c3c',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#c0392b'}
                      onMouseLeave={(e) => e.target.style.background = '#e74c3c'}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DirectorDashboard;
