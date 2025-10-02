import { Route, Routes } from "react-router-dom"
import CodesLayout from "./layouts/CodesLayout"
import Header from "../../layouts/Header"
import Footer from "../../layouts/Footer"
import CodesListPage from "./pages/CodesListPage"
import Layout from "../../components/Layout"

const CodesRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
                <Route index element={<CodesLayout MainPage={<CodesListPage />} />} />
            </Route>
        </Routes>
    )
}

export default CodesRoutes;