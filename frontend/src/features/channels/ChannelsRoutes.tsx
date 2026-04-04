import { Route, Routes } from "react-router-dom"
import Layout from "../../layouts/Layout"
import Header from "../../layouts/Header"
import RequireAuth from "../auth/components/RequireAuth"
import ChannelsPage from "./pages/ChannelsPage"
import "./channels.css"
import RolesEnum from "../../data/RolesEnum"

const ChannelsRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" hideChannelsButton />} Footer={null} />}>
                <Route element={<RequireAuth allowedRoles={[RolesEnum.USER]} />}>
                    <Route index element={<ChannelsPage />} />
                    <Route path=":channelId" element={<ChannelsPage />} />
                </Route>
            </Route>
        </Routes>
    )
}

export default ChannelsRoutes;