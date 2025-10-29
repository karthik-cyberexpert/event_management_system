import { Navigate } from 'react-router-dom';

const AdminDashboard = () => {
  // Redirect Admin to the comprehensive events overview page
  return <Navigate to="/events-overview" replace />;
};

export default AdminDashboard;