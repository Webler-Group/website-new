import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import AuthNavigation from '../features/auth/components/AuthNavigation';
import NotificationList from '../features/profile/pages/NotificationList';
import { useAuth } from '../features/auth/context/authContext';
import { isAdminOrModRole, isAuthenticatedRole } from '../data/roles';
import ChannelsButton from '../features/channels/components/ChannelsButton';
import WButton from '../components/WButton';
import { Link } from 'react-router-dom';

interface HeaderProps {
  variant?: string;
}

function Header({ variant }: HeaderProps) {

  const { userInfo } = useAuth();

  const toggleMobileMenu = () => {
    (document.getElementById("mobile-menu") as HTMLDivElement).classList.toggle("hidden");
  }

  return (
    <header className="fixed top-0 left-0 w-full bg-white text-[#222] shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <div className="flex items-center">
          
            <button id="menu-btn" className="md:hidden mr-3 focus:outline-none" onClick={toggleMobileMenu}>
          
              <svg className="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            <Link to='/'>
              <img src="/resources/images/logo.png" width="96px" height="32px" />
            </Link>

            {/* hidden on small screens */}
            <nav className="hidden md:flex space-x-6 ml-6">
              <Link to="/Courses" className="hover:text-gray-200">Courses</Link>
              <Link to="/blog" className="hover:text-gray-200">Blog</Link>
              <Link to="/Discuss" className="hover:text-gray-200">Q&A</Link>
              <Link to="/Codes" className="hover:text-gray-200">Try Codes</Link>
              {
                isAdminOrModRole(userInfo?.roles) &&
                <Link to="/Tools" className="hover:text-gray-200">Tools</Link>
              }
            </nav>
          </div>

          <div className="flex items-center space-x-4">

          {
            isAuthenticatedRole(userInfo?.roles) && (
              <>
            <div className="relative">
              <button className="focus:outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C8.67 6.165 8 7.388 8 8.75V14l-1.405 1.405A2.032 2.032 0 016 17h5m4 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
              </button>

              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 text-xs font-bold leading-none text-red-500 bg-white rounded-full">3</span>
            </div>
            <img src="/resources/images/user.svg" className="w-8 h-8 rounded-full hover:cursor-pointer" alt="User" />
            </>
            )
          }
          
          {
            !isAuthenticatedRole(userInfo?.roles) && (
              <div className="hidden md:flex space-x-2">
                <Link to="/Users/Login" className="text-blue-900 hover:text-gray-200">
                  <WButton text="Login"/>
                </Link>
                <Link to="/Users/Register" className="text-blue-900 hover:text-gray-200">
                  <WButton text="Register"/>
                </Link>
              </div>
            )
          }
          </div>
        </div>
      </div>


      <div id="mobile-menu" className="hidden md:hidden px-4 pb-4 space-y-2">
        <a href="#" className="block hover:text-gray-200">Home</a>
        <a href="#" className="block hover:text-gray-200">Courses</a>
        <a href="#" className="block hover:text-gray-200">Blog</a>
        <a href="#" className="block hover:text-gray-200">Q&A</a>
        <a href="#" className="block hover:text-gray-200">Try Codes</a>
        
        <div className="flex space-x-2 pt-2">
          <WButton text='Login' />
          <WButton text='Register' />
          <a href='/Users/Login'>
            <button className="px-3 py-1 bg-white text-red-500 rounded-lg">Login</button>
          </a>
          <a href='/Users/Register'>
            <button className="px-3 py-1 bg-gray-900 rounded-lg">Register</button>
          </a>
        </div>
      </div>
    </header>

    // <Navbar expand="lg" bg={variant} variant={variant} className="border-bottom" collapseOnSelect>
    //   <Container fluid>
    //     <div className="d-flex align-items-center gap-3">
    //       <Navbar.Toggle aria-controls="navbarScroll" />
    //       {
    //         userInfo &&
    //         <div className='d-flex gap-3'>
    //           <ChannelsButton />
    //           <NotificationList />
    //         </div>
    //       }
    //     </div>
    //     <Navbar.Collapse id="navbarScroll" className="text-center">
    //         </LinkContainer>
    
    //       </Nav>
    //       <AuthNavigation />
    //     </Navbar.Collapse>
    //   </Container>
    // </Navbar>
  );
}

export default Header;
