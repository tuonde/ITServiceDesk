import React, { useEffect, useState } from 'react';
import { ticketService } from '../services/ticketService';
import { authService } from '../services/authService';
import { signalrService } from '../services/signalrService';
import { deviceService } from '../services/deviceService';
import { TicketStatus, Priority, type TicketResponseDto, type TicketCreateDto } from '../types/ticket';
import { type DeviceDto, DeviceStatus } from '../types/device';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import DatePicker, { registerLocale } from 'react-datepicker';
import { tr } from 'date-fns/locale/tr';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('tr', tr);

const Tickets: React.FC = () => {
  const isAdmin = authService.getUserRole() === 'Admin';
  
  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting & Filtering State
  const [sortConfig, setSortConfig] = useState<{key: keyof TicketResponseDto, direction: 'asc'|'desc'} | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'resolved' | 'open' | 'inProgress' | 'unresolved'>('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  // Bulk Actions State
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketResponseDto | null>(null);
  const [newTicket, setNewTicket] = useState<TicketCreateDto>({
    title: '',
    description: '',
    priority: Priority.Low,
    deviceId: null
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // Status Update Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updateStatusData, setUpdateStatusData] = useState({ status: TicketStatus.Resolved, report: '' });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Edit Ticket Modal State (User)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTicketData, setEditTicketData] = useState<{ id: string, title: string, description: string, priority: Priority, deviceId: string | null }>({ id: '', title: '', description: '', priority: Priority.Low, deviceId: null });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadTickets();
    loadDevices();

    const handleSignalREvent = (ticket: TicketResponseDto) => {
      const currentUserId = authService.getUserId();
      if (isAdmin || ticket.requesterId === currentUserId) {
        loadTickets();
      }
    };

    signalrService.on('TicketCreated', handleSignalREvent);
    signalrService.on('TicketUpdated', handleSignalREvent);

    return () => {
      signalrService.off('TicketCreated', handleSignalREvent);
      signalrService.off('TicketUpdated', handleSignalREvent);
    };
  }, []);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const response = await ticketService.getAll({ pageNumber: 1, pageSize: 100 });
      setTickets(response.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Biletler yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const allDevices = await deviceService.getAll();
      setDevices(allDevices.filter(d => d.status === DeviceStatus.Active));
    } catch (err) {
      console.error("Cihazlar yüklenemedi", err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await ticketService.create(newTicket);
      setIsModalOpen(false);
      setNewTicket({ title: '', description: '', priority: Priority.Low });
      loadTickets(); // Reload list
    } catch (err: any) {
      alert(err.message || 'Oluşturulamadı.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('Bu talebi iptal etmek istediğinize emin misiniz?')) return;
    try {
      await ticketService.delete(id);
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'İptal işlemi başarısız oldu.');
    }
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (Number(selectedTicket.status) === TicketStatus.Resolved || Number(selectedTicket.status) === TicketStatus.Closed) {
      alert("HATA: Bu talep zaten çözülmüş veya kapatılmış. Tekrar güncellenemez.");
      setIsStatusModalOpen(false);
      return;
    }
    try {
      setIsUpdatingStatus(true);
      await ticketService.update(selectedTicket.id, {
        id: selectedTicket.id,
        title: selectedTicket.title,
        description: selectedTicket.description,
        status: updateStatusData.status,
        priority: selectedTicket.priority,
        assigneeId: selectedTicket.assigneeId || null,
        departmentId: selectedTicket.departmentId || null,
        resolutionReport: updateStatusData.report || null
      });
      setIsStatusModalOpen(false);
      setSelectedTicket(null);
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Güncelleme başarısız oldu.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEditTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTicketData || !selectedTicket) return;
    try {
      setIsEditing(true);
      await ticketService.update(selectedTicket.id, {
        id: selectedTicket.id,
        title: editTicketData.title,
        description: editTicketData.description,
        status: selectedTicket.status,
        priority: editTicketData.priority,
        assigneeId: selectedTicket.assigneeId || null,
        departmentId: selectedTicket.departmentId || null,
        resolutionReport: selectedTicket.resolutionReport || null
      });
      setIsEditModalOpen(false);
      setSelectedTicket(null);
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Güncelleme başarısız oldu.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSort = (key: keyof TicketResponseDto) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTickets = React.useMemo(() => {
    let sortableTickets = [...tickets];
    
    // Filtering
    if (filterType !== 'all') {
      sortableTickets = sortableTickets.filter(t => {
        if (filterType === 'resolved') return t.status === TicketStatus.Resolved;
        if (filterType === 'open') return t.status === TicketStatus.Open;
        if (filterType === 'inProgress') return t.status === TicketStatus.InProgress;
        if (filterType === 'unresolved') return t.status === TicketStatus.Open || t.status === TicketStatus.InProgress;
        return true;
      });
    }

    // Date Filtering
    if (startDate) {
       const start = new Date(startDate);
       start.setHours(0, 0, 0, 0);
       sortableTickets = sortableTickets.filter(t => new Date(t.createdAt) >= start);
    }
    if (endDate) {
       const end = new Date(endDate);
       end.setHours(23, 59, 59, 999);
       sortableTickets = sortableTickets.filter(t => new Date(t.createdAt) <= end);
    }

    // Sorting
    if (sortConfig !== null) {
      sortableTickets.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? null;
        const bVal = b[sortConfig.key] ?? null;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableTickets;
  }, [tickets, sortConfig, filterType, startDate, endDate]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTicketIds(sortedTickets.map(t => t.id));
    } else {
      setSelectedTicketIds([]);
    }
  };

  const handleSelectTicket = (id: string) => {
    setSelectedTicketIds(prev => prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]);
  };

  const handleBulkAction = async (action: 'resolve' | 'delete') => {
    if (!window.confirm(`Seçili ${selectedTicketIds.length} talebi ${action === 'resolve' ? 'çözüldü işaretlemek' : 'iptal etmek (silmek)'} istediğinize emin misiniz?`)) return;
    try {
      setIsProcessingBulk(true);
      const promises = selectedTicketIds.map(async (id) => {
         const ticket = tickets.find(t => t.id === id);
         if (!ticket) return;
         if (action === 'delete') {
            await ticketService.delete(id);
         } else if (action === 'resolve') {
            if (Number(ticket.status) === TicketStatus.Resolved || Number(ticket.status) === TicketStatus.Closed) {
               return; // Çözülmüş veya kapalı olanları es geç
            }
            await ticketService.update(id, {
               id: ticket.id,
               title: ticket.title,
               description: ticket.description,
               status: TicketStatus.Resolved,
               priority: ticket.priority,
               assigneeId: ticket.assigneeId || null,
               departmentId: ticket.departmentId || null,
               resolutionReport: 'Toplu işlem ile çözüldü olarak işaretlendi.'
            });
         }
      });
      await Promise.allSettled(promises);
      setSelectedTicketIds([]);
      loadTickets();
    } catch (err: any) {
      alert('Toplu işlem sırasında bir hata oluştu.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const getSortIcon = (key: keyof TicketResponseDto) => {
    if (sortConfig?.key !== key) {
      return <svg className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>;
    }
    if (sortConfig.direction === 'asc') {
      return <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>;
    }
    return <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>;
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.Open: return <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">Açık</span>;
      case TicketStatus.InProgress: return <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">İşlemde</span>;
      case TicketStatus.Resolved: return <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">Çözüldü</span>;
      case TicketStatus.Closed: return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">Kapalı</span>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case Priority.Low: return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">Düşük</span>;
      case Priority.Medium: return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">Orta</span>;
      case Priority.High: return <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">Yüksek</span>;
      case Priority.Critical: return <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">Kritik</span>;
      default: return null;
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Destek Talepleri Raporu', 14, 15);
    
    const tableData = sortedTickets.map(t => [
      t.title,
      t.departmentName || 'Belirtilmedi',
      t.status === TicketStatus.Resolved ? 'Çözüldü' : t.status === TicketStatus.Open ? 'Açık' : t.status === TicketStatus.InProgress ? 'İşlemde' : 'Kapalı',
      t.priority === Priority.Low ? 'Düşük' : t.priority === Priority.Medium ? 'Orta' : t.priority === Priority.High ? 'Yüksek' : 'Kritik',
      new Date(t.createdAt).toLocaleDateString('tr-TR')
    ]);

    autoTable(doc, {
      head: [['Konu', 'Departman', 'Durum', 'Öncelik', 'Tarih']],
      body: tableData,
      startY: 20
    });
    
    doc.save('destek_talepleri.pdf');
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Destek Talepleri');

    worksheet.columns = [
      { header: 'Konu', key: 'title', width: 30 },
      { header: 'Açıklama', key: 'description', width: 40 },
      { header: 'Departman', key: 'department', width: 20 },
      { header: 'Durum', key: 'status', width: 15 },
      { header: 'Öncelik', key: 'priority', width: 15 },
      { header: 'Oluşturulma Tarihi', key: 'date', width: 20 }
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' } // Emerald 500
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sortedTickets.forEach(t => {
      const row = worksheet.addRow({
        title: t.title,
        description: t.description,
        department: t.departmentName || 'Belirtilmedi',
        status: t.status === TicketStatus.Resolved ? 'Çözüldü' : t.status === TicketStatus.Open ? 'Açık' : t.status === TicketStatus.InProgress ? 'İşlemde' : 'Kapalı',
        priority: t.priority === Priority.Low ? 'Düşük' : t.priority === Priority.Medium ? 'Orta' : t.priority === Priority.High ? 'Yüksek' : 'Kritik',
        date: new Date(t.createdAt).toLocaleString('tr-TR')
      });

      // Style row based on Status
      let rowColor = 'FFFFFFFF'; // White
      if (t.status === TicketStatus.Open) rowColor = 'FFD1FAE5'; // Emerald 100
      else if (t.status === TicketStatus.InProgress) rowColor = 'FFDBEAFE'; // Blue 100
      else if (t.status === TicketStatus.Resolved) rowColor = 'FFF3E8FF'; // Purple 100
      else if (t.status === TicketStatus.Closed) rowColor = 'FFF1F5F9'; // Slate 100

      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowColor }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'destek_talepleri.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">{isAdmin ? 'Sistemdeki Tüm Destek Talepleri' : 'Tüm Destek Taleplerim'}</h2>
        {!isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Yeni Talep Aç
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">{error}</div>
      )}

      {/* Bulk Action Panel */}
      {selectedTicketIds.length > 0 && (
        <div className="bg-indigo-50 border-2 border-indigo-200 p-4 rounded-2xl flex flex-wrap items-center justify-between shadow-sm animate-fade-in-down gap-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                {selectedTicketIds.length}
             </div>
             <div>
                <h4 className="font-bold text-indigo-900">Talep Seçildi</h4>
                <p className="text-xs text-indigo-700">Toplu işlem modundasınız</p>
             </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => handleBulkAction('resolve')} 
              disabled={isProcessingBulk} 
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all text-sm flex items-center gap-2"
            >
              {isProcessingBulk ? 'İşleniyor...' : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Tümünü Çözüldü İşaretle</>
              )}
            </button>
            <button 
              onClick={() => handleBulkAction('delete')} 
              disabled={isProcessingBulk} 
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md shadow-rose-500/20 transition-all text-sm flex items-center gap-2"
            >
              {isProcessingBulk ? 'İşleniyor...' : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> Tümünü İptal Et</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setFilterType('all')} 
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filterType === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                Tüm Talepler
              </button>
              <button 
                onClick={() => setFilterType('resolved')} 
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filterType === 'resolved' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                Çözülmüş Talepler
              </button>
              <button 
                onClick={() => setFilterType('open')} 
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filterType === 'open' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                Açık Talepler
              </button>
              <button 
                onClick={() => setFilterType('inProgress')} 
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filterType === 'inProgress' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                İşlemdeki Talepler
              </button>
              <button 
                onClick={() => setFilterType('unresolved')} 
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filterType === 'unresolved' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                Çözülmemiş Talepler (Açık + İşlemde)
              </button>
            </div>
            
            <div className="flex items-center gap-3">
               <button onClick={exportToPDF} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                 PDF
               </button>
               <button onClick={exportToExcel} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                 Excel
               </button>
            </div>
          </div>
          
          {/* Date Filters */}
          <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
             <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-600">Tarih Aralığı:</label>
                <div className="relative z-50">
                  <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => {
                      setDateRange(update);
                    }}
                    isClearable={true}
                    calendarStartDay={1}
                    locale="tr"
                    placeholderText="Başlangıç - Bitiş seçiniz"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-56"
                    dateFormat="dd.MM.yyyy"
                  />
                </div>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-4 w-12 text-center border-r border-slate-100">
                  <input 
                    type="checkbox" 
                    checked={selectedTicketIds.length === sortedTickets.length && sortedTickets.length > 0} 
                    onChange={handleSelectAll} 
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                  />
                </th>
                <th className="px-3 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Konu</th>
                <th onClick={() => handleSort('status')} className="px-3 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">Durum {getSortIcon('status')}</div>
                </th>
                <th className="px-3 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Departman
                </th>
                <th onClick={() => handleSort('priority')} className="px-3 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">Öncelik {getSortIcon('priority')}</div>
                </th>
                <th onClick={() => handleSort('createdAt')} className="px-3 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap">
                  <div className="flex items-center gap-2">Tarih {getSortIcon('createdAt')}</div>
                </th>
                <th className="px-3 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">Yükleniyor...</td>
                </tr>
              ) : sortedTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                       <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                       <p className="text-lg font-medium text-slate-600">Henüz hiç talep yok.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedTickets.map((ticket) => (
                  <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={`transition-colors cursor-pointer group ${selectedTicketIds.includes(ticket.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-4 text-center border-r border-slate-50" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedTicketIds.includes(ticket.id)} 
                        onChange={() => handleSelectTicket(ticket.id)} 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{ticket.title}</span>
                        {ticket.isEscalated && (
                          <span title="Gecikmiş Talep!" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 truncate max-w-[200px] md:max-w-[300px] xl:max-w-[400px]">{ticket.description}</div>
                    </td>
                    <td className="px-3 py-4">{getStatusBadge(ticket.status)}</td>
                    <td className="px-3 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                        {ticket.departmentName || 'Belirtilmedi'}
                      </span>
                    </td>
                    <td className="px-3 py-4">{getPriorityBadge(ticket.priority)}</td>
                    <td className="px-3 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-4 text-right flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {isAdmin && Number(ticket.status) !== TicketStatus.Resolved && Number(ticket.status) !== TicketStatus.Closed && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (Number(ticket.status) === TicketStatus.Resolved || Number(ticket.status) === TicketStatus.Closed) {
                               alert("Bu talep zaten çözülmüş veya kapatılmış.");
                               return;
                            }
                            setSelectedTicket(ticket);
                            setUpdateStatusData({ status: TicketStatus.Resolved, report: '' });
                            setIsStatusModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          Durum Güncelle
                        </button>
                      )}
                      {!isAdmin && ticket.status === TicketStatus.Open && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                            setEditTicketData({ id: ticket.id, title: ticket.title, description: ticket.description, priority: ticket.priority, deviceId: ticket.deviceId || null });
                            setIsEditModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                        >
                          Düzenle
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTicket(ticket.id);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        İptal Et
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && !isAdmin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Yeni Bilet Oluştur</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Konu / Başlık</label>
                <input 
                  type="text" 
                  value={newTicket.title}
                  onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all outline-none"
                  placeholder="Örn: E-Posta hesabıma giremiyorum"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Açıklama</label>
                <textarea 
                  value={newTicket.description}
                  onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all outline-none resize-none"
                  placeholder="Detaylı bilgi veriniz..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Öncelik Seviyesi</label>
                <select 
                  value={newTicket.priority}
                  onChange={e => setNewTicket({...newTicket, priority: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all outline-none"
                >
                  <option value={1}>Düşük</option>
                  <option value={2}>Orta</option>
                  <option value={3}>Yüksek</option>
                  <option value={4}>Kritik</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">İlgili Cihaz (Opsiyonel)</label>
                <select 
                  value={newTicket.deviceId || ''}
                  onChange={e => setNewTicket({...newTicket, deviceId: e.target.value || null})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all outline-none"
                >
                  <option value="">Cihaz Seçiniz...</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={isCreating} className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all">
                  {isCreating ? 'Oluşturuluyor...' : 'Bileti Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">{selectedTicket.title}</h3>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-6 flex-wrap">
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
                {selectedTicket.isEscalated && (
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">Gecikmiş Talep</span>
                )}
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                  <span className="opacity-70 mr-1">Talep Eden:</span> {selectedTicket.requesterName || 'Bilinmiyor'}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                  <span className="opacity-70 mr-1">Departman:</span> {selectedTicket.departmentName || 'Belirtilmedi'}
                </span>
                {selectedTicket.deviceName && (
                  <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-100">
                    <span className="opacity-70 mr-1">Cihaz:</span> {selectedTicket.deviceName}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium ml-auto">
                  {new Date(selectedTicket.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Açıklama:</h4>
              <p className="text-slate-600 bg-slate-50/50 border border-slate-100 p-4 rounded-xl whitespace-pre-wrap break-words leading-relaxed max-h-60 overflow-y-auto overflow-x-hidden">
                {selectedTicket.description}
              </p>
              
              {selectedTicket.resolutionReport && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Durum Notu / Rapor:</h4>
                  <p className="text-slate-600 bg-blue-50/50 border border-blue-100 p-4 rounded-xl whitespace-pre-wrap break-words leading-relaxed max-h-60 overflow-y-auto overflow-x-hidden">
                    {selectedTicket.resolutionReport}
                  </p>
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                {isAdmin && Number(selectedTicket.status) !== TicketStatus.Resolved && Number(selectedTicket.status) !== TicketStatus.Closed && (
                  <button 
                    onClick={() => {
                        if (Number(selectedTicket.status) === TicketStatus.Resolved || Number(selectedTicket.status) === TicketStatus.Closed) {
                           alert("Bu talep zaten çözülmüş veya kapatılmış.");
                           return;
                        }
                        setUpdateStatusData({ status: TicketStatus.Resolved, report: '' });
                        setIsStatusModalOpen(true);
                    }} 
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                  >
                    Durum Güncelle
                  </button>
                )}
                {!isAdmin && selectedTicket.status === TicketStatus.Open && (
                  <button 
                    onClick={() => {
                        setEditTicketData({ id: selectedTicket.id, title: selectedTicket.title, description: selectedTicket.description, priority: selectedTicket.priority, deviceId: selectedTicket.deviceId || null });
                        setIsEditModalOpen(true);
                    }} 
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/30"
                  >
                    Düzenle
                  </button>
                )}
                <button onClick={() => setSelectedTicket(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Durum Güncelle</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleUpdateStatusSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Yeni Durum</label>
                <select 
                  value={updateStatusData.status}
                  onChange={e => setUpdateStatusData({...updateStatusData, status: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
                >
                  <option value={TicketStatus.InProgress}>Devam Ediyor (İşlemde)</option>
                  <option value={TicketStatus.Resolved}>Çözüldü</option>
                  <option value={TicketStatus.Closed}>Kapalı (İptal)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Rapor / Not (Opsiyonel)</label>
                <textarea 
                  value={updateStatusData.report}
                  onChange={e => setUpdateStatusData({...updateStatusData, report: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-none"
                  placeholder="Dış ekip bekleniyor, çözüm notu vs..."
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsStatusModalOpen(false)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={isUpdatingStatus} className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all">
                  {isUpdatingStatus ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {isEditModalOpen && editTicketData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Talebi Düzenle</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleEditTicketSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Konu / Başlık</label>
                <input 
                  type="text" 
                  value={editTicketData.title}
                  onChange={e => setEditTicketData({...editTicketData, title: e.target.value})}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Açıklama</label>
                <textarea 
                  value={editTicketData.description}
                  onChange={e => setEditTicketData({...editTicketData, description: e.target.value})}
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Öncelik Seviyesi</label>
                <select 
                  value={editTicketData.priority}
                  onChange={e => setEditTicketData({...editTicketData, priority: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none"
                >
                  <option value={1}>Düşük</option>
                  <option value={2}>Orta</option>
                  <option value={3}>Yüksek</option>
                  <option value={4}>Kritik</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">İlgili Cihaz (Opsiyonel)</label>
                <select 
                  value={editTicketData.deviceId || ''}
                  onChange={e => setEditTicketData({...editTicketData, deviceId: e.target.value || null})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none"
                >
                  <option value="">Cihaz Seçiniz...</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={isEditing} className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all">
                  {isEditing ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
