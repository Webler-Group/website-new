import { Row, Col, Card, Button, Container } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import RegisterForm from "../features/auth/components/RegisterForm";
import { useAuth } from "../features/auth/context/authContext";
import { useState } from "react";
import LoginForm from "../features/auth/components/LoginForm";
import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async'; 

const HomePage = () => {

  const { userInfo } = useAuth();
  const [isRegisterForm, toggleForm] = useState(true);
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Webler Codes</title>
        <meta name="description" content="Welcome to Webler! We're a global team of independent developers passionate about building high-quality, accessible software." />
      </Helmet>

      <div className="wb-home-container">

        <div className="wb-banner text-light d-flex flex-column justify-content-center gap-2">
          <div className="wb-banner__logo">
            <img className="wb-banner__logo__img" src="../resources/images/logotransparent.svg" alt="Webler logo" />
          </div>
          <h2 className="wb-banner__text">Software Engineering</h2>
          <p className="wb-banner__slogan">- Building the future, one code at a time</p>
        </div>

        <div className="bg-light wb-home-content">
          <Container>
            <h1 className="text-center mb-3">Information</h1>
            <p className="text-center">
              Welcome to Webler! We're a global team of independent developers passionate about building high-quality, accessible software. Our mission is to create useful and fun tools — always free and open to everyone. Whether you're a beginner or a pro, we aim to support your learning and creativity with practical, innovative applications.
            </p>
            <p className="text-center mt-4">Explore some of our core features below:</p>

            <Row xs="1" md="2" className="g-4 mt-2">
              <Col>
                <Card bg="light" text="dark" className="wb-home-card">
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <Card.Title className="text-center py-4 border-bottom border-2">Code Playground</Card.Title>
                    <Card.Text className="mt-4">
                      Create, edit, and run code in multiple programming languages — all within your browser. Our web-based IDE is perfect for testing ideas, learning syntax, or building small projects without any setup.
                    </Card.Text>
                    <div className="text-center mt-4">
                      <LinkContainer to="/Codes">
                        <Button variant="primary">Go to Playground</Button>
                      </LinkContainer>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col>
                <Card bg="light" text="dark" className="wb-home-card">
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <Card.Title className="text-center py-4 border-bottom border-2">Feed</Card.Title>
                    <Card.Text className="mt-4">
                      Stay connected with the Webler community! The Feed lets you see the latest project updates, shared snippets, discussions, and highlights from developers around the world.
                    </Card.Text>
                    <div className="text-center mt-4">
                      <LinkContainer to="/Feed">
                        <Button variant="primary">Check Feed</Button>
                      </LinkContainer>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col>
                <Card bg="light" text="dark" className="wb-home-card">
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <Card.Title className="text-center py-4 border-bottom border-2">Courses</Card.Title>
                    <Card.Text className="mt-4">
                      Learn by doing with our interactive courses! Each one includes hands-on content, quizzes, and coding tasks to help you master web technologies, programming languages, and software tools at your own pace.
                    </Card.Text>
                    <div className="text-center mt-4">
                      <LinkContainer to="/Courses">
                        <Button variant="primary">Explore Courses</Button>
                      </LinkContainer>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col>
                <Card bg="light" text="dark" className="wb-home-card">
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <Card.Title className="text-center py-4 border-bottom border-2">Q&A Discussions</Card.Title>
                    <Card.Text className="mt-4">
                      Have a question about code or tech? Join our community-driven forum to ask, answer, and explore real-world programming problems. It’s a place to learn, share knowledge, and grow together.
                    </Card.Text>
                    <div className="text-center mt-4">
                      <LinkContainer to="/Discuss">
                        <Button variant="primary">Visit Forum</Button>
                      </LinkContainer>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
        </div>

        {
          userInfo == null &&
          <div className="bg-dark text-light wb-home-content">
            <Container>
              <Row xs="1" md="2" className="g-4 mt-2">
                <Col>
                  <h2 className="text-center mt-5">Join us right now!</h2>
                </Col>
                <Col>
                  <div className="wb-home-sign-up-form">
                    {
                      isRegisterForm ?
                        <RegisterForm onRegister={() => navigate("/Profile")} onToggleClick={() => toggleForm(false)} />
                        :
                        <LoginForm onLogin={() => navigate("/Profile")} onToggleClick={() => toggleForm(true)} />
                    }
                  </div>
                </Col>
              </Row>
            </Container>
          </div>
        }

      </div>
    </>
  );
}

export default HomePage;