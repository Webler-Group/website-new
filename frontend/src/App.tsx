import { Routes, Route } from 'react-router-dom';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import RequireAuth from './features/auth/components/RequireAuth';
import Home from './pages/Home';
import { Profile, ProfileFromAuth } from './features/profile/pages/Profile';
import NoAuth from './features/auth/components/NoAuth';
import TermsOfUse from './pages/TermsOfUse';
import Discuss from './features/discuss/pages/Discuss';
import Contact from './pages/Contact';
import FeedDetails from './features/feed/components/FeedDetail';
import FeedList from './features/feed/components/FeedList';
import QuestionList from './features/discuss/pages/DiscussList';
import AskQuestion from './features/discuss/pages/DiscussAsk';
import DiscussPost from './features/discuss/pages/DiscussPost';
import DiscussEdit from './features/discuss/pages/DiscussEdit';
import Blog from './features/blog/pages/Blog';
import Entry from './features/blog/pages/Entry';
import PlaygroundEditor from './features/compiler-playground/pages/PlaygroundEditor';
import PlaygroundMenu from './features/compiler-playground/pages/PlaygroundMenu';
import Header from './layouts/Header';
import Footer from './layouts/Footer';
import Codes from './features/codes/pages/Codes';
import CodesList from './features/codes/pages/CodesList';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import ResetPassword from './features/auth/pages/ResetPassword';
import ActivateEmail from './features/auth/pages/ActivateEmail';
import CoursesEditorPage from './features/courses/pages/CourseEditorPage';
import CourseEditorList from './features/courses/pages/CourseEditorList';
import CreateCourse from './features/courses/pages/CreateCourse';
import EditCourse from './features/courses/pages/EditCourse';
import CourseEditor from './features/courses/pages/CourseEditor';
import CourseList from './features/courses/pages/CourseList';
import { compilerLanguages, languagesInfo } from './data/compilerLanguages';
// import {  ChannelsList } from './features/channels/pages/ChannelsList';
import CoursePage from './features/courses/pages/CoursePage';
import CourseLessonPage from './features/courses/pages/CourseLessonPage';
import ChannelsPage from './features/channels/pages/ChannelsPage';
import ToolsHome from './tools/ToolsHome';
import TagHome from './tools/tags/pages/TagHome';
import roles from './data/roles';
import AdminHome from './tools/admin/pages/AdminHome';
import AdminUserList from './tools/admin/pages/AdminUserList';
import ModView from './tools/admin/pages/ModView';
import FeedCreate from './features/feed/components/FeedCreate';
import { FeedProvider } from "./features/feed/components/FeedContext";


function App() {

  const allRoles = [...roles];

  return (
    <FeedProvider>
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
          {/* Feed List */}
          <Route index element={<FeedList />} />
          <Route path='New' element={<FeedCreate />} />

          {/* Single Feed Detail */}
          <Route path=":id" element={<FeedDetails/>} />

        </Route>
      </Route>


      <Route path="Blog">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route index element={<Blog />} />
          <Route path=":entryName" element={<Entry />} />
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

      <Route element={<Layout Header={<Header variant="light" />} Footer={null} />}>
        <Route path="/*" element={<NotFound />} />
      </Route>
    </Routes>
    </FeedProvider>
  );
};

export default App;