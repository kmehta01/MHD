import { Navigate } from "react-router-dom";
import { hasAnyPermission } from "../utils/permissions";

const PermissionRoute = ({ permission, children }) => {
  if (!hasAnyPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PermissionRoute;
