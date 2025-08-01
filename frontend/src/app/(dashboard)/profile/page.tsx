'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { User, Mail, Shield, Save, Phone, Camera, Bell, BellOff, Upload, Loader2, FileText, Eye, Download, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toastService } from '@/services/toastService';
import axios from '@/lib/axios';

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });

  const [notifications, setNotifications] = useState({
    bookingConfirmed: true,
    bookingReminder: true,
    bookingCancelled: true,
    documentStatus: true,
    marketing: false,
  });

  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        email: user.email || ''
      });
      setAvatarUrl(user.avatar_url || '');
      setNotifications(user.notification_preferences || notifications);
    }
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/upload/my-documents');
      if (response.data.success) {
        setDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put('/users/profile', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        notification_preferences: notifications
      });

      if (response.data.success) {
        toastService.success('success.generic', t('profile.success.profileUpdated'));
        if (refreshUser) {
          refreshUser();
        }
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toastService.error('error.generic', error.response?.data?.message || t('profile.errors.profileUpdate'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toastService.error('error.generic', t('profile.errors.avatarSize'));
      return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toastService.error('error.generic', t('profile.errors.avatarType'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    handleAvatarUpload(file);
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await axios.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setAvatarUrl(response.data.avatarUrl);
        setAvatarPreview('');
        toastService.success('success.generic', t('profile.success.avatarUpdated'));
        if (refreshUser) {
          refreshUser();
        }
      }
    } catch (error: any) {
      toastService.error('error.generic', error.response?.data?.message || t('profile.errors.avatarUpload'));
      setAvatarPreview('');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', 'identity');

    setUploadingDoc(true);
    try {
      const response = await axios.post('/upload/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toastService.success('success.generic', t('profile.success.documentUploaded'));
        fetchDocuments();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toastService.error('error.generic', t('profile.errors.documentUpload'));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm(t('profile.deleteDocumentConfirm'))) return;

    try {
      await axios.delete(`/upload/document/${docId}`);
      toastService.success('success.generic', t('profile.success.documentDeleted'));
      fetchDocuments();
    } catch (error) {
      toastService.error('error.generic', t('profile.errors.documentDelete'));
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
      link.setAttribute('download', doc.original_name || doc.file_name || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toastService.success('success.generic', t('profile.success.documentDownloaded'));
    } catch (error) {
      toastService.error('error.generic', t('profile.errors.documentDownload'));
    }
  };

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (avatarUrl) return `${process.env.NEXT_PUBLIC_API_URL}${avatarUrl}`;
    return null;
  };

  const getInitials = () => {
    const first = formData.first_name?.charAt(0) || '';
    const last = formData.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-6">
        {t('profile.title')}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 futuristic:bg-purple-800/30 flex items-center justify-center">
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()!}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-gray-600 dark:text-gray-400 futuristic:text-purple-400">
                    {getInitials()}
                  </span>
                )}
              </div>

              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white p-2 rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
                {formData.first_name && formData.last_name
                  ? `${formData.first_name} ${formData.last_name}`
                  : user?.email
                }
              </h2>
              <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
                {user?.role === 'admin' ? t('profile.administrator') : t('profile.user')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50 mt-1">
                {t('profile.changeAvatar')}
              </p>
            </div>
          </div>
        </div>

        {/* Informații personale */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            {t('profile.personalInfo')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                {t('profile.lastName')}
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder={t('profile.lastNamePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                {t('profile.firstName')}
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder={t('profile.firstNamePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
              <Phone className="inline h-4 w-4 mr-1" />
              {t('profile.phone')}
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('profile.phonePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-white dark:bg-gray-700 futuristic:bg-purple-900/30 text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400"
            />
          </div>
        </div>

        {/* Informații cont */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            {t('profile.accountInfo')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                {t('profile.email')}
              </label>
              <input
                type="email"
                value={formData.email}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg bg-gray-100 dark:bg-gray-700/50 futuristic:bg-purple-900/20 text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80 mb-1">
                {t('profile.role')}
              </label>
              <div className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 futuristic:text-purple-400" />
                <span className="text-gray-700 dark:text-gray-300 futuristic:text-cyan-200">
                  {user?.role === 'admin' ? t('profile.administrator') : t('profile.user')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Preferințe Notificări */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            {t('profile.notificationPreferences')}
          </h2>

          <div className="space-y-4">
            {[
              { key: 'bookingConfirmed', label: t('profile.notifications.bookingConfirmed'), desc: t('profile.notifications.bookingConfirmedDesc') },
              { key: 'bookingReminder', label: t('profile.notifications.bookingReminder'), desc: t('profile.notifications.bookingReminderDesc') },
              { key: 'bookingCancelled', label: t('profile.notifications.bookingCancelled'), desc: t('profile.notifications.bookingCancelledDesc') },
              { key: 'documentStatus', label: t('profile.notifications.documentStatus'), desc: t('profile.notifications.documentStatusDesc') },
              { key: 'marketing', label: t('profile.notifications.marketing'), desc: t('profile.notifications.marketingDesc') },
            ].map((item) => (
              <div key={item.key} className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id={item.key}
                    type="checkbox"
                    checked={notifications[item.key as keyof typeof notifications]}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      [item.key]: e.target.checked
                    })}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor={item.key} className="text-sm font-medium text-gray-700 dark:text-gray-300 futuristic:text-cyan-200/80">
                    {item.label}
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documente */}
        <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/20 rounded-lg shadow dark:shadow-gray-700/50 futuristic:shadow-purple-500/20 p-6 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 futuristic:text-cyan-100 mb-4 flex items-center justify-between">
            <span className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {t('profile.documents')}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/70">
              {documents.length} {documents.length !== 1 ? t('profile.documentsCount') : t('profile.documentCount')}
            </span>
          </h2>

          {/* Upload Document */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 futuristic:border-purple-500/30 rounded-lg p-6 text-center mb-4">
            <input
              ref={docInputRef}
              type="file"
              className="hidden"
              onChange={handleDocumentUpload}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              disabled={uploadingDoc}
              className="flex flex-col items-center justify-center w-full"
            >
              {uploadingDoc ? (
                <Loader2 className="w-8 h-8 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 futuristic:text-purple-400" />
              )}
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 futuristic:text-cyan-300/70">
                {uploadingDoc ? t('profile.uploading') : t('profile.uploadDocument')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 futuristic:text-cyan-300/50 mt-1">
                {t('profile.fileTypes')}
              </p>
            </button>
          </div>

          {/* Lista documente */}
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 futuristic:border-purple-500/30 rounded bg-gray-50 dark:bg-gray-700/50 futuristic:bg-purple-800/20">
                  <div className="flex items-center flex-1">
                    <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 futuristic:text-purple-400 mr-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 futuristic:text-cyan-100">
                        {doc.original_name || doc.file_name || doc.filename}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50">
                        {new Date(doc.uploaded_at).toLocaleDateString(
                          language === 'ro' ? 'ro-RO' : language === 'en' ? 'en-US' : `${language}-${language.toUpperCase()}`
                        )} - {doc.upload_source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="text-blue-600 dark:text-blue-400 futuristic:text-cyan-400 hover:text-blue-800 dark:hover:text-blue-300"
                      title={t('documents.preview')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                      title={t('documents.download')}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      title={t('documents.delete')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 futuristic:text-cyan-300/50 text-center py-4">
              {t('profile.noDocuments')}
            </p>
          )}
        </div>

        {/* Buton salvare */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 futuristic:focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-5 w-5 mr-2" />
          {loading ? t('profile.saving') : t('profile.saveChanges')}
        </button>
      </form>

      {/* Modal Preview Document */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 futuristic:bg-purple-900/95 rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
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
            <div className="flex-1 overflow-auto p-4">
              {previewDoc.mime_type?.includes('image') || previewDoc.file_name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${previewDoc.file_url || `/uploads/documents/${previewDoc.filename}`}`}
                  alt={previewDoc.original_name || previewDoc.file_name}
                  className="max-w-full mx-auto"
                />
              ) : previewDoc.mime_type?.includes('pdf') || previewDoc.file_name?.match(/\.pdf$/i) ? (
                <iframe
                  src={`${process.env.NEXT_PUBLIC_API_URL}${previewDoc.file_url || `/uploads/documents/${previewDoc.filename}`}`}
                  className="w-full h-[70vh]"
                  title={previewDoc.original_name || previewDoc.file_name}
                />
              ) : (
                <div className="text-center py-20">
                  <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 futuristic:text-purple-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 futuristic:text-cyan-200">
                    {t('profile.previewNotAvailable')}
                  </p>
                  <button
                    onClick={() => {
                      handleDownload(previewDoc);
                      setPreviewDoc(null);
                    }}
                    className="mt-4 bg-blue-600 dark:bg-blue-700 futuristic:bg-purple-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 futuristic:hover:bg-purple-700 transition-colors"
                  >
                    {t('profile.downloadToView')}
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
