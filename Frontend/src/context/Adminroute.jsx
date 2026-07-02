// context/AdminRoute.jsx
// Wrap any route that should only be reachable by a logged-in admin.
// Usage in main.jsx:
//   { path: "/admin/products", element: <AdminRoute><AdminProductsList/></AdminRoute> }

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // AuthContext is still resolving refreshUser() on app load — don't
  // redirect prematurely just because `user` hasn't populated yet.
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[13.5px] text-[#4B4F57]">
        Checking session…
      </div>
    );
  }

  const isStaff = user?.role === "admin";

  if (!isStaff) {
    // send them to login, remember where they were headed
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default AdminRoute;