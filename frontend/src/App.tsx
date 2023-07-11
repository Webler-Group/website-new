import {
  Routes,
  Route
} from 'react-router-dom';

import Home from './pages/Home';
import ContactUs from './pages/ContactUs';
import CodePlayground from './pages/code-playground/CodesMainPage';
import Learn from './pages/school-learn/LearnMainPage'
import Error404 from './pages/Error404';
import News from './pages/news-blog/NewsBlogMainPage';
import AboutUs from './pages/AboutUs';
import Help from './pages/Help';
import ResetPassword from './pages/account-profile/ResetPassword';
import Member from './pages/account-profile/Member';
import SocialNetwork from './pages/social-network/SocialMainPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import SignUp from './pages/account-profile/SignUp';
import LogIn from './pages/account-profile/LogIn';
import { AuthProvider } from './context/AuthContext';
import EditMember from './pages/account-profile/EditMember';
import Messaging from './pages/social-network/chat/Messaging';
import QnA from './pages/discuss-forum/QAMainPage';


function App(){

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/code" element={<CodePlayground />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/news" element={<News />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/help" element={<Help />} />
        <Route path="/discuss" element={<QnA />} />
        <Route path="/member/:username" element={<Member />} />
        <Route path="/edit-member" element={<EditMember />} />
        <Route path="/social" element={<SocialNetwork />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/messages" element={<Messaging pageName={""}/>} />
        <Route path="/*" element={<Error404 />} />
      </Routes>
    </AuthProvider>
  );

};

export default App;