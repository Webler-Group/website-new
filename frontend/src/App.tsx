import React from 'react';
import { Routes, Route } from 'react-router-dom';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { compilerLanguages, languagesInfo } from './data/compilerLanguages';
import roles from './data/roles';

const NotFound = React.lazy(() => import('./pages/NotFound'));
const Layout = React.lazy(() => import('./components/Layout'));
const Login = React.lazy(() => import('./features/auth/pages/Login'));
const Register = React.lazy(() => import('./features/auth/pages/Register'));
const RequireAuth = React.lazy(() => import('./features/auth/components/RequireAuth'));
const Home = React.lazy(() => import('./pages/Home'));
const Profile = React.lazy(() => import('./features/profile/pages/Profile').then(module => ({ default: module.Profile })));
const ProfileFromAuth = React.lazy(() => import('./features/profile/pages/Profile').then(module => ({ default: module.ProfileFromAuth })));
const NoAuth = React.lazy(() => import('./features/auth/components/NoAuth'));
const TermsOfUse = React.lazy(() => import('./pages/TermsOfUse'));
const Discuss = React.lazy(() => import('./features/discuss/pages/Discuss'));
const Contact = React.lazy(() => import('./pages/Contact'));
const QuestionList = React.lazy(() => import('./features/discuss/pages/DiscussList'));
const AskQuestion = React.lazy(() => import('./features/discuss/pages/DiscussAsk'));
const DiscussPost = React.lazy(() => import('./features/discuss/pages/DiscussPost'));
const DiscussEdit = React.lazy(() => import('./features/discuss/pages/DiscussEdit'));
const PlaygroundEditor = React.lazy(() => import('./features/compiler-playground/pages/PlaygroundEditor'));
const PlaygroundMenu = React.lazy(() => import('./features/compiler-playground/pages/PlaygroundMenu'));
const Header = React.lazy(() => import('./layouts/Header'));
const Footer = React.lazy(() => import('./layouts/Footer'));
const Codes = React.lazy(() => import('./features/codes/pages/Codes'));
const CodesList = React.lazy(() => import('./features/codes/pages/CodesList'));
const ForgotPassword = React.lazy(() => import('./features/auth/pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./features/auth/pages/ResetPassword'));
const ActivateEmail = React.lazy(() => import('./features/auth/pages/ActivateEmail'));
const CoursesEditorPage = React.lazy(() => import('./features/courses/pages/CourseEditorPage'));
const CourseEditorList = React.lazy(() => import('./features/courses/pages/CourseEditorList'));
const CreateCourse = React.lazy(() => import('./features/courses/pages/CreateCourse'));
const EditCourse = React.lazy(() => import('./features/courses/pages/EditCourse'));
const CourseEditor = React.lazy(() => import('./features/courses/pages/CourseEditor'));
const CourseList = React.lazy(() => import('./features/courses/pages/CourseList'));
const CoursePage = React.lazy(() => import('./features/courses/pages/CoursePage'));
const CourseLessonPage = React.lazy(() => import('./features/courses/pages/CourseLessonPage'));
const ChannelsPage = React.lazy(() => import('./features/channels/pages/ChannelsPage'));
const ToolsHome = React.lazy(() => import('./tools/ToolsHome'));
const TagHome = React.lazy(() => import('./tools/tags/pages/TagHome'));
const AdminHome = React.lazy(() => import('./tools/admin/pages/AdminHome'));
const AdminUserList = React.lazy(() => import('./tools/admin/pages/AdminUserList'));
const ModView = React.lazy(() => import('./tools/admin/pages/ModView'));
const FeedLayout = React.lazy(() => import('./features/feed/FeedLayout'));
const FeedCreate = React.lazy(() => import('./features/feed/components/FeedCreate'));
const FAQ = React.lazy(() => import('./pages/FAQ'));

function App() {

  const allRoles = [...roles];

  return (
    <Routes>

      <Route element={<NoAuth />}>
        <Route path="Users">
          <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
            <Route path="Login" element={<Login />} />
            <Route path="Register" element={<Register />} />
            <Route path="Forgot-Password" element={<ForgotPassword />} />
          </Route>
        </Route>
      </Route>

      <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
        <Route index element={<Home />} />
        <Route path="Terms-of-use" element={<TermsOfUse />} />
        <Route path="Contact" element={<Contact />} />
        <Route path='Faq' element={<FAQ />} />
      </Route>

      <Route path="Users">
        <Route element={<Layout Header={null} Footer={null} />}>
          <Route path="Reset-Password" element={<ResetPassword />} />
          <Route path="Activate" element={<ActivateEmail />} />
        </Route>
      </Route>

      <Route path="Discuss">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route index element={<Discuss MainPage={<QuestionList />} />} />
          <Route path=":questionId" element={<Discuss MainPage={<DiscussPost />} />} />
          <Route element={<RequireAuth allowedRoles={allRoles} />}>
            <Route path="New" element={<Discuss MainPage={<AskQuestion questionId={null} />} />} />
            <Route path="Edit/:questionId" element={<Discuss MainPage={<DiscussEdit />} />} />
          </Route>
        </Route>
      </Route>

      <Route path="Codes">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route index element={<Codes MainPage={<CodesList />} />} />
        </Route>
      </Route>

      <Route path="Compiler-Playground">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route index element={<PlaygroundMenu />} />
        </Route>
        {
          Object.keys(languagesInfo).map((lang, i) => {
            return (<Route key={i} path={lang} element={<PlaygroundEditor language={lang as compilerLanguages} />} />);
          })
        }
        <Route path=":codeId" element={<PlaygroundEditor language={null} />} />
      </Route>

      <Route path="Feed">
        <Route element={<Layout Header={<Header variant="light" />} Footer={null} />}>
          <Route index element={<FeedLayout />} />
          <Route element={<RequireAuth allowedRoles={allRoles} />}>
            <Route path="New" element={<FeedCreate />} />
          </Route>
          <Route path=":feedId" element={<FeedLayout />} />
        </Route>
      </Route>

      <Route path="Profile">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route path=":userId" element={<Profile />} />
          <Route index element={<ProfileFromAuth />} />
        </Route>
      </Route>

      <Route path="Courses">

        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route element={<RequireAuth allowedRoles={["Admin", "Creator"]} />}>
            <Route path="Editor">
              <Route index element={<CoursesEditorPage MainPage={<CourseEditorList />} />} />
              <Route path="New" element={<CoursesEditorPage MainPage={<CreateCourse courseId={null} />} />} />
              <Route path="Edit/:courseId" element={<CoursesEditorPage MainPage={<EditCourse />} />} />
              <Route path=":courseId">
                <Route index element={<CoursesEditorPage MainPage={<CourseEditor />} />} />
                <Route path="Lesson/:lessonId" element={<CoursesEditorPage MainPage={<CourseEditor />} />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route index element={<CourseList />} />
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
            <Route index element={<AdminHome />} />
            <Route path="UserSearch">
              <Route index element={<AdminUserList />} />
              <Route path=":userId" element={<ModView />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="Tools">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<></>} />}>
          <Route index element={<ToolsHome />} />
          <Route element={<RequireAuth allowedRoles={["Admin", "Moderator"]} />}>
            <Route path="Tags" element={<TagHome />} />
          </Route>
        </Route>
      </Route>

      <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
        <Route path="/*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;