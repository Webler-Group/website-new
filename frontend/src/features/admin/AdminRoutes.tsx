import { Route, Routes } from "react-router-dom"
import Layout from "../../layouts/Layout"
import Header from "../../layouts/Header"
import RequireAuth from "../auth/components/RequireAuth"
import AdminHomePage from "./pages/AdminHomePage"
import AdminUserListPage from "./pages/AdminUserListPage"
import ModViewPage from "./pages/ModViewPage"
import RolesEnum from "../../data/RolesEnum"

const AdminRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" />} Footer={<></>} />}>
                <Route element={<RequireAuth allowedRoles={[RolesEnum.ADMIN, RolesEnum.MODERATOR]} />}>
                    <Route index element={<AdminHomePage />} />
                    <Route path="UserSearch">
                        <Route index element={<AdminUserListPage />} />
                        <Route path=":userId" element={<ModViewPage />} />
                    </Route>
                </Route>
            </Route>
        </Routes>
    )
}

export default AdminRoutes;