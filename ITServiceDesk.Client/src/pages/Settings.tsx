import { useState, useRef, useEffect, type FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { settingsService } from '../services/settingsService';
import { useSettings } from '../contexts/SettingsContext';
import { systemSettingsService, type SystemSettingsDto } from '../services/systemSettingsService';

export default function Settings() {
  const { settings, refreshSettings } = useSettings();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<SystemSettingsDto>({
    appName: '',
    sessionTimeoutMinutes: 30,
    passwordMinLength: 6,
    passwordRequireUppercase: false
  });

  const loadLogo = async () => {
    try {
      const url = await settingsService.getLogoUrl();
      if (url) {
        setLogoUrl(url);
      }
    } catch (err) {
      console.error('Logo yüklenemedi', err);
    }
  };

  useEffect(() => {
    loadLogo();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await systemSettingsService.updateSettings(formData);
      await refreshSettings();
      toast.success('Ayarlar başarıyla kaydedildi.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ayarlar kaydedilemedi.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLoading(true);
      try {
        const response = await settingsService.uploadLogo(file);
        toast.success(response.message || 'Logo güncellendi.');
        // Update local state and trigger app refresh by dispatching an event if needed
        setLogoUrl(response.data);
        window.dispatchEvent(new Event('logo-updated'));
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Logo yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sistem Ayarları</h1>
        <p className="text-sm text-slate-500 mt-1">Sistemin genel ayarlarını ve görselliğini yapılandırın.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Uygulama Logosu</h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="w-48 h-48 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-slate-50 overflow-hidden relative group">
            {logoUrl ? (
              <img src={logoUrl} alt="Sistem Logosu" className="max-w-full max-h-full object-contain p-4" />
            ) : (
              <div className="text-slate-400 text-center p-4">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-sm">Logo Yok</span>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div>
              <h3 className="font-semibold text-slate-700">Yeni Logo Yükle</h3>
              <p className="text-sm text-slate-500 mt-1">Önerilen boyut: 200x50 piksel. Şeffaf arkaplanlı (PNG) tercih edilir.</p>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".jpg,.jpeg,.png,.svg,.webp" 
              className="hidden" 
            />
            
            <button 
              onClick={handleUploadClick}
              disabled={loading}
              className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors font-medium shadow-sm inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Dosya Seç
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSettingsSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Genel Ayarlar</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Uygulama Adı</label>
                <input 
                  type="text" 
                  value={formData.appName}
                  onChange={(e) => setFormData({...formData, appName: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Güvenlik Ayarları</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Oturum Zaman Aşımı (Dakika)</label>
                <input 
                  type="number" 
                  min="1"
                  max="1440"
                  value={formData.sessionTimeoutMinutes}
                  onChange={(e) => setFormData({...formData, sessionTimeoutMinutes: parseInt(e.target.value) || 30})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Şifre Minimum Uzunluk</label>
                <input 
                  type="number" 
                  min="4"
                  max="32"
                  value={formData.passwordMinLength}
                  onChange={(e) => setFormData({...formData, passwordMinLength: parseInt(e.target.value) || 6})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="requireUppercase"
                  checked={formData.passwordRequireUppercase}
                  onChange={(e) => setFormData({...formData, passwordRequireUppercase: e.target.checked})}
                  className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="requireUppercase" className="text-sm font-medium text-slate-700 select-none">
                  Şifrede en az bir büyük harf zorunlu olsun
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button 
            type="submit"
            disabled={savingSettings}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {savingSettings ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            )}
            Ayarları Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
