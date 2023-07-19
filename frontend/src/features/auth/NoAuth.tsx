import { useLocation, Navigate, Outlet } from "react-router-dom"
import { useAuth } from "./authContext"

const RequireAuth = () => {
    const location = useLocation();
    const { userInfo } = useAuth();

    const content = (
        userInfo
            ? <Navigate to="/Profile" state={{ from: location }} replace />
            : <Outlet />
    )

    return content
}
export default RequireAuth