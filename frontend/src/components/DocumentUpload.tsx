'use client';

import { useState, useRef } from 'react';
import api from '@/lib/axios';

interface DocumentUploadProps {
  type: 'id_front' | 'id_back' | 'selfie' | 'other';
  label: string;
  onUploadSuccess?: () => void;
}

export default function DocumentUpload({ type, label, onUploadSuccess }: DocumentUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset mesaje anterioare
    setError('');
    setSuccess('');

    // Validare dimensiune
    if (file.size > 10 * 1024 * 1024) {
      setError('Fișierul nu poate depăși 10MB!');
      return;
    }

    // Validare tip
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Doar fișiere JPG, PNG sau PDF sunt permise!');
      return;
    }

    // Preview pentru imagini
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Upload automat
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.user.uploadDocument(file, type);

      if (response.success) {
        setSuccess('Document încărcat cu succes!');
        setUploadedFile(file.name);
        
        // NU face reload, doar actualizează lista dacă există callback
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        
        // După 3 secunde, resetează pentru următorul upload
        setTimeout(() => {
          setSuccess('');
          setPreview(null);
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 3000);
        
      } else {
        setError(response.message || 'Eroare la încărcare!');
      }
    } catch (err) {
      setError('Eroare de conexiune. Încearcă din nou!');
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-2">{label}</h3>
      
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded text-sm">
          {success}
        </div>
      )}

      {preview && (
        <div className="mb-4">
          <img 
            src={preview} 
            alt="Preview" 
            className="max-w-xs mx-auto rounded-lg shadow-md"
          />
        </div>
      )}
      
      {uploadedFile && !success && (
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-600">
            Fișier încărcat: <span className="font-medium">{uploadedFile}</span>
          </p>
        </div>
      )}

      <div className="text-center">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/jpeg,image/jpg,image/png,application/pdf"
          className="hidden"
        />
        
        <button
          onClick={triggerFileInput}
          disabled={loading}
          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
            loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Se încarcă...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploadedFile ? 'Alege alt fișier' : 'Alege fișier'}
            </>
          )}
        </button>
        
        <p className="mt-2 text-xs text-gray-500">
          JPG, PNG sau PDF până la 10MB
        </p>
      </div>
    </div>
  );
}