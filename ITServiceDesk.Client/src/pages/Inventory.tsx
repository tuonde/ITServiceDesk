import React, { useEffect, useState, useMemo } from 'react';
import { deviceService } from '../services/deviceService';
import { deviceCategoryService } from '../services/deviceCategoryService';
import { departmentService } from '../services/departmentService';
import { ticketService } from '../services/ticketService';
import { userService } from '../services/userService';
import { type DeviceDto, type DeviceCreateDto, DeviceStatus, type DeviceCategoryDto } from '../types/device';
import { type DepartmentResponseDto } from '../types/department';
import { type TicketResponseDto, TicketStatus } from '../types/ticket';
import { type UserListDto } from '../types/user';
import { toast } from 'react-hot-toast';
import CreatableSelect from 'react-select/creatable';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';

const Inventory: React.FC = () => {
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [categories, setCategories] = useState<DeviceCategoryDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [users, setUsers] = useState<UserListDto[]>([]);

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
  const [formData, setFormData] = useState<DeviceCreateDto & { assignedUserId?: string | null }>({
    code: '',
    name: '',
    status: DeviceStatus.Active,
    categoryId: '',
    departmentId: null,
    assignedUserId: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [devs, cats, depts, usrs] = await Promise.all([
        deviceService.getAll(),
        deviceCategoryService.getAll(),
        departmentService.getAll(),
        userService.getAll()
      ]);
      setDevices(devs);
      setCategories(cats);
      setDepartments(depts.data || []);
      setUsers((usrs.data || []).filter(u => u.isActive === true));
    } catch (error) {
      console.error(error);
      toast.error('Veriler yÃ¼klenirken hata oluÅŸtu');
    } finally {
      setIsLoading(false);
    }
  };

  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | TicketStatus>('All');
  const [historyPriorityFilter, setHistoryPriorityFilter] = useState<'All' | number>('All');

  const loadHistory = async (deviceId: string) => {
    try {
      setIsHistoryLoading(true);
      const res = await ticketService.getByDeviceId(deviceId);
      setDeviceHistory(res || []);
    } catch {
      toast.error("GeÃ§miÅŸ yÃ¼klenemedi");
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
        departmentId: device.departmentId,
        assignedUserId: device.assignedUserId
      });
    } else {
      setSelectedDevice(null);
      setFormData({
        code: '',
        name: '',
        status: DeviceStatus.Active,
        categoryId: categories.length > 0 ? categories[0].id : '',
        departmentId: null,
        assignedUserId: null
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
    return str.replace(/Ä±/g, 'i').replace(/Ä°/g, 'I')
      .replace(/ÄŸ/g, 'g').replace(/Ä/g, 'G')
      .replace(/Ã¼/g, 'u').replace(/Ãœ/g, 'U')
      .replace(/ÅŸ/g, 's').replace(/Å/g, 'S')
      .replace(/Ã¶/g, 'o').replace(/Ã–/g, 'O')
      .replace(/Ã§/g, 'c').replace(/Ã‡/g, 'C')
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
        toast.success('Cihaz baÅŸarÄ±yla gÃ¼ncellendi');
      } else {
        await deviceService.create(formData);
        toast.success('Yeni cihaz eklendi');
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      toast.error('Bir hata oluÅŸtu');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu cihazÄ± silmek istediÄŸinize emin misiniz?')) {
      try {
        await deviceService.delete(id);
        toast.success('Cihaz silindi');
        loadData();
      } catch {
        toast.error('Hata oluÅŸtu');
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

  const totalCount = devices.length;
  const activeCount = devices.filter(d => d.status === DeviceStatus.Active).length;
  const faultCount = devices.filter(d => d.status === DeviceStatus.Faulty || d.status === DeviceStatus.Maintenance).length;
  const storageCount = devices.filter(d => d.status === DeviceStatus.Storage).length;

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.Active: return <Badge variant="emerald">Aktif</Badge>;
      case DeviceStatus.Faulty: return <Badge variant="rose">ArÄ±zalÄ±</Badge>;
      case DeviceStatus.Maintenance: return <Badge variant="amber">BakÄ±mda</Badge>;
      case DeviceStatus.Storage: return <Badge variant="slate">Depoda</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full space-y-6">
        <PageHeader title="Envanter YÃ¶netimi" description="Sistemdeki tÃ¼m cihazlarÄ±nÄ±zÄ± yÃ¶netin ve durumlarÄ±nÄ± takip edin." />
        <Card className="flex-1 overflow-hidden p-0">
          <TableSkeleton rows={5} />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <PageHeader 
        title="Envanter YÃ¶netimi" 
        description="Sistemdeki tÃ¼m cihazlarÄ±nÄ±zÄ± yÃ¶netin ve durumlarÄ±nÄ± takip edin." 
        action={{ label: "Yeni Cihaz", onClick: () => openModal() }}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Toplam Cihaz</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Aktif KullanÄ±mda</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{activeCount}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">ArÄ±zalÄ± / BakÄ±mda</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{faultCount}</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">BoÅŸta / Depoda</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{storageCount}</p>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </div>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row gap-4 shrink-0">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="text"
              placeholder="Cihaz kodu veya adÄ± ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value === 'All' ? 'All' : Number(e.target.value) as DeviceStatus)}
            >
              <option value="All">TÃ¼m Cihazlar</option>
              <option value={DeviceStatus.Active}>Aktif</option>
              <option value={DeviceStatus.Faulty}>ArÄ±zalÄ±</option>
              <option value={DeviceStatus.Maintenance}>BakÄ±mda</option>
              <option value={DeviceStatus.Storage}>Depoda</option>
            </Select>
          </div>
          <div className="w-full md:w-56">
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="All">TÃ¼m Departmanlar</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cihaz Kodu</TableHead>
                <TableHead>Cihaz AdÄ± / Modeli</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Konum</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Ä°ÅŸlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64">
                     <EmptyState title="Cihaz BulunamadÄ±" description="Arama kriterlerinize uygun cihaz bulunmuyor." />
                  </TableCell>
                </TableRow>
              ) : (
                filteredDevices.map(device => (
                  <TableRow key={device.id} className="cursor-pointer group hover:bg-slate-50/50 transition-colors" onClick={() => openDrawer(device)}>
                    <TableCell className="font-medium text-slate-900">{device.code}</TableCell>
                    <TableCell className="text-slate-600">{device.name}</TableCell>
                    <TableCell className="text-slate-600">{device.categoryName}</TableCell>
                    <TableCell className="text-slate-600">{device.departmentName || '-'}</TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost" size="sm"
                          onClick={(e) => { e.stopPropagation(); openModal(device); }}
                          title="DÃ¼zenle"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDelete(device.id); }}
                          title="Sil"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader title={selectedDevice ? 'Cihaz DÃ¼zenle' : 'Yeni Cihaz'} onClose={() => setIsModalOpen(false)} />
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <ModalContent className="space-y-4">
            {selectedDevice && (
              <Input 
                label="Cihaz Kodu" 
                readOnly 
                value={formData.code} 
                className="font-mono bg-slate-100 text-slate-500 cursor-not-allowed" 
              />
            )}
            <Input 
              required 
              label="Cihaz AdÄ± / Modeli" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
            />
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori</label>
              <CreatableSelect
                isClearable
                placeholder="Kategori SeÃ§in veya YazÄ±n..."
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                value={formData.categoryId ? { value: formData.categoryId, label: categories.find(c => c.id === formData.categoryId)?.name } : null}
                onChange={async (newValue: any, actionMeta: any) => {
                  if (actionMeta.action === 'create-option') {
                    try {
                      const newCat = await deviceCategoryService.create(newValue.value);
                      setCategories(prev => [...prev, newCat]);
                      setFormData({ ...formData, categoryId: newCat.id });
                      toast.success('Yeni kategori eklendi');
                    } catch {
                      toast.error('Kategori oluÅŸturulamadÄ±');
                    }
                  } else {
                    setFormData({ ...formData, categoryId: newValue ? newValue.value : '' });
                  }
                }}
                formatCreateLabel={(inputValue) => `"${inputValue}" - yeni kategori oluÅŸtur`}
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
            
            <Select 
              label="Departman" 
              value={formData.departmentId || ''} 
              onChange={e => {
                setFormData({ ...formData, departmentId: e.target.value || null, assignedUserId: null });
              }}
            >
              <option value="">-- Departman Yok --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            
            {formData.departmentId && (
              <Select 
                label="Zimmetli Personel" 
                value={formData.assignedUserId || ''} 
                onChange={e => setFormData({ ...formData, assignedUserId: e.target.value || null })}
              >
                <option value="">-- Zimmet Yok (Ortak KullanÄ±m) --</option>
                {users.filter(u => u.departmentId === formData.departmentId).map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </Select>
            )}
            
            <Select 
              label="Durum" 
              value={formData.status} 
              onChange={e => setFormData({ ...formData, status: Number(e.target.value) as DeviceStatus })}
            >
              <option value={DeviceStatus.Active}>Aktif</option>
              <option value={DeviceStatus.Faulty}>ArÄ±zalÄ±</option>
              <option value={DeviceStatus.Maintenance}>BakÄ±mda</option>
              <option value={DeviceStatus.Storage}>Depoda</option>
            </Select>
          </ModalContent>
          <ModalFooter>
             <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Ä°ptal</Button>
             <Button type="submit" variant="primary">Kaydet</Button>
          </ModalFooter>
        </form>
      </Modal>

      {isDrawerOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setIsDrawerOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up relative" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Cihaz DetaylarÄ±</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 flex flex-col flex-1 overflow-hidden">
              <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100 shrink-0">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedDevice.name}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">{selectedDevice.code}</p>
                  </div>
                  {getStatusBadge(selectedDevice.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Kategori:</span><span className="font-medium text-slate-700">{selectedDevice.categoryName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Departman & Zimmet:</span>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">{selectedDevice.departmentName || <span className="text-slate-400">AtanmamÄ±ÅŸ</span>}</span>
                      {selectedDevice.assignedUserName && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-1">ğŸ‘¤ {selectedDevice.assignedUserName}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 shrink-0">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ArÄ±za GeÃ§miÅŸi ({deviceHistory.length})
                </h4>
                
                <div className="flex gap-2">
                  <select 
                    value={historyStatusFilter} 
                    onChange={e => setHistoryStatusFilter(e.target.value === 'All' ? 'All' : Number(e.target.value) as TicketStatus)}
                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 outline-none"
                  >
                    <option value="All">TÃ¼m Durumlar</option>
                    <option value={TicketStatus.Open}>AÃ§Ä±k</option>
                    <option value={TicketStatus.InProgress}>Ä°ÅŸlemde</option>
                    <option value={TicketStatus.WaitingForUser}>KullanÄ±cÄ± Bekleniyor</option>
                    <option value={TicketStatus.Resolved}>Ã‡Ã¶zÃ¼ldÃ¼</option>
                    <option value={TicketStatus.Closed}>KapalÄ±</option>
                  </select>
                  <select 
                    value={historyPriorityFilter} 
                    onChange={e => setHistoryPriorityFilter(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 outline-none"
                  >
                    <option value="All">TÃ¼m Ã–ncelikler</option>
                    <option value={1}>DÃ¼ÅŸÃ¼k</option>
                    <option value={2}>Orta</option>
                    <option value={3}>YÃ¼ksek</option>
                    <option value={4}>Kritik</option>
                  </select>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar pr-2">
                {isHistoryLoading ? (
                  <div className="text-center py-8 text-slate-500 text-sm">YÃ¼kleniyor...</div>
                ) : deviceHistory.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-500 text-sm">Bu cihaza ait arÄ±za kaydÄ± bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {deviceHistory
                      .filter(t => historyStatusFilter === 'All' || t.status === historyStatusFilter)
                      .filter(t => historyPriorityFilter === 'All' || t.priority === historyPriorityFilter)
                      .map(ticket => (
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
                              {ticket.status === TicketStatus.Resolved || ticket.status === TicketStatus.Closed ? 'Ã‡Ã¶zÃ¼ldÃ¼' : 'AÃ§Ä±k'}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{new Date(ticket.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <h5 className="text-sm font-semibold text-slate-800 truncate mb-1" title={ticket.title}>{ticket.title}</h5>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{ticket.description}</p>
                        </div>
                      </div>
                    ))}
                    
                    {deviceHistory.filter(t => historyStatusFilter === 'All' || t.status === historyStatusFilter)
                      .filter(t => historyPriorityFilter === 'All' || t.priority === historyPriorityFilter).length === 0 && (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        SeÃ§ilen filtrelere uygun arÄ±za bulunamadÄ±.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
