import { Route, Routes } from "react-router-dom";
import Header from "../../layouts/Header";
import CourseListPage from "./pages/CourseListPage";
import Layout from "../../components/Layout";
import RequireAuth from "../auth/components/RequireAuth";
import CoursePage from "./pages/CoursePage";
import roles from "../../data/roles";
import Footer from "../../layouts/Footer";
import CoursesEditorLayout from "./layouts/CourseEditorLayout";
import CourseEditorListPage from "./pages/CourseEditorListPage";
import CourseEditorPage from "./pages/CourseEditorPage";
import CourseLessonPage from "./pages/CourseLessonPage";
import CreateCoursePage from "./pages/CreateCoursePage";
import EditCoursePage from "./pages/EditCoursePage";

const CoursesRoutes = () => {
    return (
        <Routes>
            <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
                <Route element={<RequireAuth allowedRoles={["Admin", "Creator"]} />}>
                    <Route path="Editor">
                        <Route index element={<CoursesEditorLayout MainPage={<CourseEditorListPage />} />} />
                        <Route path="New" element={<CoursesEditorLayout MainPage={<CreateCoursePage courseId={null} />} />} />
                        <Route path="Edit/:courseId" element={<CoursesEditorLayout MainPage={<EditCoursePage />} />} />
                        <Route path=":courseId">
                            <Route index element={<CoursesEditorLayout MainPage={<CourseEditorPage />} />} />
                            <Route path="Lesson/:lessonId" element={<CoursesEditorLayout MainPage={<CourseEditorPage />} />} />
                        </Route>
                    </Route>
                </Route>
            </Route>

            <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
                <Route index element={<CourseListPage />} />
            </Route>

            <Route element={<RequireAuth allowedRoles={roles} />}>
                <Route path=":courseCode">
                    <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
                        <Route index element={<CoursePage />} />
                    </Route>
                    <Route path="Lesson/:lessonId" element={<CourseLessonPage />} />
                </Route>
            </Route>
        </Routes>
    )
}

export default CoursesRoutes;