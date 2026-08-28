import React, { useEffect, useState } from 'react';
import { auditLogService } from '../services/auditLogService';
import type { AuditLogResponseDto } from '../types/auditLog';
import { departmentService } from '../services/departmentService';
import type { DepartmentResponseDto } from '../types/department';
import toast from 'react-hot-toast';
import DatePicker, { registerLocale } from 'react-datepicker';
import { tr } from 'date-fns/locale/tr';
import 'react-datepicker/dist/react-datepicker.css';

import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { Modal, ModalHeader, ModalContent } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';

registerLocale('tr', tr);

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [actionFilter, setActionFilter] = useState('All');
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogResponseDto | null>(null);

  useEffect(() => {
    departmentService.getAll().then(res => {
      if (res.data) setDepartments(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [page, startDate, endDate, actionFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const startStr = startDate ? startDate.toISOString().split('T')[0] : undefined;
      const endStr = endDate ? endDate.toISOString().split('T')[0] : undefined;
      const res = await auditLogService.getAll(page, 50, startStr, endStr, actionFilter !== 'All' ? actionFilter : undefined);
      if (res.data) {
        setLogs(res.data);
        const total = Math.ceil(res.totalRecords / res.pageSize);
        setTotalPages(total > 0 ? total : 1);
      }
    } catch (err: any) {
      toast.error('Sistem logları yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const resolveValue = (key: string, val: any) => {
    if ((key === 'DepartmentId' || key === 'departmentId') && typeof val === 'string') {
      const dept = departments.find(d => d.id === val);
      if (dept) return dept.name;
    }
    if (typeof val === 'boolean') {
      return val ? 'Evet' : 'Hayır';
    }
    return String(val);
  };

  const parseLogValue = (val: string | null) => {
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'Create':
        return 'emerald';
      case 'Update':
        return 'blue';
      case 'Delete':
        return 'rose';
      case 'Login':
      case 'ChangePassword':
        return 'purple';
      default:
        return 'slate';
    }
  };

  const renderModal = () => {
    if (!selectedLog) return null;
    
    const oldVal = parseLogValue(selectedLog.oldValue);
    const newVal = parseLogValue(selectedLog.newValue);
    
    const isObject = (val: any) => val !== null && typeof val === 'object' && !Array.isArray(val);
    
    return (
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} className="max-w-4xl">
        <ModalHeader 
          title="Değişiklik Detayları" 
          onClose={() => setSelectedLog(null)} 
        />
        <ModalContent className="p-6 bg-slate-50/50">
          <div className="mb-4">
            <p className="text-sm text-slate-500">
              {new Date(selectedLog.createdAt).toLocaleString('tr-TR')} - İşlem: <span className="font-bold text-slate-700">{selectedLog.action}</span>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Eski Değer */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 bg-rose-50 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h4 className="font-bold text-rose-800 text-sm">Eski Değer</h4>
              </div>
              <div className="p-0 text-sm flex-1 overflow-auto bg-white max-h-96">
                {isObject(oldVal) ? (
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(oldVal).map(([k, v]) => (
                        <tr key={k} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-500 w-1/3 align-top bg-slate-50/30 border-r border-slate-100">{k}</td>
                          <td className="py-2.5 px-4 text-slate-700 break-words">{resolveValue(k, v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-slate-700 whitespace-pre-wrap">{String(oldVal || '-')}</div>
                )}
              </div>
            </div>
            
            {/* Yeni Değer */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 bg-emerald-50 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h4 className="font-bold text-emerald-800 text-sm">Yeni Değer</h4>
              </div>
              <div className="p-0 text-sm flex-1 overflow-auto bg-white max-h-96">
                {isObject(newVal) ? (
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(newVal).map(([k, v]) => (
                        <tr key={k} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-500 w-1/3 align-top bg-slate-50/30 border-r border-slate-100">{k}</td>
                          <td className="py-2.5 px-4 text-slate-700 break-words">
                            {isObject(oldVal) && oldVal[k] !== v ? (
                              <span className="bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded shadow-sm inline-block">{resolveValue(k, v)}</span>
                            ) : (
                              resolveValue(k, v)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-slate-700 whitespace-pre-wrap">{String(newVal || '-')}</div>
                )}
              </div>
            </div>
          </div>
        </ModalContent>
      </Modal>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Sistem Kayıtları (Audit Logs)" 
        description="Sistemdeki tüm kayıt değişikliklerinin tarihsel kaydı." 
      />

      <Card className="flex flex-col flex-1 overflow-hidden min-h-[500px]">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5 w-64">
            <label className="text-sm font-semibold text-slate-700">Tarih Aralığı:</label>
            <div className="relative z-50">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  setDateRange(update);
                  setPage(1);
                }}
                isClearable={true}
                calendarStartDay={1}
                locale="tr"
                placeholderText="Başlangıç - Bitiş seçiniz"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                dateFormat="dd.MM.yyyy"
              />
            </div>
          </div>

          <div className="w-56">
            <Select 
              label="İşlem Tipi:"
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            >
              <option value="All">Tümü</option>
              <option value="Create">Oluşturma (Create)</option>
              <option value="Update">Güncelleme (Update)</option>
              <option value="Delete">Silme (Delete)</option>
              <option value="Login">Giriş (Login)</option>
              <option value="ChangePassword">Şifre Değişimi (ChangePassword)</option>
            </Select>
          </div>
          
          {(startDate || endDate || actionFilter !== 'All') && (
            <div className="ml-auto mb-1">
              <Button 
                variant="danger"
                onClick={() => { setDateRange([null, null]); setActionFilter('All'); setPage(1); }}
              >
                Filtreleri Temizle
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/30">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={8} />
            </div>
          ) : logs.length === 0 ? (
            <div className="h-full flex items-center justify-center p-6">
              <EmptyState 
                title="Kayıt Bulunamadı"
                description="Seçilen kriterlere uygun sistem günlüğü bulunamadı."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Aksiyon</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-800">{log.userName}</div>
                      <div className="text-xs text-slate-500">{log.userEmail}</div>
                    </TableCell>
                    <TableCell>
                       {new Date(log.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action) as any}>
                        {log.action}
                      </Badge>
                      {log.ticketId && (
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Ticket: {log.ticketId.substring(0, 8)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Detaylar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <span className="text-sm text-slate-600">Sayfa {page} / {totalPages}</span>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Önceki
            </Button>
            <Button 
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Sonraki
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Modal */}
      {renderModal()}
    </div>
  );
};

export default AuditLogs;
