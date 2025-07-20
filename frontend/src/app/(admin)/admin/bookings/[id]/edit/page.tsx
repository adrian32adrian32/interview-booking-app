'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Calendar, Clock, Mail, Phone, User, X, FileText, Eye, Download, Trash2 } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';

export default function EditBookingPage() {
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
        toast.error('Programare negăsită');
        router.push('/admin/bookings');
      }
    } catch (error) {
      toast.error('Eroare la încărcarea datelor');
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
      toast.success('Programare actualizată cu succes');
      router.push('/admin/bookings');
    } catch (error) {
      toast.error('Eroare la actualizarea programării');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await axios.put(`/api/bookings/${params.id}`, { status: newStatus });
      setBooking({ ...booking, status: newStatus });
      toast.success('Status actualizat');
    } catch (error) {
      toast.error('Eroare la actualizarea statusului');
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
      await axios.delete(`/api/upload/document/${docId}`);
      toast.success('Document șters');
      fetchDocuments();
    } catch (error) {
      toast.error('Eroare la ștergerea documentului');
    }
  };

  if (loading) return <div>Se încarcă...</div>;
  if (!booking) return null;

  return (
    <div className="py-6">
      <button
        onClick={() => router.push('/admin/bookings')}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi la programări
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Editează Programare #{booking.id}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formular Date Utilizator */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Date Utilizator</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={booking.client_email}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nume</label>
              <input
                type="text"
                value={booking.client_name || ''}
                onChange={(e) => setBooking({...booking, client_name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Telefon</label>
              <input
                type="text"
                value={booking.client_phone || ''}
                onChange={(e) => setBooking({...booking, client_phone: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>

            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={booking.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full rounded-md border-gray-300"
              >
                <option value="pending">În așteptare</option>
                <option value="confirmed">Confirmat</option>
                <option value="cancelled">Anulat</option>
                <option value="completed">Finalizat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notițe
              </label>
              <textarea
                value={booking.notes || ''}
                onChange={(e) => setBooking({...booking, notes: e.target.value})}
                rows={4}
                className="w-full rounded-md border-gray-300"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Salvează Modificările
            </button>
          </form>
        </div>

        {/* Documente */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Documente Client</h2>
          
          <DocumentUpload
            bookingId={booking.id}
            documents={documents}
            onUploadComplete={fetchDocuments}
          />

          {/* Lista documente existente cu preview */}
          {documents.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-600 mb-2">Documente existente:</p>
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                  <div className="flex items-center flex-1">
                    <FileText className="w-4 h-4 text-gray-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium">{doc.original_name || doc.filename}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Vizualizează"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="text-green-600 hover:text-green-800"
                      title="Descarcă"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-600 hover:text-red-800"
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
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{previewDoc.original_name || previewDoc.filename}</h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
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
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Previzualizarea nu este disponibilă pentru acest tip de fișier</p>
                  <button
                    onClick={() => {
                      handleDownload(previewDoc);
                      setPreviewDoc(null);
                    }}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
