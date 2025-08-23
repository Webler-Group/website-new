import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import AuthNavigation from '../features/auth/components/AuthNavigation';
import NotificationList from '../features/profile/pages/NotificationList';
import { useAuth } from '../features/auth/context/authContext';
import { isAdminOrModRole } from '../data/roles';
import ChannelsButton from '../features/channels/components/ChannelsButton';

interface HeaderProps {
  variant?: string;
}

function Header({ variant }: HeaderProps) {

  const { userInfo } = useAuth();

  return (
    <Navbar expand="lg" bg={variant} variant={variant} className="border-bottom" collapseOnSelect>
      <Container fluid>
        <LinkContainer to="/">
          <Navbar.Brand><img src="/resources/images/logo.png" height="32px" width="96px" /></Navbar.Brand>
        </LinkContainer>
        <div className="d-flex align-items-center gap-3">
          <Navbar.Toggle aria-controls="navbarScroll" />
          {
            userInfo &&
            <div className='d-flex gap-3'>
              <ChannelsButton />
              <NotificationList />
            </div>
          }
        </div>
        <Navbar.Collapse id="navbarScroll" className="text-center">
          <Nav className="me-auto">
            <LinkContainer to="/Courses">
              <Nav.Link>Courses</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/Codes">
              <Nav.Link>Codes</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/Discuss">
              <Nav.Link>Discuss</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/blog">
              <Nav.Link>Blog</Nav.Link>
            </LinkContainer>
            {
              isAdminOrModRole(userInfo?.roles) &&
              <LinkContainer to="/Tools">
                <Nav.Link>Tools</Nav.Link>
              </LinkContainer>
            }
          </Nav>
          <AuthNavigation />
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
