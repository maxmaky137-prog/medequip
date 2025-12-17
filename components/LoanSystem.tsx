import React, { useEffect, useState } from 'react';
import { Asset, LoanRecord, AssetStatus } from '../types';
import { DataService } from '../services/dataService';
import { ArrowRightLeft, Search, Save, History, CheckCircle, RotateCcw } from 'lucide-react';

const LoanSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'borrow' | 'return' | 'history'>('borrow');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  
  // Borrow Form State
  const [borrowForm, setBorrowForm] = useState({
    assetId: '',
    borrowerName: '',
    department: '',
    loanDate: new Date().toISOString().split('T')[0],
    dueDate: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const assetData = await DataService.getAssets();
    const loanData = await DataService.getLoans();
    setAssets(assetData);
    setLoans(loanData);
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowForm.assetId || !borrowForm.borrowerName) return;

    const selectedAsset = assets.find(a => a.id === borrowForm.assetId);
    if (selectedAsset) {
        await DataService.createLoan({
            assetId: borrowForm.assetId,
            assetName: selectedAsset.name,
            borrowerName: borrowForm.borrowerName,
            department: borrowForm.department || 'ไม่ระบุ',
            loanDate: borrowForm.loanDate,
            dueDate: borrowForm.dueDate
        });
        alert('ทำรายการยืมสำเร็จ');
        setBorrowForm({ assetId: '', borrowerName: '', department: '', loanDate: new Date().toISOString().split('T')[0], dueDate: '' });
        loadData(); // Refresh data
    }
  };

  const handleReturn = async (loanId: string) => {
    if (confirm('ยืนยันการรับคืนครุภัณฑ์?')) {
        await DataService.returnLoan(loanId, new Date().toISOString().split('T')[0]);
        alert('บันทึกการรับคืนสำเร็จ');
        loadData();
    }
  };

  // Filter only active assets for borrowing
  const availableAssets = assets.filter(a => a.status === AssetStatus.ACTIVE);
  
  // Filter only active loans for returning
  const activeLoans = loans.filter(l => l.status === 'Active' || l.status === 'Overdue');

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <ArrowRightLeft className="w-8 h-8 text-primary-600" />
        <div>
           <h2 className="text-2xl font-bold text-slate-800">ระบบยืม-คืน (Loan & Return)</h2>
           <p className="text-sm text-slate-500">จัดการการหมุนเวียนและยืมใช้อุปกรณ์ระหว่างแผนก</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'borrow' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('borrow')}
        >
            ทำรายการยืม
        </button>
        <button 
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'return' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('return')}
        >
            บันทึกรับคืน
        </button>
        <button 
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('history')}
        >
            ประวัติการยืม-คืน
        </button>
      </div>

      {/* Borrow Tab */}
      {activeTab === 'borrow' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-2xl">
            <h3 className="text-lg font-semibold mb-6 text-slate-800">แบบฟอร์มขอยืมครุภัณฑ์</h3>
            <form onSubmit={handleBorrow} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เลือกอุปกรณ์ที่ต้องการยืม (สถานะปกติเท่านั้น) *</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <select className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white" required
                            value={borrowForm.assetId} onChange={e => setBorrowForm({...borrowForm, assetId: e.target.value})}>
                            <option value="">-- เลือกรายการ --</option>
                            {availableAssets.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.id}) - {a.department}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อผู้ยืม *</label>
                        <input type="text" className="w-full border rounded-lg px-3 py-2" required
                            value={borrowForm.borrowerName} onChange={e => setBorrowForm({...borrowForm, borrowerName: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">แผนกที่นำไปใช้</label>
                        <input type="text" className="w-full border rounded-lg px-3 py-2" 
                            value={borrowForm.department} onChange={e => setBorrowForm({...borrowForm, department: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ยืม</label>
                        <input type="date" className="w-full border rounded-lg px-3 py-2" required
                            value={borrowForm.loanDate} onChange={e => setBorrowForm({...borrowForm, loanDate: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">กำหนดส่งคืน (Due Date)</label>
                        <input type="date" className="w-full border rounded-lg px-3 py-2" 
                            value={borrowForm.dueDate} onChange={e => setBorrowForm({...borrowForm, dueDate: e.target.value})} />
                    </div>
                </div>
                <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-medium flex justify-center items-center mt-4">
                    <Save className="w-5 h-5 mr-2" /> บันทึกการยืม
                </button>
            </form>
        </div>
      )}

      {/* Return Tab */}
      {activeTab === 'return' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">รายการที่ค้างส่งคืน (Active Loans)</h3>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                        <th className="px-6 py-3">อุปกรณ์</th>
                        <th className="px-6 py-3">ผู้ยืม</th>
                        <th className="px-6 py-3">วันที่ยืม</th>
                        <th className="px-6 py-3">กำหนดคืน</th>
                        <th className="px-6 py-3">สถานะ</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {activeLoans.map(loan => (
                        <tr key={loan.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium">{loan.assetName}</td>
                            <td className="px-6 py-4">{loan.borrowerName} <span className="text-xs text-slate-400">({loan.department})</span></td>
                            <td className="px-6 py-4">{loan.loanDate}</td>
                            <td className="px-6 py-4">{loan.dueDate}</td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">กำลังยืม</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => handleReturn(loan.id)}
                                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs flex items-center ml-auto"
                                >
                                    <RotateCcw className="w-3 h-3 mr-1" /> รับคืน
                                </button>
                            </td>
                        </tr>
                    ))}
                    {activeLoans.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-400">ไม่มีรายการค้างคืน</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
              <History className="w-5 h-5 mr-2 text-slate-500" />
              <h3 className="font-semibold text-slate-800">ประวัติรายการยืม-คืนทั้งหมด</h3>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                        <th className="px-6 py-3">ID</th>
                        <th className="px-6 py-3">อุปกรณ์</th>
                        <th className="px-6 py-3">ผู้ยืม</th>
                        <th className="px-6 py-3">วันที่ยืม</th>
                        <th className="px-6 py-3">วันที่คืน</th>
                        <th className="px-6 py-3">สถานะ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loans.map(loan => (
                        <tr key={loan.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-mono text-xs">{loan.id}</td>
                            <td className="px-6 py-4 font-medium">{loan.assetName}</td>
                            <td className="px-6 py-4">{loan.borrowerName}</td>
                            <td className="px-6 py-4">{loan.loanDate}</td>
                            <td className="px-6 py-4">{loan.returnDate || '-'}</td>
                            <td className="px-6 py-4">
                                {loan.status === 'Returned' ? (
                                    <span className="text-green-600 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> คืนแล้ว</span>
                                ) : (
                                    <span className="text-amber-600">กำลังยืม</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

    </div>
  );
};

export default LoanSystem;