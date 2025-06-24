import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Link } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa6';

function Footer() {
  return (
    <>
        <footer className='bg-black'>
            <Container>
                <div className="wb-home-footer">
                    <Row>
                        <Col className='p-3'><Link to={"/"}>Home</Link></Col>
                        <Col className='p-3'>Pro</Col>
                        <Col className='p-3'>FAQ</Col>
                        <Col className='p-3'><Link to={"/Contact"}>Contact</Link></Col>
                        <Col className='p-3'><Link to={"/Terms-of-use"}>Terms of Use</Link></Col>
                        <Col className='p-3'>Privacy Policy</Col>
                    </Row>
                    <Row  className='p-2 w-100'>
                    <div className="text-center wb-made-by">
                        Made with <FaHeart /> by <b>Webler</b>
                    </div>
                    </Row>
                </div>
            </Container>
        </footer>
    </>
  )
}

export default Footer
