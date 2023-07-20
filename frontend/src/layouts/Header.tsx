import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import AuthNavigation from '../features/auth/AuthNavigation';

function Header() {



  return (
    <header>
      <Navbar expand="lg" bg="dark" variant="dark">
        <Container fluid>
          <LinkContainer to="/">
            <Navbar.Brand><img src="/resources/images/logo.png" height="50px" width="150px" /></Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle aria-controls="navbarScroll" />
          <Navbar.Collapse id="navbarScroll">

            <Nav className="me-auto">
              <Nav.Link>Link 1</Nav.Link>
              <Nav.Link>Link 2</Nav.Link>
              <Nav.Link>Link 3</Nav.Link>
              <Nav.Link>Link 4</Nav.Link>
              <Nav.Link>Link 5</Nav.Link>
            </Nav>

            <AuthNavigation />

          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
}

export default Header;
