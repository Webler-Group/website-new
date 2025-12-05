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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthProvider>
    <HelmetProvider>
      <BrowserRouter>
        <ApiProvider baseUrl='/api'>
          <WSProvider>
            <ScrollToTop excludePaths={["/feed"]} />
            <Routes>
              <Route path="/*" element={<App />} />
            </Routes>
          </WSProvider>
        </ApiProvider>
      </BrowserRouter>
    </HelmetProvider>
  </AuthProvider >
);