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
    } catch {
      toast.error('Profil bilgileri yÃ¼klenemedi.');
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
      toast.success('Profil bilgileriniz gÃ¼ncellendi.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Profil gÃ¼ncellenemedi.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== confirmPassword) {
      toast.error('Yeni ÅŸifreler eÅŸleÅŸmiyor.');
      return;
    }

    try {
      await profileService.changePassword(passwordData);
      toast.success('Åifreniz baÅŸarÄ±yla deÄŸiÅŸtirildi.');
      setPasswordData({ currentPassword: '', newPassword: '' });
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Åifre deÄŸiÅŸtirilemedi.');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // YalnÄ±zca rakamlara izin ver
    val = val.replace(/\D/g, '');

    // En fazla 10 rakam (baÅŸÄ±nda +90 sabit olduÄŸu iÃ§in)
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
      <div className={`border-b border-slate-100 flex flex-col bg-slate-50/50 ${isMobileResponsive ? 'p-4 sm:p-6' : 'p-6'}`}>
        <div>
          <div className="flex items-center gap-2 mb-2">
              <Link to="/" className="text-emerald-600 hover:text-emerald-700 font-medium">â† Ana MenÃ¼</Link>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Profilim</h2>
          <p className="text-sm text-slate-500 mt-1">KiÅŸisel bilgilerinizi ve ÅŸifrenizi gÃ¼ncelleyin.</p>
        </div>
      </div>

      <div className={isMobileResponsive ? 'p-4 sm:p-6' : 'p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">KiÅŸisel Bilgiler</h3>
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
                  Bilgilerimi GÃ¼ncelle
                </Button>
              </div>
            </form>
          </div>

          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Åifre DeÄŸiÅŸtir</h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input label="Mevcut Åifre" type="password" required value={passwordData.currentPassword} onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
              <Input label="Yeni Åifre" type="password" required minLength={6} value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
              <Input label="Yeni Åifre (Tekrar)" type="password" required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/50">
                  Åifremi GÃ¼ncelle
                </Button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
