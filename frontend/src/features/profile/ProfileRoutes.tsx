import { Route, Routes } from "react-router-dom"
import Layout from "../../components/Layout"
import Header from "../../layouts/Header"
import Footer from "../../layouts/Footer"
import ProfilePage, { ProfileFromAuth } from "./pages/ProfilePage"
import "./profile.css"

const ProfileRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
                <Route path=":userId" element={<ProfilePage />} />
                <Route index element={<ProfileFromAuth />} />
            </Route>
        </Routes>
    )
}

export default ProfileRoutes;