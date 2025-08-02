'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { toastService } from '@/services/toastService';
import { ArrowLeft, Calendar, Clock, Mail, Phone, User, X, FileText, Eye, Download, Trash2 } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';

export default function EditBookingPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  useEffect(() => {
    fetchBooking();
    fetchDocuments();
  }, []);

  const fetchBooking = async () => {
    try {
      const res = await axios.get('/bookings');
      const bookingData = res.data.find((b: any) => b.id === parseInt(params.id as string));
      if (bookingData) {
        setBooking(bookingData);
      } else {
        toastService.error('error.generic', 'Programare negăsită');
        router.push('/admin/bookings');
      }
    } catch (error) {
      toastService.error('error.loading');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`/api/bookings/${params.id}/documents`);
      setDocuments(res.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/bookings/${params.id}`, booking);
      toastService.success('success.generic', 'Programare actualizată cu succes');
      router.push('/admin/bookings');
    } catch (error) {
      toastService.error('error.updateBooking');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await axios.put(`/api/bookings/${params.id}`, { status: newStatus });
      setBooking({ ...booking, status: newStatus });
      toastService.success('success.generic', 'Status actualizat');
    } catch (error) {
      toastService.error('error.updateStatus');
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const filename = doc.filename || doc.file_url?.split('/').pop();
      if (filename) {
        window.location.href = `/api/download/document/${filename}`;
      } else {
        toastService.error('error.generic', 'Numele fișierului lipsește');
      }
    } catch (error) {
      toastService.error('error.downloading');
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Sigur doriți să ștergeți acest document?')) return;
    
    try {
      await axios.delete(`/api/upload/document/${docId}`);
      toastService.success('success.generic', 'Document șters');
      fetchDocuments();
    } catch (error) {
      toastService.error('error.deleting');
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
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('[id].date_utilizator')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('[id].email')}</label>
              <input
                type="email"
                value={booking.client_email}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-gray-100 dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('[id].nume')}</label>
              <input
                type="text"
                value={booking.client_name || ''}
                onChange={(e) => setBooking({...booking, client_name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('[id].telefon')}</label>
              <input
                type="text"
                value={booking.client_phone || ''}
                onChange={(e) => setBooking({...booking, client_phone: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100"
              />
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
                <option value="confirmed">{t('[id].confirmat')}</option>
                <option value="cancelled">{t('[id].anulat')}</option>
                <option value="completed">{t('[id].finalizat')}</option>
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
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('[id].documente_client')}</h2>
          
          <DocumentUpload
            bookingId={booking.id}
            documents={documents}
            onUploadComplete={fetchDocuments}
          />

          {/* Lista documente existente cu preview */}
          {documents.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70 mb-2">Documente existente:</p>
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 rounded bg-gray-50 dark:bg-gray-700/50 futuristic:bg-purple-800/20">
                  <div className="flex items-center flex-1">
                    <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 futuristic:text-purple-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{doc.original_name || doc.filename}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
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
                  src={`/api/uploads/documents/${previewDoc.filename}`} 
                  alt={previewDoc.original_name}
                  className="max-w-full mx-auto"
                />
              ) : previewDoc.mime_type?.includes('pdf') ? (
                <iframe
                  src={`/api/uploads/documents/${previewDoc.filename}`}
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