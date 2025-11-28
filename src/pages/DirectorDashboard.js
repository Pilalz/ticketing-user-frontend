import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, Users } from 'lucide-react';

const useTabNotification = () => {
  const [isBlinking, setIsBlinking] = useState(false);
  const intervalRef = useRef(null);
  const originalTitle = useRef(document.title);

  useEffect(() => {
    originalTitle.current = document.title;
    
    // Minta izin notifikasi saat komponen di-load
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) stopBlinking();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopCode();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const startBlinking = (message) => {
    if (!document.hidden) return; 

    if (intervalRef.current) clearInterval(intervalRef.current);
    let showMessage = true;
    intervalRef.current = setInterval(() => {
      document.title = showMessage ? message : originalTitle.current;
      showMessage = !showMessage;
    }, 1000); 
    setIsBlinking(true);
  };

  const stopBlinking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    document.title = originalTitle.current;
    setIsBlinking(false);
  };

  const stopCode = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const sendDesktopNotification = (title, body) => {
    // Cek apakah browser support
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      // Tampilkan notifikasi
      const notif = new Notification(title, {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // Ganti dengan URL logo aplikasimu
        silent: true // Kita set true karena suaranya sudah dihandle oleh Audio element terpisah
      });
      
      // Jika notifikasi diklik, fokuskan ke window browser
      notif.onclick = function() {
        window.focus();
        this.close();
      };
    }
  };

  return { startBlinking, sendDesktopNotification };
};

export default function MeetingDashboard() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);

  const API_URL = 'http://localhost:5000/api/tickets';

  const prevMeetingCountRef = useRef(0);

  const { startBlinking, sendDesktopNotification } = useTabNotification();

  const playNotificationSound = () => {
    // Ganti URL ini dengan file lokal kamu, misal: '/notification.mp3' jika ada di folder public
    const audio = new Audio('/notification.mp3'); 
    
    // Browser modern kadang memblokir autoplay jika user belum pernah interaksi (klik) di halaman.
    // Kita wrap dengan catch error agar app tidak crash jika diblokir browser.
    audio.play().catch(err => {
      console.log("Audio play failed (biasanya karena user belum interaksi dgn halaman):", err);
    });
  };

 const getCardStyle = (status) => {
    const s = status ? status.toLowerCase() : '';

    if (s === 'in the room') {
      return 'bg-green-900 border-0 shadow-green-900/20';
    }
    return 'bg-blue-950 border-0 shadow-blue-900/20';
  };

  // Fetch meetings dari API
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      
      if (result.success) {
        setMeetings(result.data);
      } else {
        setError('Failed to fetch meetings');
      }
    } catch (err) {
      setError('Error connecting to server: ' + err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Logic Trigger Notifikasi
  useEffect(() => {
    // Jika ada data baru
    if (meetings.length > prevMeetingCountRef.current && prevMeetingCountRef.current !== 0) {
      
      const newCount = meetings.length;
      
      // 1. Title Blink
      startBlinking(`🔔 (${newCount}) New Request!`);
      
      // 2. Audio
      playNotificationSound();

      // 3. DESKTOP POP-UP (Yang akan muncul di pojok Windows)
      // Hanya kirim jika tab sedang tidak dilihat user (opsional logicnya)
      if (document.hidden) {
        sendDesktopNotification("New Guest Request!", `Ada tamu baru menunggu. Total: ${newCount}`);
      }
    }

    prevMeetingCountRef.current = meetings.length;
  }, [meetings, startBlinking, sendDesktopNotification]);

  // Auto refresh
  useEffect(() => {
    fetchMeetings();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMeetings();
      }, refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchMeetings]);

  // Update status
  const handleUpdateStatus = async (meetingId, newStatus) => {
    // Konfirmasi sederhana agar tidak salah klik
    if(!window.confirm(`Are you sure you want to change status to "${newStatus}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/${meetingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh data agar tampilan update otomatis
        fetchMeetings(); 
      } else {
        alert('Failed to update status: ' + result.message);
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
      console.error('Update error:', err);
    }
  };

  const renderActionButtons = (meeting) => {
    const s = meeting.status ? meeting.status.toLowerCase() : '';

    if (s === 'waiting') {
      return (
        <div className="flex gap-3 mt-auto pt-4 border-t border-white/20">
          <button
            onClick={() => handleUpdateStatus(meeting.rowid, 'In The Room')}
            className="flex-1 bg-green-800 hover:bg-green-700 text-gray-100 text-sm font-bold py-2 rounded-lg transition shadow-md"
          >
            Approve
          </button>
          <button
            onClick={() => handleUpdateStatus(meeting.rowid, 'Reject')}
            className="flex-1 bg-red-800 hover:bg-red-700 text-gray-100 text-sm font-bold py-2 rounded-lg transition shadow-md"
          >
            Reject
          </button>
        </div>
      );
    }

    if (s === 'in the room') {
      return (
        <div className="mt-auto pt-4 border-t border-white/20">
          <button
            onClick={() => handleUpdateStatus(meeting.rowid, 'Finished')}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold py-2 rounded-lg transition shadow-md"
          >
            Finish
          </button>
        </div>
      );
    }

    return null; // Status lain (Completed/Cancelled) tidak ada tombol
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format time
  const formatTime = (timeString) => {
    return timeString.substring(0, 5); // HH:MM
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-neutral-900">
      <div className="mx-auto">
        
        {/* Header */}
        <div className="bg-gray-800 shadow-lg p-5">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-200">Guest</h1>
            <span className="flex items-center gap-2 text-gray-200">
              <Calendar className="w-4 h-4" />
              Total Meetings Request: <strong>{meetings.length}</strong>
            </span>
            {loading && <span className="text-gray-200">Loading...</span>}         
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Meetings List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {meetings.length === 0 ? (
            <div className="bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-200 mb-2">No Meetings Found</h3>
              <p className="text-gray-300">There are no meetings today.</p>
            </div>
          ) : (
            meetings.map((meeting) => (
              <div
                key={meeting.rowid}
                className={`rounded-xl shadow-xl p-6 flex flex-col justify-between h-full min-h-[220px] border ${getCardStyle(meeting.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-200">
                        {meeting.subject}
                      </h3>                      
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-200 mb-3">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(meeting.date)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTime(meeting.time)}
                      </span>
                    </div>                    
                  </div>
                </div>

                {/* Participants */}
                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="border-b pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-gray-200" />
                      <h4 className="font-semibold text-gray-200">
                        Participants ({meeting.participants.length})
                      </h4>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {meeting.participants.map((participant) => (
                        <div
                          key={participant.rowid}
                          className="flex items-center gap-2 p-2 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg border border-gray-500"
                        >
                          <span className="text-sm font-medium text-gray-200">
                            {participant.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {renderActionButtons(meeting)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}