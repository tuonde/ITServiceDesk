import React, { useEffect, useState } from 'react';
import { reportService } from '../services/reportService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';

const Reports: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await reportService.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error("Error loading data for reports", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gelişmiş Raporlar ve Analizler" 
        description="Sistem performans metrikleri ve personel verimlilik raporları."
      />

      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : !metrics ? (
          <div className="flex items-center justify-center h-64 text-slate-500">Yeterli veri bulunamadı.</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 flex flex-col justify-center transition-all hover:shadow-md border-slate-100">
                <p className="text-sm font-semibold text-slate-500 mb-1">Ortalama Çözüm Süresi</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-xl lg:text-2xl font-black text-slate-800">{metrics.avgResString}</h3>
                </div>
              </Card>
              <Card className="p-6 flex flex-col justify-center transition-all hover:shadow-md border-slate-100">
                <p className="text-sm font-semibold text-slate-500 mb-1">Haftanın En Yoğun Departmanı</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-2xl font-black text-indigo-600 truncate">{metrics.topDept}</h3>
                  <span className="text-sm font-bold text-slate-400 mb-1">({metrics.maxDeptTickets} talep)</span>
                </div>
              </Card>
              <Card className="p-6 flex flex-col justify-center transition-all hover:shadow-md border-slate-100">
                <p className="text-sm font-semibold text-slate-500 mb-1">SLA İhlal Oranı</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-3xl font-black text-rose-600">%{metrics.slaBreachPercent}</h3>
                </div>
              </Card>
              <Card className="p-6 flex flex-col justify-center transition-all hover:shadow-md border-slate-100">
                <p className="text-sm font-semibold text-slate-500 mb-1">Genel Çözüm Oranı</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-3xl font-black text-emerald-600">%{metrics.resolutionRate}</h3>
                </div>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Trend Chart */}
              <Card className="lg:col-span-2 border-slate-100">
                <CardHeader>
                  <h3 className="text-base font-bold text-slate-800">Son 30 Günlük Talep Trendi</h3>
                </CardHeader>
                <CardContent className="h-[300px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => new Date(value as any).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                        labelFormatter={(value) => new Date(value as any).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      />
                      <Area type="monotone" dataKey="talepSayisi" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" name="Talep Sayısı" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* SLA Pie Chart */}
              <Card className="border-slate-100">
                <CardHeader>
                  <h3 className="text-base font-bold text-slate-800">SLA Başarı Dağılımı</h3>
                </CardHeader>
                <CardContent className="h-[300px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.slaPieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {metrics.slaPieData.map((entry: any, index: number) => (
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
                </CardContent>
              </Card>

              {/* Department Resolution Time Chart */}
              <Card className="lg:col-span-3 border-slate-100">
                <CardHeader>
                  <h3 className="text-base font-bold text-slate-800">Departman Bazlı Ortalama Çözüm Süresi (Saat)</h3>
                </CardHeader>
                <CardContent className="h-[300px] pt-0">
                  {!metrics.departmentPerformance || metrics.departmentPerformance.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Veri bulunmuyor (Çözülmüş talep yok)</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.departmentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                          labelFormatter={(label) => {
                             const item = metrics.departmentPerformance.find((d: any) => d.name === label);
                             return item ? item.fullName : label;
                          }}
                        />
                        <Bar dataKey="ortalamaSaat" name="Ortalama Saat" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {metrics.departmentPerformance.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Departments Chart */}
              <Card className="lg:col-span-3 border-slate-100">
                <CardHeader>
                  <h3 className="text-base font-bold text-slate-800">Departmanlara Göre Talepler</h3>
                </CardHeader>
                <CardContent className="h-[300px] pt-0">
                  {!metrics.deptBarData || metrics.deptBarData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Veri bulunmuyor</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.deptBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                          formatter={(value: any) => [value, 'Talep Sayısı']}
                          labelFormatter={(label) => {
                             const item = metrics.deptBarData.find((d: any) => d.name === label);
                             return item ? item.fullName : label;
                          }}
                        />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {metrics.deptBarData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Workload Distribution Chart */}
              <Card className="lg:col-span-3 border-slate-100">
                <CardHeader>
                  <h3 className="text-base font-bold text-slate-800">İş Yükü Dağılımı (Açık ve İşlemdeki Talepler)</h3>
                </CardHeader>
                <CardContent className="h-[300px] pt-0">
                  {!metrics.workloadData || metrics.workloadData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Veri bulunmuyor</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                          formatter={(value: any) => [value, 'Aktif Talep']}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {metrics.workloadData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Technician Performance Chart */}
              <Card className="lg:col-span-3 border-slate-100">
                <CardHeader>
                  <h3 className="text-base font-bold text-slate-800">Teknisyen Performansı (Ortalama Çözüm Süresi ve Çözülen Talep)</h3>
                </CardHeader>
                <CardContent className="h-[300px] pt-0">
                  {!metrics.technicianPerformance || metrics.technicianPerformance.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Veri bulunmuyor</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.technicianPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                        />
                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar yAxisId="left" dataKey="ortalamaSaat" name="Ortalama Saat" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar yAxisId="right" dataKey="cozulenTalep" name="Çözülen Talep" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution Chart */}
              <Card className="lg:col-span-3 border-slate-100">
                <CardHeader>
                  <h3 className="text-base font-bold text-slate-800">Talep Kategori Dağılımı</h3>
                </CardHeader>
                <CardContent className="h-[300px] pt-0">
                  {!metrics.categoryDistribution || metrics.categoryDistribution.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Veri bulunmuyor</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.categoryDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {metrics.categoryDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: '#334155', fontWeight: '500' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Cost Distribution Chart */}
              <Card className="lg:col-span-3 border-slate-100">
                <CardHeader>
                  <h3 className="text-base font-bold text-slate-800">Departmanlara Göre Maliyet Dağılımı (₺)</h3>
                </CardHeader>
                <CardContent className="h-[300px] pt-0">
                  {!metrics.costByDepartment || metrics.costByDepartment.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">Veri bulunmuyor (Maliyet girişi yapılmamış)</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.costByDepartment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                          formatter={(value: any) => [`₺${value}`, 'Maliyet']}
                        />
                        <Bar dataKey="maliyet" name="Maliyet" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {metrics.costByDepartment.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f59e0b' : '#fbbf24'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
