import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { kbArticleService } from '../../services/kbArticleService';
import { kbCategoryService } from '../../services/kbCategoryService';
import type { KbCategory } from '../../types/knowledgeBase';
import { KbArticleStatus, KbArticleType, KbArticleVisibility } from '../../types/knowledgeBase';
import toast from 'react-hot-toast';

export const KbArticleEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [categories, setCategories] = useState<KbCategory[]>([]);
    const [loading, setLoading] = useState(isEditing);

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [visibility, setVisibility] = useState<KbArticleVisibility>(KbArticleVisibility.Both);
    const [status, setStatus] = useState<KbArticleStatus>(KbArticleStatus.Draft);
    const [articleType, setArticleType] = useState<KbArticleType>(KbArticleType.FAQ);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const catData = await kbCategoryService.getAll();
                setCategories(catData);
                
                if (isEditing && id) {
                    const article = await kbArticleService.getById(id);
                    setTitle(article.title);
                    setContent(article.content);
                    setCategoryId(article.categoryId);
                    setVisibility(article.visibility);
                    setStatus(article.status);
                    setArticleType(article.articleType);
                }
            } catch {
                toast.error("Veriler yÃ¼klenemedi.");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [id, isEditing]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!categoryId) {
            toast.error("LÃ¼tfen bir kategori seÃ§in.");
            return;
        }
        
        if (!content || content === '<p><br></p>') {
            toast.error("Makale iÃ§eriÄŸi boÅŸ olamaz.");
            return;
        }

        try {
            const dto = { title, content, categoryId, visibility, status, articleType };
            
            if (isEditing && id) {
                await kbArticleService.update(id, { id, ...dto });
                toast.success("Makale gÃ¼ncellendi.");
            } else {
                await kbArticleService.create(dto);
                toast.success("Makale oluÅŸturuldu.");
            }
            navigate('/kb-admin/articles');
        } catch {
            toast.error("Kaydetme iÅŸlemi baÅŸarÄ±sÄ±z oldu.");
        }
    };

    // Quill modules configuration
    const modules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'code-block'],
            ['clean']
        ]
    }), []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">YÃ¼kleniyor...</div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-2">
                        <Link to="/kb-admin/articles" className="text-emerald-600 hover:text-emerald-700 font-medium">â† Makalelere DÃ¶n</Link>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mt-2">{isEditing ? 'Makaleyi DÃ¼zenle' : 'Yeni Makale OluÅŸtur'}</h1>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Makale BaÅŸlÄ±ÄŸÄ±</label>
                        <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="KÄ±sa ve aÃ§Ä±klayÄ±cÄ± bir baÅŸlÄ±k girin..." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-slate-800" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Kategori</label>
                            <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                <option value="" disabled>Kategori SeÃ§in...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Makale Tipi</label>
                            <select required value={articleType} onChange={e => setArticleType(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                <option value={KbArticleType.FAQ}>FAQ (SÄ±kÃ§a Sorulan Sorular)</option>
                                <option value={KbArticleType.Guide}>Rehber (KullanÄ±m KÄ±lavuzu)</option>
                                <option value={KbArticleType.Troubleshooting}>Sorun Giderme (Hata Ã‡Ã¶zÃ¼mÃ¼)</option>
                                <option value={KbArticleType.Procedure}>ProsedÃ¼r (Ä°ÅŸ SÃ¼reci)</option>
                                <option value={KbArticleType.Reference}>Referans (Teknik DokÃ¼man)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">GÃ¶rÃ¼nÃ¼rlÃ¼k (EriÅŸim Yetkisi)</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="visibility" value={KbArticleVisibility.Both} checked={visibility === KbArticleVisibility.Both} onChange={() => setVisibility(KbArticleVisibility.Both)} className="text-emerald-500 focus:ring-emerald-500" />
                                    <span className="text-sm text-slate-700 font-medium">Herkes (User & Tech)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="visibility" value={KbArticleVisibility.User} checked={visibility === KbArticleVisibility.User} onChange={() => setVisibility(KbArticleVisibility.User)} className="text-emerald-500 focus:ring-emerald-500" />
                                    <span className="text-sm text-slate-700 font-medium">Sadece KullanÄ±cÄ±lar</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="visibility" value={KbArticleVisibility.Technician} checked={visibility === KbArticleVisibility.Technician} onChange={() => setVisibility(KbArticleVisibility.Technician)} className="text-emerald-500 focus:ring-emerald-500" />
                                    <span className="text-sm text-slate-700 font-medium">Sadece Teknisyenler</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">YayÄ±n Durumu</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="status" value={KbArticleStatus.Draft} checked={status === KbArticleStatus.Draft} onChange={() => setStatus(KbArticleStatus.Draft)} className="text-emerald-500 focus:ring-emerald-500" />
                                    <span className="text-sm text-slate-700 font-medium">Taslak</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="status" value={KbArticleStatus.Published} checked={status === KbArticleStatus.Published} onChange={() => setStatus(KbArticleStatus.Published)} className="text-emerald-500 focus:ring-emerald-500" />
                                    <span className="text-sm text-slate-700 font-medium text-emerald-600">YayÄ±nda</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="status" value={KbArticleStatus.Archived} checked={status === KbArticleStatus.Archived} onChange={() => setStatus(KbArticleStatus.Archived)} className="text-emerald-500 focus:ring-emerald-500" />
                                    <span className="text-sm text-slate-700 font-medium text-slate-500">ArÅŸivle</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Ä°Ã§erik (Zengin Metin)</label>
                        <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                            <ReactQuill 
                                theme="snow" 
                                value={content} 
                                onChange={setContent} 
                                modules={modules}
                                className="h-64 sm:h-96"
                                placeholder="Makale iÃ§eriÄŸini buraya yazÄ±n..."
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Ä°Ã§erik otomatik olarak HTML formatÄ±nda saklanÄ±r.</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <Link to="/kb-admin/articles" className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                        Ä°ptal
                    </Link>
                    <button type="submit" className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium transition-colors shadow-sm">
                        Makaleyi Kaydet
                    </button>
                </div>
            </form>
        </div>
    );
};
