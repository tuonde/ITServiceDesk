import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { kbArticleService } from '../services/kbArticleService';
import { kbCategoryService } from '../services/kbCategoryService';
import type { KbArticle, KbCategory } from '../types/knowledgeBase';
import { KbArticleStatus, KbArticleType } from '../types/knowledgeBase';

const Help: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [articles, setArticles] = useState<KbArticle[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoadingCategories(true);
        const data = await kbCategoryService.getAll();
        // Sort by Order
        data.sort((a, b) => a.order - b.order);
        setCategories(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCats();
  }, []);

  // Fetch Articles
  useEffect(() => {
    const fetchArts = async () => {
      try {
        setLoadingArticles(true);
        const data = await kbArticleService.getPaged({
          pageNumber: 1,
          pageSize: 20,
          searchTerm: debouncedSearch || undefined,
          categoryId: selectedCategoryId || undefined,
          status: KbArticleStatus.Published
        });
        setArticles(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingArticles(false);
      }
    };
    fetchArts();
  }, [debouncedSearch, selectedCategoryId]);

  const handleOpenTicket = () => {
    navigate('/', { state: { openNewTicket: true } });
  };

  const getArticleTypeBadge = (type: KbArticleType) => {
    switch (type) {
      case KbArticleType.FAQ: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">FAQ</span>;
      case KbArticleType.Guide: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Rehber</span>;
      case KbArticleType.Troubleshooting: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Çözüm</span>;
      case KbArticleType.Procedure: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Prosedür</span>;
      case KbArticleType.Reference: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Referans</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Hero Section */}
      <div className="bg-emerald-600 rounded-3xl p-8 md:p-12 mb-8 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0,0 L100,100 M100,0 L0,100" stroke="currentColor" strokeWidth="2"/></svg>
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-sm">Nasıl yardımcı olabiliriz?</h1>
          <p className="text-emerald-100 text-lg md:text-xl mb-8 max-w-2xl mx-auto">Sıkça sorulan sorular, rehberler ve sorun giderme makaleleri arasında arama yapın.</p>
          <div className="max-w-xl mx-auto relative">
            <input 
              type="text" 
              placeholder="Arama yapın... (örn: oracle vpn printer)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-slate-800 shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-400/50 transition-all text-lg"
            />
            <svg className="w-6 h-6 text-slate-400 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-12 pb-12">
        {/* Categories Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Kategoriler</h2>
            {selectedCategoryId && (
              <button onClick={() => setSelectedCategoryId('')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                Tümünü Göster
              </button>
            )}
          </div>
          
          {loadingCategories ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-slate-500">Henüz kategori bulunmuyor.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id === selectedCategoryId ? '' : category.id)}
                  className={`p-6 rounded-2xl border text-left transition-all group flex flex-col items-center justify-center gap-3
                    ${selectedCategoryId === category.id 
                      ? 'bg-emerald-500 border-emerald-600 shadow-md text-white' 
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md text-slate-700'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                    ${selectedCategoryId === category.id ? 'bg-emerald-600/50 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h3 className="font-bold text-center">{category.name}</h3>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Articles Section */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {debouncedSearch ? `Arama Sonuçları: "${debouncedSearch}"` : selectedCategoryId ? 'Kategori Makaleleri' : 'Önerilen Makaleler'}
          </h2>

          {loadingArticles ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Aradığınız konuyla ilgili makale bulunamadı.</h3>
              <p className="text-slate-500 mb-6 max-w-md">Farklı kelimelerle arama yapabilir veya destek ekibimizle iletişime geçebilirsiniz.</p>
              <button 
                onClick={handleOpenTicket}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Yeni Talep Aç
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.map(article => (
                <Link 
                  key={article.id} 
                  to={`/help/article/${article.id}`}
                  className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-2 pr-4">{article.title}</h3>
                    {getArticleTypeBadge(article.articleType)}
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      {article.categoryName}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Görüntülenme">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        {article.viewCount}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-500" title="Faydalı">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                        {article.helpfulCount}
                      </span>
                      <span className="flex items-center gap-1 text-rose-500" title="Faydalı Değil">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
                        {article.notHelpfulCount}
                      </span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Global Fallback CTA */}
        {articles.length > 0 && (
          <div className="mt-12 bg-slate-50 border border-slate-200 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">Aradığınızı bulamadınız mı?</h3>
              <p className="text-slate-500">Endişelenmeyin, teknik destek ekibimiz size yardımcı olmaya hazır.</p>
            </div>
            <button 
              onClick={handleOpenTicket}
              className="shrink-0 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Yeni Talep Aç
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Help;
