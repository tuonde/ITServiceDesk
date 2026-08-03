import React, { useEffect, useState } from 'react';
import { auditLogService } from '../services/auditLogService';
import type { AuditLogResponseDto } from '../types/auditLog';
import { departmentService } from '../services/departmentService';
import type { DepartmentResponseDto } from '../types/department';
import toast from 'react-hot-toast';
import DatePicker, { registerLocale } from 'react-datepicker';
import { tr } from 'date-fns/locale/tr';
import 'react-datepicker/dist/react-datepicker.css';

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

  const renderModal = () => {
    if (!selectedLog) return null;
    
    const oldVal = parseLogValue(selectedLog.oldValue);
    const newVal = parseLogValue(selectedLog.newValue);
    
    const isObject = (val: any) => val !== null && typeof val === 'object' && !Array.isArray(val);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedLog(null)}>
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Değişiklik Detayları</h3>
              <p className="text-xs text-slate-500 mt-1">{new Date(selectedLog.createdAt).toLocaleString('tr-TR')} - İşlem: <span className="font-semibold text-slate-700">{selectedLog.action}</span></p>
            </div>
            <button 
              onClick={() => setSelectedLog(null)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div className="p-6 overflow-auto flex-1 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Eski Değer */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 bg-rose-50 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <h4 className="font-bold text-rose-800 text-sm">Eski Değer</h4>
                </div>
                <div className="p-0 text-sm flex-1 overflow-auto bg-white">
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
                <div className="p-0 text-sm flex-1 overflow-auto bg-white">
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
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Sistem Kayıtları (Audit Logs)</h2>
          <p className="text-sm text-slate-500 mt-1">Sistemdeki tüm kayıt değişikliklerinin tarihsel kaydı.</p>
        </div>
      </div>

      <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">Tarih Aralığı:</label>
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
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-56"
              dateFormat="dd.MM.yyyy"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">İşlem Tipi:</label>
          <select 
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="All">Tümü</option>
            <option value="Create">Oluşturma (Create)</option>
            <option value="Update">Güncelleme (Update)</option>
            <option value="Delete">Silme (Delete)</option>
            <option value="Login">Giriş (Login)</option>
            <option value="ChangePassword">Şifre Değişimi (ChangePassword)</option>
          </select>
        </div>
        {(startDate || endDate || actionFilter !== 'All') && (
          <button 
            onClick={() => { setDateRange([null, null]); setActionFilter('All'); setPage(1); }}
            className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors ml-auto"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-slate-500">Yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             Henüz log bulunmuyor.
          </div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0 z-10">
                <th className="p-4 font-semibold border-b border-slate-200">Kullanıcı</th>
                <th className="p-4 font-semibold border-b border-slate-200">Tarih</th>
                <th className="p-4 font-semibold border-b border-slate-200">Aksiyon</th>
                <th className="p-4 font-semibold border-b border-slate-200 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{log.userName}</div>
                    <div className="text-xs text-slate-500">{log.userEmail}</div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                     {new Date(log.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {log.action}
                    </span>
                    {log.ticketId && (
                      <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Ticket: {log.ticketId.substring(0, 8)}</div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 shadow-sm inline-flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      Değişiklikleri Gör
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <span className="text-sm text-slate-600">Sayfa {page} / {totalPages}</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            Önceki
          </button>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            Sonraki
          </button>
        </div>
      </div>
      
      {/* Modal */}
      {renderModal()}
    </div>
  );
};

export default AuditLogs;
