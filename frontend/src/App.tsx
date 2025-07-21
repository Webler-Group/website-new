import { Routes, Route } from 'react-router-dom';

import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import RequireAuth from './features/auth/components/RequireAuth';
import roles from './data/roles';
import Home from './pages/Home';
import { Profile, ProfileFromAuth } from './features/profile/pages/Profile';
import NoAuth from './features/auth/components/NoAuth';
import TermsOfUse from './pages/TermsOfUse';
import Discuss from './features/discuss/pages/Discuss';
import Contact from './pages/Contact';
import Feed from './features/feed/pages/Feed';
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
import { languagesInfo } from './data/compilerLanguages';
import CoursePage from './features/courses/pages/CoursePage';
import CourseLessonPage from './features/courses/pages/CourseLessonPage';


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
      </Route>

      <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
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
            return (<Route key={i} path={lang} element={<PlaygroundEditor language={lang} />} />);
          })
        }
        <Route path=":codeId" element={<PlaygroundEditor language="" />} />
      </Route>

      <Route path="Feed">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route index element={<Feed />} />
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
              <Route path="New" element={<CoursesEditorPage MainPage={<CreateCourse courseCode={null} />} />} />
              <Route path="Edit/:courseCode" element={<CoursesEditorPage MainPage={<EditCourse />} />} />
              <Route path=":courseCode">
                <Route index element={<CoursesEditorPage MainPage={<CourseEditor />} />} />
                <Route path="Lesson/:lessonId" element={<CoursesEditorPage MainPage={<CourseEditor />} />} />
              </Route>
            </Route>
          </Route>

        </Route>

        <Route element={<RequireAuth allowedRoles={allRoles} />}>
          <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
            <Route index element={<CourseList />} />
          </Route>
          <Route path=":courseCode">
            <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
              <Route index element={<CoursePage />} />
            </Route>
            <Route path="Lesson/:lessonId" element={<CourseLessonPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<Layout Header={<Header variant="light" />} Footer={null} />}>
        <Route path="/*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
