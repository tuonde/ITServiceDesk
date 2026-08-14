import { useState, useRef, useEffect, type FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { settingsService } from '../services/settingsService';
import { useSettings } from '../contexts/SettingsContext';
import { systemSettingsService, type SystemSettingsDto } from '../services/systemSettingsService';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
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
    passwordRequireUppercase: false,
    slaCriticalResponseHours: 1,
    slaCriticalResolutionHours: 4,
    slaHighResponseHours: 4,
    slaHighResolutionHours: 8,
    slaMediumResponseHours: 8,
    slaMediumResolutionHours: 24,
    slaLowResponseHours: 24,
    slaLowResolutionHours: 48,
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
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <PageHeader 
        title="Sistem Ayarları"
        description="Sistemin genel ayarlarını ve görünürlüğünü yapılandırın."
      />

      <form onSubmit={handleSettingsSubmit} className="space-y-6">
        
        {/* 1. Uygulama Ayarları */}
        <Card>
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Uygulama Ayarları</h2>
            <p className="text-sm text-slate-500">Uygulamanın temel görünüm ve bilgilerini yapılandırın.</p>
          </div>
          <CardContent className="p-6">
            <div className="space-y-8">
              {/* Logo Alanı */}
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-slate-50 overflow-hidden relative group shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Sistem Logosu" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <div className="text-slate-400 text-center p-2">
                      <svg className="w-8 h-8 mx-auto mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-xs">Logo Yok</span>
                    </div>
                  )}
                  {loading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-medium text-slate-700">Uygulama Logosu</h3>
                    <p className="text-sm text-slate-500 mt-1">Önerilen boyut: 200x50 piksel. Şeffaf arkaplanlı (PNG) tercih edilir.</p>
                  </div>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".jpg,.jpeg,.png,.svg,.webp" 
                    className="hidden" 
                  />
                  
                  <Button 
                    type="button"
                    onClick={handleUploadClick}
                    disabled={loading}
                    variant="outline"
                    className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Yeni Logo Yükle
                  </Button>
                </div>
              </div>

              {/* App Name */}
              <div className="max-w-md border-t border-slate-100 pt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Uygulama Adı</label>
                <Input 
                  type="text" 
                  value={formData.appName}
                  onChange={(e) => setFormData({...formData, appName: e.target.value})}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Güvenlik Ayarları */}
        <Card>
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Güvenlik Ayarları</h2>
            <p className="text-sm text-slate-500">Oturum ve parola güvenlik politikalarını yapılandırın.</p>
          </div>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Oturum Zaman Aşımı (Dakika)</label>
                  <Input 
                    type="number" 
                    min="1" max="1440"
                    value={formData.sessionTimeoutMinutes.toString()}
                    onChange={(e) => setFormData({...formData, sessionTimeoutMinutes: parseInt(e.target.value) || 30})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Şifre Minimum Uzunluk</label>
                  <Input 
                    type="number" 
                    min="4" max="32"
                    value={formData.passwordMinLength.toString()}
                    onChange={(e) => setFormData({...formData, passwordMinLength: parseInt(e.target.value) || 6})}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="requireUppercase"
                  checked={formData.passwordRequireUppercase}
                  onChange={(e) => setFormData({...formData, passwordRequireUppercase: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="requireUppercase" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                  Şifrede en az bir büyük harf zorunlu olsun
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. SLA Ayarları */}
        <Card>
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">SLA (Hizmet Seviyesi) Ayarları</h2>
            <p className="text-sm text-slate-500">Talep önceliklerine göre hedef süreleri belirleyin.</p>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Critical */}
              <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100/50 hover:border-rose-200 transition-colors">
                <h3 className="font-semibold text-rose-700 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Kritik
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">İlk Yanıt (Saat)</label>
                    <Input 
                      type="number" min="1" max="720"
                      value={formData.slaCriticalResponseHours.toString()}
                      onChange={(e) => setFormData({...formData, slaCriticalResponseHours: parseInt(e.target.value) || 1})}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Çözüm (Saat)</label>
                    <Input 
                      type="number" min="1" max="720"
                      value={formData.slaCriticalResolutionHours.toString()}
                      onChange={(e) => setFormData({...formData, slaCriticalResolutionHours: parseInt(e.target.value) || 4})}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* High */}
              <div className="bg-orange-50/40 p-4 rounded-xl border border-orange-100/50 hover:border-orange-200 transition-colors">
                <h3 className="font-semibold text-orange-700 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  Yüksek
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">İlk Yanıt (Saat)</label>
                    <Input 
                      type="number" min="1" max="720"
                      value={formData.slaHighResponseHours.toString()}
                      onChange={(e) => setFormData({...formData, slaHighResponseHours: parseInt(e.target.value) || 4})}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Çözüm (Saat)</label>
                    <Input 
                      type="number" min="1" max="720"
                      value={formData.slaHighResolutionHours.toString()}
                      onChange={(e) => setFormData({...formData, slaHighResolutionHours: parseInt(e.target.value) || 8})}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Medium */}
              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100/50 hover:border-blue-200 transition-colors">
                <h3 className="font-semibold text-blue-700 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Orta
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">İlk Yanıt (Saat)</label>
                    <Input 
                      type="number" min="1" max="720"
                      value={formData.slaMediumResponseHours.toString()}
                      onChange={(e) => setFormData({...formData, slaMediumResponseHours: parseInt(e.target.value) || 8})}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Çözüm (Saat)</label>
                    <Input 
                      type="number" min="1" max="720"
                      value={formData.slaMediumResolutionHours.toString()}
                      onChange={(e) => setFormData({...formData, slaMediumResolutionHours: parseInt(e.target.value) || 24})}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Low */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 hover:border-slate-300 transition-colors">
                <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  Düşük
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">İlk Yanıt (Saat)</label>
                    <Input 
                      type="number" min="1" max="720"
                      value={formData.slaLowResponseHours.toString()}
                      onChange={(e) => setFormData({...formData, slaLowResponseHours: parseInt(e.target.value) || 24})}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Çözüm (Saat)</label>
                    <Input 
                      type="number" min="1" max="720"
                      value={formData.slaLowResolutionHours.toString()}
                      onChange={(e) => setFormData({...formData, slaLowResolutionHours: parseInt(e.target.value) || 48})}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <Button 
            type="submit"
            disabled={savingSettings}
            variant="primary"
            className="inline-flex items-center gap-2 px-6 py-2.5 shadow-sm"
          >
            {savingSettings ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            )}
            Ayarları Kaydet
          </Button>
        </div>

      </form>
    </div>
  );
}
