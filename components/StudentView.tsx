import React, { useState, useEffect } from 'react';
import { User, StudentData, DailyJournal, Material, Broadcast, PrayerTimes, ActivityLog, AppSettings } from '../types';
import { StorageService } from '../services/storageService';
import { Calendar, Clock, BookOpen, CheckCircle, Award, Volume2, Trophy, Loader2, MapPin, Edit3, Send, AlertCircle, BookmarkCheck, ChevronDown, Bell, Home, LogOut, X, User as UserIcon, Globe, Wifi, Youtube, ExternalLink, PlayCircle, ChevronLeft, ChevronRight, Menu, History, HelpCircle, Star, Users, Moon, Sun, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentViewProps {
  user: User;
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

const StudentView: React.FC<StudentViewProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'kajian' | 'quiz' | 'ranking' | 'guide'>('dashboard');
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string, time: string, timeLeft: string } | null>(null);
  const [location, setLocation] = useState<string>('Pacet, Mojokerto');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [unreadMaterialCount, setUnreadMaterialCount] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  
  // UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Forms State
  const [kajianForm, setKajianForm] = useState({ 
    speaker: '', 
    type: 'Offline' as 'Offline' | 'Online', 
    place: '', 
    link: '',
    summary: '' 
  });
  const [tadarusForm, setTadarusForm] = useState({ surah: '', ayat: '' });
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string>('all');
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);

  // Journal Modal State
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [activeJournalKey, setActiveJournalKey] = useState<string>('');
  const [journalForm, setJournalForm] = useState({
    type: 'Sendiri',
    place: 'Rumah',
    imam: ''
  });

  // Load Initial Data
  useEffect(() => {
    loadStudentData();
    loadMaterials();
    setBroadcasts(StorageService.getBroadcasts());
    setSettings(StorageService.getSettings());

    fetch(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=-7.67&longitude=112.54&method=20`)
      .then(res => res.json())
      .then(data => {
        setPrayerTimes(data.data.timings);
      })
      .catch(err => console.error("Prayer time fetch error", err));

    const interval = setInterval(() => {
      calculateNextPrayer();
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    if (prayerTimes) calculateNextPrayer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayerTimes]);

  const loadStudentData = () => {
    const students = StorageService.getStudents();
    const currentStudent = students.find(s => s.id === user.id);
    if (currentStudent) {
       if (!currentStudent.kajianLogs) currentStudent.kajianLogs = [];
       if (!currentStudent.tadarusLogs) currentStudent.tadarusLogs = [];
       
       // Migration: Convert old array of strings to array of objects if needed
       if (!currentStudent.readLogs) {
           if (currentStudent.readMaterialIds && currentStudent.readMaterialIds.length > 0) {
               currentStudent.readLogs = currentStudent.readMaterialIds.map(id => ({
                   materialId: id,
                   timestamp: new Date().toISOString() // Fallback time for old data
               }));
           } else {
               currentStudent.readLogs = [];
           }
       }

       setStudentData(currentStudent);
       if (materials.length > 0) checkUnreadMaterials(currentStudent, materials);
    }
  };

  const loadMaterials = () => {
    const mats = StorageService.getMaterials();
    setMaterials(mats);
    if (studentData) checkUnreadMaterials(studentData, mats);
  };

  const checkUnreadMaterials = (student: StudentData, mats: Material[]) => {
    const unreadCount = mats.filter(m => !student.readLogs?.some(log => log.materialId === m.id)).length;
    setUnreadMaterialCount(unreadCount);
  };

  const calculateNextPrayer = () => {
    if (!prayerTimes) return;
    
    const now = new Date();
    const timeToMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const prayers = [
      { name: 'Imsak', time: prayerTimes.Imsak },
      { name: 'Subuh', time: prayerTimes.Fajr },
      { name: 'Dzuhur', time: prayerTimes.Dhuhr },
      { name: 'Ashar', time: prayerTimes.Asr },
      { name: 'Maghrib', time: prayerTimes.Maghrib },
      { name: 'Isya', time: prayerTimes.Isha },
    ];

    let upcoming = null;
    for (const p of prayers) {
      const pMins = timeToMinutes(p.time);
      if (pMins > currentMinutes) {
        upcoming = p;
        break;
      }
    }

    if (!upcoming) {
      upcoming = { name: 'Imsak (Besok)', time: prayerTimes.Imsak };
    }

    const targetMins = timeToMinutes(upcoming.time.replace(' (Besok)', ''));
    let diff = targetMins - currentMinutes;
    if (diff < 0) diff += 24 * 60; // Next day

    const hLeft = Math.floor(diff / 60);
    const mLeft = diff % 60;

    setNextPrayer({
      name: upcoming.name,
      time: upcoming.time,
      timeLeft: `${hLeft} jam ${mLeft} menit`
    });
  };

  const isTimeForPrayer = (prayerKey: string): boolean => {
    if (!prayerTimes) return true;
    const map: Record<string, keyof PrayerTimes> = {
      'sholatSubuh': 'Fajr',
      'sholatZuhur': 'Dhuhr',
      'sholatAsar': 'Asr',
      'sholatMaghrib': 'Maghrib',
      'sholatIsya': 'Isha'
    };
    const apiKey = map[prayerKey];
    if (!apiKey) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [ph, pm] = prayerTimes[apiKey].split(':').map(Number);
    return currentMinutes >= (ph * 60 + pm);
  };

  const initiateJournalEntry = (key: keyof DailyJournal | string) => {
    if (!studentData) return;

    if (key.startsWith('sholat')) {
       // @ts-ignore
       const journalEntry = studentData.journal[new Date().toISOString().split('T')[0]]?.[key];
       if (!journalEntry?.completed && !isTimeForPrayer(key)) {
         alert("Belum masuk waktu sholat ini.");
         return;
       }
    }

    setActiveJournalKey(key);
    
    // @ts-ignore
    const existing = studentData.journal[new Date().toISOString().split('T')[0]]?.[key];
    
    if (existing?.completed) {
      updateJournal(key, false, existing);
    } else {
      if (['puasa', 'dhuha'].includes(key)) {
         updateJournal(key, true, { completed: true });
      } else {
         setJournalForm({ type: 'Sendiri', place: 'Rumah', imam: '' });
         setIsJournalModalOpen(true);
      }
    }
  };

  const submitJournalModal = () => {
    const details: ActivityLog = {
      completed: true,
      timestamp: new Date().toLocaleTimeString(),
      place: journalForm.place,
    };

    if (activeJournalKey.startsWith('sholat')) {
      // @ts-ignore
      details.type = journalForm.type;
    }
    if (activeJournalKey === 'tarawih') {
      details.imam = journalForm.imam;
    }

    updateJournal(activeJournalKey, true, details);
    setIsJournalModalOpen(false);
  };

  const updateJournal = (key: string, isCompleting: boolean, details: ActivityLog) => {
    if (!studentData) return;
    const today = new Date().toISOString().split('T')[0];
    const newJournal = { ...studentData.journal };
    
    if (!newJournal[today]) {
      // @ts-ignore
      newJournal[today] = {};
    }

    const currentEntry = newJournal[today];
    let pointsToAdd = 0;

    if (isCompleting) {
      let points = 10;
      
      if (key.startsWith('sholat')) {
         if (details.type === 'Jamaah') points = 20;
         else points = 10;
      } else if (key === 'tarawih') {
         points = 15;
      } else if (key === 'dhuha') {
         points = 10;
      } else if (key === 'puasa') {
         points = 20;
      }

      // @ts-ignore
      currentEntry[key] = { ...details, pointsEarned: points };
      pointsToAdd = points;
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#818cf8', '#e879f9', '#2dd4bf'] });
      
      setTimeout(() => {
        alert(`Alhamdulillah! Amalan tercatat. Kamu mendapatkan +${points} Poin.`);
      }, 300);

    } else {
      // @ts-ignore
      const oldPoints = currentEntry[key]?.pointsEarned || 0;
      pointsToAdd = -oldPoints;
      // @ts-ignore
      currentEntry[key] = { completed: false };
    }

    const updatedStudent = {
      ...studentData,
      points: Math.max(0, studentData.points + pointsToAdd),
      journal: newJournal
    };

    setStudentData(updatedStudent);
    StorageService.saveStudent(updatedStudent);
  };

  const toggleHaid = () => {
    if (!studentData) return;
    const today = new Date().toISOString().split('T')[0];
    const newJournal = { ...studentData.journal };
    
    if (!newJournal[today]) {
      // @ts-ignore
      newJournal[today] = {};
    }

    const isCurrentlyHaid = newJournal[today].haid;
    let pointsAdjustment = 0;

    if (!isCurrentlyHaid) {
        // Activate Haid Mode
        // 1. Calculate points earned today from restricted activities to deduct them
        const restrictedKeys = ['sholatSubuh', 'sholatZuhur', 'sholatAsar', 'sholatMaghrib', 'sholatIsya', 'puasa', 'tarawih', 'dhuha'];
        
        restrictedKeys.forEach(key => {
            // @ts-ignore
            if (newJournal[today][key]?.completed) {
                // @ts-ignore
                pointsAdjustment -= (newJournal[today][key].pointsEarned || 0);
                // Reset the entry
                // @ts-ignore
                newJournal[today][key] = { completed: false };
            }
        });

        // 2. Add flat points for Haid
        pointsAdjustment += 50;
        newJournal[today].haid = true;
        
        confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 }, colors: ['#ec4899', '#fbcfe8'] });
        alert("Mode Haid diaktifkan. Aktivitas sholat dan puasa dinonaktifkan. Kamu mendapatkan +50 Poin pengganti.");

    } else {
        // Deactivate Haid Mode
        pointsAdjustment -= 50;
        newJournal[today].haid = false;
        alert("Mode Haid dinonaktifkan. Poin pengganti (-50) dicabut. Silakan isi jurnal seperti biasa.");
    }

    const updatedStudent = {
        ...studentData,
        points: Math.max(0, studentData.points + pointsAdjustment),
        journal: newJournal
    };

    setStudentData(updatedStudent);
    StorageService.saveStudent(updatedStudent);
  };

  const handleKajianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;
    
    const finalPlace = kajianForm.type === 'Online' 
        ? `Online: ${kajianForm.link}` 
        : kajianForm.place;

    const newLog = {
      id: `kajian_${Date.now()}`,
      date: new Date().toISOString(),
      speaker: kajianForm.speaker,
      place: finalPlace,
      summary: kajianForm.summary
    };

    const updatedStudent = {
      ...studentData,
      kajianLogs: [newLog, ...(studentData.kajianLogs || [])],
      points: studentData.points + 20
    };

    setStudentData(updatedStudent);
    StorageService.saveStudent(updatedStudent);
    
    setKajianForm({ speaker: '', type: 'Offline', place: '', link: '', summary: '' });
    
    confetti({ particleCount: 50, spread: 60, colors: ['#818cf8', '#e879f9'] });
    alert("Alhamdulillah! Kajian tercatat. Kamu mendapatkan +20 Poin.");
  };

  const handleTadarusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;

    const newLog = {
      id: `tadarus_${Date.now()}`,
      date: new Date().toISOString(),
      ...tadarusForm
    };

    const updatedStudent = {
      ...studentData,
      tadarusLogs: [newLog, ...(studentData.tadarusLogs || [])],
      points: studentData.points + 15 
    };

    setStudentData(updatedStudent);
    StorageService.saveStudent(updatedStudent);
    setTadarusForm({ surah: '', ayat: '' });
    
    confetti({ particleCount: 40, spread: 50 });
    alert("MasyaAllah! Laporan Tadarus diterima. Kamu mendapatkan +15 Poin.");
  };

  const toggleMaterial = (id: string) => {
    if (expandedMaterialId === id) {
      setExpandedMaterialId(null);
    } else {
      setExpandedMaterialId(id);
      const material = materials.find(m => m.id === id);
      if (material && material.category !== 'quiz') {
          handleReadMaterial(id, 5, "Membaca Materi");
      }
    }
  };

  const handleReadMaterial = (materialId: string, pointValue: number = 5, actionName: string = "Materi") => {
    if (!studentData) return;
    if (studentData.readLogs?.some(log => log.materialId === materialId)) return;

    const newLog = {
      materialId: materialId,
      timestamp: new Date().toISOString()
    };

    const updatedStudent = {
      ...studentData,
      readLogs: [...(studentData.readLogs || []), newLog],
      points: studentData.points + pointValue
    };
    
    setStudentData(updatedStudent);
    StorageService.saveStudent(updatedStudent);
    checkUnreadMaterials(updatedStudent, materials);
    
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
        alert(`Selamat! Kamu mendapatkan +${pointValue} Poin karena ${actionName}.`);
    }, 300);
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
       {/* New Material Notification Banner */}
       {unreadMaterialCount > 0 && (
         <div 
           onClick={() => setActiveTab('kajian')}
           className="bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl p-1 shadow-lg cursor-pointer transform hover:scale-[1.01] transition-all"
         >
             <div className="bg-white/10 backdrop-blur-sm p-4 rounded-[1.3rem] flex items-center justify-between">
                 <div className="flex items-center gap-3 text-white">
                     <div className="bg-white/20 p-2 rounded-full animate-pulse"><Bell size={24} /></div>
                     <div>
                         <p className="font-bold text-lg leading-tight">Materi Baru Tersedia!</p>
                         <p className="text-sm opacity-90">Ada {unreadMaterialCount} materi/kuis belum kamu baca. Klik disini.</p>
                     </div>
                 </div>
                 <ChevronRight className="text-white" />
             </div>
         </div>
       )}

      {broadcasts.filter(b => b.active).map(b => (
        <div key={b.id} className="glass-card bg-white/40 border border-white/50 text-indigo-900 p-5 rounded-3xl shadow-lg relative overflow-hidden" role="alert">
           <div className="absolute top-0 right-0 p-4 opacity-5"><Bell size={48} /></div>
           <div className="relative z-10 flex items-start gap-3">
             <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-2 rounded-xl text-white shadow-lg shadow-pink-200"><AlertCircle size={20} /></div>
             <div>
                <p className="font-bold text-lg tracking-tight">Pengumuman</p>
                <p className="opacity-80 text-sm leading-relaxed">{b.message}</p>
             </div>
           </div>
        </div>
      ))}

      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] text-white p-8 shadow-2xl shadow-indigo-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-20 mix-blend-overlay">
          <img src="https://cdn-icons-png.flaticon.com/512/7228/7228211.png" alt="Mosque" className="w-80 h-80 -mr-16 -mt-16" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
             <div>
                <h2 className="text-3xl font-sans font-bold mb-1 tracking-tight">Assalamu'alaikum,</h2>
                <h3 className="text-xl opacity-90 font-light">{studentData?.name} - <span className="font-bold">{studentData?.className}</span></h3>
             </div>
             <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 flex items-center text-indigo-50 text-sm w-fit">
                <MapPin size={16} className="mr-2" />
                {location}
             </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
             <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 flex-1">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Menuju {nextPrayer?.name}</span>
                  <Clock size={18} className="text-indigo-100" />
                </div>
                <div className="text-5xl font-black font-sans tracking-tighter">{nextPrayer?.timeLeft.split(' ')[0]} <span className="text-lg font-normal opacity-80">Jam</span></div>
                <div className="text-sm text-right mt-1 opacity-70">{nextPrayer?.timeLeft.split(' ')[2]} Menit lagi</div>
             </div>
             
             <div className="flex-1 grid grid-cols-3 gap-3">
                {prayerTimes && Object.entries(prayerTimes).filter(([k]) => ['Imsak', 'Fajr','Dhuhr','Asr','Maghrib','Isha'].includes(k)).map(([name, time]) => (
                    <div key={name} className="bg-indigo-900/20 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 hover:bg-white/20 transition cursor-default">
                      <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-widest mb-1">{name}</div>
                      <div className="font-bold text-sm tracking-wide">{time}</div>
                    </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-6">
         <div className="glass-card p-6 rounded-[2rem] shadow-sm border border-white/60 flex items-center space-x-4 group hover:scale-[1.02] transition duration-300">
            <div className="bg-amber-100/80 p-4 rounded-2xl text-amber-500 shadow-inner group-hover:rotate-12 transition">
               <Trophy size={28} />
            </div>
            <div>
               <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Poin</div>
               <div className="text-3xl font-black text-gray-800 tracking-tight">{studentData?.points || 0}</div>
            </div>
         </div>
         <div className="glass-card p-6 rounded-[2rem] shadow-sm border border-white/60 flex items-center space-x-4 group hover:scale-[1.02] transition duration-300">
            <div className="bg-indigo-100/80 p-4 rounded-2xl text-indigo-500 shadow-inner group-hover:-rotate-12 transition">
               <Calendar size={28} />
            </div>
            <div>
               <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Ramadhan</div>
               <div className="text-3xl font-black text-gray-800 tracking-tight">{settings.ramadhanYear}</div>
            </div>
         </div>
      </div>
    </div>
  );

  const renderGuide = () => {
      const pointSystem = [
          { item: 'Sholat Wajib (Sendiri)', point: '+10', icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { item: 'Sholat Wajib (Jamaah)', point: '+20', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { item: 'Puasa Ramadhan', point: '+20', icon: Star, color: 'text-amber-600', bg: 'bg-amber-100' },
          { item: 'Sholat Tarawih', point: '+15', icon: Moon, color: 'text-purple-600', bg: 'bg-purple-100' },
          { item: 'Sholat Dhuha', point: '+10', icon: Sun, color: 'text-orange-600', bg: 'bg-orange-100' },
          { item: 'Tadarus Al-Quran', point: '+15', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
          { item: 'Kajian/Ceramah', point: '+20', icon: MapPin, color: 'text-fuchsia-600', bg: 'bg-fuchsia-100' },
          { item: 'Membaca Materi', point: '+5', icon: Volume2, color: 'text-teal-600', bg: 'bg-teal-100' },
          { item: 'Mengerjakan Kuis', point: '+20', icon: Award, color: 'text-rose-600', bg: 'bg-rose-100' },
          { item: 'Mode Haid', point: '+50', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100' },
      ];

      return (
          <div className="space-y-8 animate-fade-in pb-10">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                      <h2 className="text-3xl font-bold mb-2 flex items-center gap-3"><HelpCircle size={32}/> Panduan Aplikasi</h2>
                      <p className="text-emerald-100 font-medium opacity-90">Cara menggunakan aplikasi dan sistem poin Ramadhan.</p>
                  </div>
                  <HelpCircle size={200} className="absolute -right-10 -bottom-10 text-white opacity-10 rotate-12" />
              </div>

              {/* Point System Section */}
              <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Star className="text-amber-500 fill-amber-500" /> Sistem Poin Keaktifan
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pointSystem.map((p, idx) => (
                          <div key={idx} className="glass-card p-4 rounded-2xl flex items-center justify-between border border-white/60 hover:scale-[1.02] transition duration-200">
                              <div className="flex items-center gap-3">
                                  <div className={`p-3 rounded-xl ${p.bg} ${p.color}`}>
                                      <p.icon size={20} />
                                  </div>
                                  <span className="font-bold text-gray-700 text-sm">{p.item}</span>
                              </div>
                              <div className={`font-black text-lg ${p.color}`}>{p.point}</div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Features Walkthrough */}
              <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <BookOpen className="text-indigo-500" /> Cara Menggunakan Fitur
                  </h3>
                  
                  <div className="glass-card p-6 rounded-[2rem] border border-white/60 space-y-6">
                      <div className="flex gap-4">
                          <div className="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                          <div>
                              <h4 className="font-bold text-gray-800 text-lg">Dashboard</h4>
                              <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                                  Halaman utama menampilkan jadwal sholat hari ini, countdown waktu sholat berikutnya, total poin kamu, dan pengumuman penting dari sekolah. Jika ada materi baru, notifikasi akan muncul di sini.
                              </p>
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <div className="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                          <div>
                              <h4 className="font-bold text-gray-800 text-lg">Jurnal Ibadah</h4>
                              <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                                  Isi kegiatan ibadahmu setiap hari di menu <b>Jurnal</b>. Klik tombol checklist pada sholat wajib (pilih Sendiri atau Jamaah). Untuk Tarawih, sebutkan nama imam. Kamu juga bisa mengisi jurnal Tadarus dan Kajian Luar Sekolah di sini untuk mendapatkan poin tambahan. 
                                  <br/><br/>
                                  <b>Khusus Siswi Haid:</b> Aktifkan tombol "Mode Haid" di bagian atas jurnal. Ini akan menonaktifkan sholat dan puasa, namun kamu akan mendapatkan poin pengganti (+50).
                              </p>
                          </div>
                      </div>

                      {/* ... rest of the walkthrough ... */}
                  </div>
              </div>
          </div>
      );
  };

  const getDailyPoints = (date: string) => {
      if (!studentData?.journal[date]) return 0;
      const j = studentData.journal[date];
      if (j.haid) return 50; // Simple check, though points are already in student total
      let total = 0;
      Object.values(j).forEach((v: any) => {
          if (v && v.pointsEarned) total += v.pointsEarned;
      });
      return total;
  }

  const renderHistoryModal = () => {
      const dates = Object.keys(studentData?.journal || {}).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
      
      return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg border border-white flex flex-col max-h-[80vh]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-indigo-900 flex items-center gap-2"><History/> Riwayat Jurnal</h3>
                    <button onClick={() => setIsHistoryModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
                  </div>
                  
                  <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3">
                      {dates.map(date => {
                          const journalDay = studentData?.journal[date];
                          const points = getDailyPoints(date);
                          const formattedDate = new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
                          return (
                              <div key={date} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
                                  <div>
                                      <div className="font-bold text-gray-700">{formattedDate}</div>
                                      <div className="text-xs text-gray-400">Total Poin Harian</div>
                                      {journalDay?.haid && <div className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-md font-bold w-fit mt-1">Sedang Haid</div>}
                                  </div>
                                  <div className="text-xl font-black text-indigo-600">+{points}</div>
                              </div>
                          )
                      })}
                      {dates.length === 0 && <p className="text-center text-gray-400 italic py-10">Belum ada riwayat jurnal.</p>}
                  </div>
              </div>
          </div>
      )
  }

  const renderJournal = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultStructure = {
        sholatSubuh: { completed: false },
        sholatZuhur: { completed: false },
        sholatAsar: { completed: false },
        sholatMaghrib: { completed: false },
        sholatIsya: { completed: false },
        puasa: { completed: false },
        tarawih: { completed: false },
        dhuha: { completed: false }
    };
    const journalToday = { ...defaultStructure, ...(studentData?.journal[today] || {}) };
    const isHaid = journalToday.haid || false;

    const prayers = [
      { key: 'sholatSubuh', label: 'Sholat Subuh' },
      { key: 'sholatZuhur', label: 'Sholat Dzuhur' },
      { key: 'sholatAsar', label: 'Sholat Ashar' },
      { key: 'sholatMaghrib', label: 'Sholat Maghrib' },
      { key: 'sholatIsya', label: 'Sholat Isya' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
           <h3 className="text-2xl font-bold text-gray-800 flex items-center tracking-tight">
             <BookOpen className="mr-3 text-indigo-500" /> Jurnal Ibadah
           </h3>
           <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition">
               <History size={16}/> Riwayat
           </button>
        </div>
        
        {/* Date & Haid Toggle */}
        <div className="flex flex-col items-center gap-4 mb-4">
            <div className="text-center bg-white/50 px-4 py-2 rounded-full text-xs font-bold text-indigo-900/60 border border-white shadow-sm w-fit">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <button 
                onClick={toggleHaid}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-md transition-all ${isHaid ? 'bg-pink-500 text-white hover:bg-pink-600 ring-2 ring-pink-300' : 'bg-white text-gray-500 hover:bg-pink-50 hover:text-pink-500'}`}
            >
                <Heart size={16} className={isHaid ? 'fill-current animate-pulse' : ''} />
                {isHaid ? "Sedang Haid (Aktif +50 Poin)" : "Mode Haid (Khusus Siswi)"}
            </button>
        </div>

        <div className={`glass-card rounded-[2rem] shadow-sm overflow-hidden border border-white/60 ${isHaid ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
          <div className="bg-indigo-50/50 p-5 border-b border-indigo-100 font-bold text-indigo-900 flex justify-between items-center backdrop-blur-sm">
            <span>Sholat Wajib (5 Waktu)</span>
            <span className="text-[10px] bg-white px-2 py-1 rounded-lg text-indigo-600 font-bold shadow-sm border border-indigo-50">Max 100 Poin</span>
          </div>
          <div className="divide-y divide-gray-100/50">
            {prayers.map((p) => {
               // @ts-ignore
               const info = journalToday[p.key];
               return (
                <div key={p.key} className="p-4 flex items-center justify-between hover:bg-indigo-50/30 transition duration-200">
                  <div className="flex-1">
                    <div className="font-bold text-gray-700">{p.label}</div>
                    {info.completed && (
                       <div className="text-xs text-indigo-500 font-medium mt-1">
                          ✓ {info.type} di {info.place} ({info.timestamp}) <span className="text-indigo-600 font-bold">+{info.pointsEarned} Poin</span>
                       </div>
                    )}
                    {!info.completed && !isTimeForPrayer(p.key) && !isHaid && <div className="text-xs text-red-400 mt-1 italic">Belum masuk waktu</div>}
                  </div>
                  <button 
                    onClick={() => initiateJournalEntry(p.key)}
                    disabled={isHaid}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-sm ${info.completed ? 'bg-indigo-500 border-indigo-500 text-white scale-110 shadow-indigo-300' : 'bg-white border-gray-100 text-transparent hover:border-indigo-200'}`}
                  >
                    <CheckCircle size={24} fill={info.completed ? "currentColor" : "none"} />
                  </button>
                </div>
               );
            })}
          </div>
        </div>

        {/* ... Rest of Journal (Sunnah, Kajian, Tadarus) ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Sunnah & Puasa */}
           <div className={`glass-card rounded-[2rem] shadow-sm overflow-hidden border border-white/60 ${isHaid ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
              <div className="bg-amber-50/50 p-5 border-b border-amber-100 font-bold text-amber-900 flex justify-between items-center backdrop-blur-sm">
                <span>Amalan Sunnah</span>
                <span className="text-[10px] bg-white px-2 py-1 rounded-lg text-amber-600 font-bold shadow-sm border border-amber-50">Variabel Poin</span>
              </div>
              <div className="divide-y divide-gray-100/50">
                 {/* Puasa & Dhuha */}
                 {[
                   { key: 'puasa', label: 'Berpuasa Hari Ini' },
                   { key: 'dhuha', label: 'Sholat Dhuha' }
                 ].map(item => (
                   <div key={item.key} className="p-4 flex items-center justify-between hover:bg-amber-50/30 transition">
                     <div className="font-bold text-gray-700">
                        {item.label}
                        {/* @ts-ignore */}
                        {journalToday[item.key]?.completed && (
                           <div className="text-xs text-indigo-500 font-medium mt-1">
                             {/* @ts-ignore */}
                             ✓ {journalToday[item.key].timestamp} <span className="font-bold">+{journalToday[item.key].pointsEarned} Poin</span>
                           </div>
                        )}
                     </div>
                     <button 
                       onClick={() => initiateJournalEntry(item.key)}
                       disabled={isHaid}
                       // @ts-ignore
                       className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-sm ${journalToday[item.key]?.completed ? 'bg-amber-500 border-amber-500 text-white scale-110 shadow-amber-200' : 'bg-white border-gray-100 text-transparent hover:border-amber-200'}`}
                     >
                        <CheckCircle size={24} fill="currentColor" />
                     </button>
                   </div>
                 ))}

                 {/* Tarawih (Detailed) */}
                 <div className="p-4 flex items-center justify-between hover:bg-amber-50/30 transition">
                     <div className="font-bold text-gray-700">
                        Sholat Tarawih
                        {/* @ts-ignore */}
                        {journalToday.tarawih?.completed && (
                            <div className="text-xs text-indigo-500 font-medium mt-1">
                               {/* @ts-ignore */}
                               Imam: {journalToday.tarawih.imam} | {journalToday.tarawih.timestamp} <span className="font-bold">+{journalToday.tarawih.pointsEarned} Poin</span>
                            </div>
                        )}
                     </div>
                     <button 
                       onClick={() => initiateJournalEntry('tarawih')}
                       disabled={isHaid}
                       // @ts-ignore
                       className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-sm ${journalToday.tarawih?.completed ? 'bg-amber-500 border-amber-500 text-white scale-110 shadow-amber-200' : 'bg-white border-gray-100 text-transparent hover:border-amber-200'}`}
                     >
                        <CheckCircle size={24} fill="currentColor" />
                     </button>
                  </div>
              </div>
           </div>

           {/* Input Kajian Luar */}
           <div className="glass-card rounded-[2rem] shadow-sm overflow-hidden border border-white/60">
              <div className="bg-fuchsia-50/50 p-5 border-b border-fuchsia-100 font-bold text-fuchsia-900 flex justify-between items-center backdrop-blur-sm">
                <span>Jurnal Kajian Luar</span>
                <span className="text-[10px] bg-white px-2 py-1 rounded-lg text-fuchsia-600 font-bold shadow-sm border border-fuchsia-50">+20 Poin</span>
              </div>
              <div className="p-6">
                 <form onSubmit={handleKajianSubmit} className="space-y-4">
                    <div className="flex bg-fuchsia-50 rounded-xl p-1 mb-2">
                        <button
                          type="button"
                          onClick={() => setKajianForm({...kajianForm, type: 'Offline'})}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${kajianForm.type === 'Offline' ? 'bg-white text-fuchsia-700 shadow-sm' : 'text-gray-500'}`}
                        >
                           <MapPin size={12} className="inline mr-1"/> Offline (Tempat)
                        </button>
                        <button
                          type="button"
                          onClick={() => setKajianForm({...kajianForm, type: 'Online'})}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${kajianForm.type === 'Online' ? 'bg-white text-fuchsia-700 shadow-sm' : 'text-gray-500'}`}
                        >
                           <Globe size={12} className="inline mr-1"/> Online (Link)
                        </button>
                    </div>

                    <input 
                       className="w-full border border-gray-200 bg-white/50 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-fuchsia-400 focus:outline-none" 
                       value={kajianForm.speaker}
                       onChange={(e) => setKajianForm({...kajianForm, speaker: e.target.value})}
                       required
                       placeholder="Nama Penceramah"
                    />
                    
                    {kajianForm.type === 'Offline' ? (
                      <input 
                         className="w-full border border-gray-200 bg-white/50 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-fuchsia-400 focus:outline-none" 
                         value={kajianForm.place}
                         onChange={(e) => setKajianForm({...kajianForm, place: e.target.value})}
                         required
                         placeholder="Tempat (Masjid/Musholla)"
                      />
                    ) : (
                      <input 
                         className="w-full border border-gray-200 bg-white/50 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-fuchsia-400 focus:outline-none" 
                         value={kajianForm.link}
                         onChange={(e) => setKajianForm({...kajianForm, link: e.target.value})}
                         required
                         placeholder="Link YouTube / Sumber (https://...)"
                         type="url"
                      />
                    )}

                    <textarea 
                       className="w-full border border-gray-200 bg-white/50 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-fuchsia-400 focus:outline-none h-24" 
                       value={kajianForm.summary}
                       onChange={(e) => setKajianForm({...kajianForm, summary: e.target.value})}
                       required
                       placeholder="Ringkasan isi ceramah..."
                    ></textarea>
                    <button className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white py-3 rounded-2xl text-sm font-bold shadow-lg hover:shadow-fuchsia-500/30 transition transform hover:-translate-y-0.5">
                       Simpan Jurnal Kajian (+20 Poin)
                    </button>
                 </form>

                 <div className="mt-6 border-t border-gray-100 pt-4">
                   <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Riwayat Kajian</h4>
                   <div className="space-y-3">
                    {studentData?.kajianLogs?.slice(0, 2).map(log => (
                        <div key={log.id} className="text-xs bg-white/60 p-3 rounded-xl border border-gray-100 relative">
                            <div className="absolute top-2 right-2 text-[10px] bg-fuchsia-100 text-fuchsia-700 px-1.5 py-0.5 rounded font-bold">+20 Poin</div>
                            <div className="font-bold text-fuchsia-700 pr-12">{log.speaker}</div>
                            <div className="text-gray-500 font-medium">{log.place}</div>
                            <div className="text-gray-400 truncate mt-1 italic">"{log.summary}"</div>
                        </div>
                    ))}
                    {!studentData?.kajianLogs?.length && <p className="text-xs text-center text-gray-400 italic">Belum ada data.</p>}
                   </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Tadarus Form */}
        <div className={`glass-card rounded-[2rem] shadow-sm overflow-hidden border border-white/60 ${isHaid ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
            <div className="bg-blue-50/50 p-5 border-b border-blue-100 font-bold text-blue-900 flex justify-between items-center backdrop-blur-sm">
            <span>Lapor Tadarus</span>
            <span className="text-[10px] bg-white px-2 py-1 rounded-lg text-blue-600 font-bold shadow-sm border border-blue-50">+15 Poin</span>
            </div>
            <div className="p-6">
                <form onSubmit={handleTadarusSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input 
                    placeholder="Nama Surah" 
                    className="border border-gray-200 bg-white/50 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    value={tadarusForm.surah}
                    onChange={(e) => setTadarusForm({...tadarusForm, surah: e.target.value})}
                    required
                    disabled={isHaid}
                    />
                    <input 
                    placeholder="Ayat (cth: 1-10)" 
                    className="border border-gray-200 bg-white/50 rounded-2xl p-3.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    value={tadarusForm.ayat}
                    onChange={(e) => setTadarusForm({...tadarusForm, ayat: e.target.value})}
                    required
                    disabled={isHaid}
                    />
                </div>
                <button 
                    disabled={isHaid}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-2xl text-sm font-bold shadow-lg hover:shadow-blue-500/30 transition transform hover:-translate-y-0.5"
                >
                    Kirim Laporan (+15 Poin)
                </button>
                </form>
                
                <div className="mt-6">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Riwayat Tadarus</h4>
                <div className="space-y-3">
                    {studentData?.tadarusLogs?.slice(0, 3).map(log => (
                        <div key={log.id} className="text-xs bg-white/60 p-3 rounded-xl border border-gray-100 flex justify-between shadow-sm items-center">
                            <div>
                                <span className="font-bold text-gray-700 block">{log.surah} : {log.ayat}</span>
                                <span className="text-gray-400 text-[10px]">{new Date(log.date).toLocaleDateString()}</span>
                            </div>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">+15 Poin</span>
                        </div>
                    ))}
                    {!studentData?.tadarusLogs?.length && <p className="text-xs text-gray-400 italic text-center">Belum ada riwayat.</p>}
                </div>
                </div>
            </div>
        </div>
      </div>
    );
  };

  const renderRanking = () => {
    // Basic ranking view for students (top 5 only)
    const allStudents = StorageService.getStudents();
    const sorted = [...allStudents].sort((a,b) => b.points - a.points);
    const myRank = sorted.findIndex(s => s.id === user.id) + 1;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Peringkat Kamu</div>
                    <div className="text-6xl font-black">{myRank}</div>
                    <div className="text-sm opacity-90 mt-2">Dari {sorted.length} Siswa</div>
                </div>
                <Trophy size={150} className="absolute -right-6 -bottom-6 opacity-20 rotate-12 text-white" />
            </div>

            <div className="glass-card rounded-[2.5rem] p-6 border border-white/60 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Award className="text-amber-500"/> Top 5 Siswa</h3>
                <div className="space-y-4">
                    {sorted.slice(0, 5).map((s, idx) => (
                        <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl ${s.id === user.id ? 'bg-indigo-50 border border-indigo-200' : 'bg-white/50 border border-gray-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-700 text-sm">{s.name}</div>
                                    <div className="text-[10px] text-gray-400">{s.className}</div>
                                </div>
                            </div>
                            <div className="font-black text-indigo-600">{s.points}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderMaterials = (type: 'kajian' | 'quiz') => {
      const filtered = materials.filter(m => type === 'quiz' ? m.category === 'quiz' : m.category !== 'quiz');
      
      return (
          <div className="space-y-6 animate-fade-in">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {type === 'quiz' ? <Award className="text-rose-500"/> : <Volume2 className="text-teal-500"/>} 
                    {type === 'quiz' ? 'Kuis & Tantangan' : 'Materi Ramadhan'}
                </h3>
             </div>

             <div className="grid grid-cols-1 gap-4">
                 {filtered.map(item => {
                     const isRead = studentData?.readLogs?.some(log => log.materialId === item.id);
                     const isOpen = expandedMaterialId === item.id;
                     
                     return (
                         <div key={item.id} className={`glass-card rounded-3xl p-5 border transition-all duration-300 ${isOpen ? 'shadow-lg bg-white/80' : 'shadow-sm bg-white/40 hover:bg-white/60'} ${isRead ? 'border-gray-100' : 'border-indigo-100 ring-1 ring-indigo-50'}`}>
                             <div className="flex justify-between items-start cursor-pointer" onClick={() => toggleMaterial(item.id)}>
                                 <div className="flex-1">
                                     <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${type === 'quiz' ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'}`}>
                                            {item.category}
                                        </span>
                                        {!isRead && <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">BARU</span>}
                                        {isRead && <span className="text-[10px] text-green-600 font-bold flex items-center"><CheckCircle size={10} className="mr-1"/> Selesai</span>}
                                     </div>
                                     <h4 className="font-bold text-gray-800 text-lg leading-tight">{item.title}</h4>
                                     <div className="text-xs text-gray-400 mt-2 flex items-center gap-4">
                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                        {item.youtubeUrl && <span className="flex items-center gap-1 text-red-500 font-medium"><Youtube size={12}/> Video</span>}
                                     </div>
                                 </div>
                                 <div className={`p-2 rounded-full transition ${isOpen ? 'bg-gray-100 text-gray-600' : 'text-gray-400'}`}>
                                     {isOpen ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                                 </div>
                             </div>

                             {isOpen && (
                                 <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                                     {item.youtubeUrl && (
                                        <div className="mb-4 rounded-xl overflow-hidden shadow-md">
                                            <iframe 
                                                width="100%" 
                                                height="200" 
                                                src={`https://www.youtube.com/embed/${item.youtubeUrl.split('v=')[1] || ''}`} 
                                                title="YouTube video player" 
                                                frameBorder="0" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                     )}
                                     <ContentRenderer content={item.content} />
                                     {!isRead && (
                                         <div className="mt-4 p-3 bg-indigo-50 text-indigo-700 text-center text-sm font-bold rounded-xl animate-pulse">
                                             Selamat! Poin +5 ditambahkan karena membaca.
                                         </div>
                                     )}
                                 </div>
                             )}
                         </div>
                     )
                 })}
                 {filtered.length === 0 && <p className="text-center text-gray-400 italic py-8">Belum ada {type === 'quiz' ? 'kuis' : 'materi'} tersedia.</p>}
             </div>
          </div>
      );
  };

  return (
    <div className={`min-h-screen font-sans text-gray-800 transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-24' : 'md:pl-80'} pb-24 md:pb-0`}>
        {/* Sidebar */}
        <aside className={`hidden md:flex flex-col fixed left-0 top-0 h-full z-20 p-6 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-24' : 'w-72'}`}>
            <div className="glass-panel h-full rounded-[2.5rem] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-indigo-500/10 to-transparent"></div>
                
                <div className={`p-8 relative z-10 transition-all duration-300 ${isSidebarCollapsed ? 'px-4' : ''}`}>
                    <div className={`flex items-center gap-4 mb-2 ${isSidebarCollapsed ? 'justify-center flex-col' : ''}`}>
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center p-2 transform hover:scale-105 transition">
                            <img src="https://image2url.com/r2/default/images/1769001049680-d981c280-6340-4989-8563-7b08134c189a.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="animate-fade-in">
                                <h1 className="font-bold text-xl leading-none text-indigo-900">Siswa</h1>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Dashboard</p>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 relative z-10 mt-2 overflow-y-auto custom-scrollbar">
                    {[
                        { id: 'dashboard', icon: Home, label: 'Beranda' },
                        { id: 'journal', icon: BookOpen, label: 'Jurnal Ibadah' },
                        { id: 'kajian', icon: Volume2, label: 'Materi & Kajian' },
                        { id: 'quiz', icon: Award, label: 'Kuis' },
                        { id: 'ranking', icon: Trophy, label: 'Peringkat' },
                        { id: 'guide', icon: HelpCircle, label: 'Panduan' },
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
                            {!isSidebarCollapsed && item.id === 'kajian' && unreadMaterialCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadMaterialCount}</span>
                            )}
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
                        <h1 className="font-bold text-gray-800 leading-none">Ramadhan</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{studentData?.name.split(' ')[0]}</p>
                    </div>
                </div>
                <button onClick={onLogout} className="text-red-500 bg-red-50 p-3 rounded-full hover:bg-red-100 transition"><LogOut size={20} /></button>
            </div>

            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'journal' && renderJournal()}
            {activeTab === 'kajian' && renderMaterials('kajian')}
            {activeTab === 'quiz' && renderMaterials('quiz')}
            {activeTab === 'ranking' && renderRanking()}
            {activeTab === 'guide' && renderGuide()}
        </main>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
                <div className="glass-panel rounded-[2rem] shadow-2xl flex justify-around p-3 items-center bg-white/80 backdrop-blur-xl border border-white/50 overflow-x-auto">
                    {[
                        { id: 'dashboard', icon: Home },
                        { id: 'journal', icon: BookOpen },
                        { id: 'kajian', icon: Volume2 },
                        { id: 'quiz', icon: Award },
                        { id: 'ranking', icon: Trophy },
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
                            {item.id === 'kajian' && unreadMaterialCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>
                    ))}
                </div>
        </div>

        {/* History Modal */}
        {isHistoryModalOpen && renderHistoryModal()}

        {/* Journal Form Modal */}
        {isJournalModalOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-200">
                <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-6 w-full max-w-sm border border-white">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Lapor {activeJournalKey === 'tarawih' ? 'Tarawih' : 'Sholat'}</h3>
                    
                    {activeJournalKey.startsWith('sholat') && (
                        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                            <button onClick={() => setJournalForm({...journalForm, type: 'Sendiri'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${journalForm.type === 'Sendiri' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Sendiri</button>
                            <button onClick={() => setJournalForm({...journalForm, type: 'Jamaah'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${journalForm.type === 'Jamaah' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Jamaah</button>
                        </div>
                    )}

                    <div className="space-y-3 mb-6">
                        <input 
                            placeholder="Tempat (Rumah/Masjid/Musholla)" 
                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            value={journalForm.place}
                            onChange={(e) => setJournalForm({...journalForm, place: e.target.value})}
                        />
                        {activeJournalKey === 'tarawih' && (
                             <input 
                                placeholder="Nama Imam" 
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={journalForm.imam}
                                onChange={(e) => setJournalForm({...journalForm, imam: e.target.value})}
                             />
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setIsJournalModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition">Batal</button>
                        <button onClick={submitJournalModal} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">Simpan</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default StudentView;