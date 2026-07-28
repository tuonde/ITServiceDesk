import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { departmentService } from '../services/departmentService';
import type { UserListDto } from '../types/user';
import type { DepartmentResponseDto } from '../types/department';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

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
      const isAdmin = authService.getUserRole() === 'Admin';
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
    try {
      const response = await userService.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        departmentId: formData.departmentId || null,
        role: formData.role,
        phoneNumber: formData.phoneNumber
      });
      toast.success((t) => (
        <div className="flex flex-col gap-2">
          <span className="font-bold">Kullanıcı oluşturuldu!</span>
          <span>Geçici Şifresi: <b className="tracking-wider">{response.data?.generatedPassword}</b></span>
          <button 
            onClick={() => { 
              navigator.clipboard.writeText(response.data?.generatedPassword || ''); 
              toast.dismiss(t.id); 
              toast.success('Şifre panoya kopyalandı!'); 
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
      role: user.roles.includes('Admin') ? 'Admin' : 'User',
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
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-slate-500 mt-1">Sistemdeki tüm kullanıcıları ve yetkilerini yönetin.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm shadow-emerald-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Yeni Kullanıcı
        </button>
      </div>

      <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
        <div className="relative w-72">
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input 
            type="text" 
            placeholder="Ad veya Soyad ara..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-slate-500">Yükleniyor...</div>
        ) : displayedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             Kriterlere uygun kullanıcı bulunmuyor.
          </div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0 z-10">
                <th className="p-4 font-semibold border-b border-slate-200 cursor-pointer group" onClick={() => handleSort('firstName')}>
                  <div className="flex items-center gap-2">Ad Soyad {renderSortIndicator('firstName')}</div>
                </th>
                <th className="p-4 font-semibold border-b border-slate-200 cursor-pointer group" onClick={() => handleSort('email')}>
                  <div className="flex items-center gap-2">Email {renderSortIndicator('email')}</div>
                </th>
                <th className="p-4 font-semibold border-b border-slate-200 cursor-pointer group" onClick={() => handleSort('departmentName')}>
                  <div className="flex items-center gap-2">Departman {renderSortIndicator('departmentName')}</div>
                </th>
                <th className="p-4 font-semibold border-b border-slate-200">Yetki</th>
                <th className="p-4 font-semibold border-b border-slate-200 cursor-pointer group" onClick={() => handleSort('isActive')}>
                  <div className="flex items-center gap-2">Durum {renderSortIndicator('isActive')}</div>
                </th>
                <th className="p-4 font-semibold border-b border-slate-200 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{user.firstName} {user.lastName}</div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{user.email}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {user.departmentName || 'Atanmadı'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${user.roles.includes('Admin') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      {user.roles.includes('Admin') ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="p-4">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {user.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">
                {isAddModalOpen ? 'Yeni Kullanıcı Ekle' : 'Kullanıcıyı Düzenle'}
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ad</label>
                  <input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Soyad</label>
                  <input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">E-posta</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Telefon</label>
                  <div className="relative flex items-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                    <span className="text-slate-500 font-medium mr-1">+90</span>
                    <input 
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
                      className="w-full bg-transparent outline-none" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Departman</label>
                <select value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                  <option value="">-- Departman Seçin --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Yetki (Rol)</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                  <option value="User">Kullanıcı (User)</option>
                  <option value="Admin">Yönetici (Admin)</option>
                </select>
              </div>

              {isEditModalOpen && (
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Hesap Aktif Mi?</label>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                  İptal
                </button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-emerald-200">
                  {isAddModalOpen ? 'Oluştur' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Users;
