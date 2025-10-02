import { Routes, Route } from 'react-router-dom';
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
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage';
import ActivateEmailPage from './features/auth/pages/ActivateEmailPage';
import React from 'react';
import ToolsHomePage from './pages/ToolsHome';
import RequireAuth from './features/auth/components/RequireAuth';
import TagHomePage from './features/tags/pages/TagHome';
import LoadingPage from './pages/LoadingPage';
const ChannelsRoutes = React.lazy(() => import("./features/channels/ChannelsRoutes"));
const CoursesRoutes = React.lazy(() => import("./features/courses/CoursesRoutes"));
const DiscussRoutes = React.lazy(() => import("./features/discuss/DiscussRoutes"));
const FeedRoutes = React.lazy(() => import("./features/feed/FeedRoutes"));
const CompilerPlaygroundRoutes = React.lazy(() => import('./features/compiler-playground/CompilerPlaygroundRoutes'));
const CodesRoutes = React.lazy(() => import('./features/codes/CodesRoutes'));
const AdminRoutes = React.lazy(() => import('./features/admin/AdminRoutes'));
const ProfileRoutes = React.lazy(() => import('./features/profile/ProfileRoutes'));

function App() {

  return (
    <React.Suspense fallback={<LoadingPage />}>
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

      <Route path="Tools">
        <Route element={<Layout Header={<Header variant="light" />} Footer={<></>} />}>
          <Route index element={<ToolsHomePage />} />
          <Route element={<RequireAuth allowedRoles={["Admin", "Moderator"]} />}>
            <Route path="Tags" element={<TagHomePage />} />
          </Route>
        </Route>
      </Route>

        <Route path="Admin/*" element={<AdminRoutes />} />
        <Route path="Channels/*" element={<ChannelsRoutes />} />
        <Route path="Codes/*" element={<CodesRoutes />} />
        <Route path="Compiler-Playground/*" element={<CompilerPlaygroundRoutes />} />
        <Route path="Courses/*" element={<CoursesRoutes />} />
        <Route path="Discuss/*" element={<DiscussRoutes />} />
        <Route path="Feed/*" element={<FeedRoutes />} />
        <Route path="Profile/*" element={<ProfileRoutes />} />

        <Route element={<Layout Header={<Header variant="light" />} Footer={<Footer />} />}>
          <Route path="/*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
};

export default App;