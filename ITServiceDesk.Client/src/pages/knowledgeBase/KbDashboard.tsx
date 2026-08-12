import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { kbArticleService } from '../../services/kbArticleService';
import type { KbDashboardStatsDto } from '../../types/knowledgeBase';

export const KbDashboard: React.FC = () => {
    const [stats, setStats] = useState<KbDashboardStatsDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await kbArticleService.getStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch KB stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!stats) {
        return <div className="p-8 text-center text-slate-500">İstatistikler yüklenemedi.</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Bilgi Bankası Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-1">Makalelerinizi ve kategorilerinizi yönetin.</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/kb-admin/categories" className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium transition-colors shadow-sm">
                        Kategoriler
                    </Link>
                    <Link to="/kb-admin/articles" className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium transition-colors shadow-sm">
                        Makaleler
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Toplam Makale" value={stats.totalArticles} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" color="bg-blue-500" />
                <StatCard title="Yayında" value={stats.publishedCount} icon="M5 13l4 4L19 7" color="bg-emerald-500" />
                <StatCard title="Taslak" value={stats.draftCount} icon="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" color="bg-amber-500" />
                <StatCard title="Arşiv" value={stats.archivedCount} icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" color="bg-slate-500" />
                <StatCard title="Görüntülenme" value={stats.totalViews} icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" color="bg-purple-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">En Çok Görüntülenenler</h3>
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {stats.mostViewedArticles.map((article) => (
                            <li key={article.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                <div>
                                    <Link to={`/kb-admin/articles/edit/${article.id}`} className="font-semibold text-emerald-600 hover:underline">{article.title}</Link>
                                    <p className="text-xs text-slate-500 mt-1">{article.categoryName}</p>
                                </div>
                                <div className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                    {article.viewCount} Görüntülenme
                                </div>
                            </li>
                        ))}
                        {stats.mostViewedArticles.length === 0 && (
                            <li className="p-6 text-center text-slate-500 text-sm">Henüz veri yok.</li>
                        )}
                    </ul>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">Son Eklenen Makaleler</h3>
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {stats.recentlyAddedArticles.map((article) => (
                            <li key={article.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                <div>
                                    <Link to={`/kb-admin/articles/edit/${article.id}`} className="font-semibold text-emerald-600 hover:underline">{article.title}</Link>
                                    <p className="text-xs text-slate-500 mt-1">{new Date(article.createdAt).toLocaleDateString('tr-TR')}</p>
                                </div>
                                <div className="text-sm">
                                    {article.helpfulCount > 0 && <span className="text-emerald-500 font-bold mr-3">+{article.helpfulCount}</span>}
                                    {article.notHelpfulCount > 0 && <span className="text-rose-500 font-bold">-{article.notHelpfulCount}</span>}
                                </div>
                            </li>
                        ))}
                        {stats.recentlyAddedArticles.length === 0 && (
                            <li className="p-6 text-center text-slate-500 text-sm">Henüz veri yok.</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${color}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);
