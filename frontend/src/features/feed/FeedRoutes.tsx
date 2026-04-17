import { Route, Routes } from "react-router-dom"
import Layout from "../../layouts/Layout"
import Header from "../../layouts/Header"
import FeedLayout from "./layouts/FeedLayout"
import FeedListPage from "./pages/FeedListPage"
import RequireAuth from "../auth/components/RequireAuth"
import FeedCreatePage from "./pages/FeedCreatePage"
import "./feed.css"
import FeedEditPage from "./pages/FeedEditPage"
import RolesEnum from "../../data/RolesEnum"
import FeedSuggestedUserListPage from "./pages/FeedSuggestedUserListPage"

const FeedRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" />} Footer={null} />}>
                <Route index element={<FeedLayout MainPage={<FeedListPage />} />} />
                <Route element={<RequireAuth allowedRoles={[RolesEnum.USER]} />}>
                    <Route path="New" element={<FeedLayout MainPage={<FeedCreatePage feedId={null} />} />} />
                    <Route path="Edit/:feedId" element={<FeedLayout MainPage={<FeedEditPage />} />} />
                    <Route path="Users" element={<FeedLayout MainPage={<FeedSuggestedUserListPage/>} />} />
                </Route>
                <Route path=":feedId" element={<FeedLayout MainPage={<FeedListPage />} />} />
            </Route>
        </Routes>
    )
}

export default FeedRoutes;