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
import MenuNavBar from './partials/MenuNavBar';
import Footer from './partials/Footer';

function App(){
  return (
    <AuthProvider>
      <MenuNavBar pageName=''/>
      <Routes>
        <Route path="/" Component={Home} />
        <Route path="/home" Component={Home} />
        <Route path="/contact-us" Component={ContactUs} />
        <Route path="/code" Component={CodePlayground} />
        <Route path="/learn" Component={Learn} />
        <Route path="/news" Component={News} />
        <Route path="/about-us" Component={AboutUs} />
        <Route path="/help" Component={Help} />
        <Route path="/discuss" Component={QnA} />
        <Route path="/member/:username" Component={Member} />
        <Route path="/edit-member" Component={EditMember} />
        <Route path="/social" Component={SocialNetwork} />
        <Route path="/reset-password" Component={ResetPassword} />
        <Route path="/privacy-policy" Component={PrivacyPolicy} />
        <Route path="/terms-and-conditions" Component={TermsAndConditions} />
        <Route path="/signup" Component={SignUp} />
        <Route path="/login" Component={LogIn} />
        <Route path="/messages" element={<Messaging pageName='' />} />
        <Route path="/*" Component={Error404} />
      </Routes>
       <Footer/>
    </AuthProvider>
  );
};

export default App;