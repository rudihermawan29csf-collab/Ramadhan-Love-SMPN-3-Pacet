import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { User, Role } from './types';
import Login from './components/Login';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';
import TeacherView from './components/TeacherView';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      // Fetch data from Google Sheets
      await StorageService.init();
      
      // Check session
      const storedUser = localStorage.getItem('ramadhan_app_user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };

    initApp();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ramadhan_app_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ramadhan_app_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
         <div className="text-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-indigo-900 font-bold">Menghubungkan ke Database...</p>
         </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      {currentUser.role === Role.STUDENT && (
        <StudentView user={currentUser} onLogout={handleLogout} />
      )}
      {currentUser.role === Role.ADMIN && (
        <AdminView onLogout={handleLogout} />
      )}
      {currentUser.role === Role.TEACHER && (
        <TeacherView user={currentUser} onLogout={handleLogout} />
      )}
    </>
  );
};

export default App;