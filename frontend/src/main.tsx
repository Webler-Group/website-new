import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import './style.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import AuthProvider from './features/auth/context/authContext';
import ApiProvider from './context/apiCommunication';
import WSProvider from './context/wsCommunication';
import ScrollToTop from './components/ScrollToTop';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import UserInfoProvider from './context/userInfoContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthProvider>
    <HelmetProvider>
      <BrowserRouter>
        <ApiProvider baseUrl='/api'>
          <WSProvider>
            <UserInfoProvider>
              <ScrollToTop excludePaths={["/feed"]} />
              <Routes>
                <Route path="/*" element={<App />} />
              </Routes>
            </UserInfoProvider>
          </WSProvider>
        </ApiProvider>
      </BrowserRouter>
    </HelmetProvider>
  </AuthProvider >
);