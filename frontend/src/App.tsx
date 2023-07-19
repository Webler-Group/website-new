import { Routes, Route } from 'react-router-dom';

import Error404 from './pages/Error404';
import Layout from './components/Layout';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import RequireAuth from './features/auth/RequireAuth';
import roles from './config/roles';
import Home from './pages/Home';
import { ProfileFromParams, ProfileFromAuth } from './features/profile/Profile';
import NoAuth from './features/auth/NoAuth';

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
        <Route path="Profile">
          <Route path=":userId" element={<ProfileFromParams />} />
          <Route index element={<ProfileFromAuth />} />
        </Route>

        {/* protected routes */}
        <Route element={<RequireAuth allowedRoles={[...Object.values(roles)]} />}>

        </Route>

      </Route>

      <Route path="/*" element={<Error404 />} />
    </Routes>
  );
};

export default App;