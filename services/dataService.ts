
import { Asset, CheckRecord, MaintenanceRecord, LoanRecord, AssetStatus, RegisteredUser, AppSettings } from '../types';
import { MOCK_ASSETS, MOCK_CHECKS, MOCK_MAINTENANCE, MOCK_LOANS } from './mockData';

// Helper to get API URL and Settings
const getSettings = (): AppSettings | null => {
  const settingsStr = localStorage.getItem('medEquipSettings');
  if (settingsStr) {
    return JSON.parse(settingsStr);
  }
  return null;
};

// Update Settings (Helper for adding departments)
const updateSettings = (newSettings: AppSettings) => {
    localStorage.setItem('medEquipSettings', JSON.stringify(newSettings));
};

// If API URL exists in settings, use it. Otherwise use LocalStorage.
const useApi = () => {
  const settings = getSettings();
  return settings?.googleScriptUrl && settings.googleScriptUrl.startsWith('https://');
};

const getApiUrl = () => {
  return getSettings()?.googleScriptUrl;
}

// --- Telegram Logic ---
const sendTelegramMessage = async (message: string) => {
  const settings = getSettings();
  if (!settings?.telegramBotToken || !settings?.telegramChatId) {
    console.warn('Telegram Notification Skipped: Missing config.');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.telegramChatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error('Telegram Error:', error);
  }
};

// --- Google Sheets API Helper ---
const apiFetch = async (sheetName: string) => {
  // Add timestamp to prevent caching
  const url = `${getApiUrl()}?sheet=${sheetName}&t=${new Date().getTime()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch (error) {
    console.error(`API Fetch Error (${sheetName}):`, error);
    // If API fails, return empty array to prevent app crash, 
    // but log it so user knows why data is missing.
    return [];
  }
};

const apiPost = async (sheetName: string, action: 'add' | 'update' | 'delete', data: any) => {
  const url = getApiUrl();
  try {
    // Note: no-cors mode is used for GAS simple triggers compatibility, 
    // but it means we can't read the response. 
    await fetch(url!, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet: sheetName, action, data })
    });
    return data;
  } catch (error) {
    console.error(`API Post Error (${action}):`, error);
    throw error;
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const DataService = {
  // --- User Management (Local Storage Only for now) ---
  getRegisteredUsers: (): RegisteredUser[] => {
      const stored = localStorage.getItem('ME_Users');
      // Default Admin Updated
      const defaultAdmin: RegisteredUser = { username: 'admin', password: 'admin1234', role: 'Admin' };
      if (!stored) return [defaultAdmin];
      const users = JSON.parse(stored);
      // Ensure admin exists
      if (!users.find((u: RegisteredUser) => u.username === 'admin')) {
          users.push(defaultAdmin);
      }
      return users;
  },

  registerUser: (newUser: RegisteredUser): boolean => {
      const users = DataService.getRegisteredUsers();
      if (users.find(u => u.username === newUser.username)) {
          return false; // User exists
      }
      
      // Save User
      users.push(newUser);
      localStorage.setItem('ME_Users', JSON.stringify(users));

      // Auto-add Department if new
      if (newUser.department) {
          const settings = getSettings();
          if (settings) {
              const currentDepts = settings.departments || [];
              if (!currentDepts.includes(newUser.department)) {
                  const updatedDepts = [...currentDepts, newUser.department];
                  updateSettings({ ...settings, departments: updatedDepts });
              }
          } else {
               // Initialize settings if empty
               const initSettings: AppSettings = {
                    hospitalName: 'โรงพยาบาลแก้งคร้อ จ.ชัยภูมิ',
                    logoUrl: '',
                    backgroundUrl: '',
                    telegramBotToken: '',
                    telegramChatId: '',
                    departments: ['ER', 'ICU', 'OPD', 'Radiology', 'Pediatrics', 'เวชกรรมฟื้นฟู', newUser.department]
               };
               updateSettings(initSettings);
          }
      }
      return true;
  },

  // --- Asset Management ---
  getAssets: async (): Promise<Asset[]> => {
    if (useApi()) {
      const data = await apiFetch('Assets');
      // If API returns empty but we expected data, it might be a connection issue
      // But we adhere to the API source of truth.
      return data;
    }
    await delay(300);
    const stored = localStorage.getItem('ME_Assets');
    return stored ? JSON.parse(stored) : [...MOCK_ASSETS];
  },

  addAsset: async (asset: Partial<Asset>): Promise<Asset> => {
    const newId = asset.id && asset.id.trim() !== '' 
        ? asset.id 
        : `EQ-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const newAsset = { ...asset, id: newId } as Asset;

    if (useApi()) {
      await apiPost('Assets', 'add', newAsset);
      return newAsset;
    }
    
    await delay(300);
    const currentAssets = await DataService.getAssets();
    if (currentAssets.some(a => a.id === newAsset.id)) {
        throw new Error('Asset ID already exists');
    }

    const updatedAssets = [newAsset, ...currentAssets];
    localStorage.setItem('ME_Assets', JSON.stringify(updatedAssets));
    return newAsset;
  },

  updateAsset: async (asset: Asset): Promise<Asset> => {
    if (useApi()) {
        await apiPost('Assets', 'update', asset);
        return asset;
    }

    await delay(300);
    const currentAssets = await DataService.getAssets();
    const index = currentAssets.findIndex(a => a.id === asset.id);
    if (index !== -1) {
        currentAssets[index] = asset;
        localStorage.setItem('ME_Assets', JSON.stringify(currentAssets));
    }
    return asset;
  },

  deleteAsset: async (id: string): Promise<void> => {
    if (useApi()) {
        await apiPost('Assets', 'delete', { id });
        return;
    }

    await delay(300);
    const currentAssets = await DataService.getAssets();
    const updatedAssets = currentAssets.filter(a => a.id !== id);
    localStorage.setItem('ME_Assets', JSON.stringify(updatedAssets));
  },

  getChecks: async (): Promise<CheckRecord[]> => {
    if (useApi()) {
      return await apiFetch('Checks');
    }
    await delay(300);
    const stored = localStorage.getItem('ME_Checks');
    return stored ? JSON.parse(stored) : [...MOCK_CHECKS];
  },

  addCheck: async (check: Omit<CheckRecord, 'id'>): Promise<CheckRecord> => {
    const newCheck = { ...check, id: `CHK-${Math.floor(Math.random() * 10000)}` };

    if (useApi()) {
      await apiPost('Checks', 'add', newCheck);
    } else {
      await delay(300);
      const currentChecks = await DataService.getChecks();
      localStorage.setItem('ME_Checks', JSON.stringify([newCheck, ...currentChecks]));
    }
    
    if (check.status === 'Fail') {
      let issues = '';
      if (check.checklistDetails) {
         if (!check.checklistDetails.powerCord) issues += `- สายไฟ: ${check.checklistDetails.powerCordNote || 'ผิดปกติ'}\n`;
         if (!check.checklistDetails.screen) issues += `- หน้าจอ: ${check.checklistDetails.screenNote || 'ผิดปกติ'}\n`;
         if (!check.checklistDetails.functionality) issues += `- การทำงาน: ${check.checklistDetails.functionalityNote || 'ผิดปกติ'}\n`;
         if (!check.checklistDetails.cleanliness) issues += `- ความสะอาด: ${check.checklistDetails.cleanlinessNote || 'ผิดปกติ'}\n`;
      }

      const msg = `🚨 <b>แจ้งเตือนความผิดปกติ (Daily Check Fail)</b>\n\n` +
                  `<b>อุปกรณ์:</b> ${check.assetName}\n` +
                  `<b>ผู้ตรวจ:</b> ${check.checkerName}\n` +
                  `<b>วันที่:</b> ${check.date}\n` +
                  `----------------------------\n` +
                  `<b>จุดที่พบปัญหา:</b>\n${issues || '- ไม่ระบุ'}\n` +
                  `<b>สรุปเพิ่มเติม:</b> ${check.notes || '-'}`;
      await sendTelegramMessage(msg);
    }
    return newCheck;
  },

  // New Function for Summary Report
  sendDailySummary: async (summary: { department: string, checker: string, date: string, total: number, failCount: number, failedItems: string[] }) => {
     const msg = `📊 <b>สรุปผลการตรวจประจำวัน (${summary.department})</b>\n\n` +
                 `<b>วันที่:</b> ${summary.date}\n` +
                 `<b>ผู้ตรวจ:</b> ${summary.checker}\n` +
                 `--------------------------------\n` +
                 `✅ <b>ตรวจสอบแล้ว:</b> ${summary.total} เครื่อง\n` +
                 `❌ <b>พบปัญหา (ไม่ผ่าน):</b> ${summary.failCount} เครื่อง\n` +
                 (summary.failedItems.length > 0 ? `\n<b>รายชื่อเครื่องที่พบปัญหา:</b>\n- ${summary.failedItems.join('\n- ')}` : `\n✨ อุปกรณ์สมบูรณ์ทุกรายการ`);
     
     await sendTelegramMessage(msg);
  },

  getMaintenanceRecords: async (): Promise<MaintenanceRecord[]> => {
    if (useApi()) {
      return await apiFetch('Maintenance');
    }
    await delay(300);
    const stored = localStorage.getItem('ME_Maintenance');
    return stored ? JSON.parse(stored) : [...MOCK_MAINTENANCE];
  },

  addMaintenanceRequest: async (req: Omit<MaintenanceRecord, 'id' | 'status'>): Promise<MaintenanceRecord> => {
    const newReq: MaintenanceRecord = { 
        ...req, 
        id: `MT-${Math.floor(Math.random() * 10000)}`, 
        status: 'Pending' 
    };

    if (useApi()) {
      await apiPost('Maintenance', 'add', newReq);
      const assets = await DataService.getAssets();
      const asset = assets.find(a => a.id === req.assetId);
      if (asset) {
        asset.status = AssetStatus.REPAIR;
        await apiPost('Assets', 'update', asset);
      }
    } else {
      await delay(300);
      const currentMaint = await DataService.getMaintenanceRecords();
      localStorage.setItem('ME_Maintenance', JSON.stringify([newReq, ...currentMaint]));
      
      const currentAssets = await DataService.getAssets();
      const assetIndex = currentAssets.findIndex(a => a.id === req.assetId);
      if (assetIndex > -1) {
          currentAssets[assetIndex].status = AssetStatus.REPAIR;
          localStorage.setItem('ME_Assets', JSON.stringify(currentAssets));
      }
    }

    const msg = `🛠 <b>แจ้งซ่อมใหม่ (New Maintenance Request)</b>\n\n` +
                `<b>อุปกรณ์:</b> ${req.assetName}\n` +
                `<b>ผู้แจ้ง:</b> ${req.technician}\n` +
                `<b>อาการเสีย:</b> ${req.description}\n` +
                `<b>เอกสารแนบ:</b> ${req.attachmentUrl ? 'มีไฟล์แนบ' : '-'}\n` +
                `<b>ความเร่งด่วน:</b> สูง`;
    await sendTelegramMessage(msg);

    return newReq;
  },

  getLoans: async (): Promise<LoanRecord[]> => {
    if (useApi()) {
      return await apiFetch('Loans');
    }
    await delay(300);
    const stored = localStorage.getItem('ME_Loans');
    return stored ? JSON.parse(stored) : [...MOCK_LOANS];
  },
  
  createLoan: async (loan: Omit<LoanRecord, 'id' | 'status'>): Promise<LoanRecord> => {
    const newLoan: LoanRecord = { ...loan, id: `LN-${Math.floor(Math.random() * 10000)}`, status: 'Active' };
    
    if (useApi()) {
      await apiPost('Loans', 'add', newLoan);
      const assets = await DataService.getAssets();
      const asset = assets.find(a => a.id === loan.assetId);
      if (asset) {
        asset.status = AssetStatus.LOANED;
        await apiPost('Assets', 'update', asset);
      }
    } else {
      await delay(300);
      const currentLoans = await DataService.getLoans();
      localStorage.setItem('ME_Loans', JSON.stringify([newLoan, ...currentLoans]));

      const currentAssets = await DataService.getAssets();
      const assetIndex = currentAssets.findIndex(a => a.id === loan.assetId);
      if (assetIndex > -1) {
          currentAssets[assetIndex].status = AssetStatus.LOANED;
          localStorage.setItem('ME_Assets', JSON.stringify(currentAssets));
      }
    }
    return newLoan;
  },

  returnLoan: async (loanId: string, returnDate: string): Promise<void> => {
    const loans = await DataService.getLoans();
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
        loan.status = 'Returned';
        loan.returnDate = returnDate;

        if (useApi()) {
           await apiPost('Loans', 'update', loan);
           const assets = await DataService.getAssets();
           const asset = assets.find(a => a.id === loan.assetId);
           if (asset) {
             asset.status = AssetStatus.ACTIVE;
             await apiPost('Assets', 'update', asset);
           }
        } else {
           const allLoans = await DataService.getLoans();
           const idx = allLoans.findIndex(l => l.id === loanId);
           if (idx > -1) {
             allLoans[idx] = loan;
             localStorage.setItem('ME_Loans', JSON.stringify(allLoans));
           }
           const currentAssets = await DataService.getAssets();
           const assetIndex = currentAssets.findIndex(a => a.id === loan.assetId);
           if (assetIndex > -1) {
               currentAssets[assetIndex].status = AssetStatus.ACTIVE;
               localStorage.setItem('ME_Assets', JSON.stringify(currentAssets));
           }
        }
    }
  },

  checkUpcomingPMs: async (): Promise<number> => {
      const assets = await DataService.getAssets();
      const today = new Date();
      let alertCount = 0;
      for (const asset of assets) {
          if (asset.nextPmDate) {
              const pmDate = new Date(asset.nextPmDate);
              const diffTime = pmDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays >= 0 && diffDays <= 7) {
                  const msg = `📅 <b>แจ้งเตือน PM ล่วงหน้า (Upcoming PM)</b>\n\n` +
                              `<b>อุปกรณ์:</b> ${asset.name} (${asset.id})\n` +
                              `<b>แผนก:</b> ${asset.department}\n` +
                              `<b>กำหนด PM:</b> ${asset.nextPmDate} (อีก ${diffDays} วัน)\n` +
                              `กรุณาเตรียมแผนการบำรุงรักษา`;
                  await sendTelegramMessage(msg);
                  alertCount++;
              }
          }
      }
      return alertCount;
  },

  exportAllData: async (): Promise<string> => {
      const data = {
          assets: await DataService.getAssets(),
          checks: await DataService.getChecks(),
          maintenance: await DataService.getMaintenanceRecords(),
          loans: await DataService.getLoans(),
          timestamp: new Date().toISOString()
      };
      return JSON.stringify(data, null, 2);
  },

  importData: async (jsonString: string): Promise<boolean> => {
      try {
          const data = JSON.parse(jsonString);
          if (useApi()) {
            alert("Import is only supported in Offline Mode currently.");
            return false;
          }
          if (data.assets) localStorage.setItem('ME_Assets', JSON.stringify(data.assets));
          if (data.checks) localStorage.setItem('ME_Checks', JSON.stringify(data.checks));
          if (data.maintenance) localStorage.setItem('ME_Maintenance', JSON.stringify(data.maintenance));
          if (data.loans) localStorage.setItem('ME_Loans', JSON.stringify(data.loans));
          return true;
      } catch (e) {
          console.error("Import failed", e);
          return false;
      }
  }
};
