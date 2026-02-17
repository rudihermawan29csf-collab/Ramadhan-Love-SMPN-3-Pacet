import { StudentData, Material, Broadcast, CLASSES, AppSettings } from '../types';

// URL Google Apps Script yang Anda berikan
const API_URL = 'https://script.google.com/macros/s/AKfycbwPrOv7x9ARHq9TcvAJL-Uh3iNa_iKFjrohf_SkqN3Ws9r3qdH-w7B4jFTfNqUUiFgHZA/exec'.trim(); 

const STORAGE_KEYS = {
  STUDENTS: 'ramadhan_app_students',
  MATERIALS: 'ramadhan_app_materials',
  BROADCASTS: 'ramadhan_app_broadcasts',
  SETTINGS: 'ramadhan_app_settings',
  LAST_FETCH: 'ramadhan_last_fetch'
};

const DEFAULT_SETTINGS: AppSettings = {
    schoolName: 'SMPN 3 Pacet',
    ramadhanYear: '1446 H',
    gregorianYear: '2026',
    loginTitle: 'Ramadhan Love',
    adminPassword: 'admin123',
    teacherPassword: 'walas123',
    copyrightText: '© 2026/1447 H SMPN 3 Pacet'
};

const cache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Storage full or error", e);
  }
};

const getFromCache = (key: string, defaultVal: any) => {
  const item = localStorage.getItem(key);
  try {
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

export const StorageService = {
  init: async () => {
    // 1. Load local cache first
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
       cache(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    
    // 2. Check API
    const isApiConfigured = API_URL && !API_URL.includes('...'); 

    if (!isApiConfigured) {
        console.log("API URL belum dikonfigurasi. Berjalan dalam Mode Offline.");
        if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
             seedLocalData();
        }
        return;
    }

    // 3. Fetch from Cloud
    try {
      // IMPORTANT: 
      // 1. credentials: 'omit' prevents cookie issues with Google Accounts
      // 2. No custom headers (like Accept) to prevent Preflight OPTIONS request which GAS fails on
      // 3. redirect: 'follow' to handle the GAS 302 redirect
      const response = await fetch(`${API_URL}?action=getData&_=${Date.now()}`, {
          method: 'GET',
          redirect: 'follow', 
          credentials: 'omit',
      });

      if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
      
      const data = await response.json();
      
      if (data) {
        // Validate and cache
        if(Array.isArray(data.students)) cache(STORAGE_KEYS.STUDENTS, data.students);
        if(Array.isArray(data.materials)) cache(STORAGE_KEYS.MATERIALS, data.materials);
        if(Array.isArray(data.broadcasts)) cache(STORAGE_KEYS.BROADCASTS, data.broadcasts);
        
        if(data.settings) {
            const mergedSettings = { ...DEFAULT_SETTINGS, ...data.settings };
            cache(STORAGE_KEYS.SETTINGS, mergedSettings);
        }
        console.log("Data synced from cloud");
      }
    } catch (e) {
      console.error("Gagal sinkronisasi cloud (menggunakan data lokal):", e);
      if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
          seedLocalData();
      }
    }
  },

  getStudents: (): StudentData[] => getFromCache(STORAGE_KEYS.STUDENTS, []),
  getMaterials: (): Material[] => getFromCache(STORAGE_KEYS.MATERIALS, []),
  getBroadcasts: (): Broadcast[] => getFromCache(STORAGE_KEYS.BROADCASTS, []),
  getSettings: (): AppSettings => {
      const s = getFromCache(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS, ...s };
  },

  saveStudent: (student: StudentData) => {
    const students = StorageService.getStudents();
    const index = students.findIndex(s => s.id === student.id);
    if (index >= 0) students[index] = student;
    else students.push(student);
    cache(STORAGE_KEYS.STUDENTS, students);
    pushToCloud('saveStudent', student);
  },

  deleteStudent: (id: string) => {
    const students = StorageService.getStudents().filter(s => s.id !== id);
    cache(STORAGE_KEYS.STUDENTS, students);
    pushToCloud('deleteStudent', { id });
  },

  // Fungsi baru untuk Import Excel dengan antrian upload ke Cloud
  importStudents: (newStudents: StudentData[]) => {
    // 1. Simpan Lokal (Gabungkan dengan data lama)
    const currentStudents = StorageService.getStudents();
    const updatedList = [...currentStudents, ...newStudents];
    cache(STORAGE_KEYS.STUDENTS, updatedList);

    // 2. Sync ke Cloud (Spreadsheet)
    // Kita kirim satu per satu dengan jeda waktu untuk menghindari error "Too Many Requests" atau timeout dari Google Script
    if (newStudents.length > 0) {
        console.log(`Mulai sinkronisasi ${newStudents.length} data siswa ke cloud...`);
        newStudents.forEach((student, index) => {
            setTimeout(() => {
                pushToCloud('saveStudent', student);
                console.log(`Mengirim siswa ${index + 1}/${newStudents.length}: ${student.name}`);
            }, index * 1000); // Jeda 1 detik per request agar aman
        });
    }
  },

  saveMaterial: (material: Material) => {
    const materials = StorageService.getMaterials();
    const index = materials.findIndex(m => m.id === material.id);
    if (index >= 0) materials[index] = material;
    else materials.push(material);
    cache(STORAGE_KEYS.MATERIALS, materials);
    pushToCloud('saveMaterial', material);
  },

  deleteMaterial: (id: string) => {
    const materials = StorageService.getMaterials().filter(m => m.id !== id);
    cache(STORAGE_KEYS.MATERIALS, materials);
    pushToCloud('deleteMaterial', { id });
  },

  saveBroadcast: (broadcast: Broadcast) => {
    const list = StorageService.getBroadcasts();
    const index = list.findIndex(b => b.id === broadcast.id);
    if (index >= 0) list[index] = broadcast;
    else list.push(broadcast);
    cache(STORAGE_KEYS.BROADCASTS, list);
    pushToCloud('saveBroadcast', broadcast);
  },

  saveSettings: (settings: AppSettings) => {
    cache(STORAGE_KEYS.SETTINGS, settings);
    pushToCloud('saveSettings', settings);
  }
};

const pushToCloud = (action: string, payload: any) => {
    if (!API_URL || API_URL.includes('...')) return;

    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
            'Content-Type': 'text/plain', // Simplest content type
        },
        body: JSON.stringify({ action, payload, id: payload.id })
    }).catch(err => console.error(`Failed to sync ${action}`, err));
};

const seedLocalData = () => {
    const initialStudents: StudentData[] = [];
    CLASSES.forEach((cls, classIdx) => {
      for (let i = 1; i <= 5; i++) {
        initialStudents.push({
          id: `stu_${classIdx}_${i}`,
          name: `Siswa ${cls} ${i}`,
          className: cls,
          nis: `10${classIdx}${i}`,
          nisn: `00456${classIdx}${i}`,
          points: 0,
          journal: {},
          kajianLogs: [],
          tadarusLogs: [],
          readLogs: []
        });
      }
    });
    cache(STORAGE_KEYS.STUDENTS, initialStudents);
    
    if (!localStorage.getItem(STORAGE_KEYS.MATERIALS)) {
        cache(STORAGE_KEYS.MATERIALS, [
          {
            id: 'mat_1',
            title: 'Niat Puasa Ramadhan',
            category: 'fiqih',
            content: 'Niat puasa adalah: Nawaitu shauma ghadin an adai fardhi syahri ramadhana hadzihis sanati lillahi ta\'ala.',
            createdAt: new Date().toISOString()
          }
        ]);
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.BROADCASTS)) {
        cache(STORAGE_KEYS.BROADCASTS, [{
            id: 'bc_1',
            message: 'Selamat Menunaikan Ibadah Puasa. Aplikasi berjalan dalam mode Offline.',
            createdAt: new Date().toISOString(),
            active: true
        }]);
    }
};