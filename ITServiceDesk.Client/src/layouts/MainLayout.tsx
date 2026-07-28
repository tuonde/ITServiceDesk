import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { signalrService } from '../services/signalrService';
import toast from 'react-hot-toast';
import { TicketStatus, type TicketResponseDto } from '../types/ticket';
import { ticketService } from '../services/ticketService';
import { settingsService } from '../services/settingsService';
import { useSettings } from '../contexts/SettingsContext';

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
  const role = authService.getUserRole();
  const isAdmin = role === 'Admin';
  
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
  
  React.useEffect(() => {
    const fetchLogo = async () => {
      try {
        const url = await settingsService.getLogoUrl();
        if (url) setLogoUrl(`http://localhost:5014${url}`);
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
    fetchOpenTickets();

    const handleTicketCreated = (ticket: TicketResponseDto) => {
      fetchOpenTickets();
      const currentUserId = authService.getUserId();
      if (isAdmin || ticket.requesterId === currentUserId) {
        toast.success(`Yeni Talep Oluşturuldu: ${ticket.title}`);
      }
    };

    const handleTicketUpdated = (ticket: TicketResponseDto) => {
      fetchOpenTickets();
      const currentUserId = authService.getUserId();
      if (isAdmin || ticket.requesterId === currentUserId) {
        toast.success(`Talep Güncellendi: ${ticket.title}`);
      }
    };

    signalrService.on('TicketCreated', handleTicketCreated);
    signalrService.on('TicketUpdated', handleTicketUpdated);

    return () => {
      signalrService.off('TicketCreated', handleTicketCreated);
      signalrService.off('TicketUpdated', handleTicketUpdated);
      signalrService.stopConnection();
    };
  }, [isAdmin]);

  return (
    <div className="h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="h-16 px-6 text-xl font-bold border-b border-slate-100 flex items-center gap-3">
           {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-8 max-w-[2rem] object-contain" />
           ) : (
             <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-lg shadow-emerald-500/30 shadow flex items-center justify-center shrink-0">
               <span className="text-white text-xs font-black tracking-wider">IT</span>
             </div>
           )}
           <span className="text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">{settings?.appName || 'IT Service Desk'}</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isDashboardPage ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            Dashboard
          </Link>
          <Link to="/profile" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${location.pathname.startsWith('/profile') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Profilim
          </Link>
          <Link to="/tickets" className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isTicketsPage ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'} relative`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
            Destek Talepleri
            {openTicketCount > 0 && (
              <span className="absolute right-4 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-rose-500/30">
                {openTicketCount}
              </span>
            )}
          </Link>

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
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => {
              if (window.confirm('Oturumunuz sonlandırılacak. Çıkış yapmak istediğinize emin misiniz?')) {
                authService.logout();
              }
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle top decoration */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-50/50 to-transparent -z-10"></div>
        
        <header className="h-16 flex items-center justify-between px-8 z-10">
          <h2 className="text-slate-800 font-bold text-2xl tracking-tight">{pageTitle}</h2>
          
          {/* User profile mockup */}
          <Link 
            to="/profile" 
            className="w-9 h-9 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center text-slate-600 font-bold transition-colors focus:outline-none"
            title="Profilim"
          >
             A
          </Link>
        </header>
        <div className="p-8 flex-1 overflow-auto z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
