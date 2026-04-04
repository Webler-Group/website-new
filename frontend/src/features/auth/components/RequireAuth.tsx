import { useLocation, Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/authContext"
import RolesEnum from "../../../data/RolesEnum";

interface RequireAuthProps {
    allowedRoles: RolesEnum[];
}

const RequireAuth = ({ allowedRoles }: RequireAuthProps) => {
    const location = useLocation();
    const { userInfo } = useAuth();

    const content = (
        userInfo?.roles.some(role => [...allowedRoles, RolesEnum.ADMIN].includes(role))
            ? <Outlet />
            : <Navigate to={"/Users/Login?returnUrl=" + location.pathname} state={{ from: location }} replace />
    )

    return content
}
export default RequireAuth