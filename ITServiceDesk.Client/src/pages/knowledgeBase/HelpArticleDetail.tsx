import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { kbArticleService } from '../../services/kbArticleService';
import type { KbArticle } from '../../types/knowledgeBase';
import { KbArticleType } from '../../types/knowledgeBase';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';
import 'react-quill-new/dist/quill.snow.css'; // For basic Quill styles (lists, blockquotes etc)

export const HelpArticleDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [article, setArticle] = useState<KbArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    
    useEffect(() => {
        const fetchArticle = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await kbArticleService.getById(id);
                setArticle(data);
            } catch {
                toast.error('Makale yÃ¼klenemedi veya bulunamadÄ±.');
                navigate('/help');
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [id, navigate]);

    const handleFeedback = async (isHelpful: boolean) => {
        if (!id || feedbackSubmitted) return;
        try {
            await kbArticleService.submitFeedback(id, { isHelpful });
            setFeedbackSubmitted(true);
            toast.success('Geri bildiriminiz iÃ§in teÅŸekkÃ¼rler!');
        } catch {
            toast.error('Geri bildirim gÃ¶nderilemedi.');
        }
    };

    const handleOpenTicket = () => {
        navigate('/', { state: { openNewTicket: true } });
    };

    const getArticleTypeBadge = (type: KbArticleType) => {
        switch (type) {
            case KbArticleType.FAQ: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">FAQ</span>;
            case KbArticleType.Guide: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">Rehber</span>;
            case KbArticleType.Troubleshooting: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">Ã‡Ã¶zÃ¼m</span>;
            case KbArticleType.Procedure: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">ProsedÃ¼r</span>;
            case KbArticleType.Reference: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Referans</span>;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-24 mb-8"></div>
                <div className="h-10 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-12"></div>
                <div className="space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                </div>
            </div>
        );
    }

    if (!article) return null;

    const sanitizedContent = DOMPurify.sanitize(article.content, {
        USE_PROFILES: { html: true }
    });

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 pb-16">
            <Link to="/help" className="inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-700 mb-8 group">
                <svg className="w-4 h-4 mr-1 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                YardÄ±m Merkezine DÃ¶n
            </Link>

            <article className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{article.categoryName}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        {getArticleTypeBadge(article.articleType)}
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 leading-tight">
                        {article.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                {article.authorName.charAt(0)}
                            </div>
                            <span>{article.authorName}</span>
                        </div>
                        <div className="flex items-center gap-2" title="YayÄ±nlanma Tarihi">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {new Date(article.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                        <div className="flex items-center gap-2" title="Okunma SayÄ±sÄ±">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            {article.viewCount} Okunma
                        </div>
                    </div>
                </div>

                {/* Article Content */}
                <div className="p-8 md:p-12">
                    <div 
                        className="ql-editor !px-0"
                        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                </div>
            </article>

            {/* Feedback Widget */}
            <div className="bg-emerald-50 rounded-2xl p-8 text-center border border-emerald-100 shadow-sm mb-12">
                {feedbackSubmitted ? (
                    <div className="flex flex-col items-center justify-center animate-fade-in-up">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-emerald-800">Geri bildiriminiz alÄ±ndÄ±!</h3>
                        <p className="text-emerald-600 mt-1">Ä°Ã§eriÄŸimizi geliÅŸtirmemize yardÄ±mcÄ± olduÄŸunuz iÃ§in teÅŸekkÃ¼r ederiz.</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Bu makale faydalÄ± oldu mu?</h3>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => handleFeedback(true)}
                                className="px-6 py-2.5 bg-white border-2 border-emerald-200 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                                Evet, faydalÄ±
                            </button>
                            <button 
                                onClick={() => handleFeedback(false)}
                                className="px-6 py-2.5 bg-white border-2 border-rose-200 text-rose-700 font-bold rounded-xl hover:bg-rose-100 hover:border-rose-300 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
                                HayÄ±r, olmadÄ±
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Support CTA */}
            <div className="bg-slate-800 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left shadow-lg">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Bu makale sorununuzu Ã§Ã¶zmedi mi?</h3>
                    <p className="text-slate-300">Teknik destek ekibimize yeni bir talep ileterek doÄŸrudan yardÄ±m alabilirsiniz.</p>
                </div>
                <button 
                    onClick={handleOpenTicket}
                    className="shrink-0 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Yeni Talep AÃ§
                </button>
            </div>
        </div>
    );
};
