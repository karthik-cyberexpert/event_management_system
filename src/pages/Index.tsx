import { useAuth } from "@/contexts/AuthContext";
import CoordinatorDashboard from "./coordinator/Dashboard";
import HodDashboard from "./hod/Dashboard";
import DeanDashboard from "./dean/Dashboard";
import PrincipalDashboard from "./principal/Dashboard";
import AdminDashboard from "./admin/Dashboard";

const Index = () => {
  const { profile } = useAuth();

  if (!profile) {
    return <div>Loading profile...</div>;
  }

  switch (profile.role) {
    case 'coordinator':
      return <CoordinatorDashboard />;
    case 'hod':
      return <HodDashboard />;
    case 'dean':
      return <DeanDashboard />;
    case 'principal':
      return <PrincipalDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <AdminDashboard />;
  }
};

export default Index;