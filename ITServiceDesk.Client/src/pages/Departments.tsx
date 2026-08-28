import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { departmentService } from '../services/departmentService';
import { userService } from '../services/userService';
import type { DepartmentResponseDto } from '../types/department';
import type { UserListDto } from '../types/user';
import { authService } from '../services/authService';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
export default function Departments() {
  const isAdmin = authService.isAdmin();
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [users, setUsers] = useState<UserListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const loadData = async () => {
    try {
      const [deptRes, userRes] = await Promise.all([
        departmentService.getAll(),
        userService.getAll()
      ]);
      
      if (deptRes.isSuccess && deptRes.data) {
        setDepartments(deptRes.data);
      } else {
        toast.error(deptRes.message || 'Departmanlar yüklenirken bir hata oluştu.');
      }
      
      if (userRes.isSuccess && userRes.data) {
        setUsers(userRes.data);
      }
    } catch (err: any) {
      toast.error('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (key: string) => {
    if (sortConfig?.key !== key) return <svg className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return sortConfig.direction === 'asc' 
      ? <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      : <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };

  const sortedDepartments = [...departments].sort((a, b) => {
    if (!sortConfig) return 0;
    
    if (sortConfig.key === 'name') {
      if (a.name < b.name) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a.name > b.name) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }
    
    if (sortConfig.key === 'userCount') {
      const countA = users.filter(u => u.departmentId === a.id).length;
      const countB = users.filter(u => u.departmentId === b.id).length;
      if (countA < countB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (countA > countB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }
    
    return 0;
  });

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (dept: DepartmentResponseDto) => {
    setEditingId(dept.id);
    setFormData({ name: dept.name, description: dept.description || '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = formData.name.trim();
    if (!nameTrimmed) {
      toast.error('Departman adı boş olamaz.');
      return;
    }
    try {
      if (editingId) {
        const res = await departmentService.update(editingId, {
          name: nameTrimmed,
          description: formData.description.trim()
        });
        if (res.isSuccess) {
          toast.success(res.message || 'Departman güncellendi.');
          closeModal();
          loadData();
        } else {
          toast.error(res.message || 'Departman güncellenemedi.');
        }
      } else {
        const res = await departmentService.create({
          name: nameTrimmed,
          description: formData.description.trim()
        });
        if (res.isSuccess) {
          toast.success(res.message || 'Yeni departman eklendi.');
          closeModal();
          loadData();
        } else {
          toast.error(res.message || 'Yeni departman eklenemedi.');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem başarısız.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu departmanı silmek istediğinize emin misiniz?')) {
      try {
        const res = await departmentService.delete(id);
        if (res.isSuccess) {
          toast.success(res.message || 'Departman başarıyla silindi.');
          loadData();
        } else {
          toast.error(res.message || 'Departman silinemedi.');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Departman silinemedi.');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <PageHeader title="Departman Yönetimi" description="Sistemdeki departmanları ekleyin, düzenleyin veya silin." />
        <Card>
          <TableSkeleton rows={5} />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full h-full flex flex-col space-y-6">
      <PageHeader 
        title="Departman Yönetimi" 
        description="Sistemdeki departmanları ekleyin, düzenleyin veya silin." 
        action={isAdmin ? { label: "Yeni Departman", onClick: openAddModal } : undefined}
      />

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer group" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Departman Adı {renderSortIndicator('name')}</div>
                </TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="cursor-pointer group" onClick={() => handleSort('userCount')}>
                  <div className="flex items-center gap-2">Personel {renderSortIndicator('userCount')}</div>
                </TableHead>
                {isAdmin && <TableHead className="text-right">İşlemler</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="h-64">
                    <EmptyState 
                      title="Departman Yok" 
                      description="Sistemde henüz bir departman bulunmuyor." 
                      action={isAdmin ? { label: "Yeni Departman Ekle", onClick: openAddModal } : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                sortedDepartments.map(dept => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium text-slate-800">
                      {dept.name}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {dept.description || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">
                      {users.filter(u => u.departmentId === dept.id).length} Kişi
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openEditModal(dept)} 
                            title="Düzenle"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(dept.id)} 
                            title="Sil"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <ModalHeader title={editingId ? 'Departman Düzenle' : 'Yeni Departman Ekle'} onClose={closeModal} />
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <ModalContent className="space-y-4">
            <Input 
              label="Departman Adı"
              required 
              maxLength={100} 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="Örn: Bilgi İşlem" 
            />
            <Textarea 
              label="Açıklama"
              maxLength={500} 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              placeholder="Opsiyonel departman açıklaması..." 
            />
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={closeModal}>İptal</Button>
            <Button type="submit" variant="primary">{editingId ? 'Güncelle' : 'Ekle'}</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
