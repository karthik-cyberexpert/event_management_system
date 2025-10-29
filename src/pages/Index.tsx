import { useAuth } from "@/contexts/AuthContext";
import TeacherDashboard from "./teacher/Dashboard";
import HodDashboard from "./hod/Dashboard";
import DeanDashboard from "./dean/Dashboard";
// import AdminDashboard from "./admin/Dashboard"; // Placeholder for future
// import PrincipalDashboard from "./principal/Dashboard"; // Placeholder for future

const Index = () => {
  const { profile } = useAuth();

  if (!profile) {
    return <div>Loading profile...</div>;
  }

  switch (profile.role) {
    case 'teacher':
      return <TeacherDashboard />;
    case 'hod':
      return <HodDashboard />;
    case 'dean':
      return <DeanDashboard />;
    // case 'admin':
    //   return <AdminDashboard />;
    // case 'principal':
    //   return <PrincipalDashboard />;
    default:
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold">Welcome, {profile.first_name}</h1>
          <p>Your role ({profile.role}) dashboard is not yet available.</p>
        </div>
      );
  }
};

export default Index;