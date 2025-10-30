import { Navigate } from 'react-router-dom';

const AdminDashboard = () => {
  // Redirect Admin to the new styled dashboard
  return <Navigate to="/styled-dashboard" replace />;
};

export default AdminDashboard;