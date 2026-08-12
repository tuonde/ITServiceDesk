import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { kbArticleService } from '../../services/kbArticleService';
import { kbCategoryService } from '../../services/kbCategoryService';
import type { KbArticle, KbCategory } from '../../types/knowledgeBase';
import { KbArticleStatus, KbArticleVisibility } from '../../types/knowledgeBase';
import toast from 'react-hot-toast';

export const KbArticlesList: React.FC = () => {
    const [articles, setArticles] = useState<KbArticle[]>([]);
    const [categories, setCategories] = useState<KbCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [pageNumber, setPageNumber] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [status, setStatus] = useState<KbArticleStatus | ''>('');

    const fetchCategories = async () => {
        try {
            const data = await kbCategoryService.getAll();
            setCategories(data);
        } catch (error) { }
    };

    const fetchArticles = async () => {
        try {
            setLoading(true);
            const data = await kbArticleService.getPaged({
                pageNumber,
                pageSize: 10,
                searchTerm: searchTerm || undefined,
                categoryId: categoryId || undefined,
                status: status !== '' ? status : undefined
            });
            setArticles(data.data || []);
            setTotalCount(data.totalRecords);
        } catch (error) {
            toast.error("Makaleler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchArticles();
    }, [pageNumber, categoryId, status]);

    const handleDelete = async (id: string, title: string) => {
        if (window.confirm(`"${title}" makalesini silmek istediğinize emin misiniz?`)) {
            try {
                await kbArticleService.delete(id);
                toast.success("Makale silindi.");
                fetchArticles();
            } catch (error) {
                toast.error("Makale silinemedi.");
            }
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPageNumber(1);
        fetchArticles();
    };

    const getStatusBadge = (status: KbArticleStatus) => {
        switch (status) {
            case KbArticleStatus.Published: return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">Yayında</span>;
            case KbArticleStatus.Draft: return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">Taslak</span>;
            case KbArticleStatus.Archived: return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-bold">Arşiv</span>;
            default: return null;
        }
    };

    const getVisibilityBadge = (visibility: KbArticleVisibility) => {
        switch (visibility) {
            case KbArticleVisibility.User: return 'Kullanıcı (User)';
            case KbArticleVisibility.Technician: return 'Teknisyen (Tech)';
            case KbArticleVisibility.Both: return 'Herkes (Both)';
            default: return '-';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2">
                        <Link to="/kb-admin" className="text-emerald-600 hover:text-emerald-700 font-medium">← Bilgi Bankası</Link>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mt-2">Makale Yönetimi</h1>
                </div>
                <Link to="/kb-admin/articles/new" className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium transition-colors shadow-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Yeni Makale
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Arama</label>
                        <input type="text" placeholder="Başlık veya içerik ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div className="w-48">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kategori</label>
                        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPageNumber(1); }} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                            <option value="">Tümü</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="w-48">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Durum</label>
                        <select value={status} onChange={e => { setStatus(e.target.value ? Number(e.target.value) : ''); setPageNumber(1); }} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                            <option value="">Tümü</option>
                            <option value={KbArticleStatus.Published}>Yayında</option>
                            <option value={KbArticleStatus.Draft}>Taslak</option>
                            <option value={KbArticleStatus.Archived}>Arşivlenmiş</option>
                        </select>
                    </div>
                    <button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium transition-colors">
                        Filtrele
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Makale</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Görünürlük</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">İstatistikler</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {articles.map((article) => (
                                    <tr key={article.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-slate-800">{article.title}</div>
                                            <div className="text-xs text-slate-500 mt-1">{article.categoryName} • Yazar: {article.authorName}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">{new Date(article.createdAt).toLocaleDateString('tr-TR')}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(article.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                            {getVisibilityBadge(article.visibility)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                                <span className="flex items-center gap-1" title="Görüntülenme">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    {article.viewCount}
                                                </span>
                                                <span className="flex items-center gap-1 text-emerald-500" title="Faydalı">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                                                    {article.helpfulCount}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link to={`/kb-admin/articles/edit/${article.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">Düzenle</Link>
                                            <button onClick={() => handleDelete(article.id, article.title)} className="text-rose-600 hover:text-rose-900">Sil</button>
                                        </td>
                                    </tr>
                                ))}
                                {articles.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Sonuç bulunamadı.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Pagination (Simplified) */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-sm text-slate-600">Toplam {totalCount} kayıt</span>
                    <div className="flex gap-2">
                        <button disabled={pageNumber === 1} onClick={() => setPageNumber(p => p - 1)} className="px-3 py-1 border border-slate-300 rounded bg-white text-slate-600 disabled:opacity-50">Önceki</button>
                        <button disabled={articles.length < 10} onClick={() => setPageNumber(p => p + 1)} className="px-3 py-1 border border-slate-300 rounded bg-white text-slate-600 disabled:opacity-50">Sonraki</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
