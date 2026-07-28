import React, { useEffect, useState } from 'react';
import { auditLogService } from '../services/auditLogService';
import type { AuditLogResponseDto } from '../types/auditLog';
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

  const parseValue = (val: string | null) => {
    if (!val) return '-';
    try {
      const parsed = JSON.parse(val);
      // If it's an object, render as key-value tags
      if (typeof parsed === 'object' && parsed !== null) {
        return (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(parsed).map(([k, v]) => (
              <span key={k} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                <span className="font-bold mr-1">{k}:</span> {String(v)}
              </span>
            ))}
          </div>
        );
      }
      return val;
    } catch {
      return val;
    }
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
                <th className="p-4 font-semibold border-b border-slate-200">Eski Değer</th>
                <th className="p-4 font-semibold border-b border-slate-200">Yeni Değer</th>
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
                  <td className="p-4 text-sm max-w-xs overflow-hidden">
                    {parseValue(log.oldValue)}
                  </td>
                  <td className="p-4 text-sm max-w-xs overflow-hidden">
                    {parseValue(log.newValue)}
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
    </div>
  );
};

export default AuditLogs;
