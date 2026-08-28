import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { kbCategoryService } from '../../services/kbCategoryService';
import type { KbCategory, KbCategoryCreateDto, KbCategoryUpdateDto } from '../../types/knowledgeBase';
import { KB_ICONS, getCategoryIcon } from '../../utils/iconMapper';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

export const KbCategories: React.FC = () => {
    const [categories, setCategories] = useState<KbCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<KbCategory | null>(null);
    
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('BookOpen');
    const [order, setOrder] = useState(0);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await kbCategoryService.getAll();
            setCategories(data.sort((a, b) => a.order - b.order));
        } catch (error) {
            toast.error("Kategoriler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleOpenModal = (category?: KbCategory) => {
        if (category) {
            setEditingCategory(category);
            setName(category.name);
            setDescription(category.description);
            setIcon(category.icon);
            setOrder(category.order);
        } else {
            setEditingCategory(null);
            setName('');
            setDescription('');
            setIcon('BookOpen');
            setOrder(categories.length + 1);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                const dto: KbCategoryUpdateDto = { id: editingCategory.id, name, description, icon, order };
                await kbCategoryService.update(editingCategory.id, dto);
                toast.success("Kategori güncellendi.");
            } else {
                const dto: KbCategoryCreateDto = { name, description, icon, order };
                await kbCategoryService.create(dto);
                toast.success("Kategori eklendi.");
            }
            setIsModalOpen(false);
            fetchCategories();
        } catch (error) {
            toast.error("Kategori kaydedilirken bir hata oluştu.");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`"${name}" kategorisini silmek istediğinize emin misiniz?`)) {
            try {
                await kbCategoryService.delete(id);
                toast.success("Kategori silindi.");
                fetchCategories();
            } catch (error) {
                toast.error("Kategori silinemedi.");
            }
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link to="/kb-admin" className="text-emerald-600 hover:text-emerald-700 font-medium">← Bilgi Bankası</Link>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Kategori Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-1">Bilgi bankası kategorilerini ekleyin veya düzenleyin.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium transition-colors shadow-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Yeni Kategori
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">İkon</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Adı & Açıklama</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sıra</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {categories.map((category) => (
                                <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-emerald-600">
                                        {getCategoryIcon(category.icon)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-800">{category.name}</div>
                                        <div className="text-sm text-slate-500">{category.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                                        {category.order}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => handleOpenModal(category)}
                                              title="Düzenle"
                                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => handleDelete(category.id, category.name)}
                                              title="Sil"
                                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                            >
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Henüz kategori bulunmuyor.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">{editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori Adı</label>
                                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                                <textarea required rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"></textarea>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">İkon</label>
                                    <select value={icon} onChange={e => setIcon(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                        {Object.keys(KB_ICONS).map(iconKey => (
                                            <option key={iconKey} value={iconKey}>{iconKey}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sıra</label>
                                    <input type="number" required min="1" value={order} onChange={e => setOrder(parseInt(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                                    İptal
                                </button>
                                <button type="submit" className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium transition-colors">
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
