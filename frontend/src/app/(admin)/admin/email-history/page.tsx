// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Mail, Send, CheckCircle, XCircle, AlertCircle,
  Calendar, Clock, TrendingUp, Users, Eye,
  Filter, Download, RefreshCw, BarChart3
} from 'lucide-react';
import { toastService } from '@/services/toastService';

interface EmailHistoryItem {
  id: number;
  template_name: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  status: string;
  sent_at: string;
  opened_at: string | null;
  error_message: string | null;
  sent_by_name: string;
  batch_id: string | null;
}

interface EmailStats {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_failed: number;
  total_bounced: number;
  open_rate: number;
  delivery_rate: number;
  templates_stats: {
    template_name: string;
    sent_count: number;
    opened_count: number;
    failed_count: number;
  }[];
  daily_stats: {
    date: string;
    sent: number;
    opened: number;
    failed: number;
  }[];
}

export default function EmailHistoryStats() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'history' | 'statistics'>('history');
  const [history, setHistory] = useState<EmailHistoryItem[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else {
      fetchStatistics();
    }
  }, [activeTab, filters, currentPage]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...filters
      });

      const response = await fetch(`/api/emails/history?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch history');

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      toastService.error('error.loading');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      });

      const response = await fetch(`/api/emails/statistics?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch statistics');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      toastService.error('error.loading');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'opened':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'bounced':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'opened':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'bounced':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
    }
  };

  const exportData = async (format: 'csv' | 'excel') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/emails/export?format=${format}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to export data');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-history-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      a.click();
    } catch (error) {
      toastService.error('error.generic', 'Eroare la exportarea datelor');
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Istoric & Statistici Email
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitorizează performanța campaniilor de email
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => activeTab === 'history' ? fetchHistory() : fetchStatistics()}
            className="flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => exportData('csv')}
            className="flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Istoric
            </div>
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'statistics'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistici
            </div>
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Caută după email sau subiect..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
          />
          
          {activeTab === 'history' && (
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            >
              <option value="">{t('email-history.toate_statusurile')}</option>
              <option value="sent">{t('email-history.trimise')}</option>
              <option value="delivered">{t('email-history.livrate')}</option>
              <option value="opened">{t('email-history.deschise')}</option>
              <option value="failed">Eșuate</option>
              <option value="bounced">{t('email-history.respinse')}</option>
            </select>
          )}
          
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
          />
          
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'history' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Destinatar
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subiect
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Template
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Trimis la
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Trimis de
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.recipient_name || item.recipient_email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.recipient_email}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {item.subject}
                      </p>
                      {item.error_message && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {item.error_message}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.template_name || 'Custom'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>{new Date(item.sent_at).toLocaleDateString('ro-RO')}</p>
                        <p className="text-xs">{new Date(item.sent_at).toLocaleTimeString('ro-RO')}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.sent_by_name}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {history.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Nu s-au găsit email-uri
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('email-history.total_trimise')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats?.total_sent || 0}
                  </p>
                </div>
                <Send className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('email-history.rata_livrare')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats?.delivery_rate || 0}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('email-history.rata_deschidere')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats?.open_rate || 0}%
                  </p>
                </div>
                <Eye className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Eșuate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats?.total_failed || 0}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>

          {/* Template Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performanță Template-uri
            </h3>
            <div className="space-y-4">
              {stats?.templates_stats.map((template, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {template.template_name}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span>Trimise: {template.sent_count}</span>
                      <span>Deschise: {template.opened_count}</span>
                      <span>Eșuate: {template.failed_count}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.opened_count && template.sent_count
                        ? Math.round((template.opened_count / template.sent_count) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500">Rată deschidere</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Stats Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Evoluție Zilnică
            </h3>
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {/* Aici poți adăuga un grafic cu Recharts sau Chart.js */}
              <p>Grafic în dezvoltare</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
