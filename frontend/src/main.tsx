import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import AuthProvider from './features/auth/context/authContext';
import ApiProvider from './context/apiCommunication';
import WSProvider from './context/wsCommunication';
import ScrollToTop from './components/ScrollToTop';
import { HelmetProvider } from 'react-helmet-async';
import LoadingPage from './pages/LoadingPage';

const App = React.lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthProvider>
    <HelmetProvider>
      <BrowserRouter>
        <ApiProvider baseUrl='/api'>
          <WSProvider>
            <ScrollToTop excludePaths={["/feed"]} />
            <React.Suspense fallback={<LoadingPage />}>
              <Routes>
                <Route path="/*" element={<App />} />
              </Routes>
            </React.Suspense>
          </WSProvider>
        </ApiProvider>
      </BrowserRouter>
    </HelmetProvider>
  </AuthProvider >
);