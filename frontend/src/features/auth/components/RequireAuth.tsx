import { useLocation, Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/authContext"

interface RequireAuthProps {
    allowedRoles: string[];
}

const RequireAuth = ({ allowedRoles }: RequireAuthProps) => {
    const location = useLocation();
    const { userInfo } = useAuth();

    const content = (
        userInfo?.roles.some(role => allowedRoles.includes(role))
            ? <Outlet />
            : <Navigate to="/Login" state={{ from: location }} replace />
    )

    return content
}
export default RequireAuth