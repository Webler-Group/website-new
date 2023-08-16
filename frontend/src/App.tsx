import { Routes, Route } from 'react-router-dom';

import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import RequireAuth from './features/auth/components/RequireAuth';
import roles from './config/roles';
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


function App() {
  return (
    <Routes>
      {/* no-auth routes */}
      <Route element={<NoAuth />}>
        <Route path="Login" element={<Login />} />
        <Route path="Register" element={<Register />} />
        <Route element={<Layout header="dark" footer={true} />}>
          <Route index element={<Home />} />
        </Route>
      </Route>

      {/* public routes */}
      <Route element={<Layout header={"light"} footer={true} />}>
        <Route path="Terms-of-use" element={<TermsOfUse />} />
        <Route path="Contact" element={<Contact />} />

        <Route path="Discuss">
          <Route index element={<Discuss MainPage={<QuestionList />} />} />
          <Route path="New" element={<Discuss MainPage={<AskQuestion questionId={null} />} />} />
          <Route path=":questionId" element={<Discuss MainPage={<DiscussPost />} />} />
          <Route path="Edit/:questionId" element={<Discuss MainPage={<DiscussEdit />} />} />
        </Route>

        <Route path="Feed">
          <Route index element={<Feed />} />
        </Route>

        <Route path="Profile">
          <Route path=":userId" element={<Profile />} />
          <Route index element={<ProfileFromAuth />} />
        </Route>
      </Route>

      {/* protected routes */}
      <Route element={<RequireAuth allowedRoles={[...Object.values(roles)]} />}>

      </Route>

      <Route path="/*" element={<NotFound />} />
    </Routes>
  );
};

export default App;