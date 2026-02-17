import React, { useState, useEffect } from 'react';
import { Role, User, CLASSES, AppSettings } from '../types';
import { StorageService } from '../services/storageService';
import { Moon, User as UserIcon, Lock, ChevronDown } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());

  const [studentsInClass, setStudentsInClass] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    // Load settings freshly
    setSettings(StorageService.getSettings());

    if (role === Role.STUDENT) {
      const allStudents = StorageService.getStudents();
      setStudentsInClass(allStudents.filter(s => s.className === selectedClass));
    }
  }, [role, selectedClass]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === Role.ADMIN) {
      if (password === settings.adminPassword) {
        onLogin({ id: 'admin', name: 'Administrator', role: Role.ADMIN });
      } else {
        setError('Password admin salah!');
      }
    } else if (role === Role.TEACHER) {
      if (password === settings.teacherPassword) {
        onLogin({ id: `teacher_${selectedClass}`, name: `Wali Kelas ${selectedClass}`, role: Role.TEACHER, className: selectedClass });
      } else {
        setError('Password wali kelas salah!');
      }
    } else if (role === Role.STUDENT) {
       const student = StorageService.getStudents().find(s => s.id === studentId);
       if (student) {
         onLogin({ id: student.id, name: student.name, role: Role.STUDENT, className: student.className });
       } else {
         setError('Silakan pilih nama siswa.');
       }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-cover bg-center font-sans">
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-400/30 blur-[100px] animate-blob mix-blend-multiply"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/30 blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] rounded-full bg-pink-400/30 blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply"></div>

      {/* Main Login Card - Glassmorphism */}
      <div className="w-full max-w-md p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative z-10 border border-white/50 bg-white/40 backdrop-blur-xl animate-fade-in-up">
        
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
           <div className="w-24 h-24 rounded-[2rem] bg-white shadow-lg mb-4 flex items-center justify-center overflow-hidden p-2 transform hover:scale-105 transition duration-500">
             <img 
               src="https://image2url.com/r2/default/images/1769001049680-d981c280-6340-4989-8563-7b08134c189a.png" 
               alt="Logo SMPN 3 Pacet" 
               className="w-full h-full object-contain"
             />
           </div>
           <h1 className="text-3xl font-bold font-sans bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600 mb-1 tracking-tight">
               {settings.loginTitle || 'Ramadhan Love'}
           </h1>
           <p className="text-indigo-900/60 font-semibold tracking-widest text-xs uppercase">{settings.schoolName}</p>
        </div>

        {/* Role Switcher */}
        <div className="flex p-1.5 bg-gray-100/50 rounded-2xl mb-8 backdrop-blur-md border border-white/40 shadow-inner">
           <button 
             onClick={() => setRole(Role.STUDENT)} 
             className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${role === Role.STUDENT ? 'bg-white text-indigo-600 shadow-md scale-100' : 'text-gray-500 hover:text-indigo-500'}`}
           >
             Siswa
           </button>
           <button 
             onClick={() => setRole(Role.TEACHER)} 
             className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${role === Role.TEACHER ? 'bg-white text-indigo-600 shadow-md scale-100' : 'text-gray-500 hover:text-indigo-500'}`}
           >
             Guru
           </button>
           <button 
             onClick={() => setRole(Role.ADMIN)} 
             className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${role === Role.ADMIN ? 'bg-white text-indigo-600 shadow-md scale-100' : 'text-gray-500 hover:text-indigo-500'}`}
           >
             Admin
           </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
           {role === Role.STUDENT && (
             <>
               <div className="space-y-1 group">
                 <label className="text-xs font-bold uppercase tracking-wider text-indigo-900/50 ml-1">Kelas</label>
                 <div className="relative">
                   <select 
                     value={selectedClass} 
                     onChange={(e) => setSelectedClass(e.target.value)}
                     className="w-full bg-white/60 border border-white/60 rounded-2xl px-4 py-3.5 text-indigo-900 placeholder-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:bg-white/80 focus:outline-none transition-all appearance-none cursor-pointer shadow-sm"
                   >
                     {CLASSES.map(c => <option key={c} value={c} className="text-gray-900">{c}</option>)}
                   </select>
                   <ChevronDown className="absolute right-4 top-4 text-indigo-400 pointer-events-none" size={18} />
                 </div>
               </div>
               <div className="space-y-1 group">
                 <label className="text-xs font-bold uppercase tracking-wider text-indigo-900/50 ml-1">Nama Siswa</label>
                 <div className="relative">
                   <select 
                     value={studentId}
                     onChange={(e) => setStudentId(e.target.value)}
                     className="w-full bg-white/60 border border-white/60 rounded-2xl px-4 py-3.5 text-indigo-900 placeholder-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:bg-white/80 focus:outline-none transition-all appearance-none cursor-pointer shadow-sm"
                     required
                   >
                     <option value="" className="text-gray-400">-- Pilih Nama --</option>
                     {studentsInClass.map(s => <option key={s.id} value={s.id} className="text-gray-900">{s.name}</option>)}
                   </select>
                   <UserIcon className="absolute right-4 top-4 text-indigo-400 pointer-events-none" size={18} />
                 </div>
               </div>
             </>
           )}

           {role === Role.TEACHER && (
             <>
               <div className="space-y-1 group">
                 <label className="text-xs font-bold uppercase tracking-wider text-indigo-900/50 ml-1">Wali Kelas</label>
                 <div className="relative">
                   <select 
                     value={selectedClass} 
                     onChange={(e) => setSelectedClass(e.target.value)}
                     className="w-full bg-white/60 border border-white/60 rounded-2xl px-4 py-3.5 text-indigo-900 placeholder-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:bg-white/80 focus:outline-none transition-all appearance-none cursor-pointer shadow-sm"
                   >
                     {CLASSES.map(c => <option key={c} value={c} className="text-gray-900">{c}</option>)}
                   </select>
                   <ChevronDown className="absolute right-4 top-4 text-indigo-400 pointer-events-none" size={18} />
                 </div>
               </div>
               <div className="space-y-1 group">
                 <label className="text-xs font-bold uppercase tracking-wider text-indigo-900/50 ml-1">Password</label>
                 <div className="relative">
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/60 border border-white/60 rounded-2xl px-4 py-3.5 pl-11 text-indigo-900 placeholder-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:bg-white/80 focus:outline-none transition-all shadow-sm"
                      placeholder="Masukkan password"
                    />
                    <Lock className="absolute left-4 top-3.5 text-indigo-400" size={18} />
                 </div>
               </div>
             </>
           )}

           {role === Role.ADMIN && (
              <div className="space-y-1 group">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-900/50 ml-1">Password Admin</label>
                <div className="relative">
                   <input 
                     type="password" 
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full bg-white/60 border border-white/60 rounded-2xl px-4 py-3.5 pl-11 text-indigo-900 placeholder-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:bg-white/80 focus:outline-none transition-all shadow-sm"
                     placeholder="Masukkan password admin"
                   />
                   <Lock className="absolute left-4 top-3.5 text-indigo-400" size={18} />
                </div>
              </div>
           )}

           {error && (
             <div className="bg-red-100 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center font-bold shadow-sm animate-pulse">
               {error}
             </div>
           )}

           <button 
             type="submit" 
             className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all transform hover:-translate-y-1 active:scale-95 border border-white/20 mt-4"
           >
             Masuk Aplikasi
           </button>
        </form>

        <div className="mt-8 text-center text-xs text-indigo-900/40 font-bold tracking-wide">
           {settings.copyrightText || '© 2026/1447 H SMPN 3 Pacet'}
        </div>
      </div>
    </div>
  );
};

export default Login;