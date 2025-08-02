'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Upload, FileText, X } from 'lucide-react';
import axios from '@/lib/axios';
import { toastService } from '@/services/toastService';
import { API_URL } from '@/lib/axios';

interface DocumentUploadProps {
  bookingId?: number;
  userId?: number;
  onUploadComplete?: () => void;
  documents?: any[];
  canDelete?: boolean;
  // Props noi pentru pagina de documente
  uploadUrl?: string;
  acceptedFileTypes?: string;
  documentType?: string;
  onUploadStart?: () => void;
}

export default function DocumentUpload({ 
  bookingId, 
  userId, 
  onUploadComplete,
  documents = [],
  canDelete = true,
  uploadUrl,
  acceptedFileTypes,
  documentType,
  onUploadStart
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState(documents);

  // Actualizează lista de documente când se schimbă props-ul documents
  useEffect(() => {
    setUploadedDocs(documents);
  }, [documents]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Verifică dimensiunea fișierului (50MB pentru toate tipurile)
    if (file.size > 50 * 1024 * 1024) {
      toastService.error('error.fileTooLarge');
      return;
    }

    // Pentru pagina de documente, verifică dacă este selectat un tip
    if (uploadUrl && !documentType) {
      toastService.error('error.generic', 'Te rog selectează mai întâi tipul documentului');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    // Adaugă tipul documentului dacă există
    if (documentType) {
      formData.append('docType', documentType);
    }
    
    // Adaugă bookingId dacă există
    if (bookingId) {
      formData.append('bookingId', bookingId.toString());
    }

    try {
      setUploading(true);
      if (onUploadStart) onUploadStart();
      
      console.log('Uploading file:', file.name);
      console.log('Booking ID:', bookingId);
      
      // Determină URL-ul pentru upload
      let url = '';
      if (uploadUrl) {
        // Pentru pagina de documente - folosește uploadUrl
        url = uploadUrl.startsWith('/') ? uploadUrl : `/${uploadUrl}`;
      } else if (bookingId) {
        // Pentru booking - folosește endpoint-ul de booking
        url = `/bookings/${bookingId}/documents`;
      } else {
        // Default - documente generale
        url = '/upload/document';
      }
      
      console.log('Upload URL:', url);
      
      const response = await axios.post(url, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('Upload progress:', percentCompleted + '%');
          }
        }
      });
      
      console.log('Upload response:', response.data);
      
      if (response.data.success) {
        toastService.success('success.generic', 'Document încărcat cu succes');
        
        // Actualizează lista locală de documente
        if (response.data.document) {
          setUploadedDocs(prev => [...prev, response.data.document]);
        }
        
        // IMPORTANT: Apelează callback-ul pentru a reîncărca documentele din server
        if (onUploadComplete) {
          console.log('Calling onUploadComplete callback...');
          setTimeout(() => {
            onUploadComplete();
          }, 100); // Mică întârziere pentru a se asigura că serverul a procesat
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Eroare la încărcarea documentului';
      toastService.error('error.generic', errorMessage);
    } finally {
      setUploading(false);
      // Reset input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('Sigur doriți să ștergeți acest document?')) return;
    
    try {
      // Pentru documente de booking
      if (bookingId) {
        await axios.delete(`/bookings/${bookingId}/documents/${docId}`);
      } else {
        // Pentru documente generale
        await axios.delete(`/upload/document/${docId}`);
      }
      
      // Actualizează lista locală
      setUploadedDocs(prev => prev.filter(doc => doc.id !== docId));
      toastService.success('success.generic', 'Document șters');
      
      // Apelează callback pentru a reîncărca din server
      if (onUploadComplete) {
        console.log('Calling onUploadComplete after delete...');
        setTimeout(() => {
          onUploadComplete();
        }, 100);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toastService.error('error.deleting');
    }
  };

  // Determină ce tipuri de fișiere să accepte
  const getAcceptTypes = () => {
    if (acceptedFileTypes) {
      return acceptedFileTypes;
    }
    // Default - acceptă imagini și PDF
    return ".pdf,.jpg,.jpeg,.png";
  };

  // Determină textul pentru label
  const getLabelText = () => {
    if (documentType) {
      return `Încarcă ${documentType}`;
    }
    return uploading ? 'Se încarcă...' : 'Click pentru upload (max 50MB)';
  };

  return (
    <div className="space-y-4">
      <div>
        {!uploadUrl && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-2">
            Documente
          </label>
        )}
        
        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 futuristic:hover:border-purple-400/50 transition-colors bg-gray-50 dark:bg-gray-700/50 futuristic:bg-purple-900/20 hover:bg-gray-100 dark:hover:bg-gray-700 futuristic:hover:bg-purple-900/30">
          <div className="flex flex-col items-center">
            <Upload className={`w-6 h-6 ${uploading ? 'text-blue-500 dark:text-blue-400 futuristic:text-cyan-400 animate-pulse' : 'text-gray-400 dark:text-gray-500 futuristic:text-purple-400'}`} />
            <span className="mt-1 text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">
              {getLabelText()}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 futuristic:text-cyan-300/50 mt-1">
              {acceptedFileTypes === '*' ? 'Orice tip de fișier' : 'PDF, JPG, JPEG, PNG'}
            </span>
          </div>
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept={getAcceptTypes()}
            disabled={uploading || (uploadUrl && !documentType)}
          />
        </label>
        
        {uploadUrl && !documentType && (
          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            ⚠️ Selectează mai întâi tipul documentului din lista de mai sus
          </p>
        )}
      </div>

      {/* Debug info - șterge după ce funcționează */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          BookingId: {bookingId}, Docs count: {uploadedDocs.length}
        </div>
      )}
    </div>
  );
}