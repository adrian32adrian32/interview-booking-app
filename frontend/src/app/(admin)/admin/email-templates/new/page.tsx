'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, X, Code, Type, Variable } from 'lucide-react';
import { toastService } from '@/services/toastService';

const TEMPLATE_CATEGORIES = [
  { value: 'booking', label: 'Programări' },
  { value: 'reminder', label: 'Remindere' },
  { value: 'admin', label: 'Admin' },
  { value: 'account', label: 'Cont' },
  { value: 'general', label: 'General' }
];

const COMMON_VARIABLES = [
  { name: 'client_name', description: 'Numele clientului' },
  { name: 'first_name', description: 'Prenumele' },
  { name: 'last_name', description: 'Numele de familie' },
  { name: 'username', description: 'Username' },
  { name: 'email', description: 'Email' },
  { name: 'interview_date', description: 'Data interviului' },
  { name: 'interview_time', description: 'Ora interviului' },
  { name: 'interview_type', description: 'Tipul interviului' },
  { name: 'booking_id', description: 'ID programare' },
  { name: 'client_email', description: 'Email client' },
  { name: 'client_phone', description: 'Telefon client' },
  { name: 'reason', description: 'Motiv (pentru anulare)' }
];

export default function NewEmailTemplatePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'html' | 'text'>('html');
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template_html: '',
    template_text: '',
    variables: [] as string[],
    category: 'general',
    is_active: true,
    send_copy_to_admin: false
  });

  const handleVariableToggle = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.includes(variable)
        ? prev.variables.filter(v => v !== variable)
        : [...prev.variables, variable]
    }));
  };

  const handleInsertVariable = (variable: string) => {
    const placeholder = `{{${variable}}}`;
    
    if (activeTab === 'html') {
      const textarea = document.getElementById('template_html') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + placeholder + text.substring(end);
        setFormData(prev => ({ ...prev, template_html: newText }));
        
        // Reset cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
          textarea.focus();
        }, 0);
      }
    } else {
      const textarea = document.getElementById('template_text') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + placeholder + text.substring(end);
        setFormData(prev => ({ ...prev, template_text: newText }));
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
          textarea.focus();
        }, 0);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.subject || !formData.template_html) {
      toastService.error('error.generic', 'Completează toate câmpurile obligatorii');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/emails/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create template');
      }

      toastService.success('success.generic', 'Template creat cu succes');
      router.push('/admin/email-templates');
    } catch (error: any) {
      toastService.error(error.message || 'Eroare la crearea template-ului');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/email-templates')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('new.template_email_nou')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Creează un nou template de email
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-4">Informații de bază</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nume template *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ex: welcome_email"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Folosește underscore în loc de spații</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subiect email *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="ex: Bun venit la {{company_name}}!"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Categorie
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      {TEMPLATE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('new.template_activ')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.send_copy_to_admin}
                        onChange={(e) => setFormData(prev => ({ ...prev, send_copy_to_admin: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('new.trimite_copie_la_admin')}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-4">Conținut template</h3>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
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
                    type="button"
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

                {activeTab === 'html' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template HTML *
                    </label>
                    <textarea
                      id="template_html"
                      value={formData.template_html}
                      onChange={(e) => setFormData(prev => ({ ...prev, template_html: e.target.value }))}
                      rows={20}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 font-mono text-sm"
                      placeholder="<!DOCTYPE html>..."
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Text (opțional)
                    </label>
                    <textarea
                      id="template_text"
                      value={formData.template_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, template_text: e.target.value }))}
                      rows={20}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 font-mono text-sm"
                      placeholder={t('new.versiunea_text_a_email_ului_')}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Variables */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Variable className="h-5 w-5" />
                Variabile disponibile
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Click pe variabilă pentru a o insera în template. Selectează variabilele folosite:
              </p>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {COMMON_VARIABLES.map(variable => (
                  <div key={variable.name} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={formData.variables.includes(variable.name)}
                      onChange={() => handleVariableToggle(variable.name)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => handleInsertVariable(variable.name)}
                        className="text-left w-full group"
                      >
                        <code className="text-sm text-blue-600 dark:text-blue-400 group-hover:underline">
                          {`{{${variable.name}}}`}
                        </code>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {variable.description}
                        </p>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Salvează Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}