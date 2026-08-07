import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { signalrService } from '../services/signalrService';
import toast from 'react-hot-toast';
import { TicketStatus } from '../types/ticket';
import { ticketService } from '../services/ticketService';
import { settingsService } from '../services/settingsService';
import { useSettings } from '../contexts/SettingsContext';
import notificationService, { type NotificationDto } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';

const MainLayout: React.FC = () => {
  const { settings } = useSettings();
  const location = useLocation();
  const isDashboardPage = location.pathname === '/';
  const isTicketsPage = location.pathname.startsWith('/tickets');
  const isUsersPage = location.pathname.startsWith('/users');
  const isAuditLogsPage = location.pathname.startsWith('/audit-logs');
  const isDepartmentsPage = location.pathname.startsWith('/departments');
  const isSettingsPage = location.pathname.startsWith('/settings');
  const isReportsPage = location.pathname.startsWith('/reports');
  const roles = authService.getUserRoles();
  const isAdmin = authService.isAdmin();
  const isTechnician = authService.isTechnician();
  const isMobileResponsive = !isAdmin;
  let pageTitle = 'Genel Bakış';
  if (isDashboardPage) pageTitle = 'Dashboard';
  else if (isTicketsPage) pageTitle = 'Destek Talepleri';
  else if (isUsersPage) pageTitle = 'Kullanıcılar';
  else if (isDepartmentsPage) pageTitle = 'Departmanlar';
  else if (isAuditLogsPage) pageTitle = 'Sistem Kayıtları';
  else if (isSettingsPage) pageTitle = 'Ayarlar';
  else if (isReportsPage) pageTitle = 'Gelişmiş Raporlar';
  else if (location.pathname.startsWith('/inventory')) pageTitle = 'Envanter Yönetimi';
  else if (location.pathname.startsWith('/profile')) pageTitle = 'Profilim';

  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [openTicketCount, setOpenTicketCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<NotificationDto[]>([]);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  React.useEffect(() => {
    const fetchLogo = async () => {
      try {
        const url = await settingsService.getLogoUrl();
        if (url) setLogoUrl(url);
      } catch (err) {}
    };
    fetchLogo();

    // Listen for custom event from Settings page
    const handleLogoUpdate = () => fetchLogo();
    window.addEventListener('logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('logo-updated', handleLogoUpdate);
  }, []);

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      signalrService.startConnection(token);
    }

    const fetchOpenTickets = async () => {
      try {
        const res = await ticketService.getAll({ pageNumber: 1, pageSize: 100, status: TicketStatus.Open });
        setOpenTicketCount(res.totalRecords);
      } catch (err) {}
    };
    
    const fetchNotifications = async () => {
      try {
        const userId = authService.getUserId();
        if (userId) {
          const res = await notificationService.getAll(userId);
          setNotifications(res);
        }
      } catch (err) {}
    };

    fetchOpenTickets();
    fetchNotifications();

    const handleTicketCreated = () => {
      fetchOpenTickets();
    };

    const handleTicketUpdated = () => {
      fetchOpenTickets();
    };

    const handleReceiveNotification = (notif: NotificationDto) => {
      setNotifications(prev => [notif, ...prev]);
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">Yeni Bildirim</p>
                <p className="mt-1 text-sm text-gray-500">{notif.message}</p>
              </div>
            </div>
          </div>
        </div>
      ));
    };

    signalrService.on('TicketCreated', handleTicketCreated);
    signalrService.on('TicketUpdated', handleTicketUpdated);
    signalrService.on('ReceiveNotification', handleReceiveNotification);

    return () => {
      signalrService.off('TicketCreated', handleTicketCreated);
      signalrService.off('TicketUpdated', handleTicketUpdated);
      signalrService.off('ReceiveNotification', handleReceiveNotification);
      signalrService.stopConnection();
    };
  }, [isAdmin]);

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-800 overflow-hidden">
      
      {/* Full-width Topbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm relative">
        
        {/* Topbar Left: Logo */}
        <div className={`flex items-center gap-3 shrink-0 ${isMobileResponsive ? 'w-auto' : 'w-64'}`}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="max-h-8 max-w-[2rem] object-contain" />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-lg shadow-emerald-500/30 shadow flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-black tracking-wider">IT</span>
            </div>
          )}
          <span className="text-slate-800 font-bold text-lg whitespace-nowrap overflow-hidden text-ellipsis">
            {settings?.appName || 'IT Service Desk'}
          </span>
        </div>

        {/* Topbar Middle: Search Bar */}
        {isAdmin && (
          <div className="flex-1 max-w-xl px-8 hidden md:block">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
              <input 
                type="text" 
                placeholder="Talep Ara... (Şimdilik işlevsiz)" 
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm transition-all"
              />
            </div>
          </div>
        )}

        {/* Topbar Right: Actions */}
        <div className="flex items-center gap-4 shrink-0">
          
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={async () => {
                const newState = !isNotifOpen;
                setIsNotifOpen(newState);
                if (newState) {
                  const hasUnread = notifications.some(n => !n.isRead);
                  if (hasUnread) {
                    const userId = authService.getUserId();
                    if(userId) {
                      await notificationService.markAllAsRead(userId);
                      setNotifications(prev => prev.map(n => ({...n, isRead: true})));
                    }
                  }
                }
              }}
              className="relative w-10 h-10 bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-600 transition-colors focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4">
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold text-white items-center justify-center border border-white">
                    {notifications.filter(n => !n.isRead).length > 9 ? '9+' : notifications.filter(n => !n.isRead).length}
                  </span>
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="fixed inset-x-4 top-[4.5rem] sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 w-auto sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <h3 className="font-semibold text-slate-800">Bildirimler</h3>
                  {/* Empty block to replace the 'Tümünü Okundu İşaretle' button since we auto-mark */}
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500 flex flex-col items-center">
                      <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                      Henüz bildiriminiz yok.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-emerald-50/30' : ''}`}
                          onClick={async () => {
                            if (!notif.isRead) {
                              await notificationService.markAsRead(notif.id);
                              setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, isRead: true} : n));
                            }
                            setIsNotifOpen(false);
                            if (notif.relatedTicketId) {
                              navigate(`/tickets`);
                              setTimeout(() => window.dispatchEvent(new CustomEvent('open-ticket', { detail: notif.relatedTicketId })), 100);
                            }
                          }}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm break-words ${!notif.isRead ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                                {notif.message}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                {new Date(notif.createdAt).toLocaleString('tr-TR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-slate-200 hidden sm:block mx-1"></div>

          {/* Profile Section */}
          <Link to="/profile" className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors cursor-pointer border border-transparent hover:border-slate-200" title="Profil Ayarları">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold shadow-sm border border-emerald-200 text-sm">
               {authService.getUserFullName()?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-bold text-slate-700 leading-none mb-0.5">{authService.getUserFullName() || 'Kullanıcı'}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">{roles.join(', ') || 'Bilinmiyor'}</div>
            </div>
          </Link>

          {/* Logout Button */}
          <button 
            onClick={() => {
              if (window.confirm('Oturumunuz sonlandırılacak. Çıkış yapmak istediğinize emin misiniz?')) {
                authService.logout();
              }
            }}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors focus:outline-none"
            title="Çıkış Yap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>

        </div>
      </header>

      {/* Main Body below Topbar */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        {isAdmin && (
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shrink-0">
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
              <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isDashboardPage ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                Dashboard
              </Link>
            
            {(isAdmin || isTechnician) && (
              <Link to="/my-tasks" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname.startsWith('/my-tasks') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Görevlerim
              </Link>
            )}
            
            {(!isTechnician || isAdmin) && (
              <Link to="/tickets" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isTicketsPage ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'} relative`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
                Destek Talepleri
                {openTicketCount > 0 && (
                  <span className="absolute right-4 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-rose-500/30">
                    {openTicketCount}
                  </span>
                )}
              </Link>
            )}

            {isAdmin && (
              <>
                <Link to="/inventory" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname === '/inventory' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  Envanter Yönetimi
                </Link>
                <Link to="/users" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isUsersPage ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                  Kullanıcılar
                </Link>
                <Link to="/departments" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isDepartmentsPage ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                  Departmanlar
                </Link>
                <Link to="/reports" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isReportsPage ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                  Gelişmiş Raporlar
                </Link>
                <Link to="/audit-logs" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isAuditLogsPage ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Sistem Kayıtları
                </Link>
                <Link to="/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isSettingsPage ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Ayarlar
                </Link>
              </>
            )}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50">
          <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-50/50 to-transparent -z-10`}></div>
          
          <div className={`pb-2 shrink-0 ${isMobileResponsive ? 'px-4 pt-4 sm:px-8 sm:pt-6' : 'px-8 pt-6'}`}>
             <h2 className="text-slate-800 font-bold text-2xl tracking-tight">{pageTitle}</h2>
          </div>

          <div className={`flex-1 overflow-auto z-10 custom-scrollbar relative ${isMobileResponsive ? 'p-4 pt-2 sm:p-8 sm:pt-4' : 'p-8 pt-4'}`}>
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
};

export default MainLayout;
