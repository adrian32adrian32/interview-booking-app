'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { FileText, Upload, Download, Trash2, Eye, X } from 'lucide-react';
import axios from '@/lib/axios';
import { toastService } from '@/services/toastService';

interface Document {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
  source: string;
  booking_ref?: number;
  file_url?: string;
}

export default function DocumentsPage() {
  const { t, language } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/upload/my-documents');
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toastService.error('error.loading', t('documents.errors.loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await axios.get(`/upload/download/${doc.id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toastService.success('success.generic', t('documents.success.downloaded'));
    } catch (error) {
      toastService.error('error.downloading', t('documents.errors.downloading'));
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm(t('documents.deleteConfirm'))) return;
    
    try {
      await axios.delete(`/upload/document/${docId}`);
      toastService.success('success.generic', t('documents.success.deleted'));
      fetchDocuments();
    } catch (error) {
      toastService.error('error.deleting', t('documents.errors.deleting'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);

    try {
      const response = await axios.post('/upload/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toastService.success('success.generic', t('documents.success.uploaded'));
        fetchDocuments();
        setShowUploadOptions(false);
        // Reset input
        e.target.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      // Afișează mesajul de eroare specific de la server
      const errorMessage = error.response?.data?.message || error.response?.data?.error || t('documents.errors.uploading');
      toastService.error('error.uploading', errorMessage);
    }
  };

  const canPreview = (mimeType: string) => {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('documents.title')}
        </h1>
        <button
          onClick={() => setShowUploadOptions(!showUploadOptions)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="h-5 w-5 mr-2" />
          {t('documents.uploadDocuments')}
        </button>
      </div>

      {showUploadOptions && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">{t('documents.identityCard')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('documents.identityCardDesc')}</p>
            <input
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => handleFileUpload(e, 'identity')}
              id="identity-upload"
            />
            <label
              htmlFor="identity-upload"
              className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
            >
              {t('documents.upload')}
            </label>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">{t('documents.cv')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('documents.cvDesc')}</p>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileUpload(e, 'cv')}
              id="cv-upload"
            />
            <label
              htmlFor="cv-upload"
              className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
            >
              {t('documents.upload')}
            </label>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">{t('documents.otherDocuments')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('documents.otherDocumentsDesc')}</p>
            <input
              type="file"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'other')}
              id="other-upload"
            />
            <label
              htmlFor="other-upload"
              className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
            >
              {t('documents.upload')}
            </label>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
          <FileText className="mx-auto h-12 w-12 mb-4 text-gray-400" />
          <p>{t('documents.noDocuments')}</p>
          <button
            onClick={() => setShowUploadOptions(true)}
            className="inline-block mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            {t('documents.uploadDocumentsPrompt')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('documents.documentName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('documents.source')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('documents.date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('documents.size')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('documents.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                          {doc.original_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {doc.mime_type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {doc.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(doc.uploaded_at).toLocaleDateString(
                      language === 'ro' ? 'ro-RO' : language === 'en' ? 'en-US' : `${language}-${language.toUpperCase()}`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {canPreview(doc.mime_type) && (
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          title={t('documents.preview')}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title={t('documents.download')}
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title={t('documents.delete')}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal pentru previzualizare */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {previewDoc.original_name}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              {previewDoc.mime_type.startsWith('image/') ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${previewDoc.file_url || `/uploads/documents/${previewDoc.filename}`}`}
                  alt={previewDoc.original_name}
                  className="max-w-full h-auto mx-auto"
                />
              ) : previewDoc.mime_type === 'application/pdf' ? (
                <iframe
                  src={`${process.env.NEXT_PUBLIC_API_URL}${previewDoc.file_url || `/uploads/documents/${previewDoc.filename}`}`}
                  className="w-full h-[70vh]"
                  title={previewDoc.original_name}
                />
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">
                  {t('documents.fileTypeNotPreviewable')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
