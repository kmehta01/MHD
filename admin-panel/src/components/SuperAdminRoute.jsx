import { Navigate } from "react-router-dom";
import { isSuperAdmin } from "../utils/permissions";

const SuperAdminRoute = ({ children }) => {
  if (!isSuperAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default SuperAdminRoute;
