
import React, { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, MessageCircle, Hospital, Database, Download, Upload, Cloud, Layers, Plus, Trash2, Code, Copy, Check } from 'lucide-react';
import { AppSettings } from '../types';
import { DataService } from '../services/dataService';

interface SettingsProps {
  onSettingsChange: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<AppSettings>({
    hospitalName: 'โรงพยาบาลแก้งคร้อ จ.ชัยภูมิ',
    logoUrl: '',
    backgroundUrl: '',
    telegramBotToken: '',
    telegramChatId: '',
    googleScriptUrl: '', // Reset default to force user setup
    departments: ['ER', 'ICU', 'OPD', 'Radiology', 'Pediatrics', 'เวชกรรมฟื้นฟู'] // Defaults
  });

  const [newDept, setNewDept] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('medEquipSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.departments) parsed.departments = ['ER', 'ICU', 'OPD', 'Radiology', 'Pediatrics', 'เวชกรรมฟื้นฟู'];
      if (!parsed.hospitalName || parsed.hospitalName === 'MedEquip Manager') parsed.hospitalName = 'โรงพยาบาลแก้งคร้อ จ.ชัยภูมิ';
      setSettings(parsed);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    localStorage.setItem('medEquipSettings', JSON.stringify(settings));
    onSettingsChange(settings);
    alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof AppSettings) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSettings(prev => ({ ...prev, [field]: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Department Logic
  const handleAddDept = () => {
      if (newDept.trim() && !settings.departments?.includes(newDept.trim())) {
          setSettings(prev => ({
              ...prev,
              departments: [...(prev.departments || []), newDept.trim()]
          }));
          setNewDept('');
      }
  };

  const handleRemoveDept = (dept: string) => {
      if (confirm(`ต้องการลบแผนก ${dept} ออกจากรายการตัวเลือก?`)) {
        setSettings(prev => ({
            ...prev,
            departments: prev.departments?.filter(d => d !== dept)
        }));
      }
  };

  const handleExportData = async () => {
      const jsonStr = await DataService.exportAllData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medequip_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
             const success = await DataService.importData(event.target?.result as string);
             if(success) alert('นำเข้าข้อมูลสำเร็จ! กรุณารีเฟรชหน้าจอ');
             else alert('ไฟล์ข้อมูลไม่ถูกต้อง');
          };
          reader.readAsText(file);
      }
  };

  const gasCode = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var sheetName = payload.sheet;
    var action = payload.action;
    var data = payload.data;
    
    var sheet = doc.getSheetByName(sheetName);
    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
      if (data) {
        var headers = Object.keys(data);
        sheet.appendRow(headers);
      }
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (action === 'add') {
       var row = headers.map(function(header) { return data[header] || ''; });
       sheet.appendRow(row);
    } else if (action === 'update') {
       var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
       var rowIndex = ids.indexOf(data.id);
       if (rowIndex !== -1) {
         var row = headers.map(function(header) { return data[header] || ''; });
         sheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]);
       }
    } else if (action === 'delete') {
       var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
       var rowIndex = ids.indexOf(data.id);
       if (rowIndex !== -1) {
         sheet.deleteRow(rowIndex + 2);
       }
    }
    
    return ContentService.createTextOutput(JSON.stringify({result: 'success'})).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({result: 'error', error: e})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var sheetName = e.parameter.sheet;
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(sheetName);
  
  if (!sheet) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
  
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var data = rows.slice(1).map(function(row) {
    var obj = {};
    row.forEach(function(cell, i) {
      obj[headers[i]] = cell;
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-3 bg-slate-200 rounded-xl">
             <Hospital className="w-8 h-8 text-slate-700" />
        </div>
        <div>
           <h2 className="text-3xl font-bold text-slate-800">ตั้งค่าระบบ (System Settings)</h2>
           <p className="text-slate-500">ปรับแต่งหน้าตา, การเชื่อมต่อ และจัดการฐานข้อมูล</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* General Appearance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <h3 className="font-bold text-xl text-slate-800 flex items-center border-b pb-3">
            <ImageIcon className="w-5 h-5 mr-3 text-primary-600" /> การแสดงผล (Appearance)
          </h3>
          
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">ชื่อหน่วยงาน/โรงพยาบาล</label>
            <input 
              name="hospitalName"
              value={settings.hospitalName}
              onChange={handleChange}
              className="w-full border rounded-xl px-4 py-2.5 bg-slate-50 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              placeholder="Ex. โรงพยาบาลกลาง"
            />
          </div>

          <div>
             <label className="block text-base font-semibold text-slate-700 mb-2">โลโก้ (Logo)</label>
             <div className="flex items-center space-x-4">
               {settings.logoUrl && <img src={settings.logoUrl} alt="Logo Preview" className="h-16 w-16 object-contain border rounded-lg bg-slate-100" />}
               <input 
                 type="file" 
                 accept="image/*"
                 onChange={(e) => handleFileChange(e, 'logoUrl')}
                 className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
               />
             </div>
          </div>

          <div>
             <label className="block text-base font-semibold text-slate-700 mb-2">ภาพพื้นหลัง (Background)</label>
             <div className="flex items-center space-x-4">
               {settings.backgroundUrl && (
                  <div className="h-16 w-24 bg-cover bg-center border rounded-lg" style={{backgroundImage: `url(${settings.backgroundUrl})`}}></div>
               )}
               <input 
                 type="file" 
                 accept="image/*"
                 onChange={(e) => handleFileChange(e, 'backgroundUrl')}
                 className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
               />
             </div>
          </div>
        </div>

        {/* Department Management */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
            <h3 className="font-bold text-xl text-slate-800 flex items-center border-b pb-3">
                <Layers className="w-5 h-5 mr-3 text-indigo-500" /> จัดการแผนก (Departments)
            </h3>
            
            <div className="flex space-x-2">
                <input 
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="เพิ่มแผนกใหม่..."
                />
                <button 
                    onClick={handleAddDept}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-2 max-h-60 overflow-y-auto space-y-2">
                {settings.departments?.map((dept, index) => (
                    <div key={index} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-sm">
                        <span className="text-slate-700 font-medium">{dept}</span>
                        <button 
                            onClick={() => handleRemoveDept(dept)}
                            className="text-slate-400 hover:text-red-500 transition"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {(!settings.departments || settings.departments.length === 0) && (
                    <p className="text-center text-slate-400 text-sm py-4">ยังไม่มีข้อมูลแผนก</p>
                )}
            </div>
        </div>

        <div className="md:col-span-2 space-y-6">
            {/* Database Connection */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                <h3 className="font-bold text-xl text-slate-800 flex items-center border-b pb-3">
                    <Cloud className="w-5 h-5 mr-3 text-emerald-500" /> เชื่อมต่อฐานข้อมูลออนไลน์ (Online Database)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                         <label className="block text-base font-semibold text-slate-700 mb-2">Google Apps Script Web App URL</label>
                         <p className="text-xs text-slate-500 mb-2">ใส่ URL ที่ได้จากการ Deploy Script (ลงท้ายด้วย /exec)</p>
                         <input 
                            name="googleScriptUrl"
                            value={settings.googleScriptUrl || ''}
                            onChange={handleChange}
                            className="w-full border rounded-xl px-4 py-2.5 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-sm mb-4"
                            placeholder="https://script.google.com/macros/s/.../exec"
                         />
                         
                         {settings.googleScriptUrl ? (
                             <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                                 <Check className="w-4 h-4 mr-2" /> ระบบพร้อมเชื่อมต่อ (Online Mode Active)
                             </div>
                         ) : (
                             <div className="flex items-center text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                 <Database className="w-4 h-4 mr-2" /> กำลังใช้งานโหมดออฟไลน์ (Offline Mode)
                             </div>
                         )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                         <div className="flex justify-between items-center mb-2">
                             <h4 className="font-semibold text-slate-700 flex items-center">
                                 <Code className="w-4 h-4 mr-2" /> คู่มือติดตั้ง Backend (Setup Guide)
                             </h4>
                             <button 
                                onClick={handleCopyCode}
                                className="text-xs flex items-center bg-white border px-2 py-1 rounded hover:bg-slate-100"
                             >
                                 {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                 {copied ? 'Copied!' : 'Copy Code'}
                             </button>
                         </div>
                         <p className="text-xs text-slate-500 mb-3">
                             1. เปิด Google Sheet ใหม่ > Extensions > Apps Script<br/>
                             2. ลบโค้ดเก่าทิ้ง แล้ววางโค้ดด้านล่างนี้ลงไป<br/>
                             3. กด Deploy > New Deployment > Select type: Web App<br/>
                             4. ตั้งค่า <b>Who has access: Anyone</b> > กด Deploy<br/>
                             5. คัดลอก Web App URL มาใส่ในช่องด้านซ้าย
                         </p>
                         <div className="bg-slate-800 text-slate-200 p-3 rounded-lg text-[10px] font-mono h-40 overflow-y-auto">
                             <pre>{gasCode}</pre>
                         </div>
                    </div>
                </div>
            </div>

            {/* Telegram Integration */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
            <h3 className="font-bold text-xl text-slate-800 flex items-center border-b pb-3">
                <MessageCircle className="w-5 h-5 mr-3 text-blue-500" /> การแจ้งเตือน (Notifications)
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-4">
                <p className="font-semibold">วิธีตั้งค่า Telegram Bot:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>สร้าง Bot ผ่าน @BotFather และรับ API Token</li>
                <li>สร้างกลุ่ม และดึง Bot เข้ากลุ่ม</li>
                <li>หา Chat ID ของกลุ่ม (เช่นใช้ @userinfobot)</li>
                </ol>
            </div>

            <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Bot API Token</label>
                <input 
                name="telegramBotToken"
                type="password"
                value={settings.telegramBotToken}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                />
            </div>

            <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Chat ID</label>
                <input 
                name="telegramChatId"
                value={settings.telegramChatId}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="-100123456789"
                />
            </div>
            </div>
        </div>
      </div>

      {/* Database Management */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-xl text-slate-800 flex items-center border-b pb-3 mb-5">
            <Database className="w-5 h-5 mr-3 text-slate-600" /> สำรอง/กู้คืนข้อมูล (Local Backup)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-3">
                <h4 className="font-semibold text-slate-700 flex items-center">
                    <Download className="w-4 h-4 mr-2" /> สำรองข้อมูล (Export)
                </h4>
                <p className="text-sm text-slate-500">ดาวน์โหลดข้อมูลทั้งหมดในระบบเก็บไว้เป็นไฟล์ JSON</p>
                <button 
                    onClick={handleExportData}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-sm transition flex items-center"
                >
                    <Download className="w-4 h-4 mr-2" /> Export Database
                </button>
             </div>

             <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
                <h4 className="font-semibold text-slate-700 flex items-center">
                    <Upload className="w-4 h-4 mr-2" /> นำเข้าข้อมูล (Import)
                </h4>
                <p className="text-sm text-slate-500">กู้คืนข้อมูลจากไฟล์ Backup (.json) เฉพาะโหมด Offline</p>
                <input 
                    type="file" 
                    accept=".json"
                    onChange={handleImportData}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                />
             </div>
          </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition font-bold text-lg flex items-center"
        >
          <Save className="w-5 h-5 mr-2" /> บันทึกการตั้งค่าทั้งหมด
        </button>
      </div>
    </div>
  );
};

export default Settings;
