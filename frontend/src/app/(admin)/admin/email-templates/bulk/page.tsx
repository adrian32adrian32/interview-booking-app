'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, Users, Mail, Filter, CheckCircle,
  XCircle, AlertCircle, Search, ChevronDown, ChevronUp,
  Calendar, Phone, AtSign, User, Loader2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { toastService } from '@/services/toastService';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  category: string;
  variables: string[];
}

interface Booking {
  id: number;
  client_name: string;
  client_email: string;
  interview_date: string;
  interview_time: string;
  status: string;
}

export default function BulkEmailPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    hasBooking: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch users
      const usersRes = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      
      // API returnează {success: true, data: [...]}
      if (usersData.success && usersData.data) {
        setUsers(usersData.data);
      } else if (Array.isArray(usersData)) {
        setUsers(usersData);
      } else {
        setUsers([]);
      }

      // Fetch bookings
      const bookingsRes = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bookingsData = await bookingsRes.json();
      
      if (bookingsData.success && bookingsData.data) {
        setBookings(bookingsData.data);
      } else if (Array.isArray(bookingsData)) {
        setBookings(bookingsData);
      } else {
        setBookings([]);
      }

      // Fetch templates
      const templatesRes = await fetch('/api/emails/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const templatesData = await templatesRes.json();
      setTemplates(templatesData.templates || []);
    } catch (error) {
      toastService.error('error.loading');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!user.email.toLowerCase().includes(search) &&
          !user.username.toLowerCase().includes(search) &&
          !`${user.first_name} ${user.last_name}`.toLowerCase().includes(search)) {
        return false;
      }
    }

    // Role filter
    if (filters.role && user.role !== filters.role) {
      return false;
    }

    // Status filter
    if (filters.status && user.status !== filters.status) {
      return false;
    }

    // Has booking filter
    if (filters.hasBooking) {
      const userBookings = bookings.filter(b => b.client_email === user.email);
      if (filters.hasBooking === 'yes' && userBookings.length === 0) return false;
      if (filters.hasBooking === 'no' && userBookings.length > 0) return false;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const createdDate = new Date(user.created_at);
      if (filters.dateFrom && createdDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && createdDate > new Date(filters.dateTo)) return false;
    }

    return true;
  });

  // Calculare paginare
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleSelectAll = () => {
    if (selectAllPages) {
      // Deselectează tot
      setSelectedUsers(new Set());
      setSelectAllPages(false);
    } else if (selectedUsers.size === paginatedUsers.length) {
      // Dacă toți de pe pagină sunt selectați, selectează toți utilizatorii filtrați
      setSelectedUsers(new Set(filteredUsers.map(u => u.email)));
      setSelectAllPages(true);
    } else {
      // Selectează doar utilizatorii de pe pagina curentă
      setSelectedUsers(new Set(paginatedUsers.map(u => u.email)));
      setSelectAllPages(false);
    }
  };

  const handleSelectUser = (email: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedUsers(newSelected);
    setSelectAllPages(false);
  };

  const handleQuickSelect = (type: string) => {
    let emails: string[] = [];
    
    switch (type) {
      case 'active':
        emails = users.filter(u => u.status === 'active').map(u => u.email);
        break;
      case 'with-bookings':
        const usersWithBookings = new Set(bookings.map(b => b.client_email));
        emails = users.filter(u => usersWithBookings.has(u.email)).map(u => u.email);
        break;
      case 'recent':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        emails = users.filter(u => new Date(u.created_at) > oneWeekAgo).map(u => u.email);
        break;
      case 'admins':
        emails = users.filter(u => u.role === 'admin').map(u => u.email);
        break;
    }
    
    setSelectedUsers(new Set(emails));
    setSelectAllPages(true);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSendEmails = async () => {
    if (selectedUsers.size === 0) {
      toastService.error('error.generic', t('email_templates.bulk.selectRecipients'));
      return;
    }

    if (!selectedTemplate && !customMessage) {
      toastService.error('error.generic', t('email_templates.bulk.selectTemplateOrCustom'));
      return;
    }

    const confirmSend = confirm(
      t('email_templates.bulk.confirmSend').replace('{count}', selectedUsers.size.toString()).replace('{people}', selectedUsers.size === 1 ? t('email_templates.bulk.person') : t('email_templates.bulk.people'))
    );

    if (!confirmSend) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      
      // Prepare recipients with their data
      const recipients = Array.from(selectedUsers).map(email => {
        const user = users.find(u => u.email === email);
        const userBooking = bookings.find(b => b.client_email === email);
        
        return {
          email,
          name: user ? `${user.first_name} ${user.last_name}` : email,
          variables: {
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            username: user?.username || '',
            client_name: user ? `${user.first_name} ${user.last_name}` : '',
            client_email: email,
            interview_date: userBooking?.interview_date || '',
            interview_time: userBooking?.interview_time || '',
            booking_id: userBooking?.id || ''
          }
        };
      });

      if (selectedTemplate) {
        // Send using template
        const template = templates.find(temp => temp.id === selectedTemplate);
        const response = await fetch('/api/emails/bulk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            templateName: template?.name,
            recipients,
            batchSize: 5,
            delayMs: 3000
          })
        });

        if (!response.ok) throw new Error('Failed to send emails');

        const result = await response.json();
        const successful = result.results.filter((r: any) => r.success).length;
        const failed = result.results.filter((r: any) => !r.success).length;

        toastService.success(
          t('email_templates.bulk.emailsSent').replace('{successful}', successful.toString()).replace('{failed}', failed > 0 ? `, ${failed} ${t('email_templates.bulk.failed')}` : '')
        );
      } else {
        // Send custom email
        // TODO: Implement custom email endpoint
        toastService.error('error.generic', t('email_templates.bulk.featureInDevelopment'));
      }

      // Clear selection
      setSelectedUsers(new Set());
      setSelectAllPages(false);
    } catch (error) {
      toastService.error('error.generic', t('email_templates.bulk.sendError'));
    } finally {
      setSending(false);
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/email-templates')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('email_templates.bulk.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('email_templates.bulk.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('email_templates.bulk.selectedCount').replace('{selected}', selectedUsers.size.toString()).replace('{total}', filteredUsers.length.toString())}
          </div>
          <button
            onClick={handleSendEmails}
            disabled={selectedUsers.size === 0 || sending}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('email_templates.bulk.sending')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('email_templates.bulk.sendEmails')}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - User Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {selectAllPages ? t('email_templates.bulk.deselectAll') : 
                   selectedUsers.size === paginatedUsers.length ? t('email_templates.bulk.selectAllUsers') : 
                   t('email_templates.bulk.selectPage')}
                </button>
                <button
                  onClick={() => handleQuickSelect('active')}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {t('email_templates.bulk.activeUsers')}
                </button>
                <button
                  onClick={() => handleQuickSelect('with-bookings')}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {t('email_templates.bulk.withBookings')}
                </button>
                <button
                  onClick={() => handleQuickSelect('recent')}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {t('email_templates.bulk.recentUsers')}
                </button>
                <button
                  onClick={() => handleQuickSelect('admins')}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {t('email_templates.bulk.onlyAdmins')}
                </button>
              </div>
              
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('email_templates.bulk.show')}:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                  <option value={999999}>{t('email_templates.bulk.all')}</option>
                </select>
              </div>
            </div>
            
            {/* Mesaj selectare toate paginile */}
            {selectAllPages && filteredUsers.length > paginatedUsers.length && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('email_templates.bulk.allUsersSelected').replace('{count}', filteredUsers.length.toString())}
                </p>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {t('email_templates.bulk.filters')}
                </h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {showFilters && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('common.search')}
                    </label>
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      placeholder={t('email_templates.bulk.searchPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('email_templates.bulk.role')}
                    </label>
                    <select
                      value={filters.role}
                      onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      <option value="">{t('email_templates.bulk.allRoles')}</option>
                      <option value="user">{t('email_templates.bulk.user')}</option>
                      <option value="admin">{t('email_templates.bulk.admin')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('common.status')}
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      <option value="">{t('email_templates.bulk.allStatuses')}</option>
                      <option value="active">{t('status.active')}</option>
                      <option value="inactive">{t('status.inactive')}</option>
                      <option value="suspended">{t('status.suspended')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('email_templates.bulk.hasBookings')}
                    </label>
                    <select
                      value={filters.hasBooking}
                      onChange={(e) => setFilters(prev => ({ ...prev, hasBooking: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      <option value="">{t('email_templates.bulk.all')}</option>
                      <option value="yes">{t('common.yes')}</option>
                      <option value="no">{t('common.no')}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('email_templates.bulk.userColumn')}
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('email_templates.bulk.contactColumn')}
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('common.status')}
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('email_templates.bulk.bookingsColumn')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map(user => {
                    const userBookings = bookings.filter(b => b.client_email === user.email);
                    return (
                      <tr key={user.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.email)}
                            onChange={() => handleSelectUser(user.email)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{user.username}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <AtSign className="h-4 w-4" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="h-4 w-4" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                            user.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                          }`}>
                            {t(`status.${user.status}`)}
                          </span>
                        </td>
                        <td className="p-4">
                          {userBookings.length > 0 ? (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {userBookings.length} {t('email_templates.bulk.bookings')}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                              {t('email_templates.bulk.noBookings')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('email_templates.bulk.showing').replace('{start}', (startIndex + 1).toString()).replace('{end}', Math.min(endIndex, filteredUsers.length).toString()).replace('{total}', filteredUsers.length.toString())}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {/* Afișează maxim 5 pagini */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-3 py-1 text-sm rounded ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {t('email_templates.bulk.noUsersFound')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Email Content */}
        <div className="space-y-4">
          {/* Template Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('email_templates.bulk.selectTemplate')}
            </h3>

            <div className="space-y-2">
              {templates.map(template => (
                <label
                  key={template.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={() => setSelectedTemplate(template.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{template.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                        {t(`email_templates.category.${template.category}`)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {template.variables.length} {t('email_templates.manage.variables')}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <label
                className="flex items-start gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="template"
                  value="custom"
                  checked={selectedTemplate === null}
                  onChange={() => setSelectedTemplate(null)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{t('email_templates.bulk.customEmail')}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('email_templates.bulk.customEmailDescription')}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Email Form */}
          {selectedTemplate === null && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-4">{t('email_templates.bulk.customEmail')}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email_templates.subject')}
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder={t('email_templates.bulk.subjectPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email_templates.bulk.message')}
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={10}
                    placeholder={t('email_templates.bulk.messagePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('email_templates.bulk.featureInDevelopment')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Send Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              {t('email_templates.bulk.sendSummary')}
            </h3>
            <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
              <p>• {t('email_templates.bulk.summaryRecipients').replace('{count}', selectedUsers.size.toString())}</p>
              <p>• {t('email_templates.bulk.summaryTemplate')}: {selectedTemplate ? templates.find(temp => temp.id === selectedTemplate)?.name : t('email_templates.bulk.customEmail')}</p>
              <p>• {t('email_templates.bulk.summaryBatch')}</p>
              <p>• {t('email_templates.bulk.summaryDelay')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}