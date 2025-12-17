
import React from 'react';
import { 
  LayoutDashboard, 
  Stethoscope, 
  ClipboardCheck, 
  Wrench, 
  ArrowRightLeft, 
  Settings,
  Activity
} from 'lucide-react';
import { AppSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  settings?: AppSettings;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, settings }) => {
  const menuItems = [
    { id: 'dashboard', label: 'แดชบอร์ด (Dashboard)', icon: LayoutDashboard },
    { id: 'assets', label: 'ทะเบียนครุภัณฑ์', icon: Stethoscope },
    { id: 'checks', label: 'ตรวจเช็คประจำวัน', icon: ClipboardCheck },
    { id: 'maintenance', label: 'แจ้งซ่อม & PM', icon: Wrench },
    { id: 'loans', label: 'ระบบยืม-คืน', icon: ArrowRightLeft },
    { id: 'compliance', label: 'มาตรฐาน & รายงาน', icon: Activity },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-30 h-screen w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-center h-20 border-b border-slate-200 bg-primary-600 shadow-sm relative overflow-hidden">
           {/* Custom Logo Logic */}
           {settings?.logoUrl ? (
             <div className="flex flex-col items-center justify-center w-full h-full p-2 bg-white">
                <img src={settings.logoUrl} alt="Logo" className="h-full object-contain" />
             </div>
           ) : (
              <div className="flex items-center space-x-2 text-white font-bold text-xl z-10">
                <Activity className="w-6 h-6" />
                <span>MedEquip</span>
              </div>
           )}
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150
                  ${isActive 
                    ? 'bg-primary-50 text-primary-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        
        {/* GAS Connection Indicator (Mock) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
           <div className="flex items-center text-xs text-slate-500 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              System Online
           </div>
           <div className="text-[10px] text-slate-400">
             {settings?.hospitalName || 'MedEquip Manager'}
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
