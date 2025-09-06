import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App';

import 'bootstrap/dist/css/bootstrap.css';
import './index.css';
import AuthProvider from './features/auth/context/authContext';
import ApiProvider from './context/apiCommunication';
import WSProvider from './context/wsCommunication';
import ScrollToTop from './components/ScrollToTop';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthProvider>
    <BrowserRouter>
      <ApiProvider baseUrl='/api'>
        <WSProvider>
          <ScrollToTop excludePaths={[]} />
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </WSProvider>
      </ApiProvider>
    </BrowserRouter>
  </AuthProvider >
);
