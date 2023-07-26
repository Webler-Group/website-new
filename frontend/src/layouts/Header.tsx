import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import AuthNavigation from '../features/auth/components/AuthNavigation';

function Header() {



  return (
    <Navbar expand="lg" bg="light" variant="light" className="border-bottom">
      <Container fluid>
        <LinkContainer to="/">
          <Navbar.Brand><img src="/resources/images/logo.png" height="50px" width="150px" /></Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="navbarScroll" />
        <Navbar.Collapse id="navbarScroll">

          <Nav className="me-auto">
            <Nav.Link>Catalog</Nav.Link>
            <Nav.Link>Leaderboard</Nav.Link>
            <Nav.Link>Code Bits</Nav.Link>
            <LinkContainer to="/Discuss">
              <Nav.Link>Discuss</Nav.Link>
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
