import { StudentData, Material, Broadcast, CLASSES, AppSettings } from '../types';

// URL Google Apps Script yang Anda berikan
const API_URL = 'https://script.google.com/macros/s/AKfycbxGNzOjdmWmASjFlvHIx82_rbEgDjyxBqvGed2SRc4bQ_4ok2RYnCl1Emxguef747ZTKg/exec'; 

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

// Helper for caching to LocalStorage to make app feel fast
const cache = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const getFromCache = (key: string, defaultVal: any) => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultVal;
};

export const StorageService = {
  // Initialize now fetches from Cloud if possible
  init: async () => {
    // 1. Load local cache first for instant UI
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
       cache(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    
    // 2. Check if API URL is configured (not the default placeholder)
    const isApiConfigured = API_URL && !API_URL.includes('...'); 

    if (!isApiConfigured) {
        console.log("API URL belum dikonfigurasi. Berjalan dalam Mode Offline.");
        // Seed dummy data if completely empty
        if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
             seedLocalData();
        }
        return;
    }

    // 3. Attempt to fetch from Cloud
    try {
      const response = await fetch(`${API_URL}?action=getData`);
      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();
      
      if (data) {
        cache(STORAGE_KEYS.STUDENTS, data.students || []);
        cache(STORAGE_KEYS.MATERIALS, data.materials || []);
        cache(STORAGE_KEYS.BROADCASTS, data.broadcasts || []);
        // Merge settings
        const mergedSettings = { ...DEFAULT_SETTINGS, ...data.settings };
        cache(STORAGE_KEYS.SETTINGS, mergedSettings);
        console.log("Data synced from cloud");
      }
    } catch (e) {
      console.error("Gagal sinkronisasi cloud (menggunakan data lokal):", e);
      // Ensure we have something in local storage if fetch failed and local is empty
      if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
          seedLocalData();
      }
    }
  },

  // DATA GETTERS (Synchronous from Cache for UI Performance)
  getStudents: (): StudentData[] => getFromCache(STORAGE_KEYS.STUDENTS, []),
  getMaterials: (): Material[] => getFromCache(STORAGE_KEYS.MATERIALS, []),
  getBroadcasts: (): Broadcast[] => getFromCache(STORAGE_KEYS.BROADCASTS, []),
  getSettings: (): AppSettings => {
      const s = getFromCache(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS, ...s };
  },

  // DATA SETTERS (Update Cache + Async Push to Cloud)
  
  saveStudent: (student: StudentData) => {
    // 1. Update Local
    const students = StorageService.getStudents();
    const index = students.findIndex(s => s.id === student.id);
    if (index >= 0) students[index] = student;
    else students.push(student);
    cache(STORAGE_KEYS.STUDENTS, students);

    // 2. Push to Cloud
    pushToCloud('saveStudent', student);
  },

  deleteStudent: (id: string) => {
    const students = StorageService.getStudents().filter(s => s.id !== id);
    cache(STORAGE_KEYS.STUDENTS, students);
    pushToCloud('deleteStudent', { id });
  },

  saveAllStudents: (newStudents: StudentData[]) => {
    cache(STORAGE_KEYS.STUDENTS, newStudents);
    alert("Import Excel disimpan lokal. Sinkronisasi penuh ke Cloud mungkin memakan waktu atau memerlukan API khusus.");
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

// Helper to push data to Google Sheets
const pushToCloud = (action: string, payload: any) => {
    // Check if API is valid before trying to push
    if (!API_URL || API_URL.includes('...')) return;

    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors', // Important for Google Apps Script Web App
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload, id: payload.id })
    }).then(() => {
        console.log(`Synced ${action} to cloud`);
    }).catch(err => {
        console.error(`Failed to sync ${action}`, err);
    });
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
    
    // Seed initial material if empty
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