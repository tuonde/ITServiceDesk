import React, { useEffect, useState } from 'react';
import Tickets from './Tickets';
import { ticketService } from '../services/ticketService';
import { authService } from '../services/authService';
import { type TicketResponseDto, TicketStatus } from '../types/ticket';
import { Card, CardContent } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

const MyTasks: React.FC = () => {
  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const currentUserId = authService.getUserId();
        if (!currentUserId) return;
        
        // Sadece Admin kullanıcının KENDİ görevlerini çekiyoruz (KPI'lar için)
        const filterParams = { pageNumber: 1, pageSize: 1000, assigneeId: currentUserId };
        const response = await ticketService.getAll(filterParams);
        setTickets(response.data || []);
      } catch (err) {
        console.error("Görevler yüklenirken hata", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTickets();
  }, []);

  const openTickets = tickets.filter(t => t.status === TicketStatus.Open).length;
  const inProgressTickets = tickets.filter(t => t.status === TicketStatus.InProgress).length;
  const resolvedTickets = tickets.filter(t => t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed).length;
  const escalatedTickets = tickets.filter(t => t.isEscalated).length;

  return (
    <div className="h-full flex flex-col gap-6">
      
      <div className="shrink-0">
        <PageHeader
          title="Görevlerim"
          description="Üzerinizdeki talepleri filtreleyin, önceliklendirin ve çözüm süreçlerini yönetin."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        {/* Stat Card 1 - Açık Görevlerim */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Açık Görevlerim</p>
              <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : openTickets}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Stat Card 2 - İşlemdeki Görevlerim */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">İşlemdeki Görevlerim</p>
              <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : inProgressTickets}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Stat Card 3 - Çözülen Görevlerim */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Çözülen Görevlerim</p>
              <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : resolvedTickets}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Stat Card 4 - Geciken Görevlerim */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Geciken Görevlerim</p>
              <h3 className="text-2xl font-bold text-slate-800">{isLoading ? '-' : escalatedTickets}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Tickets mode="my-tasks" hideHeader={true} />
      </div>
    </div>
  );
};

export default MyTasks;
