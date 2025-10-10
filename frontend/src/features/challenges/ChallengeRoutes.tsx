import { Route, Routes } from "react-router-dom";
import SnackbarLayout from "../../layouts/SnackbarLayout";
import Header from "../../layouts/Header";
import ChallengeList from "./pages/ChallengeListPage";
import roles from "../../data/roles";
import RequireAuth from "../auth/components/RequireAuth";
import ChallengeDetailsPage from "./pages/ChallengeDetailsPage";
import ChallengeCreate from "./pages/ChallengeCreatePage";
import ChallengeEdit from "./pages/ChallengeEditPage";
import "./challenges.css";

const ChallengeRoutes = () => {
    return (
        <Routes>
            <Route element={<SnackbarLayout Header={<Header variant="light" />} Footer={null} />}>
                <Route index element={<ChallengeList />} />
                <Route element={<RequireAuth allowedRoles={roles} />}>
                    <Route path=":challengeId" element={<ChallengeDetailsPage />} />
                </Route>
                <Route element={<RequireAuth allowedRoles={["Admin", "Creator"]} />}>
                    <Route path="Create" element={<ChallengeCreate />} />
                    <Route path="Edit/:challengeId" element={<ChallengeEdit />} />
                </Route>
            </Route>
        </Routes>
    )
}

export default ChallengeRoutes;