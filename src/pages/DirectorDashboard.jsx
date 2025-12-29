import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Calendar as CalendarIcon, Clock, 
  ChevronLeft, ChevronRight, // Icon Navigasi
  RotateCcw // Icon Reset/Today
} from 'lucide-react';
import AddTicketModal from '../components/FormEdit'; 
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays
} from 'date-fns';
import { id } from 'date-fns/locale'; 

const useTabNotification = () => {
  const [isBlinking, setIsBlinking] = useState(false);
  const intervalRef = useRef(null);
  const originalTitle = useRef(document.title);

  useEffect(() => {
    originalTitle.current = document.title;
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
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const notif = new Notification(title, { body: body, silent: true });
      notif.onclick = function() { window.focus(); this.close(); };
    }
  };
  return { startBlinking, sendDesktopNotification };
};

export default function MeetingDashboard() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh] = useState(true);
  const [refreshInterval] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);

  // --- STATE KALENDER ---
  const [currentMonth, setCurrentMonth] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date()); 

  const API_URL = 'http://localhost:5000/api/tickets';
  const prevMeetingCountRef = useRef(0);
  const { startBlinking, sendDesktopNotification } = useTabNotification();

  // --- HELPER AUDIO & STYLE ---
  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3'); 
    audio.play().catch(err => console.log(err));
  };

  const getCardStyle = (status) => {
    const s = status ? status.toLowerCase() : '';

    if (s === 'in the room') {
      return 'bg-green-900 border-0 shadow-green-900/20';
    }
    return 'bg-blue-950 border-0 shadow-blue-900/20';
  };

  // --- FETCH DATA ---
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}`); 
      const finalResponse = response.ok ? response : await fetch(API_URL);
      const result = await finalResponse.json();
      if (result.success) {
        setMeetings(result.data);
      } else {
        setError('Failed to fetch meetings');
      }
    } catch (err) {
      setError('Error connection: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // --- EFFECTS ---
  useEffect(() => {
    if (meetings.length > prevMeetingCountRef.current && prevMeetingCountRef.current !== 0) {
      const newCount = meetings.length;
      startBlinking(`🔔 (${newCount}) New Request!`);
      playNotificationSound();
      if (document.hidden) {
        sendDesktopNotification("New Guest Request!", `Ada tamu baru menunggu.`);
      }
    }
    prevMeetingCountRef.current = meetings.length;
  }, [meetings, startBlinking, sendDesktopNotification]);

  useEffect(() => {
    fetchMeetings();
    if (autoRefresh) {
      const interval = setInterval(() => { fetchMeetings(); }, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchMeetings]);

  // --- HANDLERS ---
  const handleUpdateStatus = async (meetingId, newStatus) => {
    if(!window.confirm(`Change status to "${newStatus}"?`)) return;
    try {
      const response = await fetch(`${API_URL}/${meetingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (result.success) fetchMeetings(); 
      else alert('Failed: ' + result.message);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleReschedule = (meeting) => {
    setEditingTicket(meeting);
    setIsModalOpen(true);     
  };

  const filteredMeetings = meetings.filter(meeting => {
    const meetingDate = meeting.date 
      ? format(new Date(meeting.date), 'yyyy-MM-dd') 
      : '';
      
    return meetingDate === format(selectedDate, 'yyyy-MM-dd');
  });

  // --- LOGIKA KALENDER BARU (NAVIGASI TAHUN & BULAN) ---
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const handleDateChange = (e) => {
    if (e.target.value) {
      const newDate = new Date(e.target.value);

      setSelectedDate(newDate);
      setCurrentMonth(newDate);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 px-1 gap-4">
        
        <div className="flex items-center gap-4">
            <div className="relative group">
                {/* <h2 className="text-3xl font-bold text-white capitalize tracking-tight cursor-pointer group-hover:text-blue-500 transition flex items-center gap-2">
                    {format(currentMonth, 'MMMM yyyy', { locale: id })}
                    <ChevronRight className="w-5 h-5 rotate-90 opacity-50 group-hover:opacity-100 transition" />
                </h2>

                <input 
                    type="month"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={handleDateChange}
                    value={format(currentMonth, 'yyyy-MM')} 
                /> */}
                <input 
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={handleDateChange}
                  className="bg-gray-800 text-white text-xl font-bold py-2 px-4 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer tracking-wide
                    [&::-webkit-calendar-picker-indicator]:invert
                    [&::-webkit-calendar-picker-indicator]:cursor-pointer
                    [&::-webkit-calendar-picker-indicator]:opacity-70
                    [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                />
            </div>

            <button 
                onClick={goToToday}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-sm rounded-md border border-gray-700 text-gray-300 flex items-center gap-2 transition"
                title="Kembali ke Hari Ini"
            >
                <RotateCcw className="w-3 h-3"/> Today
            </button>
        </div>

        {/* Kanan: Navigasi Tombol (HANYA BULAN) */}
        <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
            {/* Tombol Bulan Mundur */}
            <button onClick={prevMonth} className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition border-r border-gray-700 mr-1" title="Bulan Lalu">
                <ChevronLeft className="w-4 h-4"/>
            </button>
            
            {/* Tombol Bulan Maju */}
            <button onClick={nextMonth} className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition ml-1 border-l border-gray-700" title="Bulan Depan">
                <ChevronRight className="w-4 h-4"/>
            </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
    return (
      <div className="grid grid-cols-7 mb-2 border-b border-gray-800 pb-2">
        {days.map((day, i) => (
          <div key={i} className="text-center font-bold text-gray-200 text-xs tracking-wider">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const meetingsOnThisDay = meetings.filter(m => {
            const mDate = m.date 
              ? format(new Date(m.date), 'yyyy-MM-dd') 
              : '';
            return mDate === format(cloneDay, 'yyyy-MM-dd');
        });
        
        const count = meetingsOnThisDay.length;
        const hasMeeting = count > 0;
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={day.toString()} 
            className={`
              relative h-28 border-b border-r border-gray-800/50 flex flex-col p-2 cursor-pointer transition-all duration-200
              ${!isCurrentMonth ? "bg-gray-900/40 text-gray-600" : "bg-transparent text-gray-300 hover:bg-gray-800/50"}
              ${isSelected ? "bg-gray-800/80 ring-inset ring-1 ring-blue-500/50" : ""}
            `}
            onClick={() => {
                setSelectedDate(cloneDay);
                if (!isSameMonth(cloneDay, monthStart)) {
                    setCurrentMonth(cloneDay);
                }
            }}
          >
            {/* Tanggal Number */}
            <div className="flex justify-between items-start">
                 <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : ""
                 }`}>
                    {formattedDate}
                 </span>
            </div>
            
            {/* Indikator Meeting (Google Calendar Style - Bar) */}
            {hasMeeting && (
               <div className="mt-auto">
                   <div className="bg-green-500/20 border-l-2 border-green-500 px-2 py-0.5 rounded-sm mb-1">
                      <span className="text-[10px] text-green-400 font-medium block truncate">{count} Meeting{count > 1 ? 's' : ''}</span>
                   </div>
               </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div key={day.toString()} className="grid grid-cols-7">{days}</div>);
      days = [];
    }
    return <div className="border-t border-l border-gray-800">{rows}</div>;
  };

  // --- RENDER CARD ACTION ---
  const renderActionButtons = (meeting) => {
    const s = meeting.status ? meeting.status.toLowerCase() : '';
    if (s === 'waiting') {
      return (
        <div className="flex gap-2 mt-4 pt-4 border-t border-white/20">
          <button
            onClick={() => handleUpdateStatus(meeting.rowid, 'In The Room')}
            className="flex-1 bg-green-800 hover:bg-green-700 text-gray-100 text-xs font-semibold py-2 rounded-lg transition shadow-md"
          >
            Approve
          </button>
          <button
            onClick={() => handleUpdateStatus(meeting.rowid, 'Reject')}
            className="flex-1 bg-red-800 hover:bg-red-700 text-gray-100 text-xs font-semibold py-2 rounded-lg transition shadow-md"
          >
            Reject
          </button>
          <button onClick={() => handleReschedule(meeting)}
            className="flex-1 bg-yellow-800 hover:bg-yellow-700 text-gray-100 text-xs font-semibold py-2 rounded-lg transition shadow-md"
          >
            Reschedule
          </button>
        </div>
      );
    }
    if (s === 'in the room') {
      return (
        <div className="mt-auto pt-4 border-t border-white/20">
          <button
            onClick={() => handleUpdateStatus(meeting.rowid, 'Finished')}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold py-2 rounded-lg transition shadow-md"
          >
            Finish
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-h-screen bg-gray-950 text-white overflow-hidden flex flex-col">
      
      {/* HEADER UTAMA */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 z-20 shrink-0">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-200">
            <CalendarIcon className="w-6 h-6 text-gray-500" /> Guest
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>Total Meeting Requests: <strong className="text-white">{meetings.length}</strong></span>
            {loading && <span className="text-blue-400 animate-pulse">Syncing...</span>}
          </div>
        </div>
      </div>

      {/* SPLIT LAYOUT */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        
        <div className="w-full lg:w-[40%] bg-black p-6 flex flex-col border-r border-gray-800">
          <div className="shrink-0 mb-4">
             {renderHeader()}
             {renderDays()}
          </div>

          <div className="flex-1 h-full relative">
             <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-[100px] overflow-auto">
                {renderCells()}
             </div>
          </div>
        </div>

        {/* DETAIL LIST */}
        <div className="w-full lg:w-[60%] bg-gray-950 flex flex-col overflow-hidden border-l border-gray-800 shadow-2xl z-10">
           <div className="py-4 px-7 border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm shrink-0 z-20 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-100 mb-1 flex items-center gap-2">
                {format(selectedDate, 'eeee, dd MMMM', { locale: id })}
                <span className="text-gray-500 font-normal text-lg">{format(selectedDate, 'yyyy')}</span>
              </h2>
              <span className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-800/50">
                  {filteredMeetings.length} Meeting
              </span>
           </div>

           {/* Scrollable List Area */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-y-auto p-5 gap-4 custom-scrollbar scroll-smooth">
              {filteredMeetings.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800/50 rounded-xl bg-gray-900/10 m-2">
                   <div className="bg-gray-800 p-4 rounded-full mb-4">
                      <Clock className="w-8 h-8 text-gray-500" />
                   </div>
                   <p className="font-medium text-gray-400">Free Day</p>
                   <p className="text-xs text-gray-600 mt-1">Tidak ada jadwal meeting</p>                                      
                </div>
              ) : (
                filteredMeetings.map((meeting) => (
                  <div key={meeting.rowid} className={`rounded-xl p-5 border border-white/5 transition-all hover:scale-[1.02] hover:shadow-lg relative group ${getCardStyle(meeting.status)}`}>
                      <div className="flex justify-between items-start mb-3">
                         <h3 className="text-lg font-bold text-white leading-tight pr-8">{meeting.subject}</h3>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-gray-300 mb-4 bg-black/20 p-2 rounded-lg w-fit">
                          <Clock className="w-4 h-4 text-blue-400"/> 
                          <span className="font-mono tracking-wide">{meeting.time.substring(0, 5)}</span>
                          <span className="text-gray-600">|</span>
                          <span className="text-gray-400 text-xs">WIB</span>
                      </div>

                      {meeting.participants && (
                          <div className="flex flex-wrap gap-2 mb-4">
                              {meeting.participants.map(p => (
                                  <div key={p.rowid} className="text-xs bg-black/30 border border-white/10 px-2 py-1.5 rounded-md text-gray-300 flex items-center gap-1.5">
                                      {p.name}
                                  </div>
                              ))}
                          </div>
                      )}
                      
                      <div className="relative z-10">
                         {renderActionButtons(meeting)}
                      </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div> 

      <AddTicketModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchMeetings}
        ticketToEdit={editingTicket}
      />
    </div>
  );
}