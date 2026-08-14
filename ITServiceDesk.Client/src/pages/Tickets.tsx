import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { ticketService } from '../services/ticketService';
import { authService } from '../services/authService';
import { signalrService } from '../services/signalrService';
import { deviceService } from '../services/deviceService';
import { commentService } from '../services/commentService';
import { attachmentService } from '../services/attachmentService';
import { TicketStatus, Priority, type TicketResponseDto, type TicketCreateDto } from '../types/ticket';
import type { CommentResponseDto } from '../types/comment';
import type { AttachmentResponseDto } from '../types/attachment';
import { type DeviceDto, DeviceStatus } from '../types/device';
import { type TicketCategoryDto } from '../types/ticketCategory';
import { ticketCategoryService } from '../services/ticketCategoryService';
import { type UserListDto } from '../types/user';
import { userService } from '../services/userService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import DatePicker, { registerLocale } from 'react-datepicker';
import { tr } from 'date-fns/locale/tr';
import 'react-datepicker/dist/react-datepicker.css';
import { useLocation, useNavigate } from 'react-router-dom';

import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';

registerLocale('tr', tr);

interface TicketsProps {
  mode?: 'all' | 'my-tasks' | 'my-requests';
  onModeChange?: (mode: 'my-tasks' | 'my-requests') => void;
}

const Tickets: React.FC<TicketsProps> = ({ mode = 'all', onModeChange }) => {
  const isAdmin = authService.isAdmin();
  const isTechnician = authService.isTechnician();

  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [ticketCategories, setTicketCategories] = useState<TicketCategoryDto[]>([]);
  const [assignees, setAssignees] = useState<UserListDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Sorting & Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: keyof TicketResponseDto, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
  const [filterType, setFilterType] = useState<'all' | 'resolved' | 'open' | 'inProgress' | 'unresolved'>('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  // Bulk Actions State
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketResponseDto | null>(null);
  const [newTicket, setNewTicket] = useState<TicketCreateDto>({
    title: '',
    description: '',
    priority: Priority.Low,
    deviceId: null,
    categoryId: null
  });
  const [isCreating, setIsCreating] = useState(false);

  // Priority Assessment State
  const [priorityQ1, setPriorityQ1] = useState<number | null>(null);
  const [priorityQ2, setPriorityQ2] = useState<number | null>(null);

  // Update priority when answers change
  useEffect(() => {
    if (priorityQ1 !== null && priorityQ2 !== null) {
      const score = priorityQ1 + priorityQ2;
      let calculatedPriority = Priority.Low;

      if (score >= 5) calculatedPriority = Priority.Critical;
      else if (score === 4) calculatedPriority = Priority.High;
      else if (score === 3) calculatedPriority = Priority.Medium;
      else calculatedPriority = Priority.Low;

      setNewTicket(prev => ({ ...prev, priority: calculatedPriority }));
    }
  }, [priorityQ1, priorityQ2]);


  // Status Update Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updateStatusData, setUpdateStatusData] = useState<{ status: TicketStatus, report: string, assigneeId: string | null, repairCost: number | null }>({ status: TicketStatus.InProgress, report: '', assigneeId: null, repairCost: null });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Edit Ticket Modal State (User)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTicketData, setEditTicketData] = useState<{ id: string, title: string, description: string, priority: Priority, deviceId: string | null, categoryId: string | null }>({ id: '', title: '', description: '', priority: Priority.Low, deviceId: null, categoryId: null });
  const [isEditing, setIsEditing] = useState(false);

  // Reopen Ticket Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  // Comments State
  const [comments, setComments] = useState<CommentResponseDto[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Attachments State
  const [attachments, setAttachments] = useState<AttachmentResponseDto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // New Ticket Files
  const [newTicketFiles, setNewTicketFiles] = useState<File[]>([]);
  const newTicketFileInputRef = React.useRef<HTMLInputElement>(null);

  // Unread Messages State
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});

  useEffect(() => {
    loadTickets();
    loadDevices();
    loadCategories();
    loadAssignees();

    const handleSignalREvent = (ticket: TicketResponseDto) => {
      const currentUserId = authService.getUserId();
      if (isAdmin || ticket.requesterId === currentUserId) {
        loadTickets();
      }
    };

    const handleCommentEvent = (data: { ticketId: string, message: string }) => {
      if (selectedTicket?.id === data.ticketId) {
        loadComments(data.ticketId);
        loadAttachments(data.ticketId);
      } else {
        setUnreadMessages(prev => ({ ...prev, [data.ticketId]: (prev[data.ticketId] || 0) + 1 }));
      }
    };

    signalrService.on('TicketCreated', handleSignalREvent);
    signalrService.on('TicketUpdated', handleSignalREvent);
    signalrService.on('ReceiveCommentNotification', handleCommentEvent);

    const handleOpenTicketEvent = async (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const ticketId = customEvent.detail;
      try {
        const ticket = await ticketService.getById(ticketId);
        setSelectedTicket(ticket);
        loadComments(ticketId);
        loadAttachments(ticketId);
        // Remove unread flag for this ticket
        setUnreadMessages(prev => {
          const next = { ...prev };
          delete next[ticketId];
          return next;
        });
      } catch (error) {
        console.error("Failed to load ticket from notification", error);
      }
    };

    const handleOpenNewTicketEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceId: string, categoryId: string | null }>;
      const { deviceId, categoryId } = customEvent.detail;
      setNewTicket(prev => ({
        ...prev,
        deviceId: deviceId || null,
        categoryId: categoryId || null
      }));
      setIsModalOpen(true);
    };

    window.addEventListener('open-ticket', handleOpenTicketEvent);
    window.addEventListener('open-new-ticket', handleOpenNewTicketEvent);

    return () => {
      signalrService.off('TicketCreated', handleSignalREvent);
      signalrService.off('TicketUpdated', handleSignalREvent);
      signalrService.off('ReceiveCommentNotification', handleCommentEvent);
      window.removeEventListener('open-ticket', handleOpenTicketEvent);
      window.removeEventListener('open-new-ticket', handleOpenNewTicketEvent);
    };
  }, [selectedTicket, mode]);

  useEffect(() => {
    if (location.state?.openTicketId && tickets.length > 0) {
      const ticketToOpen = tickets.find(t => t.id === location.state.openTicketId);
      if (ticketToOpen && selectedTicket?.id !== ticketToOpen.id) {
        setSelectedTicket(ticketToOpen);
        setUnreadMessages(prev => ({ ...prev, [ticketToOpen.id]: 0 }));
        loadComments(ticketToOpen.id);
        loadAttachments(ticketToOpen.id);
        // Clean up the state so it doesn't re-trigger on other re-renders
        navigate(location.pathname, { replace: true, state: {} });
      }
    } else if (location.state?.openNewTicket) {
      setIsModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [tickets, location.state, location.pathname, navigate, selectedTicket?.id]);

  const loadComments = async (ticketId: string) => {
    try {
      const data = await commentService.getByTicketId(ticketId);
      setComments(data);
    } catch (err) {
      console.error('Yorumlar yüklenemedi', err);
    }
  };

  const loadAttachments = async (ticketId: string) => {
    try {
      const data = await attachmentService.getByTicketId(ticketId);
      setAttachments(data);
    } catch (err) {
      console.error('Ekler yüklenemedi', err);
    }
  };

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const filterParams: any = { pageNumber: 1, pageSize: 100 };
      if (mode === 'my-tasks') {
        const currentUserId = authService.getUserId();
        if (currentUserId) {
          filterParams.assigneeId = currentUserId;
        }
      } else if (mode === 'my-requests') {
        const currentUserId = authService.getUserId();
        if (currentUserId) {
          filterParams.requesterId = currentUserId;
        }
      }
      const response = await ticketService.getAll(filterParams);
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
      const data = await deviceService.getAvailable();
      setDevices(data.filter(d => d.status === DeviceStatus.Active));
    } catch (err) {
      console.error("Cihazlar yüklenemedi", err);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await ticketCategoryService.getAll();
      setTicketCategories(data);
    } catch (err) {
      console.error("Kategoriler yüklenemedi", err);
    }
  };

  const loadAssignees = async () => {
    if (!isAdmin) return;
    try {
      const response = await userService.getAll();
      if (response.data) {
        // Sadece Admin veya Teknisyen olanları getir
        const staff = response.data.filter(u => u.roles.includes('Admin') || u.roles.includes('Technician'));
        setAssignees(staff);
      }
    } catch (err) {
      console.error("Personel listesi yüklenemedi", err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const createdTicket = await ticketService.create(newTicket);

      // Upload files if any
      if (newTicketFiles.length > 0) {
        for (const file of newTicketFiles) {
          try {
            await attachmentService.upload({ file, ticketId: createdTicket.id });
          } catch (err) {
            console.error('Dosya yüklenemedi:', file.name, err);
          }
        }
      }

      toast.success('Bilet başarıyla oluşturuldu.');
      setIsModalOpen(false);
      setNewTicket({ title: '', description: '', priority: Priority.Low, deviceId: null, categoryId: null });
      setPriorityQ1(null);
      setPriorityQ2(null);
      setNewTicketFiles([]);
      loadTickets(); // Reload list
    } catch (err: any) {
      alert(err.message || 'Oluşturulamadı.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReopenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !reopenReason.trim()) return;
    try {
      setIsReopening(true);
      await ticketService.reopen(selectedTicket.id, reopenReason);
      toast.success("Bilet başarıyla yeniden açıldı.");
      setIsReopenModalOpen(false);
      setReopenReason('');
      loadTickets();
      const updated = await ticketService.getById(selectedTicket.id);
      setSelectedTicket(updated);
      loadComments(selectedTicket.id);
    } catch (err: any) {
      toast.error(err.message || 'Yeniden açma işlemi başarısız oldu.');
    } finally {
      setIsReopening(false);
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
        assigneeId: updateStatusData.assigneeId,
        departmentId: selectedTicket.departmentId || null,
        deviceId: selectedTicket.deviceId || null,
        categoryId: selectedTicket.categoryId || null,
        resolutionReport: updateStatusData.report || null,
        repairCost: updateStatusData.repairCost || null
      });
      setIsStatusModalOpen(false);
      setSelectedTicket(null);
      toast.success('Talep durumu başarıyla güncellendi.');
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
        deviceId: editTicketData.deviceId || null,
        categoryId: editTicketData.categoryId || null,
        resolutionReport: selectedTicket.resolutionReport || null
      });
      setIsEditModalOpen(false);
      setSelectedTicket(null);
      toast.success('Talep başarıyla güncellendi.');
      loadTickets();
      loadDevices();
    } catch (err: any) {
      alert(err.message || 'Güncelleme başarısız oldu.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newCommentContent.trim()) return;
    try {
      setIsSendingComment(true);
      await commentService.create({
        ticketId: selectedTicket.id,
        userId: authService.getUserId() || '',
        content: newCommentContent,
        isInternal: isInternalComment
      });
      setNewCommentContent('');
      setIsInternalComment(false);
      loadComments(selectedTicket.id);
    } catch (err: any) {
      alert(err.message || 'Yorum gönderilemedi.');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTicket || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setIsUploading(true);
      await attachmentService.upload({
        file,
        ticketId: selectedTicket.id
      });
      loadAttachments(selectedTicket.id);
      toast.success('Dosya yüklendi');
    } catch (err: any) {
      toast.error(err.message || 'Dosya yüklenemedi');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        if (filterType === 'unresolved') return t.status === TicketStatus.Open || t.status === TicketStatus.InProgress || t.status === TicketStatus.WaitingForUser;
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

  const paginatedTickets = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTickets.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTickets, currentPage]);

  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortConfig, filterType, startDate, endDate, tickets.length]);

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
            deviceId: ticket.deviceId || null,
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
      return <svg className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    }
    if (sortConfig.direction === 'asc') {
      return <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.Open: return <Badge variant="emerald">Açık</Badge>;
      case TicketStatus.InProgress: return <Badge variant="blue">İşlemde</Badge>;
      case TicketStatus.WaitingForUser: return <Badge variant="amber">Kullanıcı Bekleniyor</Badge>;
      case TicketStatus.Resolved: return <Badge variant="purple">Çözüldü</Badge>;
      case TicketStatus.Closed: return <Badge variant="slate">Kapalı</Badge>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case Priority.Low: return <Badge variant="slate">Düşük</Badge>;
      case Priority.Medium: return <Badge variant="amber">Orta</Badge>;
      case Priority.High: return <Badge variant="warning">Yüksek</Badge>;
      case Priority.Critical: return <Badge variant="rose">Kritik</Badge>;
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
    <div className="flex flex-col h-full space-y-6">

      <div className="shrink-0">
        {(mode === 'my-tasks' || mode === 'my-requests') && onModeChange ? (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-6 border-b border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => onModeChange('my-tasks')}
                className={`pb-2 px-2 font-bold text-lg transition-colors border-b-2 whitespace-nowrap ${mode === 'my-tasks' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                Görevlerim
              </button>
              <button
                onClick={() => onModeChange('my-requests')}
                className={`pb-2 px-2 font-bold text-lg transition-colors border-b-2 whitespace-nowrap ${mode === 'my-requests' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                Taleplerim
              </button>
            </div>
            {!isAdmin && (
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Yeni Talep Aç
              </Button>
            )}
          </div>
        ) : (
          <PageHeader
            title={mode === 'my-tasks' ? 'Üzerimdeki Talepler' : (isAdmin ? 'Sistemdeki Tüm Destek Talepleri' : 'Tüm Destek Taleplerim')}
            description={mode === 'my-tasks' ? 'Üzerinizdeki talepleri filtreleyin, önceliklendirin ve çözüm süreçlerini yönetin.' : 'Talepleri filtreleyin, yönetin ve durumlarını takip edin.'}
            action={!isAdmin ? {
              label: "Yeni Talep Aç",
              onClick: () => setIsModalOpen(true),
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            } : undefined}
          />
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shrink-0">{error}</div>
      )}

      {/* Bulk Action Panel */}
      {selectedTicketIds.length > 0 && (
        <Card className="bg-indigo-50 border-2 border-indigo-200 p-4 rounded-2xl flex flex-wrap items-center justify-between shrink-0 gap-4 animate-fade-in-down">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
              {selectedTicketIds.length}
            </div>
            <div>
              <h4 className="font-bold text-indigo-900">Talep Seçildi</h4>
              <p className="text-xs text-indigo-700">Toplu işlem modundasınız</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleBulkAction('resolve')}
              disabled={isProcessingBulk}
              variant="primary"
              className="bg-purple-600 hover:bg-purple-700 border-none shadow-md shadow-purple-500/20"
            >
              {isProcessingBulk ? 'İşleniyor...' : (
                <><svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Tümünü Çözüldü İşaretle</>
              )}
            </Button>
            <Button
              onClick={() => handleBulkAction('delete')}
              disabled={isProcessingBulk}
              variant="danger"
              className="shadow-md shadow-rose-500/20"
            >
              {isProcessingBulk ? 'İşleniyor...' : (
                <><svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Tümünü İptal Et</>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Table Container */}
      <Card className="flex-1 flex flex-col overflow-hidden p-0 min-h-0">

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 shrink-0 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex bg-slate-100/80 p-1 rounded-xl overflow-x-auto w-full xl:w-auto custom-scrollbar border border-slate-200/50">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 xl:flex-none ${filterType === 'all' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Tüm Talepler
              </button>
              <button
                onClick={() => setFilterType('resolved')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 xl:flex-none ${filterType === 'resolved' ? 'bg-white text-purple-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Çözülmüş
              </button>
              <button
                onClick={() => setFilterType('open')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 xl:flex-none ${filterType === 'open' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Açık
              </button>
              <button
                onClick={() => setFilterType('inProgress')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 xl:flex-none ${filterType === 'inProgress' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                İşlemde
              </button>
              <button
                onClick={() => setFilterType('unresolved')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 xl:flex-none ${filterType === 'unresolved' ? 'bg-white text-orange-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Çözülmemiş (Açık + İşlemde)
              </button>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-3">
                <Button onClick={exportToPDF} variant="danger" className="text-sm px-4 py-2 shadow-md">
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  PDF
                </Button>
                <Button onClick={exportToExcel} variant="primary" className="text-sm px-4 py-2 shadow-md hover:translate-y-0">
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Excel
                </Button>
              </div>
            )}
          </div>

          {/* Date Filters */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDateRange([null, null])} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${!startDate ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Tüm Zamanlar</button>
              <button onClick={() => { const today = new Date(); setDateRange([today, today]); }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${startDate && startDate.toDateString() === new Date().toDateString() && endDate?.toDateString() === new Date().toDateString() ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Bugün</button>
              <button onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                setDateRange([lastWeek, today]);
              }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${startDate && startDate.toDateString() === new Date(new Date().setDate(new Date().getDate() - 7)).toDateString() ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Son 7 Gün</button>
              <button onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                setDateRange([lastMonth, today]);
              }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${startDate && startDate.toDateString() === new Date(new Date().setMonth(new Date().getMonth() - 1)).toDateString() ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Son 30 Gün</button>
            </div>
            <div className="hidden sm:block h-8 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-semibold text-slate-600 shrink-0">Tarih Aralığı:</label>
              <div className="relative z-50 flex-1 sm:flex-none">
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

        <div className="flex-1 overflow-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedTicketIds.length === sortedTickets.length && sortedTickets.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </TableHead>
                <TableHead>Konu</TableHead>
                <TableHead onClick={() => handleSort('status')} className="cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2">Durum {getSortIcon('status')}</div>
                </TableHead>
                <TableHead>Departman</TableHead>
                <TableHead onClick={() => handleSort('priority')} className="cursor-pointer group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-2">Öncelik {getSortIcon('priority')}</div>
                </TableHead>
                <TableHead onClick={() => handleSort('createdAt')} className="cursor-pointer group hover:bg-slate-100/50 transition-colors whitespace-nowrap">
                  <div className="flex items-center gap-2">Tarih {getSortIcon('createdAt')}</div>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <TableSkeleton rows={5} />
                  </TableCell>
                </TableRow>
              ) : sortedTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64">
                    <EmptyState title="Talep Bulunamadı" description="Arama kriterlerinize uygun destek talebi bulunmuyor." />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id} onClick={() => { setSelectedTicket(ticket); setUnreadMessages(prev => ({ ...prev, [ticket.id]: 0 })); loadComments(ticket.id); loadAttachments(ticket.id); }} className={`cursor-pointer group ${selectedTicketIds.includes(ticket.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50 transition-colors'}`}>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTicketIds.includes(ticket.id)}
                        onChange={() => handleSelectTicket(ticket.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        {ticket.title}
                        {unreadMessages[ticket.id] > 0 && (
                          <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse">
                            {unreadMessages[ticket.id]}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 truncate max-w-[200px] md:max-w-[300px] xl:max-w-[400px]">{ticket.description}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                        {ticket.departmentName || 'Belirtilmedi'}
                      </span>
                    </TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {isAdmin && Number(ticket.status) !== TicketStatus.Resolved && Number(ticket.status) !== TicketStatus.Closed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                            setUnreadMessages(prev => ({ ...prev, [ticket.id]: 0 }));
                            loadComments(ticket.id);
                            loadAttachments(ticket.id);
                            setUpdateStatusData({ status: TicketStatus.InProgress, report: '', assigneeId: ticket.assigneeId || null, repairCost: ticket.repairCost || null });
                            setIsStatusModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Durum Güncelle"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {!isAdmin && (!isTechnician || mode === 'my-requests') && ticket.status === TicketStatus.Open && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                            setUnreadMessages(prev => ({ ...prev, [ticket.id]: 0 }));
                            loadComments(ticket.id);
                            loadAttachments(ticket.id);
                            setEditTicketData({ id: ticket.id, title: ticket.title, description: ticket.description, priority: ticket.priority, deviceId: ticket.deviceId || null, categoryId: ticket.categoryId || null });
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {isTechnician && mode === 'my-tasks' && Number(ticket.status) !== TicketStatus.Resolved && Number(ticket.status) !== TicketStatus.Closed && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                            setUnreadMessages(prev => ({ ...prev, [ticket.id]: 0 }));
                            loadComments(ticket.id);
                            loadAttachments(ticket.id);
                            setUpdateStatusData({ status: TicketStatus.InProgress, report: '', assigneeId: ticket.assigneeId || null, repairCost: ticket.repairCost || null });
                            setIsStatusModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Düzenle"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </Button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTicket(ticket.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="İptal Et"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 shrink-0">
            <div className="text-sm text-slate-500">
              Toplam <span className="font-semibold text-slate-700">{sortedTickets.length}</span> kayıttan <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sortedTickets.length)}</span> arası gösteriliyor
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                Önceki
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${currentPage === page ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-200 text-slate-600 bg-transparent'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {createPortal(
        <Modal
          isOpen={isModalOpen && !isAdmin}
          onClose={() => { setIsModalOpen(false); setPriorityQ1(null); setPriorityQ2(null); }}
          className="max-w-xl"
        >
          <ModalHeader
            title="Yeni Talep Oluştur"
            onClose={() => { setIsModalOpen(false); setPriorityQ1(null); setPriorityQ2(null); }}
          />
          <form onSubmit={handleCreateTicket} className="flex flex-col h-full overflow-hidden max-h-[80vh]">
            <ModalContent className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Konu / Başlık</label>
                <Input
                  type="text"
                  value={newTicket.title}
                  onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                  required
                  placeholder="Örn: E-Posta hesabıma giremiyorum"
                />
              </div>
              <Textarea
                label="Açıklama"
                value={newTicket.description}
                onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                required
                rows={4}
                className="resize-none bg-white"
                placeholder="Detaylı bilgi veriniz..."
              />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Öncelik Değerlendirmesi</label>
                <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800 mb-2">Soru 1: Bu durum kimi / neyi etkiliyor?</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="radio" name="q1" checked={priorityQ1 === 1} onChange={() => setPriorityQ1(1)} className="text-emerald-600 focus:ring-emerald-500" />
                        Sadece beni
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="radio" name="q1" checked={priorityQ1 === 2} onChange={() => setPriorityQ1(2)} className="text-emerald-600 focus:ring-emerald-500" />
                        Departmanımı
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="radio" name="q1" checked={priorityQ1 === 3} onChange={() => setPriorityQ1(3)} className="text-emerald-600 focus:ring-emerald-500" />
                        Tüm şirketi veya müşterileri
                      </label>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm font-medium text-slate-800 mb-2">Soru 2: Bu sorun işinizi yapmanızı ne kadar engelliyor?</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="radio" name="q2" checked={priorityQ2 === 1} onChange={() => setPriorityQ2(1)} className="text-emerald-600 focus:ring-emerald-500" />
                        İşimi engellemiyor, sadece bilgi / destek talebi
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="radio" name="q2" checked={priorityQ2 === 2} onChange={() => setPriorityQ2(2)} className="text-emerald-600 focus:ring-emerald-500" />
                        İşimi yavaşlatıyor ama alternatif bir yolum var
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="radio" name="q2" checked={priorityQ2 === 3} onChange={() => setPriorityQ2(3)} className="text-emerald-600 focus:ring-emerald-500" />
                        İşim tamamen durdu, hiçbir şekilde çalışamıyorum
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori (Opsiyonel)</label>
                <Select
                  value={newTicket.categoryId || ''}
                  onChange={e => setNewTicket({ ...newTicket, categoryId: e.target.value || null })}
                >
                  <option value="">Kategori Seçiniz...</option>
                  {ticketCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">İlgili Cihaz (Opsiyonel)</label>
                <Select
                  value={newTicket.deviceId || ''}
                  onChange={e => setNewTicket({ ...newTicket, deviceId: e.target.value || null })}
                >
                  <option value="">Cihaz Seçiniz...</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Ek Dosyalar</label>
                <input
                  type="file"
                  multiple
                  ref={newTicketFileInputRef}
                  onChange={(e) => {
                    if (e.target.files) {
                      setNewTicketFiles(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => newTicketFileInputRef.current?.click()}
                    className="w-fit text-xs font-semibold px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    + Dosya Seç
                  </button>
                  {newTicketFiles.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {newTicketFiles.map((file, i) => (
                        <div key={i} className="px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium border border-sky-100 flex items-center gap-2">
                          {file.name}
                          <button type="button" onClick={() => setNewTicketFiles(files => files.filter((_, index) => index !== i))} className="text-sky-400 hover:text-rose-500">
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ModalContent>
            <ModalFooter>
              <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setPriorityQ1(null); setPriorityQ2(null); }}>
                İptal
              </Button>
              <Button type="submit" variant="primary" disabled={isCreating || priorityQ1 === null || priorityQ2 === null}>
                {isCreating ? 'Oluşturuluyor...' : 'Bileti Gönder'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
        , document.body)}

      {/* Ticket Details Modal */}
      {createPortal(
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          className="max-w-3xl"
        >
          <ModalHeader
            title={selectedTicket?.title || ''}
            onClose={() => setSelectedTicket(null)}
          />
          {selectedTicket && (
            <div className="flex flex-col h-full overflow-hidden max-h-[85vh]">
              <ModalContent className="flex-1 p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Durum
                    </span>
                    <div>{getStatusBadge(selectedTicket.status)}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Öncelik
                    </span>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(selectedTicket.priority)}
                      {selectedTicket.isEscalated && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 shadow-sm">Gecikmiş</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Oluşturulma
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {new Date(selectedTicket.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Talep Eden
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm">
                        {(selectedTicket.requesterName || 'B').charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 truncate" title={selectedTicket.requesterName}>{selectedTicket.requesterName || 'Bilinmiyor'}</span>
                    </div>
                  </div>
                  {selectedTicket.assigneeName && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Atanan Kişi
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shadow-sm">
                          {selectedTicket.assigneeName.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 truncate" title={selectedTicket.assigneeName}>{selectedTicket.assigneeName}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      Arıza Türü
                    </span>
                    <span className="text-sm font-semibold text-slate-700 truncate" title={selectedTicket.categoryName || 'Belirtilmedi'}>{selectedTicket.categoryName || 'Belirtilmedi'}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      Departman
                    </span>
                    <span className="text-sm font-semibold text-slate-700 truncate" title={selectedTicket.departmentName}>{selectedTicket.departmentName || 'Belirtilmedi'}</span>
                  </div>
                  {(Number(selectedTicket.status) === TicketStatus.Resolved || Number(selectedTicket.status) === TicketStatus.Closed) && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Çözülme
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {selectedTicket.resolvedAt
                          ? new Date(selectedTicket.resolvedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Belirtilmedi'}
                      </span>
                    </div>
                  )}
                  {selectedTicket.deviceName && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        İlgili Cihaz
                      </span>
                      <span className="text-sm font-semibold text-slate-700 truncate" title={selectedTicket.deviceName}>{selectedTicket.deviceName}</span>
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-slate-700 mb-2">Açıklama:</h4>
                <p className="text-slate-600 bg-slate-50/50 border border-slate-100 p-4 rounded-xl whitespace-pre-wrap break-words leading-relaxed">
                  {selectedTicket.description}
                </p>

                {selectedTicket.resolutionReport && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Durum Notu / Rapor:</h4>
                    <p className="text-slate-600 bg-blue-50/50 border border-blue-100 p-4 rounded-xl whitespace-pre-wrap break-words leading-relaxed">
                      {selectedTicket.resolutionReport}
                    </p>
                  </div>
                )}

                {selectedTicket.repairCost !== null && selectedTicket.repairCost > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Onarım / Parça Maliyeti:</h4>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {selectedTicket.repairCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </div>
                  </div>
                )}

                {/* Attachments Section */}
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      Ek Dosyalar ({attachments.length})
                    </h4>
                    <div>
                      {Number(selectedTicket.status) !== TicketStatus.Resolved && Number(selectedTicket.status) !== TicketStatus.Closed && (
                        <React.Fragment>
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="text-xs font-semibold px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {isUploading ? 'Yükleniyor...' : '+ Dosya Ekle'}
                          </button>
                        </React.Fragment>
                      )}
                    </div>
                  </div>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {attachments.map(att => (
                        <div key={att.id} className="flex flex-col border border-slate-200 rounded-xl overflow-hidden hover:border-sky-300 transition-colors bg-white w-48">
                          <a
                            href={att.filePath}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 p-3 group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-700 truncate" title={att.fileName}>{att.fileName}</span>
                              <span className="text-xs text-slate-400">{(att.fileSize / 1024).toFixed(1)} KB</span>
                            </div>
                          </a>
                          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              {att.uploaderName || 'Bilinmiyor'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


                {/* Comments Section */}
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    İletişim & Yorumlar ({comments.length})
                  </h4>

                  <div className="space-y-4 mb-4 pr-2">
                    {comments.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">Henüz yorum yapılmamış.</p>
                    ) : (
                      comments.map(comment => {
                        const isMe = comment.userId === authService.getUserId();
                        return (
                          <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200'}`}>
                              <div className="flex justify-between items-end gap-4 mb-1">
                                <span className={`text-xs font-bold ${isMe ? 'text-indigo-200' : 'text-slate-500'}`}>{isMe ? 'Ben' : comment.userName}</span>
                                <span className={`text-[10px] ${isMe ? 'text-indigo-300' : 'text-slate-400'}`}>
                                  {new Date(comment.createdAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                              {comment.isInternal && (
                                <span className="px-2 py-0.5 ml-2 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md uppercase tracking-wider">Gizli Not</span>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words mt-1">{comment.content}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {Number(selectedTicket.status) !== TicketStatus.Resolved && Number(selectedTicket.status) !== TicketStatus.Closed ? (
                    <form onSubmit={handleSendComment} className="flex flex-col gap-2">
                      {(isAdmin || isTechnician) && (
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 self-end">
                          <input
                            type="checkbox"
                            checked={isInternalComment}
                            onChange={(e) => setIsInternalComment(e.target.checked)}
                            className="w-4 h-4 text-rose-600 bg-slate-100 border-slate-300 rounded focus:ring-rose-500 focus:ring-2"
                          />
                          Gizli Not (Sadece Admin/Teknisyen görebilir)
                        </label>
                      )}
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={newCommentContent}
                          onChange={e => setNewCommentContent(e.target.value)}
                          placeholder="Bir mesaj yazın..."
                          disabled={isSendingComment}
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          disabled={isSendingComment || !newCommentContent.trim()}
                          variant="primary"
                          className="min-w-[100px]"
                        >
                          {isSendingComment ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          ) : (
                            'Gönder'
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm p-4 rounded-xl text-center space-y-3">
                      <p>Bu talep çözüldüğü veya kapatıldığı için yeni mesaja kapalıdır.</p>
                      {selectedTicket.status === TicketStatus.Resolved && (
                        <div>
                          <Button 
                            variant="secondary" 
                            className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 shadow-none text-xs px-3 py-1.5 h-auto"
                            onClick={() => setIsReopenModalOpen(true)}
                          >
                            Talebi Yeniden Aç (Re-open)
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ModalContent>

              <ModalFooter>
                {(isAdmin || (isTechnician && selectedTicket.assigneeId === authService.getUserId())) && Number(selectedTicket.status) !== TicketStatus.Resolved && Number(selectedTicket.status) !== TicketStatus.Closed && (
                  <Button
                    onClick={() => {
                      if (Number(selectedTicket.status) === TicketStatus.Resolved || Number(selectedTicket.status) === TicketStatus.Closed) {
                        alert("Bu talep zaten çözülmüş veya kapatılmış.");
                        return;
                      }
                      setUpdateStatusData({ status: TicketStatus.InProgress, report: '', assigneeId: selectedTicket.assigneeId || null, repairCost: selectedTicket.repairCost || null });
                      setIsStatusModalOpen(true);
                    }}
                    variant="primary"
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Durum Güncelle
                  </Button>
                )}
                {!isAdmin && selectedTicket.status === TicketStatus.Open && (
                  <Button
                    onClick={() => {
                      setEditTicketData({ id: selectedTicket.id, title: selectedTicket.title, description: selectedTicket.description, priority: selectedTicket.priority, deviceId: selectedTicket.deviceId || null, categoryId: selectedTicket.categoryId || null });
                      setIsEditModalOpen(true);
                    }}
                    variant="secondary"
                  >
                    Düzenle
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  Kapat
                </Button>
              </ModalFooter>
            </div>
          )}
        </Modal>
        , document.body)}

      {/* Reopen Ticket Modal */}
      {createPortal(
        <Modal
          isOpen={isReopenModalOpen && !!selectedTicket}
          onClose={() => setIsReopenModalOpen(false)}
          className="max-w-lg"
        >
          <ModalHeader
            title="Talebi Yeniden Aç"
            onClose={() => setIsReopenModalOpen(false)}
          />
          <form onSubmit={handleReopenTicket}>
            <ModalContent className="space-y-4">
              <div className="bg-amber-50 text-amber-800 text-sm p-4 rounded-xl border border-amber-100">
                <p className="font-semibold mb-1">Dikkat!</p>
                <p>Bileti yeniden açmak üzeresiniz. Lütfen sorunun devam ettiğine dair detaylı bir açıklama yazınız.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Yeniden Açma Nedeni</label>
                <textarea
                  className="w-full rounded-xl border-slate-200 focus:border-amber-500 focus:ring-amber-500 text-sm p-3 min-h-[100px] resize-none"
                  placeholder="Sorun neden devam ediyor?"
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  required
                />
              </div>
            </ModalContent>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setIsReopenModalOpen(false)}>
                İptal
              </Button>
              <Button 
                type="submit" 
                disabled={isReopening || !reopenReason.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isReopening ? 'Açılıyor...' : 'Yeniden Aç'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
        , document.body)}

      {/* Status Update Modal */}
      {createPortal(
        <Modal
          isOpen={isStatusModalOpen && !!selectedTicket}
          onClose={() => setIsStatusModalOpen(false)}
          className="max-w-lg"
        >
          <ModalHeader
            title="Durum Güncelle"
            onClose={() => setIsStatusModalOpen(false)}
          />
          <form onSubmit={handleUpdateStatusSubmit} className="flex flex-col h-full overflow-hidden max-h-[80vh]">
            <ModalContent className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Yeni Durum</label>
                <Select
                  value={updateStatusData.status}
                  onChange={e => setUpdateStatusData({ ...updateStatusData, status: Number(e.target.value) })}
                >
                  <option value={TicketStatus.InProgress}>Devam Ediyor (İşlemde)</option>
                  <option value={TicketStatus.WaitingForUser}>Kullanıcı Bekleniyor</option>
                  <option value={TicketStatus.Resolved}>Çözüldü</option>
                  <option value={TicketStatus.Closed}>Kapalı (İptal)</option>
                </Select>
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Atanan Kişi (Opsiyonel)</label>
                  <Select
                    value={updateStatusData.assigneeId || ''}
                    onChange={e => setUpdateStatusData({ ...updateStatusData, assigneeId: e.target.value || null })}
                  >
                    <option value="">Atama Yapılmadı</option>
                    {assignees.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.roles.join(', ')})</option>
                    ))}
                  </Select>
                </div>
              )}
              <Textarea
                label="Rapor / Not (Opsiyonel)"
                value={updateStatusData.report}
                onChange={e => setUpdateStatusData({ ...updateStatusData, report: e.target.value })}
                rows={4}
                className="resize-none bg-white focus:ring-blue-500/50 focus:border-blue-500"
              />
              {updateStatusData.status === TicketStatus.Resolved && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Onarım / Parça Maliyeti (Opsiyonel - ₺)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={updateStatusData.repairCost || ''}
                    onChange={e => setUpdateStatusData({ ...updateStatusData, repairCost: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Örn: 1500.50"
                  />
                </div>
              )}
            </ModalContent>
            <ModalFooter>
              <Button type="button" variant="ghost" onClick={() => setIsStatusModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" variant="primary" disabled={isUpdatingStatus}>
                {isUpdatingStatus ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
        , document.body)}

      {/* Edit Ticket Modal */}
      {createPortal(
        <Modal
          isOpen={isEditModalOpen && !!editTicketData}
          onClose={() => setIsEditModalOpen(false)}
          className="max-w-lg"
        >
          <ModalHeader
            title="Talebi Düzenle"
            onClose={() => setIsEditModalOpen(false)}
          />
          <form onSubmit={handleEditTicketSubmit} className="flex flex-col h-full overflow-hidden max-h-[80vh]">
            <ModalContent className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Konu / Başlık</label>
                <Input
                  type="text"
                  value={editTicketData?.title || ''}
                  onChange={e => setEditTicketData({ ...editTicketData!, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Açıklama</label>
                <textarea
                  value={editTicketData?.description || ''}
                  onChange={e => setEditTicketData({ ...editTicketData!, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none resize-none text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori (Opsiyonel)</label>
                <Select
                  value={editTicketData?.categoryId || ''}
                  onChange={e => setEditTicketData({ ...editTicketData!, categoryId: e.target.value || null })}
                >
                  <option value="">Kategori Seçiniz...</option>
                  {ticketCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">İlgili Cihaz (Opsiyonel)</label>
                <Select
                  value={editTicketData?.deviceId || ''}
                  onChange={e => setEditTicketData({ ...editTicketData!, deviceId: e.target.value || null })}
                >
                  <option value="">Cihaz Seçiniz...</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </Select>
              </div>
            </ModalContent>
            <ModalFooter>
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" variant="primary" disabled={isEditing}>
                {isEditing ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
        , document.body)}
    </div>
  );
};

export default Tickets;
