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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* no-auth routes */}
        <Route element={<NoAuth />}>
          <Route index element={<Home />} />
          <Route path="Login" element={<Login />} />
          <Route path="Register" element={<Register />} />
        </Route>

        {/* public routes */}
        <Route path="Terms-of-use" element={<TermsOfUse />} />

        {/* protected routes */}
        <Route element={<RequireAuth allowedRoles={[...Object.values(roles)]} />}>
          <Route path="Profile">
            <Route path=":userId" element={<Profile />} />
            <Route index element={<ProfileFromAuth />} />
          </Route>
        </Route>

      </Route>

      <Route path="/*" element={<NotFound />} />
    </Routes>
  );
};

export default App;