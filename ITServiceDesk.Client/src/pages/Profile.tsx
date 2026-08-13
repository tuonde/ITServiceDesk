import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { profileService } from '../services/profileService';
import type { ProfileUpdateData, ChangePasswordData } from '../services/profileService';
import { authService } from '../services/authService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function Profile() {
  const isMobileResponsive = !authService.isAdmin();
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
      let phone = data.phoneNumber || '';
      if (phone.startsWith('+90')) {
        phone = phone.slice(3);
      }
      setProfileData({
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: phone
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
      const dataToSubmit = { ...profileData };
      if (dataToSubmit.phoneNumber && !dataToSubmit.phoneNumber.startsWith('+90')) {
        dataToSubmit.phoneNumber = '+90' + dataToSubmit.phoneNumber;
      }
      await profileService.updateProfile(dataToSubmit);
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Yalnızca rakamlara izin ver
    val = val.replace(/\D/g, '');

    // En fazla 10 rakam (başında +90 sabit olduğu için)
    if (val.length > 10) {
      val = val.slice(0, 10);
    }

    setProfileData({ ...profileData, phoneNumber: val });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden max-w-5xl mx-auto w-full">
      <div className={`border-b border-slate-100 flex items-center justify-between bg-slate-50/50 ${isMobileResponsive ? 'p-4 sm:p-6' : 'p-6'}`}>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Profilim</h2>
          <p className="text-sm text-slate-500 mt-1">Kişisel bilgilerinizi ve şifrenizi güncelleyin.</p>
        </div>
        <Link 
          to="/" 
          className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 rounded-full flex items-center justify-center transition-all shadow-sm"
          title="Anasayfaya Dön"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </Link>
      </div>

      <div className={isMobileResponsive ? 'p-4 sm:p-6' : 'p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Kişisel Bilgiler</h3>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Input label="E-posta (Sabit)" disabled value={readOnlyData.email || ''} />
              <Input label="Departman (Sabit)" disabled value={readOnlyData.departmentName || '-'} />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Ad" required value={profileData.firstName} onChange={e => setProfileData({ ...profileData, firstName: e.target.value })} />
                <Input label="Soyad" required value={profileData.lastName} onChange={e => setProfileData({ ...profileData, lastName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Telefon</label>
                <div className="relative flex items-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all overflow-hidden">
                  <div className="flex items-center justify-center bg-slate-100/50 px-3 py-2 -ml-4 mr-3 border-r border-slate-200 text-slate-600 font-semibold select-none h-full self-stretch">
                    +90
                  </div>
                  <input
                    type="text"
                    placeholder="5551234567"
                    value={profileData.phoneNumber || ''}
                    onChange={handlePhoneChange}
                    maxLength={10}
                    className="w-full bg-transparent outline-none tracking-wide"
                  />
                </div>
              </div>
              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full">
                  Bilgilerimi Güncelle
                </Button>
              </div>
            </form>
          </div>

          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Şifre Değiştir</h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input label="Mevcut Şifre" type="password" required value={passwordData.currentPassword} onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
              <Input label="Yeni Şifre" type="password" required minLength={6} value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
              <Input label="Yeni Şifre (Tekrar)" type="password" required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/50">
                  Şifremi Güncelle
                </Button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
