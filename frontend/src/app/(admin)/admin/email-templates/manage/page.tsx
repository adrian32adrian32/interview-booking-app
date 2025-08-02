// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import {
  Mail, Plus, Edit, Trash2, Eye, Copy, Check,
  Search, Filter, Code, FileText, Save, X,
  Send, TestTube, BarChart3
} from 'lucide-react';
import { toastService } from '@/services/toastService';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  template_html: string;
  template_text: string;
  category: string;
  variables: any; // JSONB
  is_active: boolean;
  send_copy_to_admin: boolean;
  created_at: string;
  updated_at: string;
}

export default function EmailTemplatesManager() {
  const { t } = useLanguage();
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    subject: '',
    template_text: '',
    template_html: '',
    category: 'general',
    variables: [] as string[],
    is_active: true,
    send_copy_to_admin: false
  });

  const categories = [
    { value: 'system', label: t('email_templates.manage.categories.system') },
    { value: 'booking', label: t('email_templates.manage.categories.booking') },
    { value: 'reminder', label: t('email_templates.manage.categories.reminder') },
    { value: 'report', label: t('email_templates.manage.categories.report') },
    { value: 'marketing', label: t('email_templates.manage.categories.marketing') },
    { value: 'general', label: t('email_templates.manage.categories.general') }
  ];

  const availableVariables = [
    'first_name', 'last_name', 'email', 'username',
    'client_name', 'client_email', 'interview_date', 
    'interview_time', 'booking_id', 'reset_link',
    'month', 'content', 'report_content'
  ];

  useEffect(() => {
    fetchTemplates();
    // Setează email-ul de test cu cel din localStorage
    const userEmail = localStorage.getItem('userEmail') || '';
    setTestEmail(userEmail);
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/emails/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data.templates || data || []);
    } catch (error) {
      toastService.error('error.loading');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      subject: template.subject,
      template_text: template.template_text || '',
      template_html: template.template_html || '',
      category: template.category,
      variables: Array.isArray(template.variables) ? template.variables : [],
      is_active: template.is_active,
      send_copy_to_admin: template.send_copy_to_admin
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = selectedTemplate 
        ? `/api/emails/templates/${selectedTemplate.id}`
        : '/api/emails/templates';
      
      const method = selectedTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editForm,
          variables: editForm.variables // Will be converted to JSONB in backend
        })
      });
      
      if (!response.ok) throw new Error('Failed to save template');
      
      toastService.success('success.generic', t('email_templates.manage.templateSaved').replace('{action}', selectedTemplate ? t('email_templates.manage.updated') : t('email_templates.manage.created')));
      fetchTemplates();
      setIsEditing(false);
      setSelectedTemplate(null);
    } catch (error) {
      toastService.error('error.saving');
    }
  };

  const handleDelete = async (id: number) => {
    const template = templates.find(temp => temp.id === id);
    
    // Protejează template-urile esențiale
    const protectedTemplates = ['booking_confirmation', 'reminder_24h', 'reminder_1h'];
    if (template && protectedTemplates.includes(template.name)) {
      toastService.error('error.generic', t('email_templates.manage.protectedTemplate'));
      return;
    }
    
    if (!confirm(t('email_templates.manage.confirmDelete'))) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/emails/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete template');
      
      toastService.success('success.generic', t('email_templates.manage.deleteSuccess'));
      fetchTemplates();
    } catch (error) {
      toastService.error('error.deleting');
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !selectedTemplate) {
      toastService.error('error.generic', t('email_templates.manage.enterTestEmail'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/emails/templates/${selectedTemplate.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientEmail: testEmail,
          variables: {
            first_name: 'Test',
            last_name: 'User',
            client_name: 'Test User',
            interview_date: new Date().toLocaleDateString('ro-RO'),
            interview_time: '10:00',
            email: testEmail
          }
        })
      });

      if (!response.ok) throw new Error('Failed to send test email');

      toastService.success('success.generic', t('email_templates.manage.testEmailSent'));
      setShowTestEmail(false);
    } catch (error) {
      toastService.error('error.generic', t('email_templates.manage.testEmailError'));
    }
  };

  const handleDuplicate = (template: EmailTemplate) => {
    setEditForm({
      name: `${template.name}_copy`,
      subject: template.subject,
      template_text: template.template_text || '',
      template_html: template.template_html || '',
      category: template.category,
      variables: Array.isArray(template.variables) ? template.variables : [],
      is_active: true,
      send_copy_to_admin: template.send_copy_to_admin
    });
    setSelectedTemplate(null);
    setIsEditing(true);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  };

  const updateVariables = () => {
    const textVars = extractVariables(editForm.template_text);
    const htmlVars = extractVariables(editForm.template_html);
    const allVars = Array.from(new Set([...textVars, ...htmlVars]));
    setEditForm(prev => ({ ...prev, variables: allVars }));
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('email_templates.manage.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('email_templates.manage.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/email-templates/bulk')}
            className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Send className="h-4 w-4 mr-2" />
            {t('email_templates.manage.bulkEmail')}
          </button>
          <button
            onClick={() => router.push('/admin/email-history')}
            className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('email_templates.manage.history')}
          </button>
          <button
            onClick={() => {
              setEditForm({
                name: '',
                subject: '',
                template_text: '',
                template_html: '',
                category: 'general',
                variables: [],
                is_active: true,
                send_copy_to_admin: false
              });
              setSelectedTemplate(null);
              setIsEditing(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('email_templates.manage.newTemplate')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('email_templates.manage.searchPlaceholder')}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              />
            </div>
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
          >
            <option value="">{t('email_templates.manage.allCategories')}</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {template.subject}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  template.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300'
                }`}>
                  {template.is_active ? t('email_templates.active') : t('email_templates.inactive')}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                  {categories.find(c => c.value === template.category)?.label || template.category}
                </span>
                {template.send_copy_to_admin && (
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded">
                    CC Admin
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {Array.isArray(template.variables) ? template.variables.length : 0} {t('email_templates.manage.variables')}
                </span>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                {template.template_text}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                  title={t('common.edit')}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowPreview(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                  title={t('email_templates.preview')}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowTestEmail(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                  title={t('email_templates.manage.test')}
                >
                  <TestTube className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDuplicate(template)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                  title={t('email_templates.manage.duplicate')}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {selectedTemplate ? t('email_templates.manage.editTemplate') : t('email_templates.manage.newTemplateTitle')}
                </h2>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedTemplate(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('email_templates.manage.templateName')}
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('email_templates.manage.templateNamePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('email_templates.manage.category')}
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email_templates.manage.emailSubject')}
                  </label>
                  <input
                    type="text"
                    value={editForm.subject}
                    onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder={t('email_templates.manage.subjectPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email_templates.manage.textContent')}
                  </label>
                  <textarea
                    value={editForm.template_text}
                    onChange={(e) => {
                      setEditForm(prev => ({ ...prev, template_text: e.target.value }));
                      updateVariables();
                    }}
                    rows={6}
                    placeholder={t('email_templates.manage.textContentPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email_templates.manage.htmlContent')}
                  </label>
                  <textarea
                    value={editForm.template_html}
                    onChange={(e) => {
                      setEditForm(prev => ({ ...prev, template_html: e.target.value }));
                      updateVariables();
                    }}
                    rows={10}
                    placeholder={t('email_templates.manage.htmlContentPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 font-mono text-sm"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('email_templates.manage.activeTemplate')}</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.send_copy_to_admin}
                      onChange={(e) => setEditForm(prev => ({ ...prev, send_copy_to_admin: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('email_templates.manage.sendCopyToAdmin')}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email_templates.manage.detectedVariables')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {editForm.variables.map(variable => (
                      <span
                        key={variable}
                        className="px-2 py-1 text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('email_templates.manage.availableVariables')}: {availableVariables.join(', ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedTemplate(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t('email_templates.preview')}: {selectedTemplate.name}</h2>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedTemplate(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('email_templates.subject')}:</h3>
                  <p className="p-3 bg-gray-100 dark:bg-gray-700 rounded">{selectedTemplate.subject}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('email_templates.manage.textContent')}:</h3>
                  <pre className="p-3 bg-gray-100 dark:bg-gray-700 rounded whitespace-pre-wrap">
                    {selectedTemplate.template_text}
                  </pre>
                </div>

                {selectedTemplate.template_html && (
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('email_templates.manage.htmlPreview')}:</h3>
                    <div 
                      className="p-3 bg-gray-100 dark:bg-gray-700 rounded"
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.template_html }} 
                    />
                  </div>
                )}

                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('email_templates.manage.variables')}:</h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.map(variable => (
                      <code
                        key={variable}
                        className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded"
                      >
                        {`{{${variable}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestEmail && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t('email_templates.manage.sendTestEmail')}</h2>
                <button
                  onClick={() => {
                    setShowTestEmail(false);
                    setSelectedTemplate(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email_templates.manage.recipientEmail')}
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t('email_templates.manage.testEmailInfo').replace('{templateName}', selectedTemplate.name)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTestEmail(false);
                  setSelectedTemplate(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleTestEmail}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {t('email_templates.sendTest')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}