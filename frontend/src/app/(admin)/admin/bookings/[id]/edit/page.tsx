'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Clock, Mail, Phone, User, X, FileText, Eye, Download, Trash2, MapPin, Video } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ]);

  useEffect(() => {
    fetchBooking();
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (booking?.interview_date) {
      fetchAvailableSlots(booking.interview_date);
    }
  }, [booking?.interview_date]);

  const fetchBooking = async () => {
    try {
      const res = await axios.get(`/bookings/${params.id}`);
      setBooking(res.data);
    } catch (error) {
      toast.error('Programare negăsită');
      router.push('/admin/bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`/bookings/${params.id}/documents`);
      setDocuments(res.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchAvailableSlots = async (date: string) => {
    try {
      const res = await axios.get(`/bookings/time-slots/available/${date}`);
      // Include current booking's time slot in available slots
      const slots = [...(res.data.availableSlots || [])];
      if (booking?.interview_time && !slots.includes(booking.interview_time)) {
        slots.push(booking.interview_time);
        slots.sort();
      }
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching slots:', error);
      // Keep default slots if API fails
    }
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving booking data:', booking);
    
    try {
      // Prepare data with proper date format
      const dataToSend = {
        ...booking,
        interview_date: booking.interview_date
      };
      
      console.log('Sending data:', dataToSend);
      
      const response = await axios.put(`/bookings/${params.id}`, dataToSend);
      
      if (response.data.success) {
        toast.success('Programare actualizată cu succes');
        router.push('/admin/bookings');
      } else {
        const errorData = response.data;
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to update');
      }
    } catch (error: any) {
      console.error('Error details:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Eroare la actualizarea programării');
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      // Pregătim toate datele cu formatul corect pentru a evita eroarea de tip date
      const currentBookingData = {
        client_name: booking.client_name,
        client_email: booking.client_email,
        client_phone: booking.client_phone,
        interview_date: formatDateForInput(booking.interview_date), // Formatăm data corect
        interview_time: booking.interview_time,
        interview_type: booking.interview_type,
        notes: booking.notes,
        status: newStatus // Noul status
      };
      
      console.log('Sending status update with data:', currentBookingData);
      
      const response = await axios.put(`/bookings/${params.id}`, currentBookingData);
      
      if (response.data.success) {
        setBooking({...booking, status: newStatus});
        toast.success('Status actualizat cu succes');
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Eroare la actualizarea statusului');
      }
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const filename = doc.filename || doc.file_url?.split('/').pop();
      if (filename) {
        window.location.href = `/api/download/document/${filename}`;
      } else {
        toast.error('Numele fișierului lipsește');
      }
    } catch (error) {
      toast.error('Eroare la descărcarea documentului');
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Sigur doriți să ștergeți acest document?')) return;
    
    try {
      await axios.delete(`/upload/document/${docId}`);
      toast.success('Document șters');
      fetchDocuments();
    } catch (error) {
      toast.error('Eroare la ștergerea documentului');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 futuristic:border-cyan-400"></div>
    </div>
  );
  
  if (!booking) return null;

  return (
    <div className="py-6">
      <button
        onClick={() => router.push('/admin/bookings')}
        className="mb-4 flex items-center text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi la programări
      </button>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-6">
        Editează Programare #{booking.id}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formular Date Utilizator */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 rounded-lg p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">Date Utilizator</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">Email</label>
              <input
                type="email"
                value={booking.client_email}
                onChange={(e) => setBooking({...booking, client_email: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">Nume</label>
              <input
                type="text"
                value={booking.client_name || ''}
                onChange={(e) => setBooking({...booking, client_name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">Telefon</label>
              <input
                type="text"
                value={booking.client_phone || ''}
                onChange={(e) => setBooking({...booking, client_phone: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">Data</label>
                <div className="mt-1 relative">
                  <input
                    type="date"
                    value={formatDateForInput(booking.interview_date)}
                    onChange={(e) => setBooking({...booking, interview_date: e.target.value})}
                    min={formatDateForInput(new Date().toISOString())}
                    className="block w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
                  />
                  <Calendar className="absolute left-3 top-2 w-4 h-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">Ora</label>
                <div className="mt-1 relative">
                  <select
                    value={booking.interview_time || ''}
                    onChange={(e) => setBooking({...booking, interview_time: e.target.value})}
                    className="block w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
                  >
                    <option value="">Selectează ora</option>
                    {availableSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  <Clock className="absolute left-3 top-2 w-4 h-4 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">Tip Interviu</label>
              <select
                value={booking.interview_type || 'in_person'}
                onChange={(e) => setBooking({...booking, interview_type: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              >
                <option value="online">Online</option>
                <option value="in_person">În persoană</option>
              </select>
              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">
                {booking.interview_type === 'online' ? (
                  <>
                    <Video className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400 futuristic:text-cyan-400" />
                    Interviul se va desfășura online
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2 text-green-500 dark:text-green-400 futuristic:text-green-400" />
                    Interviul se va desfășura în persoană
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
                Status
              </label>
              <select
                value={booking.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              >
                <option value="pending">În așteptare</option>
                <option value="confirmed">Confirmat</option>
                <option value="cancelled">Anulat</option>
                <option value="completed">Finalizat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
                Notițe
              </label>
              <textarea
                value={booking.notes || ''}
                onChange={(e) => setBooking({...booking, notes: e.target.value})}
                rows={4}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
                placeholder="Adaugă notițe despre această programare..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors"
            >
              Salvează Modificările
            </button>
          </form>
        </div>

        {/* Documente */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 rounded-lg p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">Documente Client</h2>
          
          <DocumentUpload
            bookingId={booking.id}
            documents={documents}
            onUploadComplete={fetchDocuments}
          />

          {/* Lista documente existente cu preview */}
          {documents.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70 mb-2">Documente încărcate:</p>
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 rounded bg-gray-50 dark:bg-gray-700/50 futuristic:bg-purple-800/20">
                  <div className="flex items-center flex-1">
                    <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 futuristic:text-purple-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{doc.original_name || doc.filename}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
                        {new Date(doc.uploaded_at).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
                      title="Vizualizează"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="text-green-600 dark:text-green-400 futuristic:text-green-400 hover:text-green-800 dark:hover:text-green-300 futuristic:hover:text-green-300"
                      title="Descarcă"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-600 dark:text-red-400 futuristic:text-red-400 hover:text-red-800 dark:hover:text-red-300 futuristic:hover:text-red-300"
                      title="Șterge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {documents.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nu există documente încărcate</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Preview Document */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/95 rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{previewDoc.original_name || previewDoc.filename}</h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400 futuristic:text-cyan-200" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewDoc.mime_type?.includes('image') ? (
                <img 
                  src={`http://94.156.250.138:5000/uploads/documents/${previewDoc.filename}`}
                  alt={previewDoc.original_name}
                  className="max-w-full mx-auto"
                />
              ) : previewDoc.mime_type?.includes('pdf') ? (
                <iframe
                  src={`http://94.156.250.138:5000/uploads/documents/${previewDoc.filename}`}
                  className="w-full h-[70vh]"
                  title={previewDoc.original_name}
                />
              ) : (
                <div className="text-center py-20">
                  <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-200">Previzualizarea nu este disponibilă pentru acest tip de fișier</p>
                  <button
                    onClick={() => {
                      handleDownload(previewDoc);
                      setPreviewDoc(null);
                    }}
                    className="mt-4 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors"
                  >
                    Descarcă pentru vizualizare
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}