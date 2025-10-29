import { NavLink } from 'react-router-dom';
import { Home, Building, Users, ShieldCheck, CalendarCheck, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarProps = {
  role: 'admin' | 'coordinator' | 'hod' | 'dean' | 'principal';
};

const baseLinks = [
  { to: '/approved-events', label: 'Approved Events', icon: CalendarCheck },
];

const navLinks = {
  admin: [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/venues', label: 'Manage Venues', icon: Building },
    { to: '/users', label: 'Manage Users', icon: Users },
    { to: '/departments', label: 'Manage Departments', icon: Building },
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
    <aside className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-6 text-2xl font-bold border-b border-gray-700">
        EMS
      </div>
      <nav className="flex-1 p-4">
        <ul>
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2 rounded-md transition-colors hover:bg-gray-700',
                    isActive ? 'bg-gray-900' : ''
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