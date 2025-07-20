'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';

interface FileUploadProps {
  type: 'buletin' | 'selfie' | 'cv' | 'other';
  onUploadSuccess?: () => void;
  maxSize?: number;
  accept?: string;
}

export default function FileUpload({ 
  type, 
  onUploadSuccess,
  maxSize = 10 * 1024 * 1024,
  accept = 'image/*,.pdf'
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post('/upload/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      toast.success('Document încărcat cu succes!');
      onUploadSuccess?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Eroare la încărcarea documentului');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [type, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept === 'image/*,.pdf' ? {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf']
    } : {
      'application/pdf': ['.pdf']
    },
    maxSize,
    multiple: false,
    disabled: uploading
  });

  const getTypeLabel = () => {
    switch (type) {
      case 'buletin': return 'Buletin/CI';
      case 'selfie': return 'Selfie cu documentul';
      case 'cv': return 'CV';
      default: return 'Document';
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">{getTypeLabel()}</h3>
      
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600">Se încarcă... {uploadProgress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Eliberează fișierul aici...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Trage și plasează fișierul aici sau click pentru a selecta
                </p>
                <p className="text-sm text-gray-500">
                  Formate acceptate: {type === 'cv' ? 'PDF' : 'JPG, PNG, GIF, PDF'}
                </p>
                <p className="text-sm text-gray-500">
                  Dimensiune maximă: {maxSize / (1024 * 1024)}MB
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
