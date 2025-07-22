import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import AuthNavigation from '../features/auth/components/AuthNavigation';
import NotificationList from '../features/profile/pages/NotificationList';
import { useAuth } from '../features/auth/context/authContext';

interface HeaderProps {
  variant?: string;
}

function Header({ variant }: HeaderProps) {

  const { userInfo } = useAuth();

  return (
    <Navbar expand="lg" bg={variant} variant={variant} className="border-bottom" collapseOnSelect>
      <Container fluid>
        <LinkContainer to="/">
          <Navbar.Brand><img src="/resources/images/logo.png" height="44px" width="132px" /></Navbar.Brand>
        </LinkContainer>
        <div className="d-flex gap-1 align-items-center">
          <Navbar.Toggle aria-controls="navbarScroll" />
          {userInfo && <NotificationList />}
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
            <LinkContainer to="/Courses/Editor">
              <Nav.Link>Course Editor</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/Channels">
              <Nav.Link>Channels</Nav.Link>
            </LinkContainer>
          </Nav>
          <AuthNavigation />
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
