import React, { useEffect, useState, useMemo } from 'react';
import { deviceService } from '../services/deviceService';
import { deviceCategoryService } from '../services/deviceCategoryService';
import { departmentService } from '../services/departmentService';
import { ticketService } from '../services/ticketService';
import { type DeviceDto, type DeviceCreateDto, DeviceStatus, type DeviceCategoryDto } from '../types/device';
import { type DepartmentResponseDto } from '../types/department';
import { type TicketResponseDto, TicketStatus } from '../types/ticket';
import { toast } from 'react-hot-toast';
import CreatableSelect from 'react-select/creatable';

const Inventory: React.FC = () => {
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [categories, setCategories] = useState<DeviceCategoryDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | DeviceStatus>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceDto | null>(null);

  // History state
  const [deviceHistory, setDeviceHistory] = useState<TicketResponseDto[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<DeviceCreateDto>({
    code: '',
    name: '',
    status: DeviceStatus.Active,
    categoryId: '',
    departmentId: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [devs, cats, depts] = await Promise.all([
        deviceService.getAll(),
        deviceCategoryService.getAll(),
        departmentService.getAll()
      ]);
      setDevices(devs);
      setCategories(cats);
      setDepartments(depts.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async (deviceId: string) => {
    try {
      setIsHistoryLoading(true);
      const res = await ticketService.getAll({ pageNumber: 1, pageSize: 100, deviceId });
      setDeviceHistory(res.data || []);
    } catch (error) {
      toast.error("Geçmiş yüklenemedi");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const openModal = (device?: DeviceDto) => {
    if (device) {
      setSelectedDevice(device);
      setFormData({
        code: device.code,
        name: device.name,
        status: device.status,
        categoryId: device.categoryId,
        departmentId: device.departmentId
      });
    } else {
      setSelectedDevice(null);
      setFormData({
        code: '',
        name: '',
        status: DeviceStatus.Active,
        categoryId: categories.length > 0 ? categories[0].id : '',
        departmentId: null
      });
    }
    setIsModalOpen(true);
  };

  const openDrawer = (device: DeviceDto) => {
    setSelectedDevice(device);
    setIsDrawerOpen(true);
    loadHistory(device.id);
  };

  const toTrEng = (str: string) => {
    return str.replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C')
      .toUpperCase();
  };

  const generateDeviceCode = (depId: string | null, catId: string) => {
    let depPrefix = 'GEN';
    let catPrefix = 'KAT';

    if (depId) {
      const dep = departments.find(d => d.id === depId);
      if (dep && dep.name.length >= 3) {
        depPrefix = toTrEng(dep.name.substring(0, 3));
      }
    }

    if (catId) {
      const cat = categories.find(c => c.id === catId);
      if (cat && cat.name.length >= 3) {
        catPrefix = toTrEng(cat.name.substring(0, 3));
      }
    }

    const prefix = `${depPrefix}-${catPrefix}-`;
    const relatedDevices = devices.filter(d => d.code.startsWith(prefix));

    let maxNum = 0;
    relatedDevices.forEach(d => {
      const parts = d.code.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    return `${prefix}${nextNum}`;
  };

  useEffect(() => {
    if (isModalOpen && !selectedDevice) {
      if (formData.categoryId || formData.departmentId) {
        setFormData(prev => ({ ...prev, code: generateDeviceCode(prev.departmentId, prev.categoryId) }));
      }
    }
  }, [formData.categoryId, formData.departmentId, isModalOpen, selectedDevice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedDevice) {
        await deviceService.update(selectedDevice.id, { id: selectedDevice.id, ...formData });
        toast.success('Cihaz başarıyla güncellendi');
      } else {
        await deviceService.create(formData);
        toast.success('Yeni cihaz eklendi');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu cihazı silmek istediğinize emin misiniz?')) {
      try {
        await deviceService.delete(id);
        toast.success('Cihaz silindi');
        loadData();
      } catch (error) {
        toast.error('Hata oluştu');
      }
    }
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || d.status === statusFilter;
      const matchDept = departmentFilter === 'All' || d.departmentId === departmentFilter;
      return matchSearch && matchStatus && matchDept;
    });
  }, [devices, searchQuery, statusFilter, departmentFilter]);

  // KPI calculations
  const totalCount = devices.length;
  const activeCount = devices.filter(d => d.status === DeviceStatus.Active).length;
  const faultCount = devices.filter(d => d.status === DeviceStatus.Faulty || d.status === DeviceStatus.Maintenance).length;
  const storageCount = devices.filter(d => d.status === DeviceStatus.Storage).length;

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.Active: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Aktif</span>;
      case DeviceStatus.Faulty: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">Arızalı</span>;
      case DeviceStatus.Maintenance: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Bakımda</span>;
      case DeviceStatus.Storage: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Depoda</span>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Envanter Yönetimi</h2>
          <p className="text-sm text-slate-500 mt-1">Sistemdeki tüm cihazlarınızı yönetin ve durumlarını takip edin.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm shadow-emerald-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Yeni Cihaz
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Toplam Cihaz</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Aktif Kullanımda</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{activeCount}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Arızalı / Bakımda</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{faultCount}</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Boşta / Depoda</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{storageCount}</p>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Cihaz kodu veya adı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value === 'All' ? 'All' : Number(e.target.value) as DeviceStatus)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none min-w-[150px]"
          >
            <option value="All">Tüm Cihazlar</option>
            <option value={DeviceStatus.Active}>Aktif</option>
            <option value={DeviceStatus.Faulty}>Arızalı</option>
            <option value={DeviceStatus.Maintenance}>Bakımda</option>
            <option value={DeviceStatus.Storage}>Depoda</option>
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none min-w-[150px]"
          >
            <option value="All">Tüm Departmanlar</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 text-sm font-medium sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 border-b border-slate-100">Cihaz Kodu</th>
                <th className="px-6 py-4 border-b border-slate-100">Cihaz Adı / Modeli</th>
                <th className="px-6 py-4 border-b border-slate-100">Kategori</th>
                <th className="px-6 py-4 border-b border-slate-100">Konum</th>
                <th className="px-6 py-4 border-b border-slate-100">Durum</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {filteredDevices.map(device => (
                <tr key={device.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => openDrawer(device)}>
                  <td className="px-6 py-4 font-medium text-slate-900">{device.code}</td>
                  <td className="px-6 py-4 text-slate-600">{device.name}</td>
                  <td className="px-6 py-4 text-slate-600">{device.categoryName}</td>
                  <td className="px-6 py-4 text-slate-600">{device.departmentName || '-'}</td>
                  <td className="px-6 py-4">{getStatusBadge(device.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(device); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(device.id); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Sonuç bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">{selectedDevice ? 'Cihaz Düzenle' : 'Yeni Cihaz'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {selectedDevice && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cihaz Kodu</label>
                  <input readOnly type="text" value={formData.code} className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono cursor-not-allowed outline-none" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cihaz Adı / Modeli</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                <CreatableSelect
                  isClearable
                  placeholder="Kategori Seçin veya Yazın..."
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={formData.categoryId ? { value: formData.categoryId, label: categories.find(c => c.id === formData.categoryId)?.name } : null}
                  onChange={async (newValue: any, actionMeta: any) => {
                    if (actionMeta.action === 'create-option') {
                      try {
                        const newCat = await deviceCategoryService.create(newValue.value);
                        setCategories(prev => [...prev, newCat]);
                        setFormData({ ...formData, categoryId: newCat.id });
                        toast.success('Yeni kategori eklendi');
                      } catch (e) {
                        toast.error('Kategori oluşturulamadı');
                      }
                    } else {
                      setFormData({ ...formData, categoryId: newValue ? newValue.value : '' });
                    }
                  }}
                  formatCreateLabel={(inputValue) => `"${inputValue}" - yeni kategori oluştur`}
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      borderColor: state.isFocused ? '#10b981' : '#e2e8f0',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none',
                      '&:hover': {
                        borderColor: '#10b981'
                      },
                      padding: '2px'
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      zIndex: 9999
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused ? '#ecfdf5' : 'white',
                      color: state.isFocused ? '#047857' : '#334155',
                      cursor: 'pointer',
                      '&:active': {
                        backgroundColor: '#d1fae5'
                      }
                    })
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Departman (Konum)</label>
                <select value={formData.departmentId || ''} onChange={e => setFormData({ ...formData, departmentId: e.target.value || null })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white">
                  <option value="">Belirtilmedi</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: Number(e.target.value) as DeviceStatus })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white">
                  <option value={DeviceStatus.Active}>Aktif</option>
                  <option value={DeviceStatus.Faulty}>Arızalı</option>
                  <option value={DeviceStatus.Maintenance}>Bakımda</option>
                  <option value={DeviceStatus.Storage}>Depoda</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors">İptal</button>
                <button type="submit" className="flex-1 px-4 py-2 text-white bg-emerald-600 rounded-xl font-medium hover:bg-emerald-700 transition-colors">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer (Device Details & History) */}
      {isDrawerOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="w-full max-w-md bg-white h-full shadow-2xl relative flex flex-col animate-slide-in-right">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Cihaz Detayları</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="bg-slate-50 p-4 rounded-2xl mb-8 border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedDevice.name}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">{selectedDevice.code}</p>
                  </div>
                  {getStatusBadge(selectedDevice.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Kategori:</span><span className="font-medium text-slate-700">{selectedDevice.categoryName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Konum:</span><span className="font-medium text-slate-700">{selectedDevice.departmentName || '-'}</span></div>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Arıza Geçmişi ({deviceHistory.length})
              </h4>

              {isHistoryLoading ? (
                <div className="text-center py-8 text-slate-500 text-sm">Yükleniyor...</div>
              ) : deviceHistory.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm">Bu cihaza ait arıza kaydı bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {deviceHistory.map(ticket => (
                    <div key={ticket.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {ticket.status === TicketStatus.Resolved || ticket.status === TicketStatus.Closed ? (
                          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                      </div>

                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.status === TicketStatus.Resolved || ticket.status === TicketStatus.Closed
                            ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                            {ticket.status === TicketStatus.Resolved || ticket.status === TicketStatus.Closed ? 'Çözüldü' : 'Açık'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{new Date(ticket.createdAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <h5 className="text-sm font-semibold text-slate-800 truncate mb-1" title={ticket.title}>{ticket.title}</h5>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{ticket.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
