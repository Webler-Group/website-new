
import { Container } from "../components/ui";
import { Link } from 'react-router-dom';
import { FaHeart, FaTwitter, FaFacebook, FaInstagram, FaGithub } from 'react-icons/fa6';

function Footer() {
    return (
        <footer className='wb-app-footer'>
            <Container>
                <div className="wb-app-footer-inner">
                    <div className="wb-app-footer-grid">
                        <div className="wb-app-footer-brand">
                            <span className="wb-app-footer-logo">Webler</span>
                            <p className="wb-app-footer-tagline">Learn. Code. Build.</p>
                        </div>

                        <div className="wb-app-footer-links">
                            <span className="wb-app-footer-heading">Links</span>
                            <ul>
                                <li><Link to="/">Home</Link></li>
                                <li><Link to="/Faq">FAQ</Link></li>
                                <li><Link to="/Contact">Contact</Link></li>
                                <li><Link to="/Terms-of-use">Terms of Use</Link></li>
                            </ul>
                        </div>

                        <div>
                            <span className="wb-app-footer-heading">Follow Us</span>
                            <div className="wb-app-footer-social-icons">
                                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><FaTwitter /></a>
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FaFacebook /></a>
                                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FaInstagram /></a>
                                <a href="https://github.com/Webler-Group" target="_blank" rel="noopener noreferrer" aria-label="Github"><FaGithub /></a>
                            </div>
                        </div>
                    </div>

                    <div className="wb-app-footer-bottom">
                        <span>© {new Date().getFullYear()} Webler. All rights reserved.</span>
                        <span>Made with <FaHeart className="wb-app-footer-heart" /> by <b>Webler</b></span>
                    </div>
                </div>
            </Container>
        </footer>
    );
}

export default Footer;