import React, { useEffect, useState, useMemo } from 'react';
import { ticketService } from '../services/ticketService';
import { TicketStatus, type TicketResponseDto } from '../types/ticket';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';

const Reports: React.FC = () => {
  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await ticketService.getAll({ pageNumber: 1, pageSize: 1000 });
      if (res.data) setTickets(res.data);
    } catch (error) {
      console.error("Error loading tickets for reports", error);
    } finally {
      setIsLoading(false);
    }
  };

  const metrics = useMemo(() => {
    if (!tickets.length) return null;

    const resolvedTickets = tickets.filter(t => t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed);
    
    // 1. Ortalama Çözüm Süresi
    let totalResolutionMinutes = 0;
    let resolvedWithDates = 0;
    resolvedTickets.forEach(t => {
      if (t.resolvedAt && t.createdAt) {
        const diffMs = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
        totalResolutionMinutes += diffMs / (1000 * 60);
        resolvedWithDates++;
      }
    });
    
    let avgResString = "0 saniye";
    if (resolvedWithDates > 0) {
      const avgMins = Math.floor(totalResolutionMinutes / resolvedWithDates);
      const avgSecs = Math.round((totalResolutionMinutes / resolvedWithDates) * 60);
      
      if (avgSecs < 60) {
        avgResString = `${avgSecs} saniye`;
      } else {
        const days = Math.floor(avgMins / (24 * 60));
        const hours = Math.floor((avgMins % (24 * 60)) / 60);
        const mins = avgMins % 60;
        
        const parts = [];
        if (days > 0) parts.push(`${days} gün`);
        if (hours > 0) parts.push(`${hours} saat`);
        if (mins > 0) parts.push(`${mins} dakika`);
        
        avgResString = parts.join(' ');
      }
    }

    // 2. Haftanın En Sorunlu Departmanı
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const lastWeekTickets = tickets.filter(t => new Date(t.createdAt) >= sevenDaysAgo);
    
    const deptMap: Record<string, number> = {};
    lastWeekTickets.forEach(t => {
      const dept = t.departmentName || 'Belirtilmedi';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    let topDept = 'Yok';
    let maxDeptTickets = 0;
    Object.entries(deptMap).forEach(([dept, count]) => {
      if (count > maxDeptTickets) {
        maxDeptTickets = count;
        topDept = dept;
      }
    });

    // 3. SLA İhlal Oranı
    let slaBreaches = 0;
    tickets.forEach(t => {
      if (t.isEscalated) {
        slaBreaches++;
      } else if (t.resolutionDueDate) {
        const dueDate = new Date(t.resolutionDueDate).getTime();
        const resolvedDate = t.resolvedAt ? new Date(t.resolvedAt).getTime() : new Date().getTime();
        if (resolvedDate > dueDate) {
          slaBreaches++;
        }
      }
    });
    const slaBreachPercent = tickets.length > 0 ? ((slaBreaches / tickets.length) * 100).toFixed(1) : '0';

    // 4. Çözüm Oranı (Resolution Rate)
    const resolutionRate = tickets.length > 0 ? ((resolvedTickets.length / tickets.length) * 100).toFixed(1) : '0';

    return {
      avgResString,
      topDept,
      maxDeptTickets,
      slaBreachPercent,
      resolutionRate
    };
  }, [tickets]);

  // Chart 1: Personel Bazlı Çözüm Süresi
  const assigneePerformance = useMemo(() => {
    const map: Record<string, { totalHours: number, count: number }> = {};
    tickets.forEach(t => {
      if (t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed) {
        const name = t.assigneeId ? `Per ${t.assigneeId.substring(0,4).toUpperCase()}` : 'Atanmamış';
        const endStr = t.resolvedAt || new Date().toISOString();
        if (endStr) {
          const diffMs = new Date(endStr).getTime() - new Date(t.createdAt).getTime();
          const hours = diffMs / (1000 * 60 * 60);
          if (!map[name]) map[name] = { totalHours: 0, count: 0 };
          map[name].totalHours += hours;
          map[name].count++;
        }
      }
    });
    const result = Object.entries(map).map(([name, data]) => ({
      name,
      'Ortalama Saat': parseFloat((data.totalHours / data.count).toFixed(1))
    })).sort((a, b) => b['Ortalama Saat'] - a['Ortalama Saat']).slice(0, 10);
    
    return result;
  }, [tickets]);

  // Chart 2: 30 Günlük Trend
  const trendData = useMemo(() => {
    const map: Record<string, number> = {};
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map[d.toISOString().split('T')[0]] = 0;
    }

    tickets.forEach(t => {
      const dStr = new Date(t.createdAt).toISOString().split('T')[0];
      if (map[dStr] !== undefined) {
        map[dStr]++;
      }
    });

    return Object.entries(map).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      'Talep Sayısı': count
    }));
  }, [tickets]);

  // Chart 3: SLA Durumu
  const slaPieData = useMemo(() => {
    let onTime = 0;
    let delayed = 0;
    let pending = 0;

    tickets.forEach(t => {
      if (t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed) {
        if (t.isEscalated || (t.resolutionDueDate && t.resolvedAt && new Date(t.resolvedAt) > new Date(t.resolutionDueDate))) {
          delayed++;
        } else {
          onTime++;
        }
      } else {
        if (t.isEscalated || (t.resolutionDueDate && new Date() > new Date(t.resolutionDueDate))) {
          delayed++;
        } else {
          pending++;
        }
      }
    });

    return [
      { name: 'Zamanında Çözülen', value: onTime, color: '#10b981' }, // emerald
      { name: 'Geciken / İhlal', value: delayed, color: '#f43f5e' }, // rose
      { name: 'Bekleyen (Süresi Var)', value: pending, color: '#3b82f6' } // blue
    ];
  }, [tickets]);

  // Chart 4: Departmanlara Göre Talepler
  const deptBarData = useMemo(() => {
    const deptMap: Record<string, number> = {};
    tickets.forEach(t => {
      const deptName = t.departmentName || 'Belirtilmeyen';
      deptMap[deptName] = (deptMap[deptName] || 0) + 1;
    });
    return Object.keys(deptMap).map(key => ({
      name: key.length > 15 ? key.substring(0, 15) + '...' : key,
      fullName: key,
      count: deptMap[key]
    })).sort((a, b) => b.count - a.count);
  }, [tickets]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Gelişmiş Raporlar ve Analizler</h2>
        <p className="text-sm text-slate-500 mt-1">Sistem performans metrikleri ve personel verimlilik raporları.</p>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 font-medium">Raporlar Hesaplanıyor...</div>
        ) : !metrics ? (
          <div className="flex items-center justify-center h-64 text-slate-500">Yeterli veri bulunamadı.</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md">
                <p className="text-sm font-semibold text-slate-500 mb-1">Ortalama Çözüm Süresi</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-xl lg:text-2xl font-black text-slate-800">{metrics.avgResString}</h3>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md">
                <p className="text-sm font-semibold text-slate-500 mb-1">Haftanın En Yoğun Departmanı</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-2xl font-black text-indigo-600 truncate">{metrics.topDept}</h3>
                  <span className="text-sm font-bold text-slate-400 mb-1">({metrics.maxDeptTickets} talep)</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md">
                <p className="text-sm font-semibold text-slate-500 mb-1">SLA İhlal Oranı</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-3xl font-black text-rose-600">%{metrics.slaBreachPercent}</h3>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md">
                <p className="text-sm font-semibold text-slate-500 mb-1">Genel Çözüm Oranı</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-3xl font-black text-emerald-600">%{metrics.resolutionRate}</h3>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Trend Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                <h3 className="text-base font-bold text-slate-800 mb-6">Son 30 Günlük Talep Trendi</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="Talep Sayısı" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SLA Pie Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-base font-bold text-slate-800 mb-6">SLA Başarı Dağılımı</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={slaPieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {slaPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#334155', fontWeight: '500' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Personnel Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-3">
                <h3 className="text-base font-bold text-slate-800 mb-6">Personel Bazlı Ortalama Çözüm Süresi (Saat)</h3>
                <div className="h-[300px]">
                  {assigneePerformance.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Veri bulunmuyor (Çözülmüş talep yok)</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={assigneePerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="Ortalama Saat" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {assigneePerformance.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Departments Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-3">
                <h3 className="text-base font-bold text-slate-800 mb-6">Departmanlara Göre Talepler</h3>
                <div className="h-[300px]">
                  {deptBarData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Veri bulunmuyor</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                          formatter={(value: any) => [value, 'Talep Sayısı']}
                          labelFormatter={(label) => {
                             const item = deptBarData.find(d => d.name === label);
                             return item ? item.fullName : label;
                          }}
                        />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {deptBarData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
