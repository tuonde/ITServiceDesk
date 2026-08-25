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
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
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
    } catch {
      toast.error('Veriler yÃ¼klenirken bir hata oluÅŸtu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Ad ve Soyad alanlarÄ± boÅŸ bÄ±rakÄ±lamaz.');
      return;
    }

    const sanitize = (text: string) => {
      const charMap: Record<string, string> = {
        'Ã§': 'c', 'ÄŸ': 'g', 'Ä±': 'i', 'Ã¶': 'o', 'ÅŸ': 's', 'Ã¼': 'u',
        'Ã‡': 'C', 'Ä': 'G', 'Ä°': 'I', 'Ã–': 'O', 'Å': 'S', 'Ãœ': 'U'
      };
      return text.replace(/[Ã§ÄŸÄ±ÅŸÃ¶Ã¼Ã‡ÄÄ°ÅÃ–Ãœ]/g, match => charMap[match]).toLowerCase().replace(/[^a-z]/g, '');
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
          <span className="font-bold">KullanÄ±cÄ± oluÅŸturuldu!</span>
          <span>E-posta: <b>{generatedEmail}</b></span>
          <span>GeÃ§ici Åifre: <b className="tracking-wider">{response.data?.generatedPassword}</b></span>
          <button 
            onClick={() => { 
              navigator.clipboard.writeText(`Email: ${generatedEmail}\nÅifre: ${response.data?.generatedPassword}`); 
              toast.dismiss(t.id); 
              toast.success('Bilgiler panoya kopyalandÄ±!'); 
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
      toast.error(err.message || 'KullanÄ±cÄ± oluÅŸturulamadÄ±.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Ad ve Soyad alanlarÄ± boÅŸ bÄ±rakÄ±lamaz.');
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
      toast.success('KullanÄ±cÄ± gÃ¼ncellendi.');
      setIsEditModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'KullanÄ±cÄ± gÃ¼ncellenemedi.');
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('Bu kullanÄ±cÄ±yÄ± silmek istediÄŸinize emin misiniz?')) return;
    try {
      await userService.delete(id);
      toast.success('KullanÄ±cÄ± baÅŸarÄ±yla silindi.');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'KullanÄ±cÄ± silinemedi.');
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

    if (roleFilter !== 'All') {
      filtered = filtered.filter(u => {
        if (roleFilter === 'Admin') return u.roles.includes('Admin');
        if (roleFilter === 'Technician') return u.roles.includes('Technician');
        if (roleFilter === 'User') return u.roles.includes('User') && !u.roles.includes('Admin') && !u.roles.includes('Technician');
        return true;
      });
    }

    if (departmentFilter !== 'All') {
      filtered = filtered.filter(u => u.departmentId === departmentFilter);
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

  const totalUsersCount = users.length;
  const adminCount = users.filter(u => u.roles.includes('Admin')).length;
  const technicianCount = users.filter(u => u.roles.includes('Technician')).length;
  const standardUserCount = users.filter(u => u.roles.includes('User') && !u.roles.includes('Admin') && !u.roles.includes('Technician')).length;

  return (
    <div className="flex flex-col h-full space-y-6">
      <PageHeader 
        title="KullanÄ±cÄ± YÃ¶netimi" 
        description="Sistemdeki tÃ¼m kullanÄ±cÄ±larÄ± ve yetkilerini yÃ¶netin." 
        action={{ label: "Yeni KullanÄ±cÄ±", onClick: () => { resetForm(); setIsAddModalOpen(true); } }}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Toplam KullanÄ±cÄ±</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalUsersCount}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Admin</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{adminCount}</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Teknisyen</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{technicianCount}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">User</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{standardUserCount}</p>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row gap-4 shrink-0">
          <div className="flex-1 min-w-[200px]">
            <Input 
              type="text" 
              placeholder="Ad veya Soyad ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="All">TÃ¼m KullanÄ±cÄ±lar</option>
              <option value="Admin">Admin</option>
              <option value="Technician">Teknisyen</option>
              <option value="User">User</option>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="All">TÃ¼m Departmanlar</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} /></div>
          ) : displayedUsers.length === 0 ? (
            <div className="p-6"><EmptyState title="KullanÄ±cÄ± Yok" description="Kriterlere uygun kullanÄ±cÄ± bulunmuyor." /></div>
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
                  <TableHead className="text-right">Ä°ÅŸlemler</TableHead>
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
                      <Badge variant="slate">{user.departmentName || 'AtanmadÄ±'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.roles.includes('Admin') ? 'blue' : user.roles.includes('Technician') ? 'emerald' : 'slate'}>
                        {user.roles.includes('Admin') ? 'Admin' : user.roles.includes('Technician') ? 'Teknisyen' : 'User'}
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
                          title="DÃ¼zenle"
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
        <ModalHeader title={isAddModalOpen ? 'Yeni KullanÄ±cÄ± Ekle' : 'KullanÄ±cÄ±yÄ± DÃ¼zenle'} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} />
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
                  title="10 haneli telefon numarasÄ±nÄ± baÅŸÄ±nda sÄ±fÄ±r olmadan giriniz." 
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
              <option value="">-- Departman SeÃ§in --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>

            <Select label="Yetki (Rol)" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="User">KullanÄ±cÄ± (User)</option>
              <option value="Technician">Teknisyen/OperatÃ¶r (Technician)</option>
              <option value="Admin">YÃ¶netici (Admin)</option>
            </Select>

            {isEditModalOpen && (
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Hesap Aktif Mi?</label>
              </div>
            )}
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>Ä°ptal</Button>
            <Button type="submit" variant="primary">{isAddModalOpen ? 'OluÅŸtur' : 'Kaydet'}</Button>
          </ModalFooter>
        </form>
      </Modal>

    </div>
  );
};

export default Users;
