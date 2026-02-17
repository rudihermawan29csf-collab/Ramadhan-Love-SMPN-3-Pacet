import React, { useState, useEffect, useRef } from 'react';
import { StudentData, Material, Broadcast, CLASSES, AppSettings, PrayerTimes } from '../types';
import { StorageService } from '../services/storageService';
import { 
  Users, Book, Bell, Plus, Trash2, Edit2, Search, Download, Upload, 
  BarChart2, X, Filter, LayoutDashboard, LogOut, Eye, Clock, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Youtube, FileSpreadsheet, Monitor, Award, ExternalLink, ChevronLeft, ChevronRight, Settings, Sliders, AlertTriangle, FileText, MapPin, Lock, Type, Trophy, Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminViewProps {
  onLogout: () => void;
}

// Helper component to safely render complex HTML content
const ContentRenderer: React.FC<{ content: string }> = ({ content }) => {
  const isDynamic = content.includes('<script') || content.includes('<!DOCTYPE html>') || content.includes('<html');

  if (isDynamic) {
    return (
      <div className="w-full bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm mt-4">
         <iframe 
           srcDoc={content}
           className="w-full block bg-white"
           style={{ height: '800px', minHeight: '80vh', border: 'none' }}
           sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
           title="Content"
         />
      </div>
    );
  }

  return (
    <div 
        className="prose prose-sm max-w-none text-gray-600 mt-4 leading-relaxed bg-white/50 p-6 rounded-2xl border border-white/60 shadow-inner overflow-x-auto [&_iframe]:w-full [&_iframe]:min-h-[500px] [&_iframe]:md:min-h-[700px] [&_iframe]:rounded-xl"
        dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'materials' | 'quizzes' | 'monitoring' | 'ranking' | 'settings'>('dashboard');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  
  // UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Student Filters
  const [filterClass, setFilterClass] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Ranking Filters
  const [rankingFilterClass, setRankingFilterClass] = useState<string>('All');

  // Monitoring Filters
  const [monitorDate, setMonitorDate] = useState(new Date().toISOString().split('T')[0]);
  const [monitorClass, setMonitorClass] = useState<string>('VII A');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);

  // Material Filters
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('all');
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'student' | 'material' | 'quiz' | 'detail' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentData | null>(null);
  const [detailTab, setDetailTab] = useState<'journal' | 'kajian' | 'tadarus' | 'literasi'>('journal');

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controlled State for Material Preview
  const [materialForm, setMaterialForm] = useState({
    title: '',
    category: 'fiqih',
    content: '',
    youtubeUrl: '' 
  });

  useEffect(() => {
    refreshData();
    // Fetch Prayer Times for Admin Dashboard
    fetch(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=-7.67&longitude=112.54&method=20`)
      .then(res => res.json())
      .then(data => {
        setPrayerTimes(data.data.timings);
      })
      .catch(err => console.error("Prayer time fetch error", err));
  }, []);

  const refreshData = () => {
    setStudents(StorageService.getStudents());
    setMaterials(StorageService.getMaterials());
    setBroadcasts(StorageService.getBroadcasts());
    setSettings(StorageService.getSettings());
  };

  const openMaterialModal = (item: Material | null, type: 'material' | 'quiz') => {
    setEditingItem(item);
    if (item) {
      setMaterialForm({
        title: item.title,
        category: item.category,
        content: item.content,
        youtubeUrl: item.youtubeUrl || ''
      });
    } else {
      setMaterialForm({ 
          title: '', 
          category: type === 'quiz' ? 'quiz' : 'fiqih', 
          content: '', 
          youtubeUrl: '' 
      });
    }
    setModalType(type);
    setIsModalOpen(true);
  };

  const toggleMaterialAccordion = (id: string) => {
    setExpandedMaterialId(expandedMaterialId === id ? null : id);
  };

  const handleSaveStudent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newStudent: StudentData = {
      id: editingItem?.id || `stu_${Date.now()}`,
      name: formData.get('name') as string,
      className: formData.get('className') as string,
      nis: formData.get('nis') as string,
      nisn: formData.get('nisn') as string,
      points: editingItem?.points || 0,
      journal: editingItem?.journal || {},
      kajianLogs: editingItem?.kajianLogs || [],
      tadarusLogs: editingItem?.tadarusLogs || [],
      readLogs: editingItem?.readLogs || []
    };
    StorageService.saveStudent(newStudent);
    refreshData();
    setIsModalOpen(false);
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('Yakin ingin menghapus data siswa?')) {
      StorageService.deleteStudent(id);
      refreshData();
    }
  };

  const handleDeleteMaterial = (id: string) => {
    if(window.confirm('Yakin ingin menghapus materi/kuis ini?')) {
        StorageService.deleteMaterial(id);
        refreshData();
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSaveMaterial = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newMat: Material = {
      id: editingItem?.id || `mat_${Date.now()}`,
      title: materialForm.title,
      category: modalType === 'quiz' ? 'quiz' : materialForm.category.toLowerCase(), // Ensure lowercase for consistency
      content: materialForm.content,
      youtubeUrl: materialForm.youtubeUrl, // Save URL directly
      createdAt: editingItem?.createdAt || new Date().toISOString()
    };
    StorageService.saveMaterial(newMat);
    refreshData();
    setIsModalOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const newSettings: AppSettings = {
          schoolName: formData.get('schoolName') as string,
          ramadhanYear: formData.get('ramadhanYear') as string,
          gregorianYear: formData.get('gregorianYear') as string,
          loginTitle: formData.get('loginTitle') as string,
          adminPassword: formData.get('adminPassword') as string,
          teacherPassword: formData.get('teacherPassword') as string,
          copyrightText: formData.get('copyrightText') as string,
      };
      setSettings(newSettings); // Update local state immediately
      StorageService.saveSettings(newSettings);
      alert('Pengaturan berhasil disimpan!');
  };

  const handleDownloadTemplate = () => {
    const headers = [
      { "Nama Lengkap": "", "Kelas": "VII A", "NIS": "", "NISN": "" },
      { "Nama Lengkap": "Contoh Siswa", "Kelas": "VII B", "NIS": "12345", "NISN": "0012345678" }
    ];
    
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Data_Siswa.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let addedCount = 0;
        const newStudents: StudentData[] = [];

        data.forEach((row: any) => {
           if (row["Nama Lengkap"] && row["Kelas"] && row["Nama Lengkap"] !== "Contoh Siswa") {
             newStudents.push({
               id: `stu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
               name: row["Nama Lengkap"],
               className: row["Kelas"],
               nis: row["NIS"] ? String(row["NIS"]) : "-",
               nisn: row["NISN"] ? String(row["NISN"]) : "-",
               points: 0,
               journal: {},
               kajianLogs: [],
               tadarusLogs: [],
               readLogs: []
             });
             addedCount++;
           }
        });

        if (addedCount > 0) {
            StorageService.importStudents(newStudents);
            refreshData();
            alert(`Berhasil mengimpor ${addedCount} data siswa. \n\nData tersimpan di perangkat Anda dan sedang dikirim ke Google Spreadsheet satu per satu di latar belakang. Mohon jangan tutup aplikasi selama beberapa saat.`);
        } else {
            alert("Tidak ada data siswa valid yang ditemukan di file Excel.");
        }

      } catch (error) {
        console.error("Excel import error:", error);
        alert("Gagal membaca file Excel. Pastikan format sesuai template.");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleExportJSON = () => {
     const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(students));
     const downloadAnchorNode = document.createElement('a');
     downloadAnchorNode.setAttribute("href", dataStr);
     downloadAnchorNode.setAttribute("download", "students.json");
     document.body.appendChild(downloadAnchorNode);
     downloadAnchorNode.click();
     downloadAnchorNode.remove();
  };

  const getMonitoringData = () => {
      const filtered = students.filter(s => s.className === monitorClass);
      if (showInactiveOnly) {
          return filtered.filter(s => s.points === 0 && Object.keys(s.journal).length === 0);
      }
      return filtered;
  };

  const handleExportMonitoringExcel = () => {
      const dataToExport = getMonitoringData().map(s => {
          const journal = s.journal[monitorDate] || {};
          // @ts-ignore
          const getStatus = (key) => journal[key]?.completed ? 'V' : '-';
          
          return {
              "Nama": s.name,
              "Kelas": s.className,
              "Total Poin": s.points,
              "Literasi (Materi/Kuis)": s.readLogs?.length || 0,
              "Subuh": getStatus('sholatSubuh'),
              "Zuhur": getStatus('sholatZuhur'),
              "Asar": getStatus('sholatAsar'),
              "Maghrib": getStatus('sholatMaghrib'),
              "Isya": getStatus('sholatIsya'),
              "Tarawih": getStatus('tarawih'),
              "Puasa": getStatus('puasa'),
              "Dhuha": getStatus('dhuha'),
              "Jml Kajian": s.kajianLogs.filter(k => k.date.startsWith(monitorDate)).length,
              "Jml Tadarus": s.tadarusLogs.filter(t => t.date.startsWith(monitorDate)).length
          };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Monitoring ${monitorDate}`);
      XLSX.writeFile(wb, `Monitoring_${monitorClass}_${monitorDate}.xlsx`);
  };

  const handleExportMonitoringPDF = () => {
      const doc = new jsPDF();
      
      doc.text(`Monitoring Jurnal ${monitorClass}`, 14, 15);
      doc.text(`Tanggal: ${monitorDate}`, 14, 22);
      
      const tableColumn = ["Nama", "Poin", "Literasi", "S", "Z", "A", "M", "I", "T", "P", "D", "Kajian", "Tadarus"];
      const tableRows: any[] = [];

      getMonitoringData().forEach(s => {
          const journal = s.journal[monitorDate] || {};
          // @ts-ignore
          const getStatus = (key) => journal[key]?.completed ? 'V' : '-';
          
          const row = [
              s.name,
              s.points,
              s.readLogs?.length || 0,
              getStatus('sholatSubuh'),
              getStatus('sholatZuhur'),
              getStatus('sholatAsar'),
              getStatus('sholatMaghrib'),
              getStatus('sholatIsya'),
              getStatus('tarawih'),
              getStatus('puasa'),
              getStatus('dhuha'),
              s.kajianLogs.filter(k => k.date.startsWith(monitorDate)).length,
              s.tadarusLogs.filter(t => t.date.startsWith(monitorDate)).length
          ];
          tableRows.push(row);
      });

      // Use modern autoTable usage
      autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 30,
          theme: 'grid',
          styles: { fontSize: 7 }, // Smaller font to fit more columns
          headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`Monitoring_${monitorClass}_${monitorDate}.pdf`);
  };

  const filteredStudents = students.filter(s => {
    const matchesClass = filterClass === 'All' || s.className === filterClass;
    const matchesName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesName;
  });

  const getChartData = () => {
    const data: any[] = [];
    CLASSES.forEach(cls => {
      data.push({
        name: cls,
        count: students.filter(s => s.className === cls).length
      });
    });
    return data;
  };

  const getMonitorStatus = (student: StudentData, type: 'sholatSubuh' | 'sholatZuhur' | 'sholatAsar' | 'sholatMaghrib' | 'sholatIsya' | 'puasa' | 'tarawih' | 'dhuha') => {
    const journal = student.journal[monitorDate];
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

  const getDetailButton = (student: StudentData, type: 'kajian' | 'tadarus') => {
      const logs = type === 'kajian' ? student.kajianLogs : student.tadarusLogs;
      const filteredLogs = logs.filter((log: any) => log.date.startsWith(monitorDate));
      
      if (filteredLogs.length === 0) return <span className="text-gray-300">-</span>;
      
      return (
          <button 
            onClick={() => { setSelectedStudentDetail(student); setDetailTab(type); setModalType('detail'); setIsModalOpen(true); }}
            className="font-bold text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100"
          >
              {filteredLogs.length} Detail
          </button>
      );
  };

  const availableCategories = Array.from(new Set([
      'fiqih', 'zakat', 'qa', 'story', ...materials.filter(m => m.category !== 'quiz').map(m => m.category)
  ]));

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      {/* ... Dashboard content ... */}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
           <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-400/30 rounded-full blur-2xl group-hover:scale-150 transition duration-700"></div>
           <div className="relative z-10">
             <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Siswa</div>
             <div className="text-4xl font-black text-gray-800 tracking-tight">{students.length}</div>
             <div className="mt-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg w-fit border border-blue-100">TERDAFTAR</div>
           </div>
        </div>
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
           <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-400/30 rounded-full blur-2xl group-hover:scale-150 transition duration-700"></div>
           <div className="relative z-10">
             <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Materi</div>
             <div className="text-4xl font-black text-gray-800 tracking-tight">{materials.length}</div>
             <div className="mt-2 text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded-lg w-fit border border-purple-100">PUBLISHED</div>
           </div>
        </div>
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
           <div className="absolute -right-10 -top-10 w-32 h-32 bg-pink-400/30 rounded-full blur-2xl group-hover:scale-150 transition duration-700"></div>
           <div className="relative z-10">
             <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Broadcast</div>
             <div className="text-4xl font-black text-gray-800 tracking-tight">{broadcasts.length}</div>
             <div className="mt-2 text-[10px] text-pink-600 font-bold bg-pink-50 px-2 py-1 rounded-lg w-fit border border-pink-100">AKTIF</div>
           </div>
        </div>
      </div>
      
      {/* ... Charts ... */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl shadow-sm h-96">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center">
             <BarChart2 size={20} className="mr-2 text-indigo-500" /> Distribusi Siswa
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
              <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
              <Bar dataKey="count" fill="url(#colorUv)" radius={[6, 6, 0, 0]} barSize={32}>
                 <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Broadcast Manager */}
        <div className="glass-card p-6 rounded-3xl shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center">
            <Bell size={20} className="mr-2 text-pink-500" /> Broadcast
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-4">
             {broadcasts.map(b => (
               <div key={b.id} className="bg-white/40 border border-white p-3 rounded-xl shadow-sm hover:bg-white/60 transition">
                  <p className="text-sm text-gray-700 font-medium">{b.message}</p>
                  <span className="text-[10px] text-gray-400 mt-1 block uppercase tracking-wide">{new Date(b.createdAt).toLocaleDateString()}</span>
               </div>
             ))}
          </div>
          <div className="mt-auto">
            <input type="text" placeholder="Tulis pengumuman..." className="w-full border border-gray-200 bg-white/50 rounded-xl px-4 py-3 text-sm mb-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none placeholder-gray-400" id="broadcastInput" />
            <button 
               onClick={() => {
                  const input = document.getElementById('broadcastInput') as HTMLInputElement;
                  if(input.value) {
                    StorageService.saveBroadcast({
                      id: `bc_${Date.now()}`,
                      message: input.value,
                      createdAt: new Date().toISOString(),
                      active: true
                    });
                    input.value = '';
                    refreshData();
                  }
               }}
               className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition transform hover:-translate-y-0.5 active:scale-95 text-sm"
             >
               Kirim Pesan
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-3xl border border-white/60 shadow-sm backdrop-blur-md">
           <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                  <input 
                    placeholder="Cari Siswa..." 
                    className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               <select 
                  className="bg-white border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
               >
                  <option value="All">Semua Kelas</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
           </div>
           
           <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
               <button onClick={() => { setEditingItem(null); setModalType('student'); setIsModalOpen(true); }} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 whitespace-nowrap">
                   <Plus size={18} /> Tambah
               </button>
               <button onClick={handleDownloadTemplate} className="flex items-center gap-2 bg-white text-gray-600 border border-gray-200 px-4 py-3 rounded-2xl font-bold hover:bg-gray-50 transition whitespace-nowrap">
                   <Download size={18} /> Template
               </button>
               <label className="flex items-center gap-2 bg-white text-gray-600 border border-gray-200 px-4 py-3 rounded-2xl font-bold hover:bg-gray-50 transition cursor-pointer whitespace-nowrap">
                   <Upload size={18} /> Import
                   <input type="file" hidden accept=".xlsx" onChange={handleImportExcel} ref={fileInputRef} />
               </label>
               <button onClick={handleExportJSON} className="flex items-center gap-2 bg-white text-gray-600 border border-gray-200 px-4 py-3 rounded-2xl font-bold hover:bg-gray-50 transition whitespace-nowrap">
                   <Download size={18} /> JSON
               </button>
           </div>
       </div>

       <div className="glass-card rounded-[2rem] shadow-sm overflow-hidden border border-white/60">
           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                 <thead className="bg-gray-50/50 text-gray-500 uppercase font-bold text-xs tracking-wider">
                    <tr>
                       <th className="p-5">Nama Siswa</th>
                       <th className="p-5">Kelas</th>
                       <th className="p-5">NIS / NISN</th>
                       <th className="p-5">Poin</th>
                       <th className="p-5 text-center">Aksi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map(s => (
                        <tr key={s.id} className="hover:bg-white/50 transition">
                           <td className="p-5 font-bold text-gray-700">{s.name}</td>
                           <td className="p-5">
                              <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-bold">{s.className}</span>
                           </td>
                           <td className="p-5 text-gray-500">{s.nis} <span className="text-gray-300">/</span> {s.nisn}</td>
                           <td className="p-5 font-black text-indigo-600">{s.points}</td>
                           <td className="p-5 flex justify-center gap-2">
                               <button onClick={() => { setEditingItem(s); setModalType('student'); setIsModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition"><Edit2 size={16}/></button>
                               <button onClick={() => handleDeleteStudent(s.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"><Trash2 size={16}/></button>
                           </td>
                        </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Tidak ada data siswa ditemukan.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
       </div>
    </div>
  );

  const renderMaterialsOrQuizzes = (type: 'material' | 'quiz') => {
      const items = materials
          .filter(m => type === 'quiz' ? m.category === 'quiz' : m.category !== 'quiz')
          .filter(m => materialCategoryFilter === 'all' || m.category === materialCategoryFilter)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const categories = ['all', ...Array.from(new Set(materials.filter(m => m.category !== 'quiz').map(m => m.category)))];

      return (
        <div className="space-y-6 animate-fade-in">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-3xl border border-white/60 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-4 overflow-x-auto w-full md:w-auto pb-1">
                    {type === 'material' && categories.map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => setMaterialCategoryFilter(cat)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition ${materialCategoryFilter === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                    {type === 'quiz' && <div className="font-bold text-gray-500 px-2">Daftar Kuis & Tantangan</div>}
                </div>
                <button onClick={() => openMaterialModal(null, type)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 w-full md:w-auto justify-center">
                   <Plus size={18} /> Tambah {type === 'quiz' ? 'Kuis' : 'Materi'}
                </button>
           </div>

           <div className="space-y-4">
               {items.map(item => (
                   <div key={item.id} className="glass-card rounded-[2rem] border border-white/60 overflow-hidden group hover:shadow-md transition">
                       <div 
                         onClick={() => toggleMaterialAccordion(item.id)}
                         className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/40"
                       >
                           <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === 'quiz' ? 'bg-amber-100 text-amber-600' : 'bg-fuchsia-100 text-fuchsia-600'}`}>
                                   {type === 'quiz' ? <Award size={24} /> : <Book size={24} />}
                               </div>
                               <div>
                                   <div className="flex items-center gap-2 mb-1">
                                       <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{item.category}</span>
                                       <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                                   </div>
                                   <h3 className="font-bold text-gray-800 text-lg">{item.title}</h3>
                               </div>
                           </div>
                           <div className="flex items-center gap-3">
                               <button onClick={(e) => { e.stopPropagation(); openMaterialModal(item, type); }} className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition"><Edit2 size={18}/></button>
                               <button onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(item.id); }} className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition"><Trash2 size={18}/></button>
                               <ChevronDown size={20} className={`text-gray-400 transition-transform ${expandedMaterialId === item.id ? 'rotate-180' : ''}`} />
                           </div>
                       </div>
                       
                       {expandedMaterialId === item.id && (
                           <div className="p-6 border-t border-gray-100 bg-white/30">
                               {item.youtubeUrl && (
                                   <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
                                       <Youtube size={20} />
                                       <span className="text-sm font-bold truncate">{item.youtubeUrl}</span>
                                       <a href={item.youtubeUrl} target="_blank" rel="noreferrer" className="ml-auto"><ExternalLink size={16}/></a>
                                   </div>
                               )}
                               <div className="prose prose-sm max-w-none text-gray-600">
                                   <ContentRenderer content={item.content} />
                               </div>
                           </div>
                       )}
                   </div>
               ))}
               {items.length === 0 && (
                   <div className="p-12 text-center text-gray-400 bg-white/30 rounded-[2rem] border-2 border-dashed border-gray-200">
                       Belum ada {type === 'quiz' ? 'kuis' : 'materi'} yang ditambahkan.
                   </div>
               )}
           </div>
        </div>
      );
  };

  const renderMonitoring = () => {
      const filtered = getMonitoringData();
      
      return (
          <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white/50 p-6 rounded-[2rem] border border-white/60 shadow-sm backdrop-blur-md">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full xl:w-auto">
                        <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 border border-white/60">
                            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><Calendar size={18} /></div>
                            <div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tanggal</div>
                                <input 
                                type="date" 
                                value={monitorDate} 
                                onChange={(e) => setMonitorDate(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-sm p-0 w-32 cursor-pointer"
                                />
                            </div>
                        </div>
                        <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 border border-white/60">
                            <div className="bg-purple-100 p-2 rounded-xl text-purple-600"><Users size={18} /></div>
                            <div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Kelas</div>
                                <select 
                                    className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 text-sm p-0 w-24 cursor-pointer"
                                    value={monitorClass}
                                    onChange={(e) => setMonitorClass(e.target.value)}
                                >
                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 border border-white/60">
                             <div className="bg-amber-100 p-2 rounded-xl text-amber-600"><AlertTriangle size={18} /></div>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="checkbox" checked={showInactiveOnly} onChange={e => setShowInactiveOnly(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                 <span className="text-xs font-bold text-gray-600">Hanya yang belum lapor</span>
                             </label>
                        </div>
                   </div>

                   <div className="flex gap-3 w-full xl:w-auto">
                        <button onClick={handleExportMonitoringExcel} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-100 transition border border-emerald-100 shadow-sm">
                            <FileSpreadsheet size={18}/> Excel
                        </button>
                        <button onClick={handleExportMonitoringPDF} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-600 px-5 py-3 rounded-2xl text-sm font-bold hover:bg-red-100 transition border border-red-100 shadow-sm">
                            <FileText size={18}/> PDF
                        </button>
                   </div>
              </div>

              <div className="glass-card rounded-[2rem] shadow-xl overflow-hidden border border-white/60 relative">
                  <div className="overflow-x-auto">
                      <table className="w-full text-center text-sm whitespace-nowrap">
                        <thead>
                            <tr className="bg-white/50 text-xs font-bold text-gray-500 uppercase tracking-wider backdrop-blur-sm border-b border-gray-100">
                                <th className="p-5 text-left sticky left-0 bg-white/80 z-10 shadow-sm">Nama Siswa</th>
                                <th className="p-5">Poin</th>
                                <th className="p-5 text-fuchsia-900/60">Literasi</th>
                                <th className="p-5 text-indigo-900/60">Subuh</th>
                                <th className="p-5 text-indigo-900/60">Zuhur</th>
                                <th className="p-5 text-indigo-900/60">Asar</th>
                                <th className="p-5 text-indigo-900/60">Maghrib</th>
                                <th className="p-5 text-indigo-900/60">Isya</th>
                                <th className="p-5 text-purple-900/60">Tarawih</th>
                                <th className="p-5 text-amber-900/60">Puasa</th>
                                <th className="p-5 text-blue-900/60">Dhuha</th>
                                <th className="p-5 text-fuchsia-900/60">Kajian</th>
                                <th className="p-5 text-teal-900/60">Tadarus</th>
                                <th className="p-5">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50/50">
                            {filtered.map(s => (
                                <tr key={s.id} className="hover:bg-indigo-50/30 transition">
                                    <td className="p-5 text-left font-bold text-gray-700 sticky left-0 bg-white/60 backdrop-blur-md border-r border-gray-100">{s.name}</td>
                                    <td className="p-5 font-black text-indigo-600">{s.points}</td>
                                    <td className="p-5 font-bold text-fuchsia-600">{s.readLogs?.length || 0}</td>
                                    <td className="p-5">{getMonitorStatus(s, 'sholatSubuh')}</td>
                                    <td className="p-5">{getMonitorStatus(s, 'sholatZuhur')}</td>
                                    <td className="p-5">{getMonitorStatus(s, 'sholatAsar')}</td>
                                    <td className="p-5">{getMonitorStatus(s, 'sholatMaghrib')}</td>
                                    <td className="p-5">{getMonitorStatus(s, 'sholatIsya')}</td>
                                    <td className="p-5">{getMonitorStatus(s, 'tarawih')}</td>
                                    <td className="p-5">{getMonitorStatus(s, 'puasa')}</td>
                                    <td className="p-5">{getMonitorStatus(s, 'dhuha')}</td>
                                    <td className="p-5">{getDetailButton(s, 'kajian')}</td>
                                    <td className="p-5">{getDetailButton(s, 'tadarus')}</td>
                                    <td className="p-5">
                                        <button onClick={() => { setSelectedStudentDetail(s); setDetailTab('journal'); setModalType('detail'); setIsModalOpen(true); }} className="bg-gray-100 p-2 rounded-xl text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 transition">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={14} className="p-12 text-center text-gray-400 italic">Data tidak ditemukan.</td></tr>
                            )}
                        </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  const renderSettings = () => {
      return (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                   <div className="relative z-10">
                       <h2 className="text-3xl font-bold mb-2 flex items-center gap-3"><Settings size={32}/> Pengaturan Aplikasi</h2>
                       <p className="text-gray-400">Konfigurasi data sekolah dan keamanan.</p>
                   </div>
                   <Settings size={200} className="absolute -right-10 -bottom-10 text-white opacity-5 rotate-45" />
              </div>

              <div className="glass-card p-8 rounded-[2rem] border border-white/60 shadow-sm">
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-4">
                               <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2"><MapPin size={18} className="text-indigo-500"/> Informasi Sekolah</h3>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Sekolah</label>
                                   <input name="schoolName" defaultValue={settings.schoolName} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition" />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Judul Login</label>
                                   <input name="loginTitle" defaultValue={settings.loginTitle} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition" />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Teks Copyright</label>
                                   <input name="copyrightText" defaultValue={settings.copyrightText} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition" />
                               </div>
                           </div>

                           <div className="space-y-4">
                               <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2"><Calendar size={18} className="text-pink-500"/> Periode</h3>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tahun Hijriah</label>
                                   <input name="ramadhanYear" defaultValue={settings.ramadhanYear} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition" />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tahun Masehi</label>
                                   <input name="gregorianYear" defaultValue={settings.gregorianYear} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition" />
                               </div>
                           </div>

                           <div className="space-y-4 md:col-span-2">
                               <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2"><Lock size={18} className="text-red-500"/> Keamanan</h3>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <div>
                                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password Admin</label>
                                       <div className="relative">
                                           <input type="text" name="adminPassword" defaultValue={settings.adminPassword} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition" />
                                           <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
                                       </div>
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password Guru</label>
                                       <div className="relative">
                                           <input type="text" name="teacherPassword" defaultValue={settings.teacherPassword} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition" />
                                           <Users size={16} className="absolute left-3 top-3.5 text-gray-400" />
                                       </div>
                                   </div>
                               </div>
                           </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                           <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:shadow-indigo-500/30 transition transform hover:-translate-y-1 active:scale-95">
                               Simpan Perubahan
                           </button>
                      </div>
                  </form>
              </div>
          </div>
      );
  };

  const renderRanking = () => {
    // Gunakan state 'students' bukan StorageService.getStudents() agar reaktif
    const filteredRanking = students.filter(s => rankingFilterClass === 'All' || s.className === rankingFilterClass)
        .sort((a, b) => b.points - a.points);
    
    // Top 50 of filtered results
    const sorted = filteredRanking.slice(0, 50);

    return (
       <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative z-10">
                  <h2 className="text-3xl font-black mb-1">Leaderboard</h2>
                  <p className="text-amber-100 font-medium opacity-90">Peringkat Siswa Berdasarkan Poin</p>
              </div>
              <div className="relative z-10">
                   <select 
                      value={rankingFilterClass} 
                      onChange={(e) => setRankingFilterClass(e.target.value)}
                      className="bg-white/20 border border-white/40 text-white rounded-xl px-4 py-2 font-bold focus:outline-none focus:bg-white/30 backdrop-blur-md placeholder-white"
                   >
                       <option value="All" className="text-gray-800">Semua Kelas</option>
                       {CLASSES.map(c => <option key={c} value={c} className="text-gray-800">{c}</option>)}
                   </select>
              </div>
              <Trophy size={80} className="absolute right-0 top-0 text-amber-200 opacity-30 transform translate-x-4 -translate-y-4" />
          </div>

          <div className="glass-card rounded-[2rem] shadow-sm overflow-hidden border border-white/60">
              <div className="bg-white/50 p-5 border-b border-gray-100 font-bold text-gray-800 backdrop-blur-sm">
                 Peringkat Siswa {rankingFilterClass !== 'All' ? `Kelas ${rankingFilterClass}` : ''}
              </div>
              <div className="divide-y divide-gray-100/50">
                 <div className="hidden md:flex bg-gray-50/50 text-xs text-gray-500 font-bold uppercase tracking-wider p-4">
                     <div className="w-12 text-center">#</div>
                     <div className="flex-1 px-4">Nama Siswa</div>
                     <div className="w-24">Kelas</div>
                     <div className="w-32">NIS / NISN</div>
                     <div className="w-24 text-right">Poin</div>
                 </div>
                 {sorted.map((s, idx) => (
                     <div 
                        key={s.id} 
                        onClick={() => { 
                            setSelectedStudentDetail(s); 
                            setDetailTab('journal'); 
                            setModalType('detail'); 
                            setIsModalOpen(true); 
                        }}
                        className="p-4 flex items-center gap-4 hover:bg-white/60 transition cursor-pointer group"
                     >
                         <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm flex-shrink-0 ${idx < 3 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>
                             {idx + 1}
                         </div>
                         <div className="flex-1 px-2">
                             <div className="font-bold text-gray-700 group-hover:text-indigo-600 transition">{s.name}</div>
                             <div className="md:hidden text-xs text-gray-400">{s.className} • NIS: {s.nis}</div>
                         </div>
                         <div className="hidden md:block w-24 text-sm text-gray-600">{s.className}</div>
                         <div className="hidden md:block w-32 text-xs text-gray-500">{s.nis} / {s.nisn}</div>
                         <div className="font-black text-indigo-600 w-24 text-right">{s.points}</div>
                     </div>
                 ))}
                 {sorted.length === 0 && (
                     <div className="p-8 text-center text-gray-400 italic">Belum ada data siswa untuk ditampilkan.</div>
                 )}
              </div>
          </div>
       </div>
    );
 };

  return (
    <div className={`min-h-screen font-sans text-gray-800 transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-24' : 'md:pl-80'} pb-24 md:pb-0`}>
       
       {/* Sidebar */}
       <aside className={`hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 p-6 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-24' : 'w-72'}`}>
           <div className="glass-panel h-full rounded-[2.5rem] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden transition-all duration-300">
               <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-indigo-500/10 to-transparent"></div>
               
               <div className={`p-8 relative z-10 transition-all duration-300 ${isSidebarCollapsed ? 'px-4' : ''}`}>
                   <div className={`flex items-center gap-4 mb-2 ${isSidebarCollapsed ? 'justify-center flex-col' : ''}`}>
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center p-2 transform hover:scale-105 transition">
                            <img src="https://image2url.com/r2/default/images/1769001049680-d981c280-6340-4989-8563-7b08134c189a.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="animate-fade-in">
                               <h1 className="font-bold text-xl leading-none text-indigo-900">Admin</h1>
                               <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Panel Kontrol</p>
                            </div>
                        )}
                   </div>
               </div>

               <nav className="flex-1 px-4 space-y-2 relative z-10 mt-2 overflow-y-auto custom-scrollbar">
                   {[
                       { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                       { id: 'students', icon: Users, label: 'Data Siswa' },
                       { id: 'monitoring', icon: Monitor, label: 'Monitoring' },
                       { id: 'materials', icon: Book, label: 'Materi' },
                       { id: 'quizzes', icon: Award, label: 'Kuis' },
                       { id: 'ranking', icon: BarChart2, label: 'Ranking' },
                       { id: 'settings', icon: Settings, label: 'Pengaturan' },
                   ].map(item => (
                       <button 
                         key={item.id}
                         onClick={() => setActiveTab(item.id as any)}
                         title={isSidebarCollapsed ? item.label : ''}
                         className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 group ${
                            activeTab === item.id 
                            ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100 scale-100' 
                            : 'text-gray-500 hover:bg-white/40 hover:text-indigo-600'
                         }`}
                       >
                           <div className="flex items-center">
                               <item.icon size={20} className={`${isSidebarCollapsed ? '' : 'mr-3'} ${activeTab === item.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500 transition'}`} /> 
                               {!isSidebarCollapsed && item.label}
                           </div>
                       </button>
                   ))}
               </nav>

               <div className="p-4 relative z-10">
                   <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-full flex items-center justify-center p-2 mb-2 text-gray-400 hover:text-indigo-500 hover:bg-white/50 rounded-xl transition">
                        {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                   </button>
                   <button onClick={onLogout} title="Logout" className={`w-full flex items-center justify-center ${isSidebarCollapsed ? 'px-0' : 'px-4'} py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition border border-transparent hover:border-red-100 group`}>
                      <LogOut size={18} className={`${isSidebarCollapsed ? '' : 'mr-2'} group-hover:-translate-x-1 transition`}/> {!isSidebarCollapsed && 'Logout'}
                   </button>
               </div>
           </div>
       </aside>

       <main className="p-4 md:p-8 w-full max-w-[1920px] mx-auto transition-all duration-300">
           {/* Mobile Header */}
           <div className="md:hidden flex justify-between items-center mb-6 glass-card px-5 py-4 rounded-[2rem]">
               <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-gray-100">
                       <img src="https://image2url.com/r2/default/images/1769001049680-d981c280-6340-4989-8563-7b08134c189a.png" alt="Logo" className="w-full h-full object-contain" />
                   </div>
                   <div>
                       <h1 className="font-bold text-gray-800 leading-none">Admin Panel</h1>
                       <p className="text-[10px] text-gray-500 uppercase tracking-widest">{settings.schoolName}</p>
                   </div>
               </div>
               <button onClick={onLogout} className="text-red-500 bg-red-50 p-3 rounded-full hover:bg-red-100 transition"><LogOut size={20} /></button>
           </div>

           {activeTab === 'dashboard' && renderDashboard()}
           {activeTab === 'students' && renderStudents()}
           {activeTab === 'materials' && renderMaterialsOrQuizzes('material')}
           {activeTab === 'quizzes' && renderMaterialsOrQuizzes('quiz')}
           {activeTab === 'monitoring' && renderMonitoring()}
           {activeTab === 'ranking' && renderRanking()}
           {activeTab === 'settings' && renderSettings()}
       </main>

       {/* Mobile Bottom Nav */}
       <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
            <div className="glass-panel rounded-[2rem] shadow-2xl flex justify-around p-3 items-center bg-white/80 backdrop-blur-xl border border-white/50 overflow-x-auto">
                {[
                    { id: 'dashboard', icon: LayoutDashboard },
                    { id: 'students', icon: Users },
                    { id: 'materials', icon: Book },
                    { id: 'monitoring', icon: Monitor },
                    { id: 'settings', icon: Settings }
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)} 
                        className={`relative p-3.5 rounded-2xl transition-all duration-300 min-w-[50px] flex justify-center ${
                            activeTab === item.id 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 -translate-y-6 scale-110' 
                            : 'text-gray-400 hover:text-indigo-600'
                        }`}
                    >
                        <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                    </button>
                ))}
            </div>
       </div>

       {/* MODALS */}
       {isModalOpen && (
           <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-200">
               <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-8 w-full max-w-2xl border border-white max-h-[90vh] overflow-y-auto custom-scrollbar">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-2xl font-bold text-gray-800">
                           {modalType === 'student' && (editingItem ? 'Edit Siswa' : 'Tambah Siswa')}
                           {modalType === 'material' && (editingItem ? 'Edit Materi' : 'Tambah Materi')}
                           {modalType === 'quiz' && (editingItem ? 'Edit Kuis' : 'Tambah Kuis')}
                           {modalType === 'detail' && selectedStudentDetail ? `Detail ${selectedStudentDetail.name}` : 'Detail Aktivitas'}
                       </h3>
                       <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
                   </div>

                   {/* Student Form */}
                   {modalType === 'student' && (
                       <form onSubmit={handleSaveStudent} className="space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-sm font-bold text-gray-500 mb-2">Nama Lengkap</label>
                                   <input name="name" defaultValue={editingItem?.name} className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none" required />
                               </div>
                               <div>
                                   <label className="block text-sm font-bold text-gray-500 mb-2">Kelas</label>
                                   <select name="className" defaultValue={editingItem?.className || 'VII A'} className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none">
                                       {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-sm font-bold text-gray-500 mb-2">NIS</label>
                                   <input name="nis" defaultValue={editingItem?.nis} className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                               </div>
                               <div>
                                   <label className="block text-sm font-bold text-gray-500 mb-2">NISN</label>
                                   <input name="nisn" defaultValue={editingItem?.nisn} className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                               </div>
                           </div>
                           <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition mt-4">Simpan Data Siswa</button>
                       </form>
                   )}

                   {/* Material/Quiz Form */}
                   {(modalType === 'material' || modalType === 'quiz') && (
                       <form onSubmit={handleSaveMaterial} className="space-y-4">
                           <div>
                               <label className="block text-sm font-bold text-gray-500 mb-2">Judul</label>
                               <input 
                                   value={materialForm.title} 
                                   onChange={e => setMaterialForm({...materialForm, title: e.target.value})} 
                                   className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none" required 
                               />
                           </div>
                           {modalType === 'material' && (
                               <div>
                                   <label className="block text-sm font-bold text-gray-500 mb-2">Kategori</label>
                                   <div className="flex gap-2 mb-2 flex-wrap">
                                        {availableCategories.map(cat => (
                                            <button 
                                                type="button" 
                                                key={cat}
                                                onClick={() => setMaterialForm({...materialForm, category: cat})}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${materialForm.category === cat ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                   </div>
                                   <input 
                                       placeholder="Atau ketik kategori baru..."
                                       value={materialForm.category} 
                                       onChange={e => setMaterialForm({...materialForm, category: e.target.value})} 
                                       className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none" required 
                                   />
                               </div>
                           )}
                           {modalType === 'material' && (
                               <div>
                                   <label className="block text-sm font-bold text-gray-500 mb-2">Link YouTube (Opsional)</label>
                                   <input 
                                       value={materialForm.youtubeUrl} 
                                       onChange={e => setMaterialForm({...materialForm, youtubeUrl: e.target.value})} 
                                       className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none" 
                                       placeholder="https://youtube.com/..."
                                   />
                               </div>
                           )}
                           <div>
                               <label className="block text-sm font-bold text-gray-500 mb-2">Konten (HTML Support)</label>
                               <textarea 
                                   value={materialForm.content} 
                                   onChange={e => setMaterialForm({...materialForm, content: e.target.value})} 
                                   className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 focus:outline-none h-64 font-mono text-sm" required 
                                   placeholder="Tulis konten di sini. Bisa menggunakan tag HTML seperti <b>bold</b>, <br> baris baru, dll."
                               ></textarea>
                           </div>
                           <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition mt-4">Simpan {modalType === 'quiz' ? 'Kuis' : 'Materi'}</button>
                       </form>
                   )}

                   {/* Detail Activity Modal */}
                   {modalType === 'detail' && selectedStudentDetail && (
                       <div>
                           <div className="flex bg-gray-100 rounded-xl p-1 mb-4 overflow-x-auto">
                               {['journal', 'kajian', 'tadarus', 'literasi'].map(tab => (
                                   <button 
                                       key={tab}
                                       onClick={() => setDetailTab(tab as any)} 
                                       className={`flex-1 py-2 px-2 rounded-lg text-xs md:text-sm font-bold capitalize transition whitespace-nowrap ${detailTab === tab ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                   >
                                       {tab === 'literasi' ? 'Materi & Kuis' : tab}
                                   </button>
                               ))}
                           </div>
                           
                           <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                               {detailTab === 'journal' && (
                                   <div className="grid grid-cols-2 gap-3">
                                       {/* Summary Cards */}
                                       <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                           <div className="text-xs text-indigo-500 font-bold uppercase">Total Poin</div>
                                           <div className="text-2xl font-black text-indigo-700">{selectedStudentDetail.points}</div>
                                       </div>
                                       <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                                           <div className="text-xs text-green-500 font-bold uppercase">Sholat Wajib</div>
                                           <div className="text-2xl font-black text-green-700">
                                               {Object.values(selectedStudentDetail.journal).reduce((acc, day) => {
                                                   // Count prayers
                                                   let count = 0;
                                                   // @ts-ignore
                                                   if(day.sholatSubuh?.completed) count++;
                                                   // @ts-ignore
                                                   if(day.sholatZuhur?.completed) count++;
                                                   // @ts-ignore
                                                   if(day.sholatAsar?.completed) count++;
                                                   // @ts-ignore
                                                   if(day.sholatMaghrib?.completed) count++;
                                                   // @ts-ignore
                                                   if(day.sholatIsya?.completed) count++;
                                                   return acc + count;
                                               }, 0)}
                                           </div>
                                       </div>
                                       <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                           <div className="text-xs text-amber-500 font-bold uppercase">Puasa</div>
                                           <div className="text-2xl font-black text-amber-700">
                                               {/* @ts-ignore */}
                                               {Object.values(selectedStudentDetail.journal).filter(d => d.puasa?.completed).length}
                                           </div>
                                       </div>
                                       <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                           <div className="text-xs text-purple-500 font-bold uppercase">Tarawih</div>
                                           <div className="text-2xl font-black text-purple-700">
                                               {/* @ts-ignore */}
                                               {Object.values(selectedStudentDetail.journal).filter(d => d.tarawih?.completed).length}
                                           </div>
                                       </div>
                                   </div>
                               )}

                               {detailTab === 'literasi' && (
                                   <div className="space-y-2">
                                       {selectedStudentDetail.readLogs?.map((log, idx) => {
                                           const mat = materials.find(m => m.id === log.materialId);
                                           if (!mat) return null;
                                           return (
                                               <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                   <div className="flex flex-col gap-1 w-2/3">
                                                       <div className="flex items-center gap-2">
                                                           {mat.category === 'quiz' ? <Award size={16} className="text-amber-500 shrink-0"/> : <Book size={16} className="text-fuchsia-500 shrink-0"/>}
                                                           <span className="text-sm font-bold text-gray-700 truncate">{mat.title}</span>
                                                       </div>
                                                       <div className="text-[10px] text-gray-400 pl-6">
                                                           {log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Waktu tidak tercatat'}
                                                       </div>
                                                   </div>
                                                   <span className={`text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap ${mat.category === 'quiz' ? 'bg-amber-100 text-amber-700' : 'bg-fuchsia-100 text-fuchsia-700'}`}>
                                                       {mat.category === 'quiz' ? 'Kuis' : 'Materi'}
                                                   </span>
                                               </div>
                                           )
                                       })}
                                       {(!selectedStudentDetail.readLogs || selectedStudentDetail.readLogs.length === 0) && (
                                           <p className="text-center text-gray-400 italic">Belum ada materi dibaca.</p>
                                       )}
                                   </div>
                               )}

                               {detailTab === 'kajian' && selectedStudentDetail.kajianLogs.map(log => (
                                   <div key={log.id} className="bg-fuchsia-50 border border-fuchsia-100 p-4 rounded-xl">
                                       <div className="flex justify-between font-bold text-fuchsia-800 text-sm mb-1">
                                           <span>{new Date(log.date).toLocaleDateString()}</span>
                                           <span>{log.speaker}</span>
                                       </div>
                                       <div className="text-xs text-gray-600 mb-2">{log.place}</div>
                                       <div className="bg-white/60 p-2 rounded-lg text-sm text-gray-700 italic">"{log.summary}"</div>
                                   </div>
                               ))}
                               {detailTab === 'tadarus' && selectedStudentDetail.tadarusLogs.map(log => (
                                   <div key={log.id} className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
                                       <div>
                                           <div className="font-bold text-blue-800">{log.surah}</div>
                                           <div className="text-xs text-blue-600">Ayat: {log.ayat}</div>
                                       </div>
                                       <div className="text-xs font-bold bg-white px-2 py-1 rounded text-blue-500">{new Date(log.date).toLocaleDateString()}</div>
                                   </div>
                               ))}
                               
                               {(detailTab === 'kajian' && selectedStudentDetail.kajianLogs.length === 0) && (
                                   <p className="text-center text-gray-400 py-8">Belum ada data aktivitas.</p>
                               )}
                               {(detailTab === 'tadarus' && selectedStudentDetail.tadarusLogs.length === 0) && (
                                   <p className="text-center text-gray-400 py-8">Belum ada data aktivitas.</p>
                               )}

                           </div>
                       </div>
                   )}
               </div>
           </div>
       )}
    </div>
  );
};

export default AdminView;