import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

export default function AddTicketModal({ isOpen, onClose, onSuccess, ticketToEdit }) {
  const getNow = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-CA');
    const timeStr = now.toTimeString().slice(0, 5);
    return { now, dateStr, timeStr };
  };

  const { dateStr: todayStr, timeStr: currentTimeStr } = getNow();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    subject: ''
  });
  
  const [participantInput, setParticipantInput] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (ticketToEdit) {
        // MODE EDIT: Isi form dengan data lama
        // Format tanggal harus YYYY-MM-DD agar input date membacanya
        const dateObj = new Date(ticketToEdit.date);
        // Trik mengatasi timezone agar tanggal tidak mundur 1 hari
        const dateStr = dateObj.toLocaleDateString('fr-CA'); 

        setFormData({
          date: dateStr,
          time: ticketToEdit.time.substring(0, 5), // Ambil HH:MM
          subject: ticketToEdit.subject
        });

        // Mapping peserta: ambil namanya saja
        if (ticketToEdit.participants) {
          setParticipants(ticketToEdit.participants.map(p => p.name));
        } else {
          setParticipants([]);
        }
      } else {
        const { dateStr, timeStr } = getNow();
        setFormData({
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          subject: ''
        });
        setParticipants([]);
      }
    }
  }, [isOpen, ticketToEdit]);

  if (!isOpen) return null;

  // Handle Input Text Biasa
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit ke Backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();

    if (selectedDateTime < now) {
      alert("Error: Tidak bisa membuat jadwal di waktu yang sudah lewat!");
      return; // Stop proses, jangan lanjut submit
    }

    setIsSubmitting(true);

    try {
      const payload = { ...formData, participants };
      
      let url = 'http://localhost:5000/api/tickets';
      let method = 'POST';

      // Jika ada ticketToEdit, berarti kita sedang EDIT (PUT)
      if (ticketToEdit) {
        url = `http://localhost:5000/api/tickets/${ticketToEdit.rowid}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        alert(ticketToEdit ? 'Ticket updated!' : 'Ticket created!');
        onSuccess();
        onClose();
      } else {
        alert('Failed: ' + result.message);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header Modal */}
        <div className="bg-gray-800 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
            {ticketToEdit ? 'Reschedule Meeting To' : 'New Ticket'} 
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* 1. DATE & TIME (TETAP BISA DIEDIT) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Date</label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-0 focus:border-gray-400 outline-none [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Time</label>
              <input
                type="time"
                name="time"
                required
                value={formData.time}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-0 focus:border-gray-400 outline-none [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>

          {/* 2. SUBJECT (DISABLED SAAT EDIT) */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Subject</label>
            <input
              type="text"
              name="subject"
              required
              placeholder="Meeting Subject..."
              value={formData.subject}
              onChange={handleChange}
              // Jika sedang Edit, matikan input dan beri warna abu-abu
              disabled={!!ticketToEdit}
              className={`w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-0 focus:border-gray-400 outline-none ${
                ticketToEdit 
                  ? 'text-gray-200 cursor-not-allowed' 
                  : 'focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </div>

          {/* 3. PARTICIPANTS (READ ONLY SAAT EDIT) */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Participants</label>

            {/* List Chips Peserta */}
            <div className="flex flex-wrap gap-2 mt-2">
              {participants.map((p, idx) => (
                <span key={idx} className={`text-sm px-3 py-1 rounded-full flex items-center gap-2 ${
                    ticketToEdit ? 'bg-gray-800 border border-gray-600 text-gray-200' : 'bg-blue-100 text-blue-800'
                }`}>
                  {p}
                </span>
              ))}
              {participants.length === 0 && (
                <span className="text-gray-400 text-sm italic">No participants added.</span>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-600">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 text-gray-200 hover:bg-gray-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-900 hover:bg-blue-800 text-gray-200 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> {ticketToEdit ? 'Reschedule' : 'Save Ticket'}</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}