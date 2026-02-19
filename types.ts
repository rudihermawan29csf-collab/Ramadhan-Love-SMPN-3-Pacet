
export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
  GUEST = 'GUEST'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  className?: string; // For students and teachers
}

export interface KajianLog {
  id: string;
  date: string;
  speaker: string;
  place: string;
  summary: string;
}

export interface TadarusLog {
  id: string;
  date: string;
  surah: string;
  ayat: string;
}

export interface ReadLog {
  materialId: string;
  timestamp: string;
}

export interface StudentData {
  id: string;
  name: string;
  className: string;
  nis: string;
  nisn: string;
  points: number;
  journal: Record<string, DailyJournal>; // Key is date string YYYY-MM-DD
  kajianLogs: KajianLog[];
  tadarusLogs: TadarusLog[];
  readLogs: ReadLog[]; // Changed from string[] to ReadLog[] to track time
  readMaterialIds?: string[]; // Deprecated, kept for temporary type safety during migration
}

export interface DailyJournal {
  sholatSubuh: ActivityLog;
  sholatZuhur: ActivityLog;
  sholatAsar: ActivityLog;
  sholatMaghrib: ActivityLog;
  sholatIsya: ActivityLog;
  puasa: ActivityLog;
  tarawih: ActivityLog;
  dhuha: ActivityLog;
  tadarus?: boolean;
  haid?: boolean; // New field for Menstruation mode
}

export interface ActivityLog {
  completed: boolean;
  timestamp?: string;
  type?: 'Jamaah' | 'Sendiri'; // For prayers
  place?: string; // Rumah, Sekolah, Musholla, Masjid
  imam?: string; // For Tarawih
  pointsEarned?: number;
}

export interface Material {
  id: string;
  title: string;
  category: string; // Changed from union to string to allow custom categories and 'quiz'
  content: string;
  createdAt: string;
  youtubeUrl?: string; // Optional YouTube Link
}

export interface Broadcast {
  id: string;
  message: string;
  createdAt: string;
  active: boolean;
}

export interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
}

export interface AppSettings {
  schoolName: string;
  ramadhanYear: string;
  gregorianYear: string;
  // Login & Security Settings
  loginTitle: string;
  adminPassword: string;
  teacherPassword: string;
  copyrightText: string;
}

export const CLASSES = [
  'VII A', 'VII B', 'VII C',
  'VIII A', 'VIII B', 'VIII C',
  'IX A', 'IX B', 'IX C'
];