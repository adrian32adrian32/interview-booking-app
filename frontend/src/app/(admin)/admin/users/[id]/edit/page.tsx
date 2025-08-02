'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useRouter } from 'next/navigation';
import axios, { API_URL } from '@/lib/axios';
import { toastService } from '@/services/toastService';
import { ArrowLeft, FileText, Eye, Download, X, Calendar, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export default function EditUserPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'user',
    status: 'active',
    password: ''
  });

  useEffect(() => {
    fetchUser();
    fetchAllDocuments();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`/users/${params.id}`);
      if (res.data.success) {
        setUser(res.data.user);
        setFormData({
          username: res.data.user.username || '',
          email: res.data.user.email || '',
          first_name: res.data.user.first_name || '',
          last_name: res.data.user.last_name || '',
          phone: res.data.user.phone || '',
          role: res.data.user.role || 'user',
          status: res.data.user.status || 'active',
          password: ''
        });
      }
    } catch (error) {
      toastService.error('error.loading');
      router.push('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDocuments = async () => {
    try {
      const res = await axios.get(`/users/${params.id}/documents`);
      setDocuments(res.data.documents || []);
      
      // Log statistici dacă sunt disponibile
      if (res.data.stats) {
        console.log('Statistici documente:', res.data.stats);
      }
    } catch (error) {
      console.error('Error fetching all documents:', error);
    }
  };

  const getDocumentUrl = (doc: any) => {
    // Dacă file_url începe cu http, folosește-l direct
    if (doc.file_url?.startsWith('http')) {
      return doc.file_url;
    }
    
    // Altfel, construiește URL-ul complet
    const baseUrl = API_URL.replace('/api', ''); // Elimină /api din URL
    return `${baseUrl}${doc.file_url || `/uploads/documents/${doc.filename}`}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Pregătește datele pentru trimitere - backend-ul așteaptă toate câmpurile
      const dataToSend: any = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        role: formData.role,
        status: formData.status
      };

      // Adaugă parola doar dacă a fost completată
      if (formData.password && formData.password.trim() !== '') {
        dataToSend.password = formData.password;
      }

      const res = await axios.put(`/users/${params.id}`, dataToSend);
      
      if (res.data.success) {
        toastService.success('success.generic', 'Utilizator actualizat cu succes!');
        router.push('/admin/users');
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      toastService.error('error.generic', error.response?.data?.message || 'Eroare la actualizarea utilizatorului');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', params.id as string);
    formData.append('type', 'identity'); // sau alt tip

    setUploadingDoc(true);
    try {
      const res = await axios.post('/upload/admin-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        toastService.success('success.generic', 'Document încărcat cu succes!');
        fetchAllDocuments(); // Reîncarcă lista de documente
      }
    } catch (error) {
      console.error('Upload error:', error);
      toastService.error('error.loading');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Ești sigur că vrei să ștergi acest document?')) return;

    try {
      await axios.delete(`/upload/document/${docId}`);
      toastService.success('success.generic', 'Document șters cu succes!');
      fetchAllDocuments();
    } catch (error) {
      toastService.error('error.deleting');
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const response = await axios.get(`/upload/download/${doc.id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_name || doc.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toastService.success('success.generic', 'Document descărcat cu succes');
    } catch (error) {
      console.error('Download error:', error);
      toastService.error('error.downloading');
    }
  };

  const handlePreview = (doc: any) => {
    const fileUrl = getDocumentUrl(doc);
    setPreviewDoc({
      ...doc,
      previewUrl: fileUrl
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 futuristic:border-cyan-400"></div>
    </div>
  );
  
  if (!user) return null;

  return (
    <div className="py-6">
      <button
        onClick={() => router.push('/admin/users')}
        className="mb-4 flex items-center text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300 futuristic:hover:text-cyan-300"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi la utilizatori
      </button>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-6">
        Editează Utilizator: {user.name || user.username || user.email}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Date Utilizator */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 rounded-lg p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('edit.date_utilizator')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.username')}</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.nume')}</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder={t('edit.nume_de_familie')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.prenume')}</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder={t('edit.prenume')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.telefon')}</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="+40 7XX XXX XXX"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.rol')}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="user">{t('edit.utilizator')}</option>
                  <option value="admin">{t('edit.administrator')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">{t('edit.status')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="active">{t('edit.activ')}</option>
                  <option value="inactive">{t('edit.inactiv')}</option>
                  <option value="suspended">{t('edit.suspendat')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">
                Parolă nouă (lasă gol pentru a nu schimba)
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors"
              >
                Salvează Modificările
              </button>

              <button
                type="button"
                onClick={() => router.push(`/admin/bookings?user_email=${user.email}`)}
                className="flex-1 bg-purple-600 dark:bg-purple-700 futuristic:bg-cyan-600 text-white px-4 py-2 rounded hover:bg-purple-700 dark:hover:bg-purple-600 futuristic:hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Vezi Programările
              </button>
            </div>
          </form>
        </div>

        {/* Documente */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 rounded-lg p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{t('edit.toate_documentele')}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">
              {documents.length} document{documents.length !== 1 ? 'e' : ''}
            </span>
          </div>
          
          {/* Upload Document */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg p-6 text-center mb-4">
            <input
              type="file"
              id="doc-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <label
              htmlFor="doc-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
                {uploadingDoc ? 'Se încarcă...' : 'Click pentru a încărca document'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50 mt-1">
                PDF, JPG, PNG (max 10MB)
              </p>
            </label>
          </div>

          {/* Lista documente */}
          {documents.length > 0 ? (
            <div className="space-y-3">
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
                          {doc.original_name || doc.file_name || doc.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
                          {new Date(doc.uploaded_at).toLocaleDateString('ro-RO')} • 
                          {' '}{doc.upload_source || 'Documente profil'}
                          {doc.verified_by_admin && (
                            <span className="ml-2 text-green-600 dark:text-green-400">✓ Verificat</span>
                          )}
                        </p>
                        {doc.source_type && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Tip: {doc.doc_type || doc.type} • 
                            {' '}{doc.source_type === 'booking' ? 'Programare' : 'Profil'}
                          </p>
                        )}
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
          ) : (
            <p className="text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50 text-center py-4">
              Nu există documente încărcate
            </p>
          )}
        </div>
      </div>

      {/* Modal Preview Document */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/95 rounded-lg max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
                {previewDoc.original_name || previewDoc.file_name || previewDoc.filename}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-purple-800/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400 futuristic:text-cyan-200" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900 futuristic:bg-purple-950/50">
              {previewDoc.mime_type?.includes('image') || previewDoc.file_name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <div className="flex items-center justify-center h-full">
                  <img 
                    src={previewDoc.previewUrl}
                    alt={previewDoc.original_name || previewDoc.file_name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : previewDoc.mime_type?.includes('pdf') || previewDoc.file_name?.match(/\.pdf$/i) ? (
                <iframe
                  src={previewDoc.previewUrl}
                  className="w-full h-full min-h-[600px] rounded-lg"
                  title={previewDoc.original_name || previewDoc.file_name}
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