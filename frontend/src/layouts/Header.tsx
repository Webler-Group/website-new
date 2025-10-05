import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import AuthNavigation from '../features/auth/components/AuthNavigation';
import NotificationList from '../features/profile/components/NotificationList';
import { useAuth } from '../features/auth/context/authContext';
import ChannelsButton from '../features/channels/components/ChannelsButton';
import { Link } from 'react-router-dom';

interface HeaderProps {
  variant?: string;
  hideChannelsButton?: boolean;
}

function Header({ variant, hideChannelsButton }: HeaderProps) {

  const { userInfo } = useAuth();

  return (
    <Navbar expand="lg" bg={variant} variant={variant} className="border-bottom w-100" collapseOnSelect>
      <Container fluid>
        <Link to="/" aria-label="Home">
          <Navbar.Brand><img src="/resources/images/logo.svg" alt="Webler logo" height="32px" width="96px" /></Navbar.Brand>
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
            <LinkContainer to="/Courses">
              <Nav.Link>Courses</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/Codes">
              <Nav.Link>Codes</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/Discuss">
              <Nav.Link>Discuss</Nav.Link>
            </LinkContainer>
            {
              userInfo && userInfo.roles.length > 0 && (
                <>
                  <LinkContainer to="/Feed">
                    <Nav.Link>Feed</Nav.Link>
                  </LinkContainer>

                  {
                    userInfo.roles.some(role => role != "User") && (
                      <>
                        <LinkContainer to="/Challenge">
                          <Nav.Link>Challenges</Nav.Link>
                        </LinkContainer>

                        <LinkContainer to="/Tools">
                          <Nav.Link>Tools</Nav.Link>
                        </LinkContainer>
                      </>
                    )
                  }
                </>
              )
            }
          </Nav>
          <AuthNavigation />
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
