function Footer() {
  return (
    <>
      <footer>
        <div className="footer">
          <div className="row socialIcons">
            <a href="#weblerBook">
              <i className="fa fa-facebook"></i>
            </a>
            <a href="#weblerGram">
              <i className="fa fa-instagram"></i>
            </a>
            <a href="#weblerTube">
              <i className="fa fa-youtube"></i>
            </a>
            <a href="#weblerTweet">
              <i className="fa fa-twitter"></i>
            </a>
            <a href="https://github.com/WeblerGroup">
              <i className="fa fa-github"></i>
            </a>
            <a href="#weblerTwitch">
              <i className="fa fa-twitch"></i>
            </a>
            <a href="#weblerLinkedin">
              <i className="fa fa-linkedin"></i>
            </a>
          </div>
          <div className="row">
            <ul>
              <li>
                <a href="/contact-us">Contact us</a>
              </li>
              <li>
                <a href="/products">Our Products</a>
              </li>
              <li>
                <a href="/privacy-policy">Privacy Policy</a>
              </li>
              <li>
                <a href="/terms-and-conditions">Terms & Conditions</a>
              </li>
              <li>
                <a href="/news">News</a>
              </li>
            </ul>
          </div>
          <div>
            WEBLER - Copyright © {new Date().getFullYear()} Webler Group - All rights reserved <br/><code style={{fontSize: "x-small"}}>Web Development by: <a className="linksNoDecor" style={{textDecoration: "underline", fontWeight:"bold"}} href="member/SolomoniRailoa">Solomoni Railoa</a></code>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Footer