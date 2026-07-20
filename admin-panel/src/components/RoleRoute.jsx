import { Navigate } from "react-router-dom";
import { hasRole } from "../utils/permissions";

const RoleRoute = ({ allowedRoles, children }) => {
  if (!hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
