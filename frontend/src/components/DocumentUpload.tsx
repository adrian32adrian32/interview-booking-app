'use client';

import { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';

interface DocumentUploadProps {
  bookingId?: number;
  userId?: number;
  onUploadComplete?: () => void;
  documents?: any[];
  canDelete?: boolean;
}

export default function DocumentUpload({ 
  bookingId, 
  userId, 
  onUploadComplete,
  documents = [],
  canDelete = true
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState(documents);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Verifică dimensiunea fișierului
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fișierul este prea mare. Maxim 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'document');
    
    // Adaugă bookingId sau userId dacă există
    if (bookingId) {
      formData.append('bookingId', bookingId.toString());
    }
    if (userId) {
      formData.append('userId', userId.toString());
    }

    try {
      setUploading(true);
      console.log('Uploading file:', file.name);
      
      const response = await axios.post('/upload/document', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
          console.log('Upload progress:', percentCompleted + '%');
        }
      });
      
      console.log('Upload response:', response.data);
      
      if (response.data.success) {
        toast.success('Document încărcat cu succes');
        setUploadedDocs([...uploadedDocs, response.data.document]);
        
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Eroare la încărcarea documentului');
      }
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('Sigur doriți să ștergeți acest document?')) return;
    
    try {
      await axios.delete(`/upload/document/${docId}`);
      setUploadedDocs(uploadedDocs.filter(doc => doc.id !== docId));
      toast.success('Document șters');
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      toast.error('Eroare la ștergerea documentului');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
          Documente
        </label>
        
        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 futuristic:hover:border-purple-400/50 transition-colors bg-gray-50 dark:bg-gray-700/50 futuristic:bg-purple-900/20 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-purple-900/30">
          <div className="flex flex-col items-center">
            <Upload className={`w-6 h-6 ${uploading ? 'text-blue-500 dark:text-blue-400 futuristic:text-cyan-400 animate-pulse' : 'text-gray-400 dark:text-gray-500 futuristic:text-purple-400'}`} />
            <span className="mt-1 text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">
              {uploading ? 'Se încarcă...' : 'Click pentru upload (max 10MB)'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 futuristic:text-cyan-300/50 mt-1">
              PDF, JPG, JPEG, PNG
            </span>
          </div>
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={uploading}
          />
        </label>
      </div>

      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-200/70">Documente încărcate:</p>
          {uploadedDocs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 futuristic:bg-purple-800/20 rounded border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
              <div className="flex items-center flex-1">
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 futuristic:text-purple-400 mr-2" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">{doc.original_name || doc.filename}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
                    {new Date(doc.uploaded_at).toLocaleDateString('ro-RO')}
                  </p>
                </div>
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-600 dark:text-red-400 futuristic:text-red-400 hover:text-red-800 dark:hover:text-red-300 futuristic:hover:text-red-300 ml-2 p-1"
                  title="Șterge document"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}