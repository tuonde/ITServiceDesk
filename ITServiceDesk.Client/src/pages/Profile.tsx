import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { profileService } from '../services/profileService';
import type { ProfileUpdateData, ChangePasswordData } from '../services/profileService';


export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [readOnlyData, setReadOnlyData] = useState({ email: '', departmentName: '' });
  
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });

  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadProfile = async () => {
    try {
      const data = await profileService.getMyProfile();
      setProfileData({
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber || ''
      });
      setReadOnlyData({
        email: data.email,
        departmentName: data.departmentName
      });
    } catch (err) {
      toast.error('Profil bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await profileService.updateProfile(profileData);
      toast.success('Profil bilgileriniz güncellendi.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Profil güncellenemedi.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor.');
      return;
    }
    
    try {
      await profileService.changePassword(passwordData);
      toast.success('Şifreniz başarıyla değiştirildi.');
      setPasswordData({ currentPassword: '', newPassword: '' });
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Şifre değiştirilemedi.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profilim</h1>
          <p className="text-sm text-slate-500 mt-1">Kişisel bilgilerinizi ve şifrenizi güncelleyin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Kişisel Bilgiler</h2>
          </div>
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">E-posta (Sabit)</label>
              <input disabled value={readOnlyData.email || ''} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Departman (Sabit)</label>
              <input disabled value={readOnlyData.departmentName || '-'} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Ad</label>
                <input required value={profileData.firstName} onChange={e => setProfileData({...profileData, firstName: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Soyad</label>
                <input required value={profileData.lastName} onChange={e => setProfileData({...profileData, lastName: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Telefon</label>
              <div className="relative flex items-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <input 
                  type="text" 
                  placeholder="Örn: 05551234567" 
                  value={profileData.phoneNumber || ''} 
                  onChange={e => setProfileData({...profileData, phoneNumber: e.target.value})} 
                  className="w-full bg-transparent outline-none" 
                />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm font-medium">
                Bilgilerimi Güncelle
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Şifre Değiştir</h2>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Mevcut Şifre</label>
              <input type="password" required value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Yeni Şifre</label>
              <input type="password" required minLength={6} value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Yeni Şifre (Tekrar)</label>
              <input type="password" required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium">
                Şifremi Güncelle
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
