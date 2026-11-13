


import { Container, Nav, Navbar } from "../components/ui";
import AuthNavigation from '../features/auth/components/AuthNavigation';
import NotificationList from '../features/profile/components/NotificationList';
import { useAuth } from '../features/auth/context/authContext';
import ChannelsButton from '../features/channels/components/ChannelsButton';
import { Link } from 'react-router-dom';
import AppLogo from '../components/AppLogo';

interface HeaderProps {
  hideChannelsButton?: boolean;
}

function Header({ hideChannelsButton }: HeaderProps) {

  const { userInfo } = useAuth();

  return (
    <Navbar expand="lg" bg="body-tertiary" className="border-bottom w-100" collapseOnSelect>
      <Container>
        <Link to="/" aria-label="Home">
          <Navbar.Brand><AppLogo /></Navbar.Brand>
        </Link>
        <div className="d-flex align-items-center gap-3">
          <Navbar.Toggle aria-controls="navbarScroll" />
          {
            userInfo &&
            <div className='d-flex gap-3'>
              {!hideChannelsButton && <ChannelsButton />}
              <NotificationList />
            </div>
          }
        </div>
        <Navbar.Collapse id="navbarScroll" className="text-center">
          <Nav className="me-auto">
            <Nav.Link to="/Courses">Courses</Nav.Link>
            <Nav.Link to="/Codes">Codes</Nav.Link>
            <Nav.Link to="/Discuss">Discuss</Nav.Link>
            <Nav.Link to="/Feed">Feed</Nav.Link>
            <Nav.Link to="/Challenge">Challenges</Nav.Link>
            <Nav.Link to="/Profile/Leaderboard">Leaderboard</Nav.Link>
            {
              userInfo && userInfo.roles.some(role => role !== "User") &&
              <Nav.Link to="/Tools">Tools</Nav.Link>
            }
          </Nav>
          <AuthNavigation />
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
