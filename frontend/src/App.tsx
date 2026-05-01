import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RecoveryPage } from './pages/RecoveryPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { JournalFeed } from './components/JournalFeed';
import { HistoryCalendar } from './components/HistoryCalendar';
import { UserSettings } from './components/UserSettings';
import { AppSettings } from './components/AppSettings';
import { ChatWidget } from './components/ChatWidget';
import { EnduranceDashboard } from './components/EnduranceDashboard';
import { DataPortability } from './components/DataPortability';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MainApp() {
  const { token, isLoading } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'journal' | 'biometrics' | 'history' | 'endurance' | 'user-settings' | 'app-settings' | 'data-portability'>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register' | 'recovery'>('login');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[rgb(var(--bg-primary))] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    if (authView === 'register') return <RegisterPage onLoginClick={() => setAuthView('login')} />;
    if (authView === 'recovery') return <RecoveryPage onBackToLogin={() => setAuthView('login')} />;
    return <LoginPage onRegisterClick={() => setAuthView('register')} onRecoveryClick={() => setAuthView('recovery')} />;
  }

  return (
    <div className="flex h-screen bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Navigation Sidebar */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'endurance' && <EnduranceDashboard />}
        {activeView === 'data-portability' && <DataPortability />}
        
        {activeView === 'journal' && (
           <div className="flex-1 overflow-hidden flex flex-col">
              <JournalFeed viewMode="journal" />
           </div>
        )}

        {activeView === 'biometrics' && (
           <div className="flex-1 overflow-hidden flex flex-col">
              <JournalFeed viewMode="biometrics" initialTab="health" />
           </div>
        )}

        {activeView === 'history' && (
           <div className="flex-1 overflow-hidden">
              <HistoryCalendar />
           </div>
        )}

        {activeView === 'user-settings' && <UserSettings />}
        {activeView === 'app-settings' && <AppSettings />}

        {/* Floating Chat Assistant */}
        <ChatWidget />
      </main>

    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
