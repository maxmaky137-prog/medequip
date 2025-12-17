
import React, { useEffect, useState } from 'react';
import { DataService } from '../services/dataService';
import { CheckRecord, MaintenanceRecord, Asset, User } from '../types';
import { FileText, Download, CheckCircle, AlertTriangle, Printer, FileSpreadsheet } from 'lucide-react';

interface ComplianceProps {
    currentUser: User | null;
}

const Compliance: React.FC<ComplianceProps> = ({ currentUser }) => {
  const [checks, setChecks] = useState<CheckRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const loadData = async () => {
        const allAssets = await DataService.getAssets();
        const allChecks = await DataService.getChecks();
        const allMaint = await DataService.getMaintenanceRecords();

        let visibleAssets = allAssets;
        if (currentUser?.role === 'Staff' && currentUser.department) {
            visibleAssets = allAssets.filter(a => a.department === currentUser.department);
        }
        setAssets(visibleAssets);

        const allowedAssetIds = new Set(visibleAssets.map(a => a.id));
        
        // Filter Checks & Maintenance based on allowed assets
        if (currentUser?.role === 'Staff') {
            setChecks(allChecks.filter(c => allowedAssetIds.has(c.assetId)));
            setMaintenance(allMaint.filter(m => allowedAssetIds.has(m.assetId)));
        } else {
            setChecks(allChecks);
            setMaintenance(allMaint);
        }
    };
    loadData();
  }, [currentUser]);

  // Calculate some stats
  const totalChecks = checks.length;
  const passedChecks = checks.filter(c => c.status === 'Pass').length;
  const passRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
  
  const totalAssets = assets.length;
  const compliantAssets = assets.filter(a => a.status !== 'PM Due' && a.status !== 'Under Repair').length;
  const uptimeRate = totalAssets > 0 ? (compliantAssets / totalAssets) * 100 : 0;

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = ['ID,Date,Asset Name,Type,Description,Technician,Status'];
    const rows = maintenance.map(rec => 
        `${rec.id},${rec.requestDate},"${rec.assetName}",${rec.type},"${rec.description}",${rec.technician},${rec.status}`
    );

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n"); // Add BOM for Thai support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `maintenance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between no-print">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="p-3 bg-purple-100 rounded-xl">
                <FileText className="w-8 h-8 text-purple-600" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    มาตรฐาน & รายงาน
                    {currentUser?.role === 'Staff' && <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">แผนก {currentUser.department}</span>}
                </h2>
                <p className="text-slate-500">รายงานสรุปผลเพื่อรองรับการตรวจมาตรฐาน JCI/HA</p>
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition shadow-sm">
                <Printer className="w-4 h-4 mr-2" /> พิมพ์หน้านี้ / Save PDF
            </button>
             <button onClick={handleExportCSV} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel (CSV)
            </button>
        </div>
      </div>

      {/* KPI Stats - Printable Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 font-medium">อัตราความพร้อมใช้ (Uptime)</p>
                    <h3 className="text-4xl font-bold text-slate-800 mt-2">{uptimeRate.toFixed(1)}%</h3>
                </div>
                <div className={`p-3 rounded-full ${uptimeRate > 90 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    <CheckCircle className="w-6 h-6" />
                </div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${uptimeRate}%` }}></div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 font-medium">ผลการตรวจเช็คผ่าน (Pass Rate)</p>
                    <h3 className="text-4xl font-bold text-slate-800 mt-2">{passRate.toFixed(1)}%</h3>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <FileText className="w-6 h-6" />
                </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">จากการตรวจเช็ค {totalChecks} ครั้งล่าสุด</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 font-medium">รอซ่อมบำรุง (Pending Maintain.)</p>
                    <h3 className="text-4xl font-bold text-slate-800 mt-2">{maintenance.filter(m => m.status !== 'Completed').length}</h3>
                </div>
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                    <AlertTriangle className="w-6 h-6" />
                </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">รายการที่ยังไม่ปิดงาน (Open Tickets)</p>
        </div>
      </div>

      {/* Reports Table - Printable Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-table">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">ประวัติการซ่อมบำรุงและสอบเทียบ (Maintenance Log)</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">วันที่</th>
                    <th className="px-6 py-4">อุปกรณ์</th>
                    <th className="px-6 py-4">ประเภท</th>
                    <th className="px-6 py-4">รายละเอียด</th>
                    <th className="px-6 py-4">ผู้ดำเนินการ</th>
                    <th className="px-6 py-4">สถานะ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {maintenance.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-xs">{rec.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{rec.requestDate}</td>
                        <td className="px-6 py-4 font-medium">{rec.assetName}</td>
                        <td className="px-6 py-4">{rec.type}</td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={rec.description}>{rec.description}</td>
                        <td className="px-6 py-4">{rec.technician}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                rec.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                                {rec.status}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
      </div>
    </div>
  );
};

export default Compliance;
