import { Route, Routes } from "react-router-dom"
import Layout from "../../layouts/Layout"
import Header from "../../layouts/Header"
import DiscussLayout from "./layouts/DiscussLayout"
import DiscussListPage from "./pages/DiscussListPage"
import DiscussAskPage from "./pages/DiscussAskPage"
import Footer from "../../layouts/Footer"
import DiscussPostPage from "./pages/DiscussPostPage"
import DiscussEditPage from "./pages/DiscussEditPage"
import RequireAuth from "../auth/components/RequireAuth"
import roles from "../../data/roles"
import "./discuss.css"

const DiscussRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
                <Route index element={<DiscussLayout MainPage={<DiscussListPage />} />} />
                <Route path=":questionId" element={<DiscussLayout MainPage={<DiscussPostPage />} />} />
                <Route element={<RequireAuth allowedRoles={roles} />}>
                    <Route path="New" element={<DiscussLayout MainPage={<DiscussAskPage questionId={null} />} />} />
                    <Route path="Edit/:questionId" element={<DiscussLayout MainPage={<DiscussEditPage />} />} />
                </Route>
            </Route>
        </Routes>
    )
}

export default DiscussRoutes;