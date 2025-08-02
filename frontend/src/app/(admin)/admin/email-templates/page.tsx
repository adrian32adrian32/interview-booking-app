'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import {
  Mail, Plus, Edit, Trash2, Eye, Send, CheckCircle,
  XCircle, Clock, Users, FileText, AlertCircle,
  Code, Type, Variable, TestTube, BarChart, Settings
} from 'lucide-react';
import { toastService } from '@/services/toastService';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  template_html: string;
  template_text: string;
  variables: string[];
  category: string;
  is_active: boolean;
  send_copy_to_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailStats {
  overall: {
    total_emails: number;
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
  };
  byTemplate: Array<{
    template_name: string;
    count: number;
    sent: number;
    failed: number;
  }>;
}

export default function EmailTemplatesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState<'html' | 'text'>('html');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/emails/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      toastService.error('error.loading');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/emails/statistics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data.statistics);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePreview = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    router.push(`/admin/email-templates/manage?edit=${template.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('email_templates.confirmDelete'))) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/emails/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      toastService.success('success.generic', t('email_templates.deleteSuccess'));
      fetchTemplates();
    } catch (error: any) {
      toastService.error(error.message || t('email_templates.deleteError'));
    }
  };

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) {
      toastService.error('error.generic', t('email_templates.enterEmail'));
      return;
    }

    setSendingTest(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/emails/templates/${selectedTemplate.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testEmail })
      });

      if (!response.ok) throw new Error('Failed to send test');

      toastService.success('success.generic', t('email_templates.testSentTo').replace('{email}', testEmail));
      setTestEmail('');
    } catch (error) {
      toastService.error('error.generic', t('email_templates.testError'));
    } finally {
      setSendingTest(false);
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/emails/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !template.is_active })
      });

      if (!response.ok) throw new Error('Failed to update');

      toastService.success(t('email_templates.templateStatus').replace('{status}', !template.is_active ? t('email_templates.activated') : t('email_templates.deactivated')));
      fetchTemplates();
    } catch (error) {
      toastService.error('error.generic', t('email_templates.updateError'));
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'booking': return <FileText className="w-4 h-4" />;
      case 'reminder': return <Clock className="w-4 h-4" />;
      case 'admin': return <Users className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'booking': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'reminder': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
    }
  };

  const filteredTemplates = categoryFilter === 'all' 
    ? templates 
    : templates.filter(t => t.category === categoryFilter);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('email_templates.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('email_templates.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <BarChart className="h-4 w-4 mr-2" />
            {t('email_templates.statistics')}
          </button>
          <button
            onClick={() => router.push('/admin/email-templates/manage')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('email_templates.manageTemplates')}
          </button>
          <button
            onClick={() => router.push('/admin/email-templates/bulk')}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Users className="h-4 w-4 mr-2" />
            {t('email_templates.bulkEmail')}
          </button>
          <button
            onClick={() => router.push('/admin/email-templates/new')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('email_templates.newTemplate')}
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && stats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium mb-4">{t('email_templates.statsTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.overall.total_emails}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('email_templates.totalSent')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.overall.sent}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('email_templates.delivered')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{stats.overall.failed}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('email_templates.failed')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.overall.opened}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('email_templates.opened')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.overall.clicked}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('email_templates.clicks')}</p>
            </div>
          </div>
          
          <h4 className="font-medium mb-2">{t('email_templates.byTemplate')}</h4>
          <div className="space-y-2">
            {stats.byTemplate.map(template => (
              <div key={template.template_name} className="flex justify-between items-center text-sm">
                <span className="font-medium">{template.template_name}</span>
                <div className="flex gap-4">
                  <span className="text-gray-600">{t('common.total')}: {template.count}</span>
                  <span className="text-green-600">{t('email_templates.sent')}: {template.sent}</span>
                  <span className="text-red-600">{t('email_templates.failed')}: {template.failed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            categoryFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('email_templates.allTemplates')} ({templates.length})
        </button>
        <button
          onClick={() => setCategoryFilter('booking')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            categoryFilter === 'booking'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('email_templates.bookings')} ({templates.filter(t => t.category === 'booking').length})
        </button>
        <button
          onClick={() => setCategoryFilter('reminder')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            categoryFilter === 'reminder'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('email_templates.reminders')} ({templates.filter(t => t.category === 'reminder').length})
        </button>
        <button
          onClick={() => setCategoryFilter('admin')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            categoryFilter === 'admin'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('email_templates.admin')} ({templates.filter(t => t.category === 'admin').length})
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {template.name}
                  {!template.is_active && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                      {t('email_templates.inactive')}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getCategoryColor(template.category)}`}>
                  {getCategoryIcon(template.category)}
                  {t(`email_templates.category.${template.category}`)}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('email_templates.availableVariables')}:</p>
              <div className="flex flex-wrap gap-1">
                {template.variables.map(variable => (
                  <span
                    key={variable}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                  >
                    {`{{${variable}}}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(template)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  title={t('email_templates.preview')}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  title={t('common.edit')}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => handleToggleActive(template)}
                className={`p-2 rounded-full ${
                  template.is_active 
                    ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={template.is_active ? t('email_templates.active') : t('email_templates.inactive')}
              >
                {template.is_active ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold dark:text-white">{t('email_templates.previewTitle')}: {selectedTemplate.name}</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('email_templates.subject')}
                </label>
                <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">{selectedTemplate.subject}</p>
              </div>

              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setActiveTab('html')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'html'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Code className="h-4 w-4 inline mr-2" />
                    HTML
                  </button>
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'text'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Type className="h-4 w-4 inline mr-2" />
                    Text
                  </button>
                </div>

                <div className="border dark:border-gray-700 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                  {activeTab === 'html' ? (
                    <iframe
                      srcDoc={selectedTemplate.template_html}
                      className="w-full h-full bg-white"
                      title={t('email_templates.emailPreview')}
                    />
                  ) : (
                    <pre className="p-4 bg-gray-50 dark:bg-gray-900 h-full overflow-auto whitespace-pre-wrap text-sm">
                      {selectedTemplate.template_text}
                    </pre>
                  )}
                </div>
              </div>

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email_templates.sendTestTo')}:
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest || !testEmail}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingTest ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t('email_templates.sendTest')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}