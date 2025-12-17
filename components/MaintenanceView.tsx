
import React, { useEffect, useState } from 'react';
import { MaintenanceRecord, MaintenanceType, Asset, User, AssetStatus } from '../types';
import { DataService } from '../services/dataService';
import { Wrench, Clock, CheckCircle2, AlertOctagon, X, FileText, Bell, ClipboardList, Coins, TrendingUp, Bot, Send, Printer, FileSpreadsheet } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Declare process manually to prevent build errors in environments where node types are missing
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: any;
  }
};

interface MaintenanceViewProps {
    currentUser: User | null;
}

const MaintenanceView: React.FC<MaintenanceViewProps> = ({ currentUser }) => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkingPM, setCheckingPM] = useState(false);
  
  // AI Chat State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Mode: 'repair' (User request) or 'pm' (Technician record)
  const [modalMode, setModalMode] = useState<'repair' | 'pm'>('repair');

  // Request Form State
  const [request, setRequest] = useState({
    assetId: '',
    assetName: '',
    technician: currentUser?.name || '',
    description: '',
    requestDate: new Date().toISOString().split('T')[0],
    cost: 0,
    attachmentUrl: ''
  });

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    const allAssets = await DataService.getAssets();
    const allRecords = await DataService.getMaintenanceRecords();

    let visibleAssets = allAssets;
    if (currentUser?.role === 'Staff' && currentUser.department) {
        visibleAssets = allAssets.filter(a => a.department === currentUser.department);
    }
    setAssets(visibleAssets);

    // Filter Records
    const allowedAssetIds = new Set(visibleAssets.map(a => a.id));
    let visibleRecords = allRecords;
    if (currentUser?.role === 'Staff') {
        visibleRecords = allRecords.filter(r => allowedAssetIds.has(r.assetId));
    }
    setRecords(visibleRecords);
  };

  const handleOpenModal = (mode: 'repair' | 'pm') => {
      setModalMode(mode);
      setRequest({
        assetId: '',
        assetName: '',
        technician: currentUser?.name || '',
        description: mode === 'pm' ? 'Preventive Maintenance (PM) ตามรอบระยะเวลา' : '',
        requestDate: new Date().toISOString().split('T')[0],
        cost: 0,
        attachmentUrl: ''
      });
      setIsModalOpen(true);
  };

  const handleAssetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedAsset = assets.find(a => a.id === e.target.value);
    setRequest({
        ...request,
        assetId: e.target.value,
        assetName: selectedAsset ? selectedAsset.name : ''
    });
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (request.assetId && request.description) {
        // Determine Type and Status based on Mode
        const type = modalMode === 'pm' ? MaintenanceType.PM : MaintenanceType.CM;
        const status = modalMode === 'pm' ? 'Completed' : 'Pending'; 

        const newRecord = await DataService.addMaintenanceRequest({
            assetId: request.assetId,
            assetName: request.assetName,
            type: type,
            requestDate: request.requestDate,
            technician: request.technician || 'Pending Assignment',
            description: request.description,
            cost: Number(request.cost),
            attachmentUrl: request.attachmentUrl,
            status: status 
        } as any);

        if(modalMode === 'pm') {
            newRecord.status = 'Completed'; 
        }

        setRecords([newRecord, ...records]);
        setIsModalOpen(false);
        alert(modalMode === 'pm' ? 'บันทึกผล PM เรียบร้อยแล้ว' : 'แจ้งซ่อมเรียบร้อยแล้ว');
        loadData(); 
    }
  };

  const handleCheckUpcomingPM = async () => {
      setCheckingPM(true);
      const count = await DataService.checkUpcomingPMs();
      setCheckingPM(false);
      alert(count > 0 
        ? `ส่งแจ้งเตือน PM ล่วงหน้า ${count} รายการ ไปยัง Telegram แล้ว` 
        : `ไม่มีรายการ PM ที่ครบกำหนดใน 7 วันนี้`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRequest(prev => ({ ...prev, attachmentUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Printing & Export ---
  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
    const headers = ['ID,Date,Asset,Type,Description,Status,Cost'];
    const rows = records.map(r => 
        `"${r.id}","${r.requestDate}","${r.assetName}","${r.type}","${r.description}","${r.status}",${r.cost}`
    );
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maintenance_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- AI Logic ---
  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsThinking(true);
    setAiResponse('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); 
        
        // Correct Usage: ai.models.generateContent (Stateless)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: aiPrompt,
            config: {
                systemInstruction: 'คุณคือผู้ช่วยช่างเทคนิคเครื่องมือแพทย์ (Biomedical Engineer Assistant) มีหน้าที่ให้คำแนะนำเบื้องต้นในการแก้ไขปัญหาเครื่องมือแพทย์ (Troubleshooting) ตอบสั้นกระชับ เป็นข้อๆ และเน้นความปลอดภัย'
            }
        });
        
        setAiResponse(response.text || 'ไม่สามารถประมวลผลได้ในขณะนี้');
    } catch (error) {
        console.error(error);
        setAiResponse('เกิดข้อผิดพลาดในการเชื่อมต่อ AI: กรุณาตรวจสอบ API Key');
    } finally {
        setIsThinking(false);
    }
  };

  // Calculate Costs
  const totalRepairCost = records.filter(r => r.type === MaintenanceType.CM).reduce((acc, curr) => acc + (curr.cost || 0), 0);
  const totalPMCost = records.filter(r => r.type === MaintenanceType.PM).reduce((acc, curr) => acc + (curr.cost || 0), 0);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
               ระบบแจ้งซ่อม & PM
               {currentUser?.role === 'Staff' && <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">แผนก {currentUser.department}</span>}
           </h2>
           <p className="text-sm text-slate-500">จัดการตารางซ่อมบำรุง, บันทึกผล PM และติดตามค่าใช้จ่าย</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <button 
                onClick={() => setIsAiOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center transition font-medium animate-pulse"
            >
              <Bot className="w-4 h-4 mr-2" />
              AI ช่วยวิเคราะห์ปัญหา
            </button>
            
            <button 
                onClick={handlePrint}
                className="bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-800 shadow-sm flex items-center transition"
                title="พิมพ์หน้านี้"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
                onClick={handleExportCSV}
                className="bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-800 shadow-sm flex items-center transition"
                title="Export CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            <button 
                onClick={handleCheckUpcomingPM}
                disabled={checkingPM}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 shadow-sm flex items-center transition disabled:opacity-50 text-sm"
            >
              <Bell className="w-4 h-4 mr-2" />
              {checkingPM ? 'Checking...' : 'Check Alerts'}
            </button>
            
            {/* Split Buttons */}
            <button 
                onClick={() => handleOpenModal('pm')}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-sm flex items-center transition font-medium"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              บันทึกผล PM
            </button>
            
            <button 
                onClick={() => handleOpenModal('repair')}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 shadow-sm flex items-center transition font-medium"
            >
              <AlertOctagon className="w-4 h-4 mr-2" />
              แจ้งซ่อม
            </button>
        </div>
      </div>

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
             <div className="p-3 bg-red-50 rounded-lg mr-4">
                <Wrench className="w-6 h-6 text-red-500" />
             </div>
             <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">ค่าใช้จ่ายงานซ่อม (Repair)</p>
                <h4 className="text-xl font-bold text-slate-800">{formatMoney(totalRepairCost)}</h4>
             </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
             <div className="p-3 bg-emerald-50 rounded-lg mr-4">
                <Coins className="w-6 h-6 text-emerald-500" />
             </div>
             <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">ค่าใช้จ่าย PM (Preventive)</p>
                <h4 className="text-xl font-bold text-slate-800">{formatMoney(totalPMCost)}</h4>
             </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
             <div className="p-3 bg-blue-50 rounded-lg mr-4">
                <TrendingUp className="w-6 h-6 text-blue-500" />
             </div>
             <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">รวมทั้งหมด (Total)</p>
                <h4 className="text-xl font-bold text-blue-700">{formatMoney(totalRepairCost + totalPMCost)}</h4>
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Main Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">รายการดำเนินงานล่าสุด (Recent Jobs)</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                    <th className="px-6 py-3">อุปกรณ์</th>
                    <th className="px-6 py-3">ประเภท</th>
                    <th className="px-6 py-3">วันที่</th>
                    <th className="px-6 py-3">สถานะ</th>
                    <th className="px-6 py-3 text-right">ค่าใช้จ่าย</th>
                    <th className="px-6 py-3">ผู้ดำเนินการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {records.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{record.assetName}</div>
                            {/* Updated Attachment Link Logic */}
                            {record.attachmentUrl && (
                                <a 
                                    href={record.attachmentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded inline-flex items-center mt-1 transition"
                                    title="คลิกเพื่อเปิดไฟล์"
                                >
                                    <FileText className="w-3 h-3 mr-1" /> เปิดดูไฟล์แนบ
                                </a>
                            )}
                        </td>
                        <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs border font-medium ${
                            record.type === MaintenanceType.PM ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
                        }`}>
                            {record.type === MaintenanceType.PM ? 'PM Report' : 'Repair Req'}
                        </span>
                        </td>
                        <td className="px-6 py-4">{record.requestDate}</td>
                        <td className="px-6 py-4">
                        {record.status === 'Completed' ? (
                            <span className="text-green-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> เสร็จสิ้น</span>
                        ) : (
                            <span className="text-amber-600 flex items-center"><Clock className="w-4 h-4 mr-1"/> {record.status}</span>
                        )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                            {record.cost > 0 ? formatMoney(record.cost) : '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{record.technician || '-'}</td>
                    </tr>
                    ))}
                    {records.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-400">ยังไม่มีประวัติการซ่อมบำรุง</td></tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* Sidebar: PM Schedule */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit no-print">
          <div className="flex items-center mb-4 text-slate-800">
            <Wrench className="w-5 h-5 mr-2 text-primary-600" />
            <h3 className="font-semibold text-lg">แผน PM เร็วๆนี้</h3>
          </div>
          <div className="space-y-4">
             {assets
                .filter(a => a.nextPmDate)
                .sort((a,b) => new Date(a.nextPmDate).getTime() - new Date(b.nextPmDate).getTime())
                .slice(0, 5)
                .map(asset => {
                    const isOverdue = new Date(asset.nextPmDate) < new Date();
                    return (
                        <div key={asset.id} className={`p-3 border rounded-lg transition cursor-pointer hover:shadow-sm ${isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200 hover:border-primary-300'}`}>
                            <div className="flex justify-between items-start">
                                <span className="font-semibold text-sm text-slate-700">{asset.name}</span>
                                <span className={`text-xs px-2 py-1 rounded ${isOverdue ? 'bg-red-200 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
                                    {asset.nextPmDate}
                                </span>
                            </div>
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-slate-500">{asset.department}</p>
                                {isOverdue && <span className="text-[10px] text-red-600 font-bold">เกินกำหนด!</span>}
                            </div>
                        </div>
                    );
                })}
             {assets.length === 0 && <p className="text-sm text-slate-400">ไม่พบข้อมูลอุปกรณ์</p>}
          </div>
          
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500">
             <p className="font-bold mb-2">💡 Tips:</p>
             <ul className="list-disc list-inside space-y-1">
                 <li>กดปุ่ม <b>"บันทึกผล PM"</b> เมื่อดำเนินการบำรุงรักษาเสร็จสิ้นแล้ว</li>
                 <li>กดปุ่ม <b>"แจ้งซ่อม"</b> เมื่อพบปัญหาการใช้งานทั่วไป</li>
                 <li>ค่าใช้จ่ายจะถูกนำไปคำนวณในรายงานมาตรฐาน JCI</li>
             </ul>
          </div>
        </div>
      </div>

       {/* Universal Request/Record Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                <div className={`flex justify-between items-center p-6 border-b ${modalMode === 'repair' ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <h3 className={`text-xl font-bold flex items-center ${modalMode === 'repair' ? 'text-red-700' : 'text-emerald-700'}`}>
                        {modalMode === 'repair' ? (
                            <><AlertOctagon className="w-6 h-6 mr-2" /> แจ้งซ่อม (Repair Request)</>
                        ) : (
                            <><ClipboardList className="w-6 h-6 mr-2" /> บันทึกผล PM (Record PM)</>
                        )}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
                    {/* Common Fields */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">อุปกรณ์ (Asset) *</label>
                        <select className="w-full border rounded-lg px-3 py-2 bg-white" required
                            value={request.assetId} onChange={handleAssetSelect}>
                            <option value="">-- เลือกอุปกรณ์ --</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name} - {a.department}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ดำเนินการ</label>
                            <input type="date" className="w-full border rounded-lg px-3 py-2" 
                                value={request.requestDate} onChange={e => setRequest({...request, requestDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {modalMode === 'repair' ? 'ผู้แจ้งซ่อม' : 'ผู้ตรวจ PM'}
                            </label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2" placeholder="ระบุชื่อ..."
                                value={request.technician} onChange={e => setRequest({...request, technician: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดการดำเนินงาน *</label>
                        <textarea className="w-full border rounded-lg px-3 py-2" rows={3} required 
                            placeholder={modalMode === 'repair' ? "ระบุอาการเสียที่พบ..." : "ระบุผลการตรวจเช็คสภาพเครื่อง..."}
                            value={request.description} onChange={e => setRequest({...request, description: e.target.value})} />
                    </div>

                    {/* Mode Specific Fields */}
                    {modalMode === 'pm' && (
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                             <label className="block text-sm font-bold text-emerald-800 mb-1 flex items-center">
                                <Coins className="w-4 h-4 mr-1" /> ค่าใช้จ่ายในการ PM (บาท)
                             </label>
                             <input 
                                type="number" 
                                min="0"
                                className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-right font-mono" 
                                placeholder="0.00"
                                value={request.cost} 
                                onChange={e => setRequest({...request, cost: Number(e.target.value)})} 
                             />
                        </div>
                    )}
                    
                    {/* Cost Field for Repair (Optional) */}
                    {modalMode === 'repair' && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                             <label className="block text-xs font-semibold text-slate-500 mb-1">ประเมินค่าซ่อมเบื้องต้น (ถ้ามี)</label>
                             <input 
                                type="number" 
                                min="0"
                                className="w-full border rounded-lg px-3 py-2 text-sm" 
                                placeholder="ระบุราคาประเมิน (Optional)"
                                value={request.cost || ''} 
                                onChange={e => setRequest({...request, cost: Number(e.target.value)})} 
                             />
                        </div>
                    )}

                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">แนบไฟล์ (PDF/Image) - Optional</label>
                         <input 
                            type="file" 
                            accept="application/pdf,image/*"
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                            onChange={handleFileChange}
                         />
                         <p className="text-xs text-slate-400 mt-1">*ไฟล์จะถูกแปลงและบันทึกในระบบ (แนะนำไฟล์ขนาดเล็ก)</p>
                    </div>
                    
                    <button 
                        type="submit" 
                        className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition transform active:scale-95 ${
                            modalMode === 'repair' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                    >
                        {modalMode === 'repair' ? 'ยืนยันแจ้งซ่อม' : 'บันทึกผล PM'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 no-print backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-4 border-b bg-indigo-600 text-white rounded-t-2xl">
                    <h3 className="text-lg font-bold flex items-center">
                        <Bot className="w-6 h-6 mr-2" /> AI Medical Troubleshoot
                    </h3>
                    <button onClick={() => setIsAiOpen(false)} className="text-indigo-100 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto bg-slate-50">
                    {aiResponse ? (
                        <div className="flex flex-col gap-3">
                            <div className="self-end bg-indigo-100 text-indigo-800 p-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm">
                                {aiPrompt}
                            </div>
                            <div className="self-start bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none max-w-[95%] shadow-sm text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                <Bot className="w-4 h-4 text-indigo-500 mb-2" />
                                {aiResponse}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-6">
                            <Bot className="w-12 h-12 mb-3 opacity-20" />
                            <p>พิมพ์อาการเสีย หรือปัญหาที่พบ</p>
                            <p className="text-xs mt-1">เช่น "เครื่องวัดความดัน เปิดไม่ติด", "จอมอนิเตอร์ภาพสั่น"</p>
                        </div>
                    )}
                </div>

                <form onSubmit={handleAskAI} className="p-4 border-t bg-white rounded-b-2xl">
                    <div className="relative">
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                            placeholder="ระบุอาการ..."
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            disabled={isThinking}
                        />
                        <button 
                            type="submit" 
                            disabled={isThinking || !aiPrompt.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            {isThinking ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceView;
