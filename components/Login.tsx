
import React, { useState } from 'react';
import { Activity, Lock, User as UserIcon, Building2, UserPlus, LogIn } from 'lucide-react';
import { User, UserRole, RegisteredUser } from '../types';
import { DataService } from '../services/dataService';

interface LoginProps {
  onLogin: (user: User) => void;
  availableDepartments: string[];
}

const Login: React.FC<LoginProps> = ({ onLogin, availableDepartments }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [isNewDept, setIsNewDept] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = DataService.getRegisteredUsers();
    
    // Check credentials
    const foundUser = users.find(u => u.username === username && u.password === password);
    
    if (foundUser) {
        onLogin({
            name: foundUser.username,
            role: foundUser.role,
            department: foundUser.department
        });
    } else {
        alert('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword) return;
    
    const finalDept = isNewDept ? regDepartment : (regDepartment || availableDepartments[0]);

    const success = DataService.registerUser({
        username: regUsername,
        password: regPassword,
        role: 'Staff',
        department: finalDept
    });

    if (success) {
        alert('ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ');
        setMode('login');
        setUsername(regUsername);
        setPassword('');
    } else {
        alert('ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-primary-100 rounded-full">
            <Activity className="w-10 h-10 text-primary-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          {mode === 'login' ? 'เข้าสู่ระบบ' : 'ลงทะเบียนเจ้าหน้าที่'}
        </h2>
        <p className="text-center text-slate-500 mb-8">
          MedEquip Manager - ระบบจัดการครุภัณฑ์
        </p>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center ${mode === 'login' ? 'bg-white shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <LogIn className="w-4 h-4 mr-2" /> เข้าสู่ระบบ
            </button>
            <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center ${mode === 'register' ? 'bg-white shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <UserPlus className="w-4 h-4 mr-2" /> ลงทะเบียนใหม่
            </button>
        </div>

        {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อผู้ใช้งาน</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                            type="password"
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="pt-2">
                    <button
                        type="submit"
                        className="w-full bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 transition font-medium shadow-sm"
                    >
                        เข้าสู่ระบบ
                    </button>
                </div>
            </form>
        ) : (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ตั้งชื่อผู้ใช้งาน (Username)</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ตั้งรหัสผ่าน (Password)</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                            type="password"
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
                
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-slate-700">แผนก (Department)</label>
                        <button 
                            type="button" 
                            onClick={() => { setIsNewDept(!isNewDept); setRegDepartment(''); }}
                            className="text-xs text-primary-600 hover:underline"
                        >
                            {isNewDept ? 'เลือกจากรายการที่มี' : '+ เพิ่มแผนกใหม่'}
                        </button>
                    </div>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        {isNewDept ? (
                             <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-blue-50"
                                placeholder="ระบุชื่อแผนกใหม่..."
                                value={regDepartment}
                                onChange={(e) => setRegDepartment(e.target.value)}
                                required
                            />
                        ) : (
                            <select
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                value={regDepartment}
                                onChange={(e) => setRegDepartment(e.target.value)}
                            >
                                {availableDepartments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        className="w-full bg-slate-800 text-white py-2.5 rounded-lg hover:bg-slate-900 transition font-medium shadow-sm"
                    >
                        ยืนยันการลงทะเบียน
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default Login;
