import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deviceService } from '../services/deviceService';
import { ticketService } from '../services/ticketService';
import { authService } from '../services/authService';
import { type DeviceDto, DeviceStatus } from '../types/device';
import { type TicketResponseDto, TicketStatus } from '../types/ticket';
import toast from 'react-hot-toast';

const MyInventory: React.FC = () => {
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceDto | null>(null);
  const [deviceHistory, setDeviceHistory] = useState<TicketResponseDto[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const navigate = useNavigate();
  const currentUserId = authService.getUserId();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const data = await deviceService.getAvailable();
      setDevices(data);
    } catch (error) {
      console.error(error);
      toast.error('Zimmet bilgileri yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async (deviceId: string) => {
    try {
      setIsHistoryLoading(true);
      const res = await ticketService.getByDeviceId(deviceId);
      setDeviceHistory(res || []);
    } catch (error) {
      toast.error("Arıza geçmişi yüklenemedi");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const openDrawer = (device: DeviceDto) => {
    setSelectedDevice(device);
    setIsDrawerOpen(true);
    loadHistory(device.id);
  };

  const reportIssue = (device: DeviceDto) => {
    navigate('/');
    setTimeout(() => {
       window.dispatchEvent(new CustomEvent('open-new-ticket', { detail: { deviceId: device.id, categoryId: device.categoryId } }));
    }, 100);
  };

  const myDevices = devices.filter(d => d.assignedUserId === currentUserId);
  const departmentDevices = devices.filter(d => d.assignedUserId !== currentUserId);

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.Active: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">Aktif</span>;
      case DeviceStatus.Faulty: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700 border border-rose-200 shadow-sm">Arızalı</span>;
      case DeviceStatus.Maintenance: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">Bakımda</span>;
      case DeviceStatus.Storage: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">Depoda</span>;
      default: return null;
    }
  };

  const getDeviceIcon = (categoryName: string | null) => {
    const name = (categoryName || '').toLowerCase();
    if (name.includes('bilgisayar') || name.includes('laptop') || name.includes('pc')) {
      return <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
    }
    if (name.includes('telefon') || name.includes('mobil')) {
      return <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
    }
    if (name.includes('yazıcı') || name.includes('printer')) {
      return <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
    }
    return <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
  };

  const renderDeviceCard = (device: DeviceDto, isPersonal: boolean) => (
    <div key={device.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden flex flex-col">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${isPersonal ? 'from-emerald-50 to-transparent' : 'from-indigo-50 to-transparent'} rounded-full -mr-16 -mt-16 z-0 opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
      
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isPersonal ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-indigo-100 text-indigo-600 border border-indigo-200'}`}>
           {getDeviceIcon(device.categoryName)}
        </div>
        <div>
          {getStatusBadge(device.status)}
        </div>
      </div>
      
      <div className="relative z-10 flex-1 mb-6">
        <h3 className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight mb-1" title={device.name}>{device.name}</h3>
        <p className="text-sm font-medium text-slate-500">{device.code}</p>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          {device.categoryName}
        </p>
      </div>
      
      <div className="relative z-10 grid grid-cols-2 gap-2 mt-auto">
         <button 
           onClick={() => openDrawer(device)}
           className="w-full py-2.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
         >
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           Geçmiş
         </button>
         <button 
           onClick={() => reportIssue(device)}
           className="w-full py-2.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-rose-100"
         >
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           Arıza Bildir
         </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-8">
      
      {/* Şahsi Zimmetler */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-emerald-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Üzerimdeki Cihazlar</h2>
            <p className="text-sm text-slate-500 font-medium">Bana özel tahsis edilmiş donanımlar</p>
          </div>
        </div>
        
        {myDevices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center">
            <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-slate-500 font-medium">Üzerinize zimmetlenmiş bir cihaz bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myDevices.map(d => renderDeviceCard(d, true))}
          </div>
        )}
      </section>

      <div className="h-px bg-slate-200 w-full rounded-full"></div>

      {/* Departman Cihazları */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Departman Cihazları</h2>
            <p className="text-sm text-slate-500 font-medium">Departmanınızın ortak kullanımındaki cihazlar</p>
          </div>
        </div>
        
        {departmentDevices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center">
            <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-slate-500 font-medium">Departmanınıza ait ortak bir cihaz bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {departmentDevices.map(d => renderDeviceCard(d, false))}
          </div>
        )}
      </section>

      {/* Drawer */}
      {isDrawerOpen && selectedDevice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center sm:justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)}>
          <div 
            className="bg-white h-[90vh] sm:h-full w-full sm:w-[500px] rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col transform transition-transform animate-slide-up sm:animate-slide-left mt-auto sm:mt-0" 
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile handle */}
            <div className="w-full flex justify-center py-3 sm:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 Arıza Geçmişi
              </h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 flex flex-col flex-1 overflow-hidden">
              <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100 shrink-0 shadow-inner">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedDevice.name}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">{selectedDevice.code}</p>
                  </div>
                  {getStatusBadge(selectedDevice.status)}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar pr-2">
                {isHistoryLoading ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                     <span className="text-slate-500 text-sm font-medium">Geçmiş yükleniyor...</span>
                  </div>
                ) : deviceHistory.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    <p className="text-slate-500 text-sm font-medium">Bu cihaza ait arıza kaydı bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {deviceHistory.map(ticket => (
                      <div key={ticket.id} className="relative flex items-start gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow-sm shrink-0 z-10 mt-1">
                          {ticket.status === TicketStatus.Resolved || ticket.status === TicketStatus.Closed ? (
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                        </div>

                        <div className="flex-1 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.status === TicketStatus.Resolved || ticket.status === TicketStatus.Closed
                              ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                              {ticket.status === TicketStatus.Resolved || ticket.status === TicketStatus.Closed ? 'Çözüldü' : 'Açık'}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{new Date(ticket.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <h5 className="text-sm font-bold text-slate-800 mb-1" title={ticket.title}>{ticket.title}</h5>
                          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{ticket.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyInventory;
