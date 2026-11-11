import { Route, Routes } from "react-router-dom";
import SnackbarLayout from "../../layouts/SnackbarLayout";
import Header from "../../layouts/Header";
import Footer from "../../layouts/Footer";
import ChallengeList from "./pages/ChallengeListPage";
import RequireAuth from "../auth/components/RequireAuth";
import ChallengeDetailsPage from "./pages/ChallengeDetailsPage";
import ChallengeCreate from "./pages/ChallengeCreatePage";
import ChallengeEdit from "./pages/ChallengeEditPage";
import ChallengeCollectionPage from "./pages/ChallengeCollectionPage";
import ChallengeCollectionEditPage from "./pages/ChallengeCollectionEditPage";
import "./challenges.css";
import RolesEnum from "../../data/RolesEnum";

const ChallengeRoutes = () => {
    return (
        <Routes>
            <Route element={<SnackbarLayout Header={<Header variant="light" />} Footer={<Footer />} wide />}>
                <Route index element={<ChallengeList />} />
                <Route path="Collection/:collectionId" element={<ChallengeCollectionPage />} />
                <Route element={<RequireAuth allowedRoles={[RolesEnum.USER]} />}>
                    <Route path=":challengeId" element={<ChallengeDetailsPage />} />
                </Route>
                <Route element={<RequireAuth allowedRoles={[RolesEnum.CREATOR]} />}>
                    <Route path="Create" element={<ChallengeCreate />} />
                    <Route path="Edit/:challengeId" element={<ChallengeEdit />} />
                    <Route path="Collection/Create" element={<ChallengeCollectionEditPage />} />
                    <Route path="Collection/Edit/:collectionId" element={<ChallengeCollectionEditPage />} />
                </Route>
            </Route>
        </Routes>
    )
}

export default ChallengeRoutes;