import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-4xl font-bold mb-4">Welcome to the Dashboard</h1>
        {user && <p className="text-xl text-gray-600 mb-2">Hello, {user.email}</p>}
        {profile && <p className="text-lg text-gray-500 mb-4">Your role is: <span className="font-semibold capitalize">{profile.role}</span></p>}
        <Button onClick={signOut}>Sign Out</Button>
      </div>
    </div>
  );
};

export default Index;