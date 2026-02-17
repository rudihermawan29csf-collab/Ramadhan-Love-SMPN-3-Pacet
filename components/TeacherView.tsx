import React, { useState, useEffect } from 'react';
import { User, StudentData, PrayerTimes } from '../types';
import { StorageService } from '../services/storageService';
import { CheckCircle, XCircle, Users, Calendar, LogOut, ChevronLeft, ChevronRight, Monitor, LayoutDashboard, FileSpreadsheet, FileText, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TeacherViewProps {
  user: User;
  onLogout: () => void;
}

const TeacherView: React.FC<TeacherViewProps> = ({ user, onLogout }) => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'monitoring'>('monitoring');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);

  useEffect(() => {
    // Filter only students from the teacher's class
    const all = StorageService.getStudents();
    setStudents(all.filter(s => s.className === user.className));

    fetch(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=-7.67&longitude=112.54&method=20`)
      .then(res => res.json())
      .then(data => {
        setPrayerTimes(data.data.timings);
      })
      .catch(err => console.error("Prayer time fetch error", err));
  }, [user.className, selectedDate]);

  const getStatus = (student: StudentData, type: 'sholatSubuh' | 'sholatZuhur' | 'sholatAsar' | 'sholatMaghrib' | 'sholatIsya' | 'puasa' | 'tarawih' | 'dhuha') => {
    const journal = student.journal[selectedDate];
    if (!journal) return <div className="w-5 h-5 rounded-full bg-gray-100 mx-auto"></div>;
    
    // @ts-ignore
    const entry = journal[type];
    
    if (typeof entry === 'boolean') {
        return entry ? <CheckCircle size={20} className="mx-auto text-indigo-500" fill="#e0e7ff" /> : <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 mx-auto"></div>;
    }

    if (entry?.completed) {
        if (entry.type) {
            return (
                <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-bold px-1.5 rounded ${entry.type === 'Jamaah' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {entry.type === 'Jamaah' ? 'J' : 'S'}
                    </span>
                    <CheckCircle size={16} className="text-indigo-500 mt-0.5" fill="#e0e7ff" />
                </div>
            );
        }
        return <CheckCircle size={20} className="mx-auto text-indigo-500" fill="#e0e7ff" />;
    }
    
    return <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 mx-auto"></div>;
  };

  const getDailyLogCount = (student: StudentData, type: 'kajian' | 'tadarus') => {
      const logs = type === 'kajian' ? student.kajianLogs : student.tadarusLogs;
      // Filter logs that start with the selectedDate YYYY-MM-DD
      const count = logs.filter((log: any) => log.date.startsWith(selectedDate)).length;
      
      if (count === 0) return <span className="text-gray-300">-</span>;
      return (
          <div className="flex flex-col items-center justify-center">
              <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-xs">{count}x</span>
              <span className="text-[9px] text-gray-400 mt-1">Detail di Admin</span>
          </div>
      );
  };

  const handleExportExcel = () => {
      const dataToExport = students.map(s => {
          const journal = s.journal[selectedDate] || {};
          // @ts-ignore
          const getStatus = (key) => journal[key]?.completed ? 'V' : '-';
          
          return {
              "Nama": s.name,
              "Kelas": s.className,
              "Total Poin": s.points,
              "Subuh": getStatus('sholatSubuh'),
              "Zuhur": getStatus('sholatZuhur'),
              "Asar": getStatus('sholatAsar'),
              "Maghrib": getStatus('sholatMaghrib'),
              "Isya": getStatus('sholatIsya'),
              "Tarawih": getStatus('tarawih'),
              "Puasa": getStatus('puasa'),
              "Dhuha": getStatus('dhuha'),
              "Jml Kajian": s.kajianLogs.filter(k => k.date.startsWith(selectedDate)).length,
              "Jml Tadarus": s.tadarusLogs.filter(t => t.date.startsWith(selectedDate)).length
          };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Monitoring ${selectedDate}`);
      XLSX.writeFile(wb, `Monitoring_${user.className}_${selectedDate}.xlsx`);
  };

  const handleExportPDF = () => {
      const doc = new jsPDF();
      doc.text(`Monitoring Kelas ${user.className}`, 14, 15);
      doc.text(`Tanggal: ${selectedDate}`, 14, 22);
      
      const tableColumn = ["Nama", "Poin", "S", "Z", "A", "M", "I", "T", "P", "D", "Kajian", "Tadarus"];
      const tableRows: any[] = [];

      students.forEach(s => {
          const journal = s.journal[selectedDate] || {};
          // @ts-ignore
          const getStatus = (key) => journal[key]?.completed ? 'V' : '-';
          
          const row = [
              s.name,
              s.points,
              getStatus('sholatSubuh'),
              getStatus('sholatZuhur'),
              getStatus('sholatAsar'),
              getStatus('sholatMaghrib'),
              getStatus('sholatIsya'),
              getStatus('tarawih'),
              getStatus('puasa'),
              getStatus('dhuha'),
              s.kajianLogs.filter(k => k.date.startsWith(selectedDate)).length,
              s.tadarusLogs.filter(t => t.date.startsWith(selectedDate)).length
          ];
          tableRows.push(row);
      });

      autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 30,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`Monitoring_${user.className}_${selectedDate}.pdf`);
  };

  return (
    <div className={`min-h-screen text-gray-800 font-sans transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-24' : 'md:pl-80'}`}>
       
      {/* Sidebar (Collapsible) */}
      <aside className={`hidden md:flex flex-col fixed left-0 top-0 h-full z-20 p-6 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-24' : 'w-72'}`}>
         <div className="glass-panel h-full rounded-[2rem] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-indigo-500/10 to-transparent"></div>
            
            <div className={`p-8 relative z-10 transition-all duration-300 ${isSidebarCollapsed ? 'px-4' : ''}`}>
               <div className={`flex items-center gap-4 mb-2 ${isSidebarCollapsed ? 'justify-center flex-col' : ''}`}>
                 <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center p-2 transform hover:scale-105 transition">
                     <img src="https://image2url.com/r2/default/images/1769001049680-d981c280-6340-4989-8563-7b08134c189a.png" alt="Logo" className="w-full h-full object-contain" />
                 </div>
                 {!isSidebarCollapsed && (
                    <div className="animate-fade-in">
                        <h1 className="font-bold text-xl leading-none text-indigo-900">Guru</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Wali Kelas {user.className}</p>
                    </div>
                 )}
               </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 relative z-10 mt-4">
               {[
                 { id: 'monitoring', icon: Monitor, label: 'Monitoring Kelas' }
               ].map((item) => (
                 <button 
                   key={item.id}
                   onClick={() => setActiveTab(item.id as any)}
                   title={isSidebarCollapsed ? item.label : ''}
                   className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'} py-4 text-sm font-bold rounded-2xl transition-all duration-300 ${
                     activeTab === item.id 
                     ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100 scale-100' 
                     : 'text-gray-500 hover:bg-white/40 hover:text-indigo-600'
                   }`}
                 >
                     <div className="flex items-center">
                        <item.icon size={20} className={`${isSidebarCollapsed ? '' : 'mr-3'} ${activeTab === item.id ? 'text-indigo-500' : 'text-gray-400'}`} /> 
                        {!isSidebarCollapsed && item.label}
                     </div>
                 </button>
               ))}
            </nav>
            
            <div className="p-4 relative z-10">
               <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-full flex items-center justify-center p-2 mb-2 text-gray-400 hover:text-indigo-500 hover:bg-white/50 rounded-xl transition">
                     {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
               </button>
               <button onClick={onLogout} title="Logout" className={`w-full flex items-center justify-center ${isSidebarCollapsed ? 'px-0' : 'px-4'} py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition group`}>
                  <LogOut size={18} className={`${isSidebarCollapsed ? '' : 'mr-2'} group-hover:-translate-x-1 transition`} /> {!isSidebarCollapsed && 'Logout'}
               </button>
            </div>
         </div>
      </aside>

       <main className="w-full max-w-[1920px] mx-auto p-4 md:p-8 animate-fade-in">
          
          {/* Mobile Header */}
          <div className="md:hidden flex justify-between items-center mb-6 glass-card px-5 py-4 rounded-[2rem]">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-gray-100">
                  <img src="https://image2url.com/r2/default/images/1769001049680-d981c280-6340-4989-8563-7b08134c189a.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                   <h1 className="font-bold text-gray-800 leading-none">Wali Kelas {user.className}</h1>
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest">Monitoring</p>
                </div>
             </div>
             <button onClick={onLogout} className="text-red-500 bg-red-50 p-3 rounded-full hover:bg-red-100 transition"><LogOut size={20} /></button>
          </div>

          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg mb-6 flex flex-col md:flex-row items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Jadwal Sholat Hari Ini</h2>
                    <p className="opacity-90 text-sm flex items-center gap-2"><MapPin size={16}/> Pacet, Mojokerto</p>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4 md:mt-0 w-full md:w-auto">
                        {prayerTimes && Object.entries(prayerTimes).filter(([k]) => ['Imsak', 'Fajr','Dhuhr','Asr','Maghrib','Isha'].includes(k)).map(([name, time]) => (
                            <div key={name} className="bg-white/20 backdrop-blur-md rounded-xl p-3 text-center border border-white/10">
                            <div className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-80">{name}</div>
                            <div className="font-bold text-sm">{time}</div>
                            </div>
                        ))}
                </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
             <div className="glass-card px-6 py-3 rounded-2xl flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={20} /></div>
                <span className="font-bold text-gray-700 text-lg">{students.length} Siswa</span>
             </div>
             
             <div className="flex gap-4">
                 <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition border border-emerald-100">
                    <FileSpreadsheet size={16}/> Excel
                 </button>
                 <button onClick={handleExportPDF} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition border border-red-100">
                    <FileText size={16}/> PDF
                 </button>
                 <div className="glass-card p-2 rounded-2xl flex items-center gap-3 pr-4">
                     <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600"><Calendar size={20} /></div>
                     <input 
                       type="date" 
                       value={selectedDate} 
                       onChange={(e) => setSelectedDate(e.target.value)}
                       className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-sm cursor-pointer"
                     />
                 </div>
             </div>
          </div>

          {/* Glass Table Container */}
          <div className="glass-card rounded-[2rem] shadow-xl overflow-hidden border border-white/60 relative">
             <div className="overflow-x-auto">
                <table className="w-full text-center text-sm whitespace-nowrap">
                   <thead>
                      <tr className="bg-white/50 text-xs font-bold text-gray-500 uppercase tracking-wider backdrop-blur-sm border-b border-gray-100">
                         <th className="p-6 text-left sticky left-0 bg-white/80 z-10 shadow-sm backdrop-blur-md">Nama Siswa</th>
                         <th className="p-6">Poin</th>
                         <th className="p-6 text-indigo-900/60">Subuh</th>
                         <th className="p-6 text-indigo-900/60">Dhuha</th>
                         <th className="p-6 text-indigo-900/60">Zuhur</th>
                         <th className="p-6 text-indigo-900/60">Asar</th>
                         <th className="p-6 text-indigo-900/60">Maghrib</th>
                         <th className="p-6 text-indigo-900/60">Isya</th>
                         <th className="p-6 text-amber-900/60">Tarawih</th>
                         <th className="p-6 text-fuchsia-900/60">Puasa</th>
                         <th className="p-6 text-teal-900/60">Kajian</th>
                         <th className="p-6 text-blue-900/60">Tadarus</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50/50">
                      {students.map(s => (
                         <tr key={s.id} className="hover:bg-indigo-50/30 transition duration-150">
                            <td className="p-5 text-left font-bold text-gray-700 sticky left-0 bg-white/60 backdrop-blur-md border-r border-gray-100 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">{s.name}</td>
                            <td className="p-5 font-black text-indigo-600 text-lg">{s.points}</td>
                            <td className="p-5">{getStatus(s, 'sholatSubuh')}</td>
                            <td className="p-5">{getStatus(s, 'dhuha')}</td>
                            <td className="p-5">{getStatus(s, 'sholatZuhur')}</td>
                            <td className="p-5">{getStatus(s, 'sholatAsar')}</td>
                            <td className="p-5">{getStatus(s, 'sholatMaghrib')}</td>
                            <td className="p-5">{getStatus(s, 'sholatIsya')}</td>
                            <td className="p-5">{getStatus(s, 'tarawih')}</td>
                            <td className="p-5">{getStatus(s, 'puasa')}</td>
                            <td className="p-5">{getDailyLogCount(s, 'kajian')}</td>
                            <td className="p-5">{getDailyLogCount(s, 'tadarus')}</td>
                         </tr>
                      ))}
                      {students.length === 0 && (
                         <tr><td colSpan={12} className="p-12 text-gray-400 italic">Tidak ada siswa di kelas ini.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
             <div className="p-4 bg-white/40 text-xs text-gray-500 border-t border-white/50 flex justify-center gap-6 backdrop-blur-md">
                <span className="flex items-center gap-2"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">J</span> Jamaah</span>
                <span className="flex items-center gap-2"><span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">S</span> Sendiri</span>
             </div>
          </div>
       </main>
    </div>
  );
};

export default TeacherView;