import { useLocation } from 'react-router-dom'
import { Link } from "react-router-dom";

function Footer() {

  let location = useLocation();

  return (
    !(location.pathname == '/messages' || location.pathname == '/social') ? <>
      <footer>
        <div className="footer">
          <div className="row socialIcons">
            <Link to="#weblerBook">
              <i className="fa fa-facebook"></i>
            </Link>
            <Link to="#weblerGram">
              <i className="fa fa-instagram"></i>
            </Link>
            <Link to="#weblerTube">
              <i className="fa fa-youtube"></i>
            </Link>
            <Link to="#weblerTweet">
              <i className="fa fa-twitter"></i>
            </Link>
            <Link to="https://github.com/WeblerGroup">
              <i className="fa fa-github"></i>
            </Link>
            <Link to="#weblerTwitch">
              <i className="fa fa-twitch"></i>
            </Link>
            <Link to="#weblerLinkedin">
              <i className="fa fa-linkedin"></i>
            </Link>
          </div>
          <div className="row">
            <ul>
              <li>
                <Link to="/contact-us">Contact us</Link>
              </li>
              <li>
                <Link to="/products">Our Products</Link>
              </li>
              <li>
                <Link to="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms-and-conditions">Terms & Conditions</Link>
              </li>
              <li>
                <Link to="/news">News</Link>
              </li>
            </ul>
          </div>
          <div>
            WEBLER - Copyright © {new Date().getFullYear()} Webler Group - All rights reserved <br/><code style={{fontSize: "x-small"}}>Web Development by: <Link className="linksNoDecor" style={{textDecoration: "underline", fontWeight:"bold"}} to="member/SolomoniRailoa">Solomoni Railoa</Link></code>
          </div>
        </div>
      </footer>
    </>
    :
    null
  )
}

export default Footer