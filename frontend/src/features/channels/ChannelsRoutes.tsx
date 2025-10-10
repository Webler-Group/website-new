import { Route, Routes } from "react-router-dom"
import Layout from "../../layouts/Layout"
import Header from "../../layouts/Header"
import RequireAuth from "../auth/components/RequireAuth"
import roles from "../../data/roles"
import ChannelsPage from "./pages/ChannelsPage"
import "./channels.css"

const ChannelsRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" hideChannelsButton />} Footer={null} />}>
                <Route element={<RequireAuth allowedRoles={roles} />}>
                    <Route index element={<ChannelsPage />} />
                    <Route path=":channelId" element={<ChannelsPage />} />
                </Route>
            </Route>
        </Routes>
    )
}

export default ChannelsRoutes;