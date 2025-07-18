'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  Calendar, Clock, User, Plus, Edit, Trash2, 
  Save, X, Loader, AlertCircle, CheckCircle
} from 'lucide-react';

interface TimeSlot {
  id?: number;
  interviewer_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  break_duration: number;
  is_active: boolean;
}

interface Interviewer {
  id: number;
  name: string;
  email: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Luni' },
  { value: 2, label: 'Marți' },
  { value: 3, label: 'Miercuri' },
  { value: 4, label: 'Joi' },
  { value: 5, label: 'Vineri' },
  { value: 6, label: 'Sâmbătă' },
  { value: 0, label: 'Duminică' }
];

export default function SlotsPage() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<TimeSlot>({
    interviewer_id: 0,
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration: 60,
    break_duration: 15,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [slotsRes, interviewersRes] = await Promise.all([
        api.get('/time-slots'),
        api.get('/users?role=interviewer')
      ]);

      if (slotsRes.data.success) {
        setSlots(slotsRes.data.data || []);
      }

      if (interviewersRes.data.success) {
        const interviewersList = interviewersRes.data.data.filter(
          (user: any) => user.role === 'interviewer' || user.role === 'admin'
        );
        setInterviewers(interviewersList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Eroare la încărcarea datelor');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        // Update existing
        const response = await api.put(`/time-slots/${editingId}`, formData);
        if (response.data.success) {
          toast.success('Slot actualizat cu succes');
          setEditingId(null);
          fetchData();
        }
      } else {
        // Create new
        const response = await api.post('/time-slots', formData);
        if (response.data.success) {
          toast.success('Slot creat cu succes');
          setIsAddingNew(false);
          resetForm();
          fetchData();
        }
      }
    } catch (error) {
      toast.error('Eroare la salvarea slotului');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Ești sigur că vrei să ștergi acest slot?')) {
      return;
    }

    try {
      const response = await api.delete(`/time-slots/${id}`);
      if (response.data.success) {
        toast.success('Slot șters cu succes');
        fetchData();
      }
    } catch (error) {
      toast.error('Eroare la ștergerea slotului');
    }
  };

  const handleEdit = (slot: TimeSlot) => {
    setFormData(slot);
    setEditingId(slot.id || null);
    setIsAddingNew(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      interviewer_id: 0,
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      slot_duration: 60,
      break_duration: 15,
      is_active: true
    });
  };

  const toggleSlotStatus = async (slot: TimeSlot) => {
    try {
      const response = await api.patch(`/time-slots/${slot.id}/toggle-status`);
      if (response.data.success) {
        toast.success(`Slot ${response.data.data.is_active ? 'activat' : 'dezactivat'}`);
        fetchData();
      }
    } catch (error) {
      toast.error('Eroare la actualizarea statusului');
    }
  };

  const getInterviewerName = (id: number) => {
    const interviewer = interviewers.find(i => i.id === id);
    return interviewer ? interviewer.name : 'Necunoscut';
  };

  const getDayName = (day: number) => {
    const dayObj = DAYS_OF_WEEK.find(d => d.value === day);
    return dayObj ? dayObj.label : '';
  };

  // Group slots by interviewer
  const slotsByInterviewer = slots.reduce((acc, slot) => {
    const key = slot.interviewer_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {} as Record<number, TimeSlot[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sloturi de Timp</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configurează disponibilitatea pentru interviuri
          </p>
        </div>
        <button
          onClick={() => {
            setIsAddingNew(true);
            setEditingId(null);
            resetForm();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Adaugă Slot Nou
        </button>
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Editează Slot' : 'Slot Nou'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Interviewer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervievator
              </label>
              <select
                value={formData.interviewer_id}
                onChange={(e) => setFormData({ ...formData, interviewer_id: parseInt(e.target.value) })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="0">Selectează intervievator</option>
                {interviewers.map(interviewer => (
                  <option key={interviewer.id} value={interviewer.id}>
                    {interviewer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Day of Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ziua săptămânii
              </label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interval orar
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Slot Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durată slot (minute)
              </label>
              <select
                value={formData.slot_duration}
                onChange={(e) => setFormData({ ...formData, slot_duration: parseInt(e.target.value) })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="30">30 minute</option>
                <option value="45">45 minute</option>
                <option value="60">60 minute</option>
                <option value="90">90 minute</option>
                <option value="120">120 minute</option>
              </select>
            </div>

            {/* Break Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pauză între sloturi (minute)
              </label>
              <select
                value={formData.break_duration}
                onChange={(e) => setFormData({ ...formData, break_duration: parseInt(e.target.value) })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="0">Fără pauză</option>
                <option value="5">5 minute</option>
                <option value="10">10 minute</option>
                <option value="15">15 minute</option>
                <option value="30">30 minute</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center gap-4 mt-3">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="true"
                    checked={formData.is_active}
                    onChange={() => setFormData({ ...formData, is_active: true })}
                    className="form-radio text-blue-600"
                  />
                  <span className="ml-2">Activ</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="false"
                    checked={!formData.is_active}
                    onChange={() => setFormData({ ...formData, is_active: false })}
                    className="form-radio text-blue-600"
                  />
                  <span className="ml-2">Inactiv</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.interviewer_id}
              className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Salvează
            </button>
          </div>
        </div>
      )}

      {/* Slots List */}
      {Object.keys(slotsByInterviewer).length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Nu există sloturi configurate încă.</p>
          <p className="text-sm text-gray-400 mt-2">Adaugă primul slot pentru a începe.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(slotsByInterviewer).map(([interviewerId, interviewerSlots]) => (
            <div key={interviewerId} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {getInterviewerName(parseInt(interviewerId))}
                </h3>
              </div>
              
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Interval Orar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durată Slot
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pauză
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acțiuni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {interviewerSlots
                        .sort((a, b) => a.day_of_week - b.day_of_week)
                        .map((slot) => (
                          <tr key={slot.id} className={!slot.is_active ? 'bg-gray-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {getDayName(slot.day_of_week)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {slot.start_time} - {slot.end_time}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {slot.slot_duration} min
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {slot.break_duration > 0 ? `${slot.break_duration} min` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleSlotStatus(slot)}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  slot.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {slot.is_active ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    Activ
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3" />
                                    Inactiv
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(slot)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(slot.id!)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Informații despre sloturi</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Sloturile definesc disponibilitatea pentru fiecare zi a săptămânii</li>
                <li>Sistemul va genera automat sloturi disponibile bazate pe aceste setări</li>
                <li>Pauzele sunt adăugate automat între programări consecutive</li>
                <li>Sloturile inactive nu vor fi disponibile pentru programare</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}