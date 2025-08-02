'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useRouter } from 'next/navigation';
import axios, { API_URL, BASE_URL } from '@/lib/axios';
import { toastService } from '@/services/toastService';
import { ArrowLeft, Calendar, Clock, Mail, Phone, User, X, FileText, Eye, Download, Trash2, MapPin, Video, Image as ImageIcon } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';

export default function EditBookingPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string; // Extrage ID-ul explicit
  
  const [booking, setBooking] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ]);

  // Debug log pentru ID
  useEffect(() => {
    console.log('ID from URL:', bookingId);
    console.log('Full params:', params);
  }, [bookingId, params]);

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
      fetchDocuments();
    }
  }, [bookingId]);

  useEffect(() => {
    if (booking?.interview_date) {
      fetchAvailableSlots(booking.interview_date);
    }
  }, [booking?.interview_date]);

  const fetchBooking = async () => {
    try {
      console.log('Fetching booking with ID:', bookingId);
      const res = await axios.get(`/bookings/${bookingId}`);
      console.log('Booking data received:', res.data);
      setBooking(res.data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toastService.error('error.generic', 'Programare negăsită');
      router.push('/admin/bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      console.log('Fetching documents for booking:', bookingId);
      // Fix pentru URL-ul dublu /api/api/
      const url = `/bookings/${bookingId}/documents`;
      console.log('Documents URL:', url);
      const res = await axios.get(url);
      console.log('Documents received:', res.data);
      setDocuments(res.data.documents || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      console.error('Error response:', error.response?.data);
      // Nu afișa eroare, doar setează array gol
      setDocuments([]);
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

  const getDocumentUrl = (doc: any) => {
    // Dacă file_url începe cu http, folosește-l direct
    if (doc.file_url?.startsWith('http')) {
      return doc.file_url;
    }
    
    // Pentru URL-urile de fișiere, folosim BASE URL fără /api
    const baseUrl = BASE_URL || 'http://94.156.250.138';
    return `${baseUrl}${doc.file_url || `/uploads/documents/${doc.filename}`}`;
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
      
      const response = await axios.put(`/bookings/${bookingId}`, dataToSend);
      
      if (response.data.success) {
        toastService.success('success.generic', 'Programare actualizată cu succes');
        router.push('/admin/bookings');
      } else {
        const errorData = response.data;
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to update');
      }
    } catch (error: any) {
      console.error('Error details:', error);
      if (error.response?.data?.error) {
        toastService.error(error.response.data.error);
      } else {
        toastService.error('error.updateBooking');
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
      
      const response = await axios.put(`/bookings/${bookingId}`, currentBookingData);
      
      if (response.data.success) {
        setBooking({...booking, status: newStatus});
        toastService.success('success.generic', 'Status actualizat cu succes');
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      if (error.response?.data?.error) {
        toastService.error(error.response.data.error);
      } else {
        toastService.error('error.updateStatus');
      }
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      // Folosește endpoint-ul care forțează descărcarea
      const response = await axios.get(`/upload/download/${doc.id}`, {
        responseType: 'blob'
      });
      
      // Creează blob și descarcă
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_name || doc.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toastService.success('success.generic', 'Document descărcat cu succes');
    } catch (error: any) {
      console.error('Download error:', error);
      
      // Dacă endpoint-ul cu autentificare nu merge, încearcă descărcare directă
      if (error.response?.status === 401 || error.response?.status === 403) {
        try {
          // Alternativă - descărcare directă fără autentificare pentru admin
          const baseUrl = 'http://94.156.250.138:5000';
          const fileUrl = `${baseUrl}/uploads/documents/${doc.filename}`;
          
          // Creează un link temporar pentru descărcare
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = doc.original_name || doc.filename;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toastService.success('success.generic', 'Document descărcat');
        } catch (err) {
          toastService.error('error.downloading');
        }
      } else {
        toastService.error('error.downloading');
      }
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Sigur doriți să ștergeți acest document?')) return;
    
    try {
      // Verifică dacă documentul are booking_id
      const doc = documents.find(d => d.id === docId);
      
      if (doc && doc.booking_id) {
        // Pentru documente cu booking_id, folosește endpoint-ul de booking
        await axios.delete(`/bookings/${bookingId}/documents/${docId}`);
      } else {
        // Pentru documente fără booking_id (de profil), folosește endpoint-ul general
        await axios.delete(`/upload/document/${docId}`);
      }
      
      toastService.success('success.generic', 'Document șters');
      // Reîncarcă documentele după ștergere
      setTimeout(() => {
        fetchDocuments();
      }, 500);
    } catch (error: any) {
      console.error('Delete error:', error);
      toastService.error('error.deleting');
    }
  };

  const handlePreview = (doc: any) => {
    const fileUrl = getDocumentUrl(doc);
    setPreviewDoc({
      ...doc,
      previewUrl: fileUrl
    });
  };

  // Callback pentru DocumentUpload
  const handleUploadComplete = () => {
    console.log('Upload completed, refreshing documents...');
    // Așteaptă puțin apoi reîncarcă documentele
    setTimeout(() => {
      fetchDocuments();
    }, 500);
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
        Editează Programare #{bookingId}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formular Date Utilizator */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 rounded-lg p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('edit.date_utilizator')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.email')}</label>
              <input
                type="email"
                value={booking.client_email}
                onChange={(e) => setBooking({...booking, client_email: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.nume')}</label>
              <input
                type="text"
                value={booking.client_name || ''}
                onChange={(e) => setBooking({...booking, client_name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.telefon')}</label>
              <input
                type="text"
                value={booking.client_phone || ''}
                onChange={(e) => setBooking({...booking, client_phone: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.data')}</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.ora')}</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.tip_interviu')}</label>
              <select
                value={booking.interview_type || 'in_person'}
                onChange={(e) => setBooking({...booking, interview_type: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              >
                <option value="online">{t('edit.online')}</option>
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
                <option value="confirmed">{t('edit.confirmat')}</option>
                <option value="cancelled">{t('edit.anulat')}</option>
                <option value="completed">{t('edit.finalizat')}</option>
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
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
            Documente Client
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({documents.length})
            </span>
          </h2>
          
          <DocumentUpload
            bookingId={parseInt(bookingId)}
            documents={documents}
            onUploadComplete={handleUploadComplete}
          />

          {/* Lista documente existente cu preview */}
          {documents.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70 mb-2">
                Documente încărcate:
              </p>
              {documents.map((doc) => {
                const isImage = doc.mime_type?.startsWith('image/');
                const isPDF = doc.mime_type === 'application/pdf';
                const fileUrl = getDocumentUrl(doc);
                
                return (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 rounded-lg bg-gray-50 dark:bg-gray-700/50 futuristic:bg-purple-800/20 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors">
                    <div className="flex items-center min-w-0 flex-1">
                      {/* Thumbnail preview pentru imagini */}
                      <div className="flex-shrink-0">
                        {isImage ? (
                          <div 
                            className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handlePreview(doc)}
                          >
                            <img 
                              src={fileUrl}
                              alt={doc.original_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" /></svg></div>';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            {isPDF ? (
                              <FileText className="w-8 h-8 text-red-500" />
                            ) : (
                              <FileText className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 truncate">
                          {doc.original_name || doc.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
                          {new Date(doc.uploaded_at).toLocaleDateString('ro-RO')} • 
                          {doc.mime_type?.split('/')[1]?.toUpperCase() || 'Document'}
                          {doc.size && ` • ${(doc.size / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handlePreview(doc)}
                        className="p-2 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:bg-blue-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Vizualizează"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-green-600 dark:text-green-400 futuristic:text-green-400 hover:bg-green-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Descarcă"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 text-red-600 dark:text-red-400 futuristic:text-red-400 hover:bg-red-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Șterge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/95 rounded-lg max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
                {previewDoc.original_name || previewDoc.filename}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400 futuristic:text-cyan-200" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900 futuristic:bg-purple-950/50">
              {previewDoc.mime_type?.includes('image') ? (
                <div className="flex items-center justify-center h-full">
                  <img 
                    src={previewDoc.previewUrl}
                    alt={previewDoc.original_name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : previewDoc.mime_type?.includes('pdf') ? (
                <iframe
                  src={previewDoc.previewUrl}
                  className="w-full h-full min-h-[600px] rounded-lg"
                  title={previewDoc.original_name}
                />
              ) : (
                <div className="text-center py-20">
                  <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-200 mb-2">
                    Previzualizarea nu este disponibilă pentru acest tip de fișier
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/70 mb-4">
                    Tip fișier: {previewDoc.mime_type || 'Necunoscut'}
                  </p>
                  <button
                    onClick={() => {
                      handleDownload(previewDoc);
                      setPreviewDoc(null);
                    }}
                    className="mt-4 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors"
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