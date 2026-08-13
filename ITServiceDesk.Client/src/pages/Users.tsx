import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { departmentService } from '../services/departmentService';
import type { UserListDto } from '../types/user';
import type { DepartmentResponseDto } from '../types/department';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
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

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserListDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof UserListDto; direction: 'asc' | 'desc' } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListDto | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    departmentId: '',
    role: 'User',
    isActive: true,
    phoneNumber: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, depsRes] = await Promise.all([
        userService.getAll(),
        departmentService.getAll()
      ]);
      const currentUserId = authService.getUserId();
      const userData = usersRes.data || [];
      const isAdmin = authService.isAdmin();
      const me = userData.find(u => u.id === currentUserId);
      
      if (isAdmin) {
        setUsers(userData);
      } else if (me) {
        setUsers([me]);
      } else {
        setUsers([]);
      }
      setDepartments(depsRes.data || []);
    } catch (err: any) {
      toast.error('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Ad ve Soyad alanları boş bırakılamaz.');
      return;
    }

    const sanitize = (text: string) => {
      const charMap: Record<string, string> = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
      };
      return text.replace(/[çğışöüÇĞİŞÖÜ]/g, match => charMap[match]).toLowerCase().replace(/[^a-z]/g, '');
    };

    const cleanFirst = sanitize(formData.firstName);
    const cleanLast = sanitize(formData.lastName);
    const domain = formData.role === 'Admin' ? 'admin.sirket.com' : 'sirket.com';
    
    let prefix = cleanFirst.charAt(0);
    let generatedEmail = `${prefix}.${cleanLast}@${domain}`;
    let charIndex = 1;
    let counter = 1;

    while (users.some(u => u.email === generatedEmail)) {
      if (charIndex < cleanFirst.length) {
        charIndex++;
        prefix = cleanFirst.substring(0, charIndex);
        generatedEmail = `${prefix}.${cleanLast}@${domain}`;
      } else {
        generatedEmail = `${prefix}.${cleanLast}${counter}@${domain}`;
        counter++;
      }
    }

    try {
      const response = await userService.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: generatedEmail,
        departmentId: formData.departmentId || null,
        role: formData.role,
        phoneNumber: formData.phoneNumber
      });
      toast.success((t) => (
        <div className="flex flex-col gap-2">
          <span className="font-bold">Kullanıcı oluşturuldu!</span>
          <span>E-posta: <b>{generatedEmail}</b></span>
          <span>Geçici Şifre: <b className="tracking-wider">{response.data?.generatedPassword}</b></span>
          <button 
            onClick={() => { 
              navigator.clipboard.writeText(`Email: ${generatedEmail}\nŞifre: ${response.data?.generatedPassword}`); 
              toast.dismiss(t.id); 
              toast.success('Bilgiler panoya kopyalandı!'); 
            }} 
            className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded text-sm font-medium hover:bg-emerald-200 transition-colors"
          >
            Kopyala ve Kapat
          </button>
        </div>
      ), { duration: 60000, position: 'top-center' });
      setIsAddModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Kullanıcı oluşturulamadı.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Ad ve Soyad alanları boş bırakılamaz.');
      return;
    }
    if (!selectedUser) return;
    try {
      await userService.update({
        id: selectedUser.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        departmentId: formData.departmentId || null,
        role: formData.role,
        isActive: formData.isActive,
        phoneNumber: formData.phoneNumber
      });
      toast.success('Kullanıcı güncellendi.');
      setIsEditModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Kullanıcı güncellenemedi.');
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await userService.delete(id);
      toast.success('Kullanıcı başarıyla silindi.');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Kullanıcı silinemedi.');
    }
  };

  const openEditModal = (user: UserListDto) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      departmentId: user.departmentId || '',
      role: user.roles.includes('Admin') ? 'Admin' : (user.roles.includes('Technician') ? 'Technician' : 'User'),
      isActive: user.isActive,
      phoneNumber: user.phoneNumber || ''
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      departmentId: '',
      role: 'User',
      isActive: true,
      phoneNumber: ''
    });
    setSelectedUser(null);
  };

  const getFilteredAndSortedUsers = () => {
    let filtered = users;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.firstName.toLowerCase().includes(lowerQuery) || 
        u.lastName.toLowerCase().includes(lowerQuery)
      );
    }

    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'firstName') {
          valA = `${a.firstName} ${a.lastName}`;
          valB = `${b.firstName} ${b.lastName}`;
        }
        
        valA = valA || '';
        valB = valB || '';
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const handleSort = (key: keyof UserListDto) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (key: keyof UserListDto) => {
    if (sortConfig?.key !== key) return <svg className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return sortConfig.direction === 'asc' 
      ? <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      : <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };

  const displayedUsers = getFilteredAndSortedUsers();

  return (
    <div className="flex flex-col h-full space-y-6">
      <PageHeader 
        title="Kullanıcı Yönetimi" 
        description="Sistemdeki tüm kullanıcıları ve yetkilerini yönetin." 
        action={{ label: "Yeni Kullanıcı", onClick: () => { resetForm(); setIsAddModalOpen(true); } }}
      />

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="w-72">
            <Input 
              type="text" 
              placeholder="Ad veya Soyad ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} /></div>
          ) : displayedUsers.length === 0 ? (
            <div className="p-6"><EmptyState title="Kullanıcı Yok" description="Kriterlere uygun kullanıcı bulunmuyor." /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('firstName')}>
                    <div className="flex items-center gap-2">Ad Soyad {renderSortIndicator('firstName')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('email')}>
                    <div className="flex items-center gap-2">Email {renderSortIndicator('email')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('departmentName')}>
                    <div className="flex items-center gap-2">Departman {renderSortIndicator('departmentName')}</div>
                  </TableHead>
                  <TableHead>Yetki</TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('isActive')}>
                    <div className="flex items-center gap-2">Durum {renderSortIndicator('isActive')}</div>
                  </TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-semibold text-slate-800">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="slate">{user.departmentName || 'Atanmadı'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.roles.includes('Admin') ? 'blue' : 'slate'}>
                        {user.roles.includes('Admin') ? 'Admin' : 'User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'emerald' : 'error'}>
                        {user.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditModal(user)}
                          title="Düzenle"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteUser(user.id)}
                          title="Sil"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <Modal isOpen={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
        <ModalHeader title={isAddModalOpen ? 'Yeni Kullanıcı Ekle' : 'Kullanıcıyı Düzenle'} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} />
        <form onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit} className="flex flex-col h-full">
          <ModalContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input required label="Ad" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              <Input required label="Soyad" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {isEditModalOpen && (
                <Input disabled label="E-posta (Sabit)" type="email" value={formData.email} />
              )}
              <div className={isAddModalOpen ? "col-span-2" : ""}>
                <Input 
                  label="Telefon" 
                  type="tel" 
                  pattern="[0-9]{10}" 
                  title="10 haneli telefon numarasını başında sıfır olmadan giriniz." 
                  placeholder="5551234567" 
                  maxLength={10}
                  value={formData.phoneNumber?.replace('+90', '') || ''} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData({...formData, phoneNumber: val ? '+90' + val : ''});
                  }} 
                />
              </div>
            </div>

            <Select label="Departman" value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
              <option value="">-- Departman Seçin --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>

            <Select label="Yetki (Rol)" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="User">Kullanıcı (User)</option>
              <option value="Technician">Teknisyen/Operatör (Technician)</option>
              <option value="Admin">Yönetici (Admin)</option>
            </Select>

            {isEditModalOpen && (
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Hesap Aktif Mi?</label>
              </div>
            )}
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>İptal</Button>
            <Button type="submit" variant="primary">{isAddModalOpen ? 'Oluştur' : 'Kaydet'}</Button>
          </ModalFooter>
        </form>
      </Modal>

    </div>
  );
};

export default Users;
