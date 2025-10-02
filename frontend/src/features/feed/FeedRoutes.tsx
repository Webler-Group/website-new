import { Route, Routes } from "react-router-dom"
import Layout from "../../components/Layout"
import Header from "../../layouts/Header"
import FeedLayout from "./layouts/FeedLayout"
import FeedListPage from "./pages/FeedListPage"
import RequireAuth from "../auth/components/RequireAuth"
import roles from "../../data/roles"
import FeedCreatePage from "./pages/FeedCreatePage"

const FeedRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" />} Footer={null} />}>
                <Route index element={<FeedLayout MainPage={<FeedListPage />} />} />
                <Route element={<RequireAuth allowedRoles={roles} />}>
                    <Route path="New" element={<FeedLayout MainPage={<FeedCreatePage />} />} />
                </Route>
                <Route path=":feedId" element={<FeedLayout MainPage={<FeedListPage />} />} />
            </Route>
        </Routes>
    )
}

export default FeedRoutes;