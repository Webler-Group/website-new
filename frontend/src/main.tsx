import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import './style.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import AuthProvider from './features/auth/context/authContext';
import ApiProvider from './context/apiCommunication';
import WSProvider from './context/wsCommunication';
import ConnectionStatusProvider from './context/connectionStatus';
import ConnectionStatusIndicator from './components/ConnectionStatusIndicator';
import ScrollToTop from './components/ScrollToTop';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import UserInfoProvider from './context/userInfoContext';

const Root = () => (
  <ApiProvider baseUrl='/api'>
    <WSProvider>
      <ConnectionStatusProvider>
        <UserInfoProvider>
          <ScrollToTop excludePaths={["/feed"]} />
          <ConnectionStatusIndicator />
          <App />
        </UserInfoProvider>
      </ConnectionStatusProvider>
    </WSProvider>
  </ApiProvider>
);

// Data router (instead of <BrowserRouter>) is required for useBlocker (e.g. "unsaved changes" prompts)
const router = createBrowserRouter([
  { path: "*", element: <Root /> }
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthProvider>
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  </AuthProvider>
);
