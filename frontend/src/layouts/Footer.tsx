import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { FaHeart, FaTwitter, FaFacebook, FaInstagram, FaGithub } from 'react-icons/fa6';

function Footer() {
    return (
        <>
            <footer className='bg-black'>
                <Container>
                    <div className="wb-home-footer p-3 d-flex flex-column gap-3">
                        <div className='d-flex justify-content-around'>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label='Twitter'>
                                <FaTwitter />
                            </a>
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label='Facebook'>
                                <FaFacebook />
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label='Instagram'>
                                <FaInstagram />
                            </a>
                            <a href="https://github.com/Webler-Group" target="_blank" rel="noopener noreferrer" aria-label='Github'>
                                <FaGithub />
                            </a>
                        </div>
                        <div className='d-flex justify-content-around'>
                            <Link to="/">Home</Link>
                            <Link to="/Faq">FAQ</Link>
                            <Link to="/Contact">Contact</Link>
                            <Link to="/Terms-of-use">Terms of Use</Link>
                        </div>
                        <div className="text-center wb-made-by">
                            Made with <FaHeart /> by <b>Webler</b>
                        </div>
                    </div>
                </Container>
            </footer>
        </>
    )
}

export default Footer