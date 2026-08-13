import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { ticketService } from '../services/ticketService';
import { type TicketResponseDto, TicketStatus } from '../types/ticket';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { signalrService } from '../services/signalrService';
import { useNavigate } from 'react-router-dom';
import Tickets from './Tickets';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const Dashboard: React.FC = () => {
  const isAdmin = authService.isAdmin();
  const isTechnician = authService.isTechnician();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'requests'>('tasks');

  useEffect(() => {
    loadDashboardData();

    const handleSignalREvent = (ticket: TicketResponseDto) => {
      const currentUserId = authService.getUserId();
      if (isAdmin || ticket.requesterId === currentUserId || ticket.assigneeId === currentUserId) {
        loadDashboardData();
      }
    };

    signalrService.on('TicketCreated', handleSignalREvent);
    signalrService.on('TicketUpdated', handleSignalREvent);

    return () => {
      signalrService.off('TicketCreated', handleSignalREvent);
      signalrService.off('TicketUpdated', handleSignalREvent);
    };
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const filterParams: any = { pageNumber: 1, pageSize: 100 };
      const currentUserId = authService.getUserId();
      
      if (!isAdmin && isTechnician) {
        if (activeTab === 'tasks') {
          filterParams.assigneeId = currentUserId;
        } else {
          filterParams.requesterId = currentUserId;
        }
      }

      const ticketsResponse = await ticketService.getAll(filterParams);
      setTickets(ticketsResponse.data || []);
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
      case TicketStatus.Open: return <Badge variant="emerald">Açık</Badge>;
      case TicketStatus.InProgress: return <Badge variant="blue">İşlemde</Badge>;
      case TicketStatus.WaitingForUser: return <Badge variant="warning">Kullanıcı Bekleniyor</Badge>;
      case TicketStatus.Resolved: return <Badge variant="purple">Çözüldü</Badge>;
      case TicketStatus.Closed: return <Badge variant="slate">Kapalı</Badge>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1: return <Badge variant="slate">Düşük</Badge>;
      case 2: return <Badge variant="warning">Orta</Badge>;
      case 3: return <Badge variant="rose">Yüksek</Badge>;
      case 4: return <Badge variant="error">Kritik</Badge>;
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
      {(isAdmin || isTechnician) && slaTickets.length > 0 && (
        <Card className="bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
            <svg className="w-24 h-24 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
          </div>
          <CardContent className="relative z-10 pt-6">
            <h3 className="text-lg font-bold text-rose-800 mb-4 flex items-center gap-2">
              <span className="relative flex h-4 w-4 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
              </span>
              Acil Müdahale Bekleyen {!isAdmin && activeTab === 'tasks' ? 'Görevler' : 'Talepler'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {slaTickets.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => {
                    if (isAdmin) {
                      navigate('/tickets', { state: { openTicketId: t.id } });
                    } else if (isTechnician) {
                      window.dispatchEvent(new CustomEvent('open-ticket', { detail: t.id }));
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }
                  }}
                  className="bg-white p-4 rounded-xl shadow-sm border border-rose-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer hover:border-rose-300"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant={t.isEscalated ? "error" : "warning"}>
                        {t.isEscalated ? 'Gecikmiş' : 'Zaman Daralıyor'}
                      </Badge>
                      {getPriorityBadge(t.priority)}
                    </div>
                    <h4 className="font-semibold text-slate-800 mb-1 truncate" title={t.title}>{t.title}</h4>
                    <p className="text-sm text-slate-500 mb-4 truncate" title={t.requesterName}>{t.requesterName || 'Bilinmiyor'} - {t.departmentName || 'Bilinmiyor'}</p>
                  </div>
                  <div className="text-xs font-semibold text-rose-600 bg-rose-50/80 px-3 py-2.5 rounded-lg flex items-center justify-between border border-rose-100/50">
                    <span>Çözüm Süresi:</span>
                    <span>{t.resolutionDueDate ? new Date(t.resolutionDueDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat Card 1 */}
        <Card className="hover:shadow-md transition-shadow hover:-translate-y-1">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{isAdmin ? 'Sistemdeki Açık Talepler' : (activeTab === 'tasks' ? 'Açık Görevlerim' : 'Açık Taleplerim')}</p>
              <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : openTickets}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Stat Card - İşlemde */}
        <Card className="hover:shadow-md transition-shadow hover:-translate-y-1">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{isAdmin ? 'İşlemdeki Talepler' : (activeTab === 'tasks' ? 'İşlemdeki Görevlerim' : 'İşlemdeki Taleplerim')}</p>
              <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : inProgressTickets}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Stat Card 2 */}
        <Card className="hover:shadow-md transition-shadow hover:-translate-y-1">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{isAdmin ? 'Sistemdeki Çözülenler' : (activeTab === 'tasks' ? 'Çözülen Görevlerim' : 'Çözülen Taleplerim')}</p>
              <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : resolvedTickets}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Stat Card 3 */}
        <Card className="hover:shadow-md transition-shadow hover:-translate-y-1">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{isAdmin ? 'Geciken Talepler' : (activeTab === 'tasks' ? 'Geciken Görevlerim' : 'Geciken Taleplerim')}</p>
              <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : escalatedTickets}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Charts Section for Admin */}
        {isAdmin && (
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle>Sistem Analizi</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-8">
              <div className="grid grid-cols-1 gap-8 h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-slate-400">Yükleniyor...</div>
                ) : tickets.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">Yeterli veri yok</div>
                ) : (
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
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activities Section */}
        {isAdmin && (
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-row items-center justify-between border-b-0 pb-2">
              <CardTitle>{isAdmin ? 'Genel Sistem Aktiviteleri' : 'Son Aktivitelerim'}</CardTitle>
              <Link to="/tickets" className="text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Tümünü Gör &rarr;</Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-slate-500 text-center py-8">Yükleniyor...</div>
              ) : recentActivities.length === 0 ? (
                <EmptyState 
                  title="Aktivite Yok"
                  description="Henüz hiçbir aktivite bulunmuyor."
                  icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
              ) : (
                <div className="space-y-3 overflow-y-auto pr-2 max-h-[300px] custom-scrollbar">
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
            </CardContent>
          </Card>
        )}

      </div>

      {/* Embedded Tickets for Standard Users */}
      {!isAdmin && !isTechnician && (
        <Card className="min-h-[400px] sm:min-h-[600px] flex flex-col p-3 mt-4 sm:p-6 sm:mt-6 overflow-hidden">
          <Tickets />
        </Card>
      )}

      {/* Embedded Tickets for Technicians */}
      {isTechnician && (
        <Card className="min-h-[400px] sm:min-h-[600px] flex flex-col p-3 mt-4 sm:p-6 sm:mt-6 overflow-hidden">
          <Tickets mode={activeTab === 'tasks' ? 'my-tasks' : 'my-requests'} onModeChange={(mode) => setActiveTab(mode === 'my-tasks' ? 'tasks' : 'requests')} />
        </Card>
      )}

    </div>
  );
};

export default Dashboard;
