import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';

const Layout = ({ children }: { children: ReactNode }) => {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 border-b bg-white">
          <h1 className="text-xl font-semibold">Event Platform</h1>
          <div className="flex items-center gap-4">
            <span>
              Welcome, {profile.first_name} ({profile.role})
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default Layout;