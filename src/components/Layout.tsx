import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

const Layout = ({ children }: { children: ReactNode }) => {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return (
      <div className="flex min-h-screen">
        <aside className="w-64 bg-gray-800 p-4">
           <div className="p-2 mb-4">
             <Skeleton className="h-8 w-2/5 bg-gray-700" />
           </div>
           <div className="space-y-2">
             <Skeleton className="h-9 w-full bg-gray-700" />
             <Skeleton className="h-9 w-full bg-gray-700" />
             <Skeleton className="h-9 w-full bg-gray-700" />
           </div>
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="flex justify-between items-center p-4 border-b bg-white">
            <Skeleton className="h-7 w-48" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-24" />
            </div>
          </header>
          <main className="flex-1 p-6 bg-gray-50">
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-96 w-full" />
            </div>
          </main>
        </div>
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