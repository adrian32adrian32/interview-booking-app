import React, { useState } from 'react';
import { Eye, Download, Trash2, FileText, Image as ImageIcon, X } from 'lucide-react';
import { API_URL } from '@/lib/axios';

interface Document {
  id: number;
  type: string;
  filename: string;
  original_name: string;
  file_url: string;
  file_name: string;
  size: number;
  mime_type: string;
  status: string;
  uploaded_at: string;
  upload_source?: string;
}

interface DocumentsListProps {
  documents: Document[];
  onDelete?: (id: number) => void;
  onRefresh?: () => void;
}

export default function DocumentsList({ documents, onDelete, onRefresh }: DocumentsListProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<number | null>(null);

  const handleDownload = async (doc: Document) => {
    try {
      setLoading(doc.id);
      
      const response = await fetch(`${API_URL}/api/upload/download/${doc.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_name || doc.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Eroare la descărcarea documentului');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sigur vrei să ștergi acest document?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/upload/document/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      if (onDelete) onDelete(id);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Eroare la ștergerea documentului');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-400" />;
    }
    return <FileText className="w-8 h-8 text-gray-400" />;
  };

  const getDocumentUrl = (doc: Document) => {
    if (doc.file_url?.startsWith('http')) {
      return doc.file_url;
    }
    return `${API_URL}${doc.file_url || `/uploads/documents/${doc.filename}`}`;
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Nu ai documente încărcate încă.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {documents.map((doc) => {
          const isImage = doc.mime_type?.startsWith('image/');
          const documentUrl = getDocumentUrl(doc);
          
          return (
            <div key={doc.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-750 transition-colors">
              <div className="flex items-center space-x-4">
                {/* Thumbnail/Icon */}
                <div className="flex-shrink-0">
                  {isImage ? (
                    <div className="w-16 h-16 bg-gray-700 rounded overflow-hidden">
                      <img 
                        src={documentUrl}
                        alt={doc.original_name}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewUrl(documentUrl)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center">
                      {getFileIcon(doc.mime_type)}
                    </div>
                  )}
                </div>
                
                {/* Document Info */}
                <div className="flex-grow">
                  <h4 className="font-medium text-white">{doc.original_name || doc.file_name}</h4>
                  <p className="text-sm text-gray-400">
                    {doc.type === 'identity' && 'Carte de Identitate'}
                    {doc.type === 'selfie' && 'Selfie cu Buletinul'}
                    {doc.type === 'cv' && 'CV'}
                    {doc.type === 'other' && 'Alt document'}
                    {' • '}
                    {new Date(doc.uploaded_at).toLocaleDateString('ro-RO')}
                    {doc.upload_source && ` • ${doc.upload_source}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(doc.size / 1024 / 1024).toFixed(2)} MB
                    {doc.mime_type && ` • ${doc.mime_type.split('/')[1].toUpperCase()}`}
                    {doc.status && ` • ${doc.status === 'verified' ? '✓ Verificat' : 'În așteptare'}`}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-2">
                {isImage && (
                  <button
                    onClick={() => setPreviewUrl(documentUrl)}
                    className="p-2 text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Vizualizează"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                )}
                
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={loading === doc.id}
                  className="p-2 text-green-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Descarcă"
                >
                  <Download className={`w-5 h-5 ${loading === doc.id ? 'animate-pulse' : ''}`} />
                </button>
                
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Șterge"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewUrl(null);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            
            <img 
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[90vh] w-auto h-auto mx-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}