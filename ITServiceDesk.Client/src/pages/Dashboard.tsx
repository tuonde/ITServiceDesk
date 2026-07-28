import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { ticketService } from '../services/ticketService';
import { type TicketResponseDto, TicketStatus } from '../types/ticket';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { signalrService } from '../services/signalrService';

const Dashboard: React.FC = () => {
  const role = authService.getUserRole();
  const isAdmin = role === 'Admin';

  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    const handleTicketCreated = (ticket: TicketResponseDto) => {
      const currentUserId = authService.getUserId();
      if (isAdmin || ticket.requesterId === currentUserId) {
        loadDashboardData(); // Re-fetch to update charts and recent activities
      }
    };

    const handleTicketUpdated = (ticket: TicketResponseDto) => {
      const currentUserId = authService.getUserId();
      if (isAdmin || ticket.requesterId === currentUserId) {
        loadDashboardData();
      }
    };

    signalrService.on('TicketCreated', handleTicketCreated);
    signalrService.on('TicketUpdated', handleTicketUpdated);

    return () => {
      signalrService.off('TicketCreated', handleTicketCreated);
      signalrService.off('TicketUpdated', handleTicketUpdated);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await ticketService.getAll({ pageNumber: 1, pageSize: 100 });
      setTickets(response.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openTickets = tickets.filter(t => t.status === TicketStatus.Open).length;
  const inProgressTickets = tickets.filter(t => t.status === TicketStatus.InProgress).length;
  const resolvedTickets = tickets.filter(t => t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed).length;
  const escalatedTickets = tickets.filter(t => t.isEscalated).length;

  type ActivityEvent = { id: string, title: string, date: Date, type: 'Created' | 'Resolved' | 'Escalated', ticket: TicketResponseDto };
  const events: ActivityEvent[] = [];
  tickets.forEach(t => {
    events.push({ id: t.id + '-c', title: 'Yeni Talep: ' + t.title, date: new Date(t.createdAt), type: 'Created', ticket: t });
    if (t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed) {
      // Fallback to createdAt if resolvedAt is missing for old tickets
      events.push({ id: t.id + '-r', title: 'Çözüldü: ' + t.title, date: t.resolvedAt ? new Date(t.resolvedAt) : new Date(t.createdAt), type: 'Resolved', ticket: t });
    }
    if (t.isEscalated) {
      // Approximate escalation date
      events.push({ id: t.id + '-e', title: 'Gecikme İhbarı: ' + t.title, date: t.resolutionDueDate ? new Date(t.resolutionDueDate) : new Date(t.createdAt), type: 'Escalated', ticket: t });
    }
  });

  const recentActivities = events
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.Open: return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">Açık</span>;
      case TicketStatus.InProgress: return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">İşlemde</span>;
      case TicketStatus.Resolved: return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">Çözüldü</span>;
      case TicketStatus.Closed: return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">Kapalı</span>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1: return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">Düşük</span>;
      case 2: return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">Orta</span>;
      case 3: return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">Yüksek</span>;
      case 4: return <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">Kritik</span>;
      default: return null;
    }
  };

  const pieData = [
    { name: 'Açık', value: openTickets, color: '#10b981' }, // emerald-500
    { name: 'İşlemde', value: inProgressTickets, color: '#3b82f6' }, // blue-500
    { name: 'Çözülen / Kapalı', value: resolvedTickets, color: '#a855f7' }, // purple-500
    { name: 'Geciken', value: escalatedTickets, color: '#f43f5e' } // rose-500
  ];


  const slaTickets = tickets
    .filter(t => t.status === TicketStatus.Open || t.status === TicketStatus.InProgress)
    .filter(t => {
      if (t.isEscalated) return true;
      if (t.resolutionDueDate) {
        const hoursLeft = (new Date(t.resolutionDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
        return hoursLeft <= 2 && hoursLeft >= 0; // within 2 hours
      }
      return false;
    })
    .sort((a, b) => {
      if (a.isEscalated && !b.isEscalated) return -1;
      if (!a.isEscalated && b.isEscalated) return 1;
      const dateA = a.resolutionDueDate ? new Date(a.resolutionDueDate).getTime() : 0;
      const dateB = b.resolutionDueDate ? new Date(b.resolutionDueDate).getTime() : 0;
      return dateA - dateB;
    })
    .slice(0, 4);

  return (
    <div className="space-y-6">

      {/* SLA Widget */}
      {isAdmin && slaTickets.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <svg className="w-32 h-32 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-rose-800 mb-5 flex items-center gap-2">
              <span className="relative flex h-4 w-4 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
              </span>
              Acil Müdahale Bekleyen Talepler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {slaTickets.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-rose-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${t.isEscalated ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'}`}>
                        {t.isEscalated ? 'Gecikmiş' : 'Zaman Daralıyor'}
                      </span>
                      {getPriorityBadge(t.priority)}
                    </div>
                    <h4 className="font-semibold text-slate-800 mb-1 truncate" title={t.title}>{t.title}</h4>
                    <p className="text-xs text-slate-500 mb-4 truncate" title={t.requesterName}>{t.requesterName || 'Bilinmiyor'} - {t.departmentName || 'Bilinmiyor'}</p>
                  </div>
                  <div className="text-xs font-semibold text-rose-600 bg-rose-50/80 px-3 py-2 rounded-lg flex items-center justify-between border border-rose-100/50">
                    <span>Çözüm Süresi:</span>
                    <span>{t.resolutionDueDate ? new Date(t.resolutionDueDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">{isAdmin ? 'Sistemdeki Açık Talepler' : 'Açık Taleplerim'}</p>
            <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : openTickets}</h3>
          </div>
        </div>

        {/* Stat Card - İşlemde */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">{isAdmin ? 'İşlemdeki Talepler' : 'İşlemdeki Taleplerim'}</p>
            <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : inProgressTickets}</h3>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">{isAdmin ? 'Sistemdeki Çözülenler' : 'Çözülen Taleplerim'}</p>
            <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : resolvedTickets}</h3>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">{isAdmin ? 'Geciken Talepler' : 'Geciken Taleplerim'}</p>
            <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : escalatedTickets}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Charts Section for Admin */}
        {isAdmin && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Talep Analizi</h3>
            <div className="grid grid-cols-1 gap-8">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-slate-400 md:col-span-2">Yükleniyor...</div>
              ) : tickets.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">Yeterli veri yok</div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-slate-500 mb-4 text-center">Talep Durum Dağılımı</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: '#334155', fontWeight: '500' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Recent Activities Section */}
        <div className={`bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col ${!isAdmin ? 'lg:col-span-2' : ''}`}>
          <h3 className="text-lg font-bold text-slate-800 mb-6">{isAdmin ? 'Genel Sistem Aktiviteleri' : 'Son Aktivitelerim'}</h3>

          {isLoading ? (
            <div className="text-slate-500 text-center py-8">Yükleniyor...</div>
          ) : recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Henüz hiçbir aktivite bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2 h-[250px] custom-scrollbar">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-white shrink-0 ${activity.type === 'Created' ? 'bg-blue-500' :
                        activity.type === 'Resolved' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}>
                      {activity.type === 'Created' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                      {activity.type === 'Resolved' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      {activity.type === 'Escalated' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">{activity.title}</h4>
                      <p className="text-xs text-slate-500">{activity.date.toLocaleString('tr-TR')} tarihinde gerçekleşti.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 scale-90 origin-right">
                    {getStatusBadge(activity.ticket.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
