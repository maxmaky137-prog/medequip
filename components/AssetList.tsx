
import React, { useEffect, useState } from 'react';
import { Asset, AssetStatus, AppSettings } from '../types';
import { DataService } from '../services/dataService';
import { Search, Filter, Plus, MoreVertical, X, Save, FileText, ExternalLink, HardDrive, Settings as SettingsIcon, Download, Printer, FileSpreadsheet, ClipboardList, CheckSquare, XSquare, RefreshCw, Pencil, Trash2 } from 'lucide-react';

interface AssetListProps {
  settings?: AppSettings;
  setActiveTab?: (tab: string) => void;
}

// Audit Status Types
type AuditStatusType = 'found' | 'missing' | 'unchecked';
interface AuditState {
    [assetId: string]: AuditStatusType;
}

const AssetList: React.FC<AssetListProps> = ({ settings, setActiveTab }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Audit Mode State
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [auditData, setAuditData] = useState<AuditState>({});

  // Asset Form State
  const [formAsset, setFormAsset] = useState<Partial<Asset>>({
    id: '',
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    department: '',
    purchaseDate: '',
    price: 0,
    status: AssetStatus.ACTIVE,
    nextPmDate: '',
    manualUrl: '',
    googleDriveUrl: ''
  });

  useEffect(() => {
    loadAssets();
    
    // Load saved audit progress if exists
    const savedAudit = localStorage.getItem('medEquip_audit_progress');
    if (savedAudit) {
        setAuditData(JSON.parse(savedAudit));
    }
  }, []);

  const loadAssets = async () => {
      const data = await DataService.getAssets();
      setAssets(data);
  };

  const openAddModal = () => {
      setIsEditMode(false);
      setFormAsset({
        id: '',
        name: '',
        brand: '',
        model: '',
        serialNumber: '',
        department: '',
        purchaseDate: '',
        price: 0,
        status: AssetStatus.ACTIVE,
        nextPmDate: '',
        manualUrl: '',
        googleDriveUrl: ''
      });
      setIsModalOpen(true);
  };

  const openEditModal = (asset: Asset) => {
      setIsEditMode(true);
      setFormAsset({ ...asset });
      setIsModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formAsset.name && formAsset.serialNumber) {
        try {
            if (isEditMode) {
                // Update
                await DataService.updateAsset(formAsset as Asset);
                alert('บันทึกการแก้ไขเรียบร้อยแล้ว');
            } else {
                // Create
                await DataService.addAsset(formAsset);
                alert('เพิ่มครุภัณฑ์เรียบร้อยแล้ว');
            }
            
            setIsModalOpen(false);
            loadAssets(); // Reload list
        } catch (error: any) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    } else {
        alert('กรุณากรอกชื่อครุภัณฑ์และ Serial Number');
    }
  };

  const handleDeleteAsset = async (id: string, name: string) => {
      if (confirm(`คุณต้องการลบรายการ "${name}" (${id}) ใช่หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
          try {
              await DataService.deleteAsset(id);
              loadAssets();
              alert('ลบข้อมูลเรียบร้อยแล้ว');
          } catch (error) {
              console.error(error);
              alert('เกิดข้อผิดพลาดในการลบข้อมูล');
          }
      }
  };

  const handleExportCSV = () => {
    // If Audit Mode is active, export Audit Report
    if (isAuditMode) {
        const headers = ['ID,Name,Serial Number,Department,Audit Status'];
        const rows = filteredAssets.map(asset => {
            const status = auditData[asset.id] || 'unchecked';
            const statusLabel = status === 'found' ? 'Found' : status === 'missing' ? 'Missing' : 'Not Checked';
            return `"${asset.id}","${asset.name}","${asset.serialNumber}","${asset.department}","${statusLabel}"`;
        });
        const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit_report_${filterDept}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    // Normal Export
    const headers = ['ID,Name,Brand,Model,Serial Number,Department,Purchase Date,Price,Status,Next PM'];
    const rows = filteredAssets.map(asset => 
        `"${asset.id}","${asset.name}","${asset.brand}","${asset.model}","${asset.serialNumber}","${asset.department}","${asset.purchaseDate}",${asset.price},"${asset.status}","${asset.nextPmDate}"`
    );

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n"); 
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asset_register_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Audit Logic
  const toggleAuditStatus = (id: string, status: AuditStatusType) => {
      const newStatus = auditData[id] === status ? 'unchecked' : status;
      const newData = { ...auditData, [id]: newStatus };
      setAuditData(newData);
      localStorage.setItem('medEquip_audit_progress', JSON.stringify(newData));
  };

  const resetAudit = () => {
      if(confirm('คุณต้องการรีเซ็ตผลการตรวจนับทั้งหมดใช่หรือไม่?')) {
          setAuditData({});
          localStorage.removeItem('medEquip_audit_progress');
      }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase()) || 
                          asset.id.toLowerCase().includes(search.toLowerCase()) ||
                          asset.serialNumber.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'All' || asset.department === filterDept;
    return matchesSearch && matchesDept;
  });

  // Calculate Audit Stats
  const totalInView = filteredAssets.length;
  const countedFound = filteredAssets.filter(a => auditData[a.id] === 'found').length;
  const countedMissing = filteredAssets.filter(a => auditData[a.id] === 'missing').length;
  const progressPercent = totalInView > 0 ? Math.round(((countedFound + countedMissing) / totalInView) * 100) : 0;

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case AssetStatus.ACTIVE: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">พร้อมใช้</span>;
      case AssetStatus.REPAIR: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">ส่งซ่อม</span>;
      case AssetStatus.MAINTENANCE_DUE: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">ถึงรอบ PM</span>;
      case AssetStatus.LOANED: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">ถูกยืม</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const departments = settings?.departments || ['ER', 'ICU', 'OPD', 'Radiology', 'Pediatrics'];
  const uniqueDepts = Array.from(new Set(assets.map(a => a.department)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">
               {isAuditMode ? 'โหมดตรวจนับครุภัณฑ์ (Audit Mode)' : 'ทะเบียนครุภัณฑ์ (Asset Register)'}
           </h2>
           <p className="text-sm text-slate-500">
               {isAuditMode ? 'ตรวจสอบรายการทรัพย์สินคงเหลือประจำปี' : 'จัดการข้อมูลและประวัติเครื่องมือแพทย์'}
           </p>
        </div>
        <div className="flex flex-wrap gap-2">
            {!isAuditMode ? (
                <>
                    <button 
                        onClick={() => setIsAuditMode(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
                    >
                        <ClipboardList className="w-4 h-4 mr-2" />
                        เริ่มตรวจนับ (Audit)
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition shadow-sm"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        พิมพ์ (PDF)
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                    <button 
                        onClick={openAddModal}
                        className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        เพิ่มครุภัณฑ์ใหม่
                    </button>
                </>
            ) : (
                <>
                    <button 
                        onClick={resetAudit}
                        className="flex items-center px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        รีเซ็ตผล
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        สรุปผล (CSV)
                    </button>
                    <button 
                        onClick={() => setIsAuditMode(false)}
                        className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-sm"
                    >
                        <X className="w-4 h-4 mr-2" />
                        ปิดโหมดตรวจนับ
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Audit Dashboard Panel */}
      {isAuditMode && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 no-print animate-fade-in-down">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1 w-full">
                      <div className="flex justify-between text-sm font-semibold text-indigo-900 mb-2">
                          <span>ความคืบหน้า ({filterDept === 'All' ? 'ทั้งหมด' : filterDept})</span>
                          <span>{countedFound + countedMissing} / {totalInView} รายการ ({progressPercent}%)</span>
                      </div>
                      <div className="w-full bg-indigo-200 rounded-full h-4">
                          <div 
                              className="bg-indigo-600 h-4 rounded-full transition-all duration-500 ease-out" 
                              style={{ width: `${progressPercent}%` }}
                          ></div>
                      </div>
                  </div>
                  <div className="flex space-x-6 text-sm">
                      <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-green-600">{countedFound}</span>
                          <span className="text-slate-600">พบ (Found)</span>
                      </div>
                      <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-red-500">{countedMissing}</span>
                          <span className="text-slate-600">ไม่พบ (Missing)</span>
                      </div>
                       <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-slate-400">{totalInView - (countedFound + countedMissing)}</span>
                          <span className="text-slate-600">ยังไม่ตรวจ</span>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="ค้นหาตามชื่อ, รหัสทรัพย์สิน หรือ Serial Number..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select 
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="All">ทุกแผนก</option>
            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      
      {/* Printable Title (Visible only when printing) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">{isAuditMode ? 'รายงานผลการตรวจนับครุภัณฑ์' : 'ทะเบียนครุภัณฑ์ทางการแพทย์'}</h1>
        <p className="text-sm text-slate-500">พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
        {isAuditMode && <p className="text-sm text-slate-500 mt-1">แผนก: {filterDept} | สรุปผล: พบ {countedFound} / สูญหาย {countedMissing} / รวม {totalInView}</p>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">ข้อมูลอุปกรณ์</th>
                <th className="px-6 py-4 no-print">เอกสาร</th>
                <th className="px-6 py-4">Serial No.</th>
                <th className="px-6 py-4">แผนก</th>
                <th className="px-6 py-4">สถานะ</th>
                {isAuditMode ? (
                     <th className="px-6 py-4 text-center bg-indigo-50 text-indigo-700">Audit Action</th>
                ) : (
                     <th className="px-6 py-4 text-right no-print">จัดการ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map(asset => {
                const auditStatus = auditData[asset.id];
                const rowClass = isAuditMode 
                    ? auditStatus === 'found' ? 'bg-green-50' : auditStatus === 'missing' ? 'bg-red-50' : ''
                    : '';

                return (
                <tr key={asset.id} className={`hover:bg-slate-50 transition-colors ${rowClass}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center no-print">
                        {asset.image ? (
                            <img src={asset.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-xs text-slate-400">No img</span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-slate-900">{asset.name}</div>
                        <div className="text-xs text-slate-400">{asset.id} • {asset.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 no-print">
                    <div className="flex space-x-2">
                        {asset.manualUrl && (
                        <a href={asset.manualUrl} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-700 flex items-center gap-1" title="คู่มือ/เอกสาร">
                            <FileText className="w-5 h-5" />
                        </a>
                        )}
                        {asset.googleDriveUrl && (
                        <a href={asset.googleDriveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center gap-1" title="Google Drive">
                            <HardDrive className="w-5 h-5" />
                        </a>
                        )}
                        {!asset.manualUrl && !asset.googleDriveUrl && <span className="text-slate-300">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{asset.serialNumber}</td>
                  <td className="px-6 py-4">{asset.department}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(asset.status)}
                    {isAuditMode && auditStatus && (
                         <div className="mt-1 text-xs font-bold uppercase tracking-wide">
                             {auditStatus === 'found' && <span className="text-green-600">✓ Found</span>}
                             {auditStatus === 'missing' && <span className="text-red-600">✗ Missing</span>}
                         </div>
                    )}
                  </td>
                  
                  {isAuditMode ? (
                      <td className="px-6 py-4 text-center no-print">
                          <div className="flex justify-center space-x-2">
                              <button 
                                onClick={() => toggleAuditStatus(asset.id, 'found')}
                                className={`p-2 rounded-lg transition ${auditStatus === 'found' ? 'bg-green-600 text-white shadow-md scale-110' : 'bg-white border border-slate-200 text-slate-400 hover:bg-green-50 hover:text-green-600'}`}
                                title="พบ (Found)"
                              >
                                  <CheckSquare className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => toggleAuditStatus(asset.id, 'missing')}
                                className={`p-2 rounded-lg transition ${auditStatus === 'missing' ? 'bg-red-500 text-white shadow-md scale-110' : 'bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500'}`}
                                title="ไม่พบ (Missing)"
                              >
                                  <XSquare className="w-5 h-5" />
                              </button>
                          </div>
                      </td>
                  ) : (
                      <td className="px-6 py-4 text-right no-print">
                        <div className="flex justify-end space-x-2">
                            <button 
                                onClick={() => openEditModal(asset)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-100"
                                title="แก้ไข"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleDeleteAsset(asset.id, asset.name)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100"
                                title="ลบ"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                      </td>
                  )}
                </tr>
              )})}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={isAuditMode ? 6 : 7} className="px-6 py-12 text-center text-slate-400">
                    ไม่พบข้อมูลครุภัณฑ์
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800">
                        {isEditMode ? 'แก้ไขข้อมูลครุภัณฑ์' : 'เพิ่มครุภัณฑ์ใหม่'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSaveAsset} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">เลขครุภัณฑ์ (Asset ID)</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2 bg-slate-50" 
                                placeholder="ว่างไว้เพื่อสร้างอัตโนมัติ"
                                value={formAsset.id} 
                                onChange={e => setFormAsset({...formAsset, id: e.target.value})}
                                disabled={isEditMode} // Disable ID editing
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number *</label>
                            <input type="text" required className="w-full border rounded-lg px-3 py-2" 
                                value={formAsset.serialNumber} onChange={e => setFormAsset({...formAsset, serialNumber: e.target.value})} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อครุภัณฑ์ *</label>
                            <input type="text" required className="w-full border rounded-lg px-3 py-2" 
                                value={formAsset.name} onChange={e => setFormAsset({...formAsset, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ยี่ห้อ (Brand)</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2" 
                                value={formAsset.brand} onChange={e => setFormAsset({...formAsset, brand: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">รุ่น (Model)</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2" 
                                value={formAsset.model} onChange={e => setFormAsset({...formAsset, model: e.target.value})} />
                        </div>
                       
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700">แผนก *</label>
                                {setActiveTab && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            setActiveTab('settings');
                                        }}
                                        className="text-xs text-primary-600 hover:underline flex items-center"
                                    >
                                        <SettingsIcon className="w-3 h-3 mr-1" /> จัดการแผนก
                                    </button>
                                )}
                            </div>
                            <select className="w-full border rounded-lg px-3 py-2 bg-white" required
                                value={formAsset.department} onChange={e => setFormAsset({...formAsset, department: e.target.value})}>
                                <option value="">เลือกแผนก</option>
                                {departments.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">วันที่รับเข้า</label>
                            <input type="date" className="w-full border rounded-lg px-3 py-2" 
                                value={formAsset.purchaseDate} onChange={e => setFormAsset({...formAsset, purchaseDate: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ราคา (บาท)</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2" 
                                value={formAsset.price} onChange={e => setFormAsset({...formAsset, price: Number(e.target.value)})} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">รอบ PM ถัดไป</label>
                            <input type="date" className="w-full border rounded-lg px-3 py-2" 
                                value={formAsset.nextPmDate} onChange={e => setFormAsset({...formAsset, nextPmDate: e.target.value})} />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                                    <FileText className="w-4 h-4 mr-1 text-red-500" /> ลิงก์เอกสารคู่มือ (PDF URL)
                                </label>
                                <input 
                                    type="url" 
                                    placeholder="https://example.com/manual.pdf"
                                    className="w-full border rounded-lg px-3 py-2" 
                                    value={formAsset.manualUrl} 
                                    onChange={e => setFormAsset({...formAsset, manualUrl: e.target.value})} 
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                                    <HardDrive className="w-4 h-4 mr-1 text-blue-500" /> ลิงก์ Google Drive
                                </label>
                                <input 
                                    type="url" 
                                    placeholder="https://drive.google.com/..."
                                    className="w-full border rounded-lg px-3 py-2" 
                                    value={formAsset.googleDriveUrl} 
                                    onChange={e => setFormAsset({...formAsset, googleDriveUrl: e.target.value})} 
                                />
                             </div>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center">
                            <Save className="w-4 h-4 mr-2" /> บันทึกข้อมูล
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AssetList;
