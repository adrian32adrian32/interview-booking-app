'use client';

import React, { useState, useRef } from 'react';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validare dimensiune
    if (file.size > maxSize) {
      toast.error(`Fișierul nu poate depăși ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    const formData = new FormData();
    // IMPORTANT: backend-ul așteaptă 'document', nu 'file'
    formData.append('document', file);
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

      if (response.data.success) {
        toast.success('Document încărcat cu succes!');
        onUploadSuccess?.();
        
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Eroare la încărcarea documentului';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && !uploading) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'buletin': return 'Buletin/CI';
      case 'selfie': return 'Selfie cu documentul';
      case 'cv': return 'CV';
      default: return 'Document';
    }
  };

  const getAcceptTypes = () => {
    if (type === 'cv') return '.pdf';
    if (type === 'buletin' || type === 'selfie') return 'image/jpeg,image/jpg,image/png';
    return accept;
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
        {getTypeLabel()}
      </h3>
      
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptTypes()}
          onChange={handleFileInput}
          className="hidden"
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Se încarcă... {uploadProgress}%
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragOver ? (
              <p className="text-blue-600 dark:text-blue-400">
                Eliberează fișierul aici...
              </p>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Trage și plasează fișierul aici sau click pentru a selecta
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Formate acceptate: {type === 'cv' ? 'PDF' : 'JPG, PNG'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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