import { Routes, Route } from 'react-router-dom';
import { compilerLanguages, languagesInfo } from './data/compilerLanguages';
import roles from './data/roles';
import Layout from './components/Layout';
import NotFoundPage from './pages/NotFoundPage';
import NoAuth from './features/auth/components/NoAuth';
import Header from './layouts/Header';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import HomePage from './pages/HomePage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import Footer from './layouts/Footer';
import ContactPage from './pages/ContactPage';
import FAQPage from './pages/FAQPage';
import RequireAuth from './features/auth/components/RequireAuth';
import ProfilePage, { ProfileFromAuth } from './features/profile/pages/ProfilePage';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import ActivateEmailPage from './features/auth/pages/ActivateEmailPage';
import DiscussLayout from './features/discuss/layouts/DiscussLayout';
import DiscussListPage from './features/discuss/pages/DiscussListPage';
import DiscussAskPage from './features/discuss/pages/DiscussAskPage';
import DiscussEditPage from './features/discuss/pages/DiscussEditPage';
import CodesLayout from './features/codes/layouts/CodesLayout';
import CodesListPage from './features/codes/pages/CodesListPage';
import PlaygroundMenuPage from './features/compiler-playground/pages/PlaygroundMenuPage';
import FeedCreatePage from './features/feed/pages/FeedCreatePage';
import FeedLayout from './features/feed/layouts/FeedLayout';
import CoursesEditorLayout from './features/courses/layouts/CourseEditorLayout';
import CourseEditorListPage from './features/courses/pages/CourseEditorListPage';
import CreateCoursePage from './features/courses/pages/CreateCoursePage';
import EditCoursePage from './features/courses/pages/EditCoursePage';
import CourseEditorPage from './features/courses/pages/CourseEditorPage';
import CourseListPage from './features/courses/pages/CourseListPage';
import CoursePage from './features/courses/pages/CoursePage';
import CourseLessonPage from './features/courses/pages/CourseLessonPage';
import AdminHomePage from './features/admin/pages/AdminHomePage';
import AdminUserListPage from './features/admin/pages/AdminUserListPage';
import ModViewPage from './features/admin/pages/ModViewPage';
import ToolsHomePage from './pages/ToolsHome';
import TagHomePage from './features/tags/pages/TagHome';
import DiscussPostPage from './features/discuss/pages/DiscussPostPage';
import PlaygroundEditorPage from './features/compiler-playground/pages/PlaygroundEditorPage';
import FeedListPage from './features/feed/pages/FeedListPage';
import ChannelsPage from './features/channels/pages/ChannelsPage';

function App() {

  const allRoles = [...roles];

  return (
    <Routes>

      <Route element={<NoAuth />}>
        <Route path="Users">
          <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
            <Route path="Login" element={<LoginPage />} />
            <Route path="Register" element={<RegisterPage />} />
            <Route path="Forgot-Password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
        <Route index element={<HomePage />} />
        <Route path="Terms-of-use" element={<TermsOfUsePage />} />
        <Route path="Contact" element={<ContactPage />} />
        <Route path='Faq' element={<FAQPage />} />
      </Route>

      <Route path="Users">
        <Route element={<Layout Header={null} Footer={null} />}>
          <Route path="Reset-Password" element={<ResetPasswordPage />} />
          <Route path="Activate" element={<ActivateEmailPage />} />
        </Route>
      </Route>

      <Route path="Discuss">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route index element={<DiscussLayout MainPage={<DiscussListPage />} />} />
          <Route path=":questionId" element={<DiscussLayout MainPage={<DiscussPostPage />} />} />
          <Route element={<RequireAuth allowedRoles={allRoles} />}>
            <Route path="New" element={<DiscussLayout MainPage={<DiscussAskPage questionId={null} />} />} />
            <Route path="Edit/:questionId" element={<DiscussLayout MainPage={<DiscussEditPage />} />} />
          </Route>
        </Route>
      </Route>

      <Route path="Codes">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route index element={<CodesLayout MainPage={<CodesListPage />} />} />
        </Route>
      </Route>

      <Route path="Compiler-Playground">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route index element={<PlaygroundMenuPage />} />
        </Route>
        {
          Object.keys(languagesInfo).map((lang, i) => {
            return (<Route key={i} path={lang} element={<PlaygroundEditorPage language={lang as compilerLanguages} />} />);
          })
        }
        <Route path=":codeId" element={<PlaygroundEditorPage language={null} />} />
      </Route>

      <Route path="Feed">
        <Route element={<Layout Header={<Header variant="light" />} Footer={null} />}>
          <Route index element={<FeedLayout MainPage={<FeedListPage />} />} />
          <Route element={<RequireAuth allowedRoles={allRoles} />}>
            <Route path="New" element={<FeedLayout MainPage={<FeedCreatePage />} />} />
          </Route>
          <Route path=":feedId" element={<FeedLayout MainPage={<FeedListPage />} />} />
        </Route>
      </Route>

      <Route path="Profile">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route path=":userId" element={<ProfilePage />} />
          <Route index element={<ProfileFromAuth />} />
        </Route>
      </Route>

      <Route path="Courses">

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

        <Route element={<RequireAuth allowedRoles={allRoles} />}>
          <Route path=":courseCode">
            <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
              <Route index element={<CoursePage />} />
            </Route>
            <Route path="Lesson/:lessonId" element={<CourseLessonPage />} />
          </Route>
        </Route>

      </Route>

      <Route path="Channels">

        <Route element={<Layout Header={<Header variant="light" hideChannelsButton />} Footer={null} />}>
          <Route element={<RequireAuth allowedRoles={allRoles} />}>
            <Route index element={<ChannelsPage />} />
            <Route path=":channelId" element={<ChannelsPage />} />
          </Route>
        </Route>

      </Route>

      <Route path="Admin">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<></>} />}>
          <Route element={<RequireAuth allowedRoles={["Admin", "Moderator"]} />}>
            <Route index element={<AdminHomePage />} />
            <Route path="UserSearch">
              <Route index element={<AdminUserListPage />} />
              <Route path=":userId" element={<ModViewPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="Tools">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<></>} />}>
          <Route index element={<ToolsHomePage />} />
          <Route element={<RequireAuth allowedRoles={["Admin", "Moderator"]} />}>
            <Route path="Tags" element={<TagHomePage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
        <Route path="/*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default App;