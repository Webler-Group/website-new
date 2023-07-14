import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import User from "../pages/account-profile/views/User";
import { useAuth } from '../context/AuthContext';
import { NavItem } from 'react-bootstrap';
import DatabaseClient from "../api/DatabaseClient";
import { useLocation } from 'react-router-dom'

interface Props {
  pageName: string;
}

function MenuNavBar({ pageName }: Props) {

  let location = useLocation();

  const { signout, getUserDetails, setUserDetails } = useAuth();

  const [user, setUser] = useState<User>(getUserDetails());

  useEffect(() => {
    let unsubscribe = () => { }
    if (user) {
      unsubscribe = DatabaseClient.onUserChange(user.uid, snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const user = data as User;
          setUser(user)
          setUserDetails(user)
        }
      })
    }
    return unsubscribe
  }, []);

  async function handleLogout() {
    try {
      await signout()
      window.location.href = "/login"
    } catch {
      console.log("Failed to log out")
    }
  }

  // Dark theme handler  vvvvvv
  const [switchState, setSwitchState] = useState(false)
  const [moodtheme, setMoodTheme] = useState("light2")
  const handleChange = (e: { target: { checked: any; }; }) => {
    const isDark = e.target.checked ? true : false;
    const body = document.getElementsByTagName("body")[0];
    if (isDark === false) {
      body.className = "";
      setMoodTheme("light2");
      localStorage.setItem("data-theme", "light");
    }
    else if (isDark === true) {
      body.className = "dark";
      setMoodTheme("dark");
      localStorage.setItem("data-theme", "dark");
    }
    setSwitchState(!switchState)
  }

  const switchIt = () => {
    let body = document.getElementsByTagName("body")[0];
    if (localStorage.getItem("data-theme") === "dark") {
      body.className = "dark";
      return true;
    }
    else if (localStorage.getItem("data-theme") === "light") {
      body.className = "";
      return false;
    }
  }
  //Dark theme handler   ^^^^^^^^

  //Handler for quick scroll to top or quick scroll to bottom
  const [buttonHideUp, setbuttonHideUp] = useState("none")
  const [buttonHideDown, setbuttonHideDown] = useState("none")

  function topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  function bottomFunction() {
    document.body.scrollTop = document.body.scrollHeight;
    document.documentElement.scrollTop = document.body.scrollHeight;
  }

  // When the user scrolls down 20px from the top of the document, show the button
  window.onload = function () { scrollFunction() };
  window.onscroll = function () { scrollFunction() };
  function scrollFunction() {
    if (pageName === "Home") {
      setbuttonHideUp("none");
      setbuttonHideDown("none");
      if (document.body.scrollTop > 120 || document.documentElement.scrollTop > 120) {
        setbuttonHideUp("block");
        setbuttonHideDown("block");
      } else {
        setbuttonHideUp("none");
        setbuttonHideDown("none");
      }
      if (document.body.scrollTop > document.body.scrollHeight - 800 || document.documentElement.scrollTop > document.body.scrollHeight - 800) {
        setbuttonHideDown("none");
      }
    } else if (pageName === "Chat") {
      setbuttonHideUp("none");
      setbuttonHideDown("none");
    } else if (pageName === "SocialMainPage"){
      setbuttonHideUp("none");
      setbuttonHideDown("none");
    } else {
      if (document.body.scrollTop > 240 || document.documentElement.scrollTop > 240) {
        setbuttonHideUp("block");
      } else {
        setbuttonHideUp("none");
        setbuttonHideDown("block");
      }
      if (document.body.scrollTop > document.body.scrollHeight - 800 || document.documentElement.scrollTop > document.body.scrollHeight - 800) {
        setbuttonHideDown("none");
      } else {
        setbuttonHideDown("block");
      }
    }
  }

  return (
    location.pathname !== '/messages' &&
    <>
      <Navbar expand="lg" className="navBarBG" data-bs-theme={moodtheme} onLoad={scrollFunction}>
        <Container fluid >
        <Link style={{textDecoration: "none"}}  to="/"><Navbar.Brand><img src="/resources/images/logo.png" height="50px" width="150px" /></Navbar.Brand></Link>
          <Navbar.Toggle aria-controls="navbarScroll" />
          <Navbar.Collapse id="navbarScroll">
            <Nav
              className="me-auto my-2 my-lg-0"
              style={{ maxHeight: '370px', alignItems: 'center' , alignContent:'center', justifyContent:'center'}}
              navbarScroll
            >
              <Link style={{textDecoration: "none"}}  to="/"><NavItem className="NavLink" >Home</NavItem></Link>
              <Link style={{textDecoration: "none"}}  to="/social"><Nav className="NavLink" >Social</Nav></Link>
              <Link style={{textDecoration: "none"}}  to="/learn"><Nav className="NavLink" >Learn</Nav></Link>
              <Link style={{textDecoration: "none"}}  to="/discuss"><Nav className="NavLink" >Q&A</Nav></Link>
              <Link style={{textDecoration: "none"}}  to="/code"><Nav className="NavLink" >Code Playground</Nav></Link>
              <NavDropdown title="More" style={{ color: "var(--fontColor)", alignItems:"center", alignSelf:"center"}} >
              <Link style={{textDecoration: "none"}}  to="/about-us"><NavItem>About Us</NavItem></Link>
                <NavDropdown.Divider />
                <Link style={{textDecoration: "none"}}  to="/contact-us"><NavItem>Contact Us</NavItem></Link>
                <NavDropdown.Divider />
                <Link style={{textDecoration: "none"}}  to="/help"><NavItem>Help Center - FAQ's</NavItem></Link>
                <NavDropdown.Divider />
                <Link style={{textDecoration: "none"}}  to="/products"><NavItem>Our Products</NavItem></Link>
                <NavDropdown.Divider />
                <Link style={{textDecoration: "none"}}  to="/news"><NavItem>News (Blog)</NavItem></Link>
              </NavDropdown >
              <Nav.Item>
              <Form style={{ alignSelf: "center" , display:'inline'}}>
                <Form.Check
                  type="switch"
                  id="dark-theme-switch"
                  label="Dark Theme"
                  onChange={handleChange}
                  checked={switchIt()}
                />
              </Form>
              </Nav.Item>
              
            </Nav>
            <Nav style={{ alignItems: "center" }}>
            <i className="fa fa-search p-2 pointerHere"></i>
              {
                (user) ?
                  <>
                    <i className="fa fa-bell p-2 pointerHere"></i>
                    <NavDropdown align="end" title={<><img width={34} height={34} className="rounded-circle" src={user.avatarUrl ? user.avatarUrl : "/resources/images/user.svg"} /> {(user.username)} </>} id="navbarScrollingDropdownUser">
                      <Link style={{textDecoration: "none"}}  to={"/member/" + user.username}><Nav>Profile</Nav></Link>
                      <NavDropdown.Divider />
                      <Link style={{textDecoration: "none"}}  to="/edit-member"><Nav>Edit Profile</Nav></Link>
                      <Link style={{textDecoration: "none"}}  to="/messages"><Nav>Messages</Nav></Link>
                      <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
                    </NavDropdown>
                  </>
                  :
                  <>
                    <NavItem>
                      <Link style={{textDecoration: "none"}}  to="/login"><Button size="lg" className="smallnavform navButton"><strong>Login</strong></Button></Link>
                      <Link style={{textDecoration: "none"}}  to="/signup"><Button size="lg" className="smallnavform navButton" variant="success">Sign-up</Button></Link>
                    </NavItem>
                  </>
              }
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <button onClick={topFunction} className="quick-scroll-button" id="myBtnTop" title="Go to top" style={{ display: buttonHideUp }}>^</button>
      <button onClick={bottomFunction} className="quick-scroll-button" id="myBtnBottom" title="Go to bottom" style={{ display: buttonHideDown }}>v</button>
    </>
  );
}

export default MenuNavBar;
