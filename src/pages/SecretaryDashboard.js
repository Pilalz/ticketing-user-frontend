import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketsAPI } from '../services/api';

function SecretaryDashboard() {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    guest_name: '',
    company: '',
    phone: '',
    email: '',
    purpose: '',
    appointment_time: '',
    status: 'waiting'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchTickets();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Filter tickets whenever tickets or filterStatus changes
    if (filterStatus === 'all') {
      setFilteredTickets(tickets);
    } else {
      setFilteredTickets(tickets.filter(ticket => ticket.status === filterStatus));
    }
  }, [tickets, filterStatus]);

  const fetchTickets = async () => {
    try {
      const response = await ticketsAPI.getAll();
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const openModal = (ticket = null) => {
    if (ticket) {
      setEditingTicket(ticket);
      setFormData({
        guest_name: ticket.guest_name,
        company: ticket.company || '',
        phone: ticket.phone || '',
        email: ticket.email || '',
        purpose: ticket.purpose,
        appointment_time: ticket.appointment_time.slice(0, 16),
        status: ticket.status
      });
    } else {
      setEditingTicket(null);
      setFormData({
        guest_name: '',
        company: '',
        phone: '',
        email: '',
        purpose: '',
        appointment_time: '',
        status: 'waiting'
      });
    }
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTicket(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingTicket) {
        await ticketsAPI.update(editingTicket.id, formData);
      } else {
        await ticketsAPI.create(formData);
      }
      fetchTickets();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus tiket ini?')) {
      try {
        await ticketsAPI.delete(id);
        fetchTickets();
      } catch (error) {
        alert('Gagal menghapus tiket');
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await ticketsAPI.updateStatus(id, newStatus);
      fetchTickets();
    } catch (error) {
      alert('Gagal mengubah status');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      waiting: { class: 'badge-waiting', text: 'Menunggu' },
      in_room: { class: 'badge-in-room', text: 'Di Ruangan' },
      completed: { class: 'badge-completed', text: 'Selesai' },
      cancelled: { class: 'badge-cancelled', text: 'Dibatalkan' },
      rejected: { class: 'badge-cancelled', text: 'Ditolak' }
    };
    const s = statusMap[status] || { class: '', text: status };
    return <span className={`badge ${s.class}`}>{s.text}</span>;
  };

  const getStatusLabel = (status) => {
    const labels = {
      waiting: 'Menunggu',
      in_room: 'Di Ruangan',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      rejected: 'Ditolak'
    };
    return labels[status] || status;
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
          <h1>Dashboard Sekretaris</h1>
          <div className="navbar-user">
            <span>Selamat datang, {user?.full_name}</span>
            <span style={{ fontSize: '12px', opacity: 0.8, marginLeft: '10px' }}>
              🔄 Auto-refresh setiap 30 detik
            </span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        {/* Quick Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            borderRadius: '8px', 
            padding: '15px', 
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {tickets.filter(t => t.status === 'waiting').length}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>Menunggu</div>
          </div>
          <div style={{ 
            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', 
            borderRadius: '8px', 
            padding: '15px', 
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {tickets.filter(t => t.status === 'in_room').length}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>Di Ruangan</div>
          </div>
          <div style={{ 
            background: 'linear-gradient(135deg, #3498db 0%, #2a64a7ff 100%)', 
            borderRadius: '8px', 
            padding: '15px', 
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {tickets.filter(t => t.status === 'completed').length}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>Selesai</div>
          </div>
          <div style={{ 
            background: 'linear-gradient(135deg, #e74c3c 0%, #bd5f55ff 100%)', 
            borderRadius: '8px', 
            padding: '15px', 
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {tickets.filter(t => t.status === 'rejected').length}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>Ditolak</div>
          </div>
          <div style={{ 
            background: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)', 
            borderRadius: '8px', 
            padding: '15px', 
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {tickets.filter(t => t.status === 'cancelled').length}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>Dibatalkan</div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0 }}>Manajemen Tiket Tamu</h2>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                Menampilkan {filteredTickets.length} dari {tickets.length} tiket
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={fetchTickets}
                style={{ padding: '8px 16px' }}
              >
                🔄 Refresh
              </button>
              <select 
                className="form-control" 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="all">Semua Status</option>
                <option value="waiting">Menunggu</option>
                <option value="in_room">Di Ruangan</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
                <option value="rejected">Ditolak</option>
              </select>
              <button className="btn btn-primary" onClick={() => openModal()}>
                + Tambah Tiket Baru
              </button>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <p>Tidak ada data tiket{filterStatus !== 'all' ? ` dengan status ${getStatusLabel(filterStatus)}` : ''}.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nama Tamu</th>
                  <th>Perusahaan</th>
                  <th>Telepon</th>
                  <th>Keperluan</th>
                  <th>Waktu Janji</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.guest_name}</td>
                    <td>{ticket.company || '-'}</td>
                    <td>{ticket.phone || '-'}</td>
                    <td>{ticket.purpose}</td>
                    <td>{formatDateTime(ticket.appointment_time)}</td>
                    <td>
                      <select
                        className="form-control"
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                        style={{ width: 'auto', padding: '5px' }}
                      >
                        <option value="waiting">Menunggu</option>
                        <option value="in_room">Di Ruangan</option>
                        <option value="completed">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                        <option value="rejected">Ditolak</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-warning"
                        onClick={() => openModal(ticket)}
                        style={{ marginRight: '5px', padding: '5px 10px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(ticket.id)}
                        style={{ padding: '5px 10px' }}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTicket ? 'Edit Tiket' : 'Tambah Tiket Baru'}</h2>
              <button onClick={closeModal} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Tamu *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Perusahaan</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Telepon</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Keperluan *</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Waktu Janji *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={formData.appointment_time}
                  onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                  required
                />
              </div>

              {editingTicket && (
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="waiting">Menunggu</option>
                    <option value="in_room">Di Ruangan</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTicket ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecretaryDashboard;
