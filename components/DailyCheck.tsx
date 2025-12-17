
import React, { useEffect, useState } from 'react';
import { Asset, CheckRecord, User } from '../types';
import { DataService } from '../services/dataService';
import { ClipboardCheck, Check, X, AlertTriangle, Calendar, Activity, Zap, Monitor, Sparkles, Building2, Send } from 'lucide-react';

interface DailyCheckProps {
    currentUser: User | null;
}

const DailyCheck: React.FC<DailyCheckProps> = ({ currentUser }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  
  // Checklist State with Notes
  const [checkItems, setCheckItems] = useState({
    powerCord: true, powerCordNote: '',
    screen: true, screenNote: '',
    functionality: true, functionalityNote: '',
    cleanliness: true, cleanlinessNote: ''
  });
  
  const [notes, setNotes] = useState('');
  const [checkerName, setCheckerName] = useState(currentUser?.name || '');
  const [recentChecks, setRecentChecks] = useState<CheckRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);
  
  // Filter state for history
  const [historyDate, setHistoryDate] = useState('');

  // Special logic for Rehabilitation
  const isRehab = currentUser?.department === 'เวชกรรมฟื้นฟู' || currentUser?.role === 'Admin';

  useEffect(() => {
    // Fetch data and join/filter
    const loadData = async () => {
        const allAssets = await DataService.getAssets();
        const allChecks = await DataService.getChecks();

        // Filter Assets
        let visibleAssets = allAssets;
        if (currentUser?.role === 'Staff' && currentUser.department) {
            visibleAssets = allAssets.filter(a => a.department === currentUser.department);
        }
        setAssets(visibleAssets);

        // Filter Checks (Need to check if the asset belongs to department)
        const allowedAssetIds = new Set(visibleAssets.map(a => a.id));
        
        let visibleChecks = allChecks;
        if (currentUser?.role === 'Staff') {
            visibleChecks = allChecks.filter(c => allowedAssetIds.has(c.assetId));
        }
        setRecentChecks(visibleChecks);
    };
    loadData();
  }, [currentUser]);

  // Calculate Overall Status based on items
  const overallStatus = 
    checkItems.powerCord && 
    checkItems.screen && 
    checkItems.functionality && 
    checkItems.cleanliness 
    ? 'Pass' : 'Fail';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !checkerName) return;

    // Validation: If abnormal, note is required
    if (!checkItems.powerCord && !checkItems.powerCordNote) { alert('กรุณาระบุความผิดปกติของสายไฟ'); return; }
    if (!checkItems.screen && !checkItems.screenNote) { alert('กรุณาระบุความผิดปกติของหน้าจอ'); return; }
    if (!checkItems.functionality && !checkItems.functionalityNote) { alert('กรุณาระบุความผิดปกติของการทำงาน'); return; }
    if (!checkItems.cleanliness && !checkItems.cleanlinessNote) { alert('กรุณาระบุความผิดปกติของความสะอาด'); return; }

    setSubmitting(true);
    const asset = assets.find(a => a.id === selectedAssetId);
    
    if (asset) {
      const newCheck = await DataService.addCheck({
        assetId: asset.id,
        assetName: asset.name,
        date: new Date().toISOString().split('T')[0],
        checkerName,
        type: 'Daily',
        status: overallStatus,
        notes: overallStatus === 'Fail' ? notes : undefined,
        checklistDetails: checkItems
      });
      
      setRecentChecks([newCheck, ...recentChecks]);
      // Reset form
      setCheckItems({ 
        powerCord: true, powerCordNote: '', 
        screen: true, screenNote: '', 
        functionality: true, functionalityNote: '', 
        cleanliness: true, cleanlinessNote: '' 
      });
      setNotes('');
      // Keep checker name for convenience
      setSelectedAssetId('');
      alert('บันทึกผลการตรวจสอบสำเร็จ!');
    }
    setSubmitting(false);
  };

  const handleSendSummary = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Filter checks for today and for the current user's department (based on what they can see in recentChecks)
    const todayChecks = recentChecks.filter(c => c.date === todayStr);

    if (todayChecks.length === 0) {
        alert('ยังไม่มีข้อมูลการตรวจเช็คในวันนี้');
        return;
    }

    const fails = todayChecks.filter(c => c.status === 'Fail');
    const failNames = fails.map(f => f.assetName);

    const confirmMsg = `ยืนยันการส่งสรุปผลประจำวัน?\n` +
                       `--------------------------\n` +
                       `วันที่: ${todayStr}\n` +
                       `ผู้ตรวจ: ${checkerName}\n` +
                       `ตรวจแล้ว: ${todayChecks.length} เครื่อง\n` +
                       `ไม่ผ่าน: ${fails.length} เครื่อง`;
    
    if (window.confirm(confirmMsg)) {
        setSendingSummary(true);
        await DataService.sendDailySummary({
            department: currentUser?.department || 'ไม่ระบุ',
            checker: checkerName,
            date: todayStr,
            total: todayChecks.length,
            failCount: fails.length,
            failedItems: failNames
        });
        setSendingSummary(false);
        alert('ส่งรายงานสรุปเรียบร้อยแล้ว');
    }
  };

  const filteredHistory = historyDate 
    ? recentChecks.filter(c => c.date === historyDate)
    : recentChecks;

  // Toggle Check Item
  const toggleItem = (key: 'powerCord' | 'screen' | 'functionality' | 'cleanliness', value: boolean) => {
      setCheckItems(prev => ({ ...prev, [key]: value }));
  };

  // Update Note for specific item
  const updateNote = (key: 'powerCordNote' | 'screenNote' | 'functionalityNote' | 'cleanlinessNote', value: string) => {
      setCheckItems(prev => ({ ...prev, [key]: value }));
  };

  const ChecklistItem = ({ 
    label, 
    icon: Icon, 
    statusKey, 
    noteKey,
    color 
  }: { 
    label: string, 
    icon: any, 
    statusKey: 'powerCord' | 'screen' | 'functionality' | 'cleanliness', 
    noteKey: 'powerCordNote' | 'screenNote' | 'functionalityNote' | 'cleanlinessNote',
    color: string
  }) => (
    <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center text-lg font-medium text-slate-700">
                <Icon className={`w-6 h-6 mr-3 ${color}`} /> 
                {label}
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
                <button type="button" onClick={() => toggleItem(statusKey, true)} 
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg border text-sm font-bold transition-colors ${checkItems[statusKey] ? 'bg-green-500 text-white border-green-600 shadow-inner' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                    <Check className="w-4 h-4 inline mr-1"/> ปกติ
                </button>
                <button type="button" onClick={() => toggleItem(statusKey, false)} 
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg border text-sm font-bold transition-colors ${!checkItems[statusKey] ? 'bg-red-500 text-white border-red-600 shadow-inner' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                    <X className="w-4 h-4 inline mr-1"/> ผิดปกติ
                </button>
            </div>
        </div>
        
        {/* Detail Input if Abnormal */}
        {!checkItems[statusKey] && (
            <div className="mt-3 animate-fade-in-down">
                <input 
                    type="text"
                    placeholder={`ระบุรายละเอียดความผิดปกติของ${label}...`}
                    className="w-full border-b-2 border-red-300 bg-red-50 px-3 py-2 text-red-900 focus:outline-none focus:border-red-500 rounded-t-md"
                    value={checkItems[noteKey]}
                    onChange={(e) => updateNote(noteKey, e.target.value)}
                    required
                />
            </div>
        )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 no-print">
        <div className="flex items-center space-x-3">
            <ClipboardCheck className="w-8 h-8 text-primary-600" />
            <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                การตรวจเช็คประจำวัน 
                {currentUser?.role === 'Staff' && <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">แผนก {currentUser.department}</span>}
            </h2>
            <p className="text-slate-500">บันทึกผลการตรวจสอบความพร้อมใช้งานตามรายการ</p>
            </div>
        </div>
        
        {/* Summary Button for Rehab Dept */}
        {isRehab && (
            <button 
                onClick={handleSendSummary}
                disabled={sendingSummary}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition font-bold flex items-center disabled:opacity-50"
            >
                {sendingSummary ? (
                    'กำลังส่ง...'
                ) : (
                    <>
                        <Send className="w-4 h-4 mr-2" /> ส่งสรุปผลประจำวัน
                    </>
                )}
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Check Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <h3 className="font-bold text-xl mb-6 text-slate-800 flex items-center">
            <Check className="w-5 h-5 mr-2 bg-primary-100 text-primary-600 rounded-full p-1" />
            บันทึกการตรวจสอบ
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">เลือกเครื่องมือ (Asset)</label>
              <select 
                className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 focus:ring-2 focus:ring-primary-500 focus:outline-none text-slate-900"
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                required
              >
                <option value="">-- กรุณาเลือกรายการ --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">ผู้ตรวจ (Checker)</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="ระบุชื่อผู้ตรวจ"
                value={checkerName}
                onChange={(e) => setCheckerName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
               <h4 className="text-base font-semibold text-slate-700 mb-2">รายการตรวจสอบ (Checklist)</h4>
               
               <ChecklistItem 
                 label="สายไฟ/ปลั๊กไฟ" 
                 icon={Zap} 
                 color="text-yellow-500"
                 statusKey="powerCord"
                 noteKey="powerCordNote"
               />

               <ChecklistItem 
                 label="หน้าจอ/ไฟสถานะ" 
                 icon={Monitor} 
                 color="text-blue-500"
                 statusKey="screen"
                 noteKey="screenNote"
               />

               <ChecklistItem 
                 label="การทำงานทั่วไป" 
                 icon={Activity} 
                 color="text-purple-500"
                 statusKey="functionality"
                 noteKey="functionalityNote"
               />

               <ChecklistItem 
                 label="ความสะอาด" 
                 icon={Sparkles} 
                 color="text-cyan-500"
                 statusKey="cleanliness"
                 noteKey="cleanlinessNote"
               />
            </div>

            <div className={`p-4 rounded-xl text-center font-bold text-lg border-2 ${overallStatus === 'Pass' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                ผลการประเมิน: {overallStatus === 'Pass' ? 'ผ่าน (PASS)' : 'ไม่ผ่าน (FAIL)'}
            </div>

            {overallStatus === 'Fail' && (
              <div className="animate-fade-in-down">
                <label className="block text-sm font-medium text-red-700 mb-2">สรุปปัญหาเพิ่มเติม (ภาพรวม) *</label>
                <textarea 
                  className="w-full border border-red-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:outline-none text-red-900 bg-red-50"
                  rows={3}
                  placeholder="สรุปปัญหาเพิ่มเติมเพื่อส่งแจ้งเตือน..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-primary-600 text-white py-3.5 rounded-xl hover:bg-primary-700 transition disabled:opacity-50 font-semibold text-lg shadow-lg shadow-primary-200"
            >
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันการตรวจสอบ (Submit)'}
            </button>
          </form>
        </div>

        {/* History List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 no-print">
             <h3 className="font-bold text-xl text-slate-800">
                ประวัติการตรวจสอบ 
                {currentUser?.role === 'Staff' && <span className="text-sm font-normal text-slate-500 ml-2">(แผนก {currentUser.department})</span>}
             </h3>
             <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                <input 
                    type="date" 
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-primary-500"
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                />
                {historyDate && (
                    <button onClick={() => setHistoryDate('')} className="text-sm text-red-500 hover:underline font-medium">Clear</button>
                )}
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">วันที่</th>
                  <th className="px-6 py-4">อุปกรณ์</th>
                  <th className="px-6 py-4">ผู้ตรวจ</th>
                  <th className="px-6 py-4">ผล</th>
                  <th className="px-6 py-4 rounded-tr-lg">รายละเอียดความผิดปกติ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((check) => (
                  <tr key={check.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{check.date}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{check.assetName}</td>
                    <td className="px-6 py-4">{check.checkerName}</td>
                    <td className="px-6 py-4">
                      {check.status === 'Pass' 
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1"/> ผ่าน</span> 
                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><X className="w-3 h-3 mr-1"/> ไม่ผ่าน</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                        {check.checklistDetails ? (
                            <div className="flex flex-col space-y-1 text-xs">
                                {!check.checklistDetails.powerCord && <span className="text-red-600 font-medium">• สายไฟ: {check.checklistDetails.powerCordNote || 'ผิดปกติ'}</span>}
                                {!check.checklistDetails.screen && <span className="text-red-600 font-medium">• หน้าจอ: {check.checklistDetails.screenNote || 'ผิดปกติ'}</span>}
                                {!check.checklistDetails.functionality && <span className="text-red-600 font-medium">• การทำงาน: {check.checklistDetails.functionalityNote || 'ผิดปกติ'}</span>}
                                {!check.checklistDetails.cleanliness && <span className="text-red-600 font-medium">• ความสะอาด: {check.checklistDetails.cleanlinessNote || 'ผิดปกติ'}</span>}
                                {check.status === 'Pass' && <span className="text-green-600 flex items-center"><Check className="w-3 h-3 mr-1" /> ครบถ้วนสมบูรณ์</span>}
                                {check.notes && check.status === 'Fail' && <span className="text-slate-500 italic mt-1">Note: {check.notes}</span>}
                            </div>
                        ) : (
                            <span className="text-slate-400 italic">{check.notes || '-'}</span>
                        )}
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">ไม่พบประวัติการตรวจสอบ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyCheck;
