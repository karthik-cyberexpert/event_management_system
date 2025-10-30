import { NavLink } from 'react-router-dom';
import { Home, Building, Users, ShieldCheck, CalendarCheck, ClipboardList, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarProps = {
  role: 'admin' | 'coordinator' | 'hod' | 'dean' | 'principal';
};

const baseLinks = [
  { to: '/all-events', label: 'Events Overview', icon: ListChecks },
];

const navLinks = {
  admin: [
    { to: '/', label: 'Dashboard', icon: Home },
    ...baseLinks,
    { to: '/venues', label: 'Manage Venues', icon: Building },
    { to: '/users', label: 'Manage Users', icon: Users },
    { to: '/departments', label: 'Manage Departments', icon: Building },
    { to: '/clubs', label: 'Manage Clubs', icon: ClipboardList },
  ],
  coordinator: [
    { to: '/', label: 'My Events', icon: Home },
    ...baseLinks,
  ],
  hod: [
    { to: '/', label: 'Pending Events', icon: ShieldCheck },
    ...baseLinks,
  ],
  dean: [
    { to: '/', label: 'Pending Events', icon: ShieldCheck },
    ...baseLinks,
  ],
  principal: [
    { to: '/', label: 'Pending Events', icon: ShieldCheck },
    ...baseLinks,
  ],
};

const Sidebar = ({ role }: SidebarProps) => {
  const links = navLinks[role] || [];

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-6 text-2xl font-bold border-b border-sidebar-border">
        EMS
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2 rounded-md transition-colors',
                    isActive 
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;