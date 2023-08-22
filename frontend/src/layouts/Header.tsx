import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import AuthNavigation from '../features/auth/components/AuthNavigation';

interface HeaderProps {
  variant?: string;
}

function Header({ variant }: HeaderProps) {

  return (
    <Navbar expand="lg" bg={variant} variant={variant} className="border-bottom" collapseOnSelect>
      <Container fluid>
        <LinkContainer to="/">
          <Navbar.Brand><img src="/resources/images/logo.png" height="50px" width="150px" /></Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="navbarScroll" />
        <Navbar.Collapse id="navbarScroll" className="text-center">

          <Nav className="me-auto">
            <Nav.Link>Catalog</Nav.Link>
            <Nav.Link>Leaderboard</Nav.Link>
            <LinkContainer to="/Compiler-Playground/Web">
              <Nav.Link>Online Compiler</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/Discuss">
              <Nav.Link>Discuss</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/feed">
              <Nav.Link>Feed</Nav.Link>
            </LinkContainer>
            <Nav.Link>Blog</Nav.Link>
          </Nav>

          <AuthNavigation />

        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
