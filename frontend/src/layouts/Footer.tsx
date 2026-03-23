import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { FaHeart, FaTwitter, FaFacebook, FaInstagram, FaGithub } from 'react-icons/fa6';

function Footer() {
    return (
        <footer className='wb-footer'>
            <Container>
                <div className="wb-footer__inner">
                    <div className="wb-footer__grid">
                        <div className="wb-footer__brand">
                            <span className="wb-footer__logo">Webler</span>
                            <p className="wb-footer__tagline">Learn. Code. Build.</p>
                        </div>

                        <div className="wb-footer__links">
                            <span className="wb-footer__heading">Links</span>
                            <ul>
                                <li><Link to="/">Home</Link></li>
                                <li><Link to="/Faq">FAQ</Link></li>
                                <li><Link to="/Contact">Contact</Link></li>
                                <li><Link to="/Terms-of-use">Terms of Use</Link></li>
                            </ul>
                        </div>

                        <div className="wb-footer__social">
                            <span className="wb-footer__heading">Follow Us</span>
                            <div className="wb-footer__social-icons">
                                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><FaTwitter /></a>
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FaFacebook /></a>
                                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FaInstagram /></a>
                                <a href="https://github.com/Webler-Group" target="_blank" rel="noopener noreferrer" aria-label="Github"><FaGithub /></a>
                            </div>
                        </div>
                    </div>

                    <div className="wb-footer__bottom">
                        <span>© {new Date().getFullYear()} Webler. All rights reserved.</span>
                        <span>Made with <FaHeart className="wb-footer__heart" /> by <b>Webler</b></span>
                    </div>
                </div>
            </Container>
        </footer>
    );
}

export default Footer;