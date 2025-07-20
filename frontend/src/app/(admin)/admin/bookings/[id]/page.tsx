'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { ArrowLeft, Calendar, Clock, Mail, Phone, User, MapPin, Edit2, FileText, Download, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ViewBookingPage() {
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
      console.error('Error fetching booking:', error);
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

  const handlePreview = (doc: any) => {
    setPreviewDoc(doc);
  };

  const closePreview = () => {
    setPreviewDoc(null);
  };

  if (loading) return <div className="p-6">Se încarcă...</div>;
  if (!booking) return <div className="p-6">Programare negăsită</div>;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800'
  };

  const statusLabels = {
    pending: 'În așteptare',
    confirmed: 'Confirmat',
    cancelled: 'Anulat',
    completed: 'Finalizat'
  };

  return (
    <div className="py-6">
      <button
        onClick={() => router.push('/admin/bookings')}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi la programări
      </button>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Detalii Programare #{booking.id}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Creată la {new Date(booking.created_at).toLocaleDateString('ro-RO')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[booking.status]}`}>
                {statusLabels[booking.status]}
              </span>
              <button
                onClick={() => router.push(`/admin/bookings/${booking.id}/edit`)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4" />
                Editează
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Informații Client */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Informații Client</h2>
              <div className="space-y-3">
                <div className="flex items-start">
                  <User className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Nume</p>
                    <p className="text-base">{booking.client_name}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-base">{booking.client_email}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Telefon</p>
                    <p className="text-base">{booking.client_phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalii Interviu */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Detalii Interviu</h2>
              <div className="space-y-3">
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Data</p>
                    <p className="text-base">{new Date(booking.interview_date).toLocaleDateString('ro-RO', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Ora</p>
                    <p className="text-base">{booking.interview_time}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Tip</p>
                    <p className="text-base">{booking.interview_type === 'online' ? 'Online' : 'În persoană'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notițe */}
          {booking.notes && (
            <div className="mt-8 pt-8 border-t">
              <h2 className="text-lg font-semibold mb-2 text-gray-900">Notițe</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}

          {/* Documente */}
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Documente</h2>
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center flex-1">
                      <FileText className="w-6 h-6 text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.original_name || doc.filename}</p>
                        <p className="text-xs text-gray-500">
                          Încărcat la {new Date(doc.uploaded_at).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.verified_by_admin && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Verificat
                        </span>
                      )}
                      <button
                        onClick={() => handlePreview(doc)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Vizualizează"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Descarcă"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nu există documente încărcate pentru această programare.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Preview Document */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{previewDoc.original_name || previewDoc.filename}</h3>
              <button
                onClick={closePreview}
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
                    onClick={() => handleDownload(previewDoc)}
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
