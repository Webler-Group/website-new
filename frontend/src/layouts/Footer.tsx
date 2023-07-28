import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

function Footer() {
  return (
    <>
        <footer className='bg-black'>
            <Container>
                <div className="wb-home-footer">
                    <Row>
                        <Col className='p-2'>Home</Col>
                        <Col className='p-2'>Pro</Col>
                        <Col className='p-2'>FAQ</Col>
                        <Col className='p-2'>Contact</Col>
                        <Col className='p-2'>Terms of Use</Col>
                        <Col className='p-2'>Privacy Policy</Col>
                    </Row>
                    <Row  className='p-2 w-100'>
                    <div className="text-center wb-made-by">
                        Made with :heart: by <b>Webler</b>
                    </div>
                    </Row>
                </div>
            </Container>
        </footer>
    </>
  )
}

export default Footer