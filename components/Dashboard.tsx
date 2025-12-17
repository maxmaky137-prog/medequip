
import React, { useEffect, useState } from 'react';
import { Asset, AssetStatus, User } from '../types';
import { DataService } from '../services/dataService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlertCircle, CheckCircle, Clock, Wrench, Activity, Users } from 'lucide-react';

const COLORS = ['#14b8a6', '#f59e0b', '#ef4444', '#64748b']; // Teal, Amber, Red, Slate

interface DashboardProps {
    currentUser: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const data = await DataService.getAssets();
      // Filter assets based on user role
      if (currentUser && currentUser.role === 'Staff' && currentUser.department) {
          const filtered = data.filter(a => a.department === currentUser.department);
          setAssets(filtered);
      } else {
          setAssets(data);
      }
      setLoading(false);
    };
    fetchData();
  }, [currentUser]);

  if (loading) return <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;

  // Calculate Stats
  const totalAssets = assets.length;
  const maintenanceDue = assets.filter(a => a.status === AssetStatus.MAINTENANCE_DUE || a.status === AssetStatus.REPAIR).length;
  const activeAssets = assets.filter(a => a.status === AssetStatus.ACTIVE).length;
  const loanedAssets = assets.filter(a => a.status === AssetStatus.LOANED).length;

  const statusData = [
    { name: 'พร้อมใช้งาน', value: activeAssets },
    { name: 'ส่งซ่อม/ถึงรอบ PM', value: maintenanceDue },
    { name: 'ถูกยืม', value: loanedAssets },
    { name: 'จำหน่าย', value: assets.filter(a => a.status === AssetStatus.DISPOSED).length },
  ].filter(d => d.value > 0);

  const StatCard = ({ title, value, icon: Icon, colorClass, subText }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        {subText && <p className="text-xs text-slate-400 mt-2">{subText}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center">
                แดชบอร์ด (Dashboard)
                {currentUser?.role === 'Staff' && (
                    <span className="ml-3 text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full font-medium flex items-center">
                        <Users className="w-3 h-3 mr-1" /> เฉพาะแผนก {currentUser.department}
                    </span>
                )}
            </h1>
            <p className="text-slate-500">ภาพรวมสถานะคุรุภัณฑ์ทางการแพทย์</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="ทั้งหมด" 
          value={totalAssets} 
          icon={CheckCircle} 
          colorClass="text-blue-600 bg-blue-600"
          subText={currentUser?.role === 'Staff' ? `ในแผนก ${currentUser.department}` : "จำนวนครุภัณฑ์ในระบบ"} 
        />
        <StatCard 
          title="พร้อมใช้งาน" 
          value={activeAssets} 
          icon={Activity} 
          colorClass="text-teal-600 bg-teal-600"
          subText={`คิดเป็น ${totalAssets > 0 ? ((activeAssets/totalAssets)*100).toFixed(0) : 0}% ของทั้งหมด`} 
        />
        <StatCard 
          title="ต้องซ่อม/บำรุงรักษา" 
          value={maintenanceDue} 
          icon={Wrench} 
          colorClass="text-red-500 bg-red-500"
          subText="ต้องการดำเนินการด่วน" 
        />
        <StatCard 
          title="ถูกยืมออกไป" 
          value={loanedAssets} 
          icon={Clock} 
          colorClass="text-amber-500 bg-amber-500"
          subText="รอการนำส่งคืน" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">สถานะครุภัณฑ์ (Asset Status)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Alerts / Quick Actions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">การแจ้งเตือนล่าสุด (Recent Alerts)</h3>
          <div className="space-y-4">
             {assets.filter(a => a.status === AssetStatus.MAINTENANCE_DUE).slice(0, 3).map(asset => (
               <div key={asset.id} className="flex items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                 <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                 <div>
                   <p className="text-sm font-semibold text-red-700">ถึงกำหนด PM: {asset.name}</p>
                   <p className="text-xs text-red-600">ครบกำหนด: {asset.nextPmDate} (แผนก: {asset.department})</p>
                 </div>
               </div>
             ))}
             {assets.filter(a => a.status === AssetStatus.LOANED).slice(0, 3).map(asset => (
               <div key={asset.id} className="flex items-center p-3 bg-amber-50 border border-amber-100 rounded-lg">
                 <Clock className="w-5 h-5 text-amber-500 mr-3" />
                 <div>
                   <p className="text-sm font-semibold text-amber-700">กำลังถูกยืม: {asset.name}</p>
                   <p className="text-xs text-amber-600">แผนกเจ้าของ: {asset.department}</p>
                 </div>
               </div>
             ))}
             {maintenanceDue === 0 && loanedAssets === 0 && (
                <div className="text-center text-slate-400 py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>สถานะปกติ ไม่มีรายการแจ้งเตือน</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
