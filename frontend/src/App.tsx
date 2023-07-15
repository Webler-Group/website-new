import { Routes, Route } from 'react-router-dom';

import Header from './layouts/Header';
import Footer from './layouts/Footer';

import Home from './pages/Home';
import ContactUs from './pages/ContactUs';
import CodePlayground from './pages/CodePlayground';
import Learn from './pages/Learn'
import Error404 from './pages/Error404';
import News from './pages/News';
import AboutUs from './pages/AboutUs';
import Help from './pages/Help';
import ResetPassword from './pages/ResetPassword';
import Member from './features/member/Member';
import Social from './pages/Social';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import SignUp from './pages/SignUp';
import LogIn from './pages/LogIn';
import { AuthProvider } from './context/AuthContext';
import EditMember from './features/member/EditMember';
import Messaging from './pages/Messaging';
import Discuss from './pages/Discuss';
import Products from './pages/Products';

function App(){
  return (
    <AuthProvider>
      <Header/>
      <Routes>
        <Route path="/" Component={Home} />
        <Route path="/home" Component={Home} />
        <Route path="/contact-us" Component={ContactUs} />
        <Route path="/codeplayground" Component={CodePlayground} />
        <Route path="/learn" Component={Learn} />
        <Route path="/news" Component={News} />
        <Route path="/about-us" Component={AboutUs} />
        <Route path="/help" Component={Help} />
        <Route path="/discuss" Component={Discuss} />
        <Route path="/member/:username" Component={Member} />
        <Route path="/edit-member" Component={EditMember} />
        <Route path="/social" Component={Social} />
        <Route path="/reset-password" Component={ResetPassword} />
        <Route path="/privacy-policy" Component={PrivacyPolicy} />
        <Route path="/terms-and-conditions" Component={TermsAndConditions} />
        <Route path="/signup" Component={SignUp} />
        <Route path="/login" Component={LogIn} />
        <Route path="/products" Component={Products} />
        <Route path="/messages" element={<Messaging pageName='' />} />
        <Route path="/*" Component={Error404} />
      </Routes>
       <Footer/>
    </AuthProvider>
  );
};

export default App;