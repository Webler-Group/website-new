
import { Button, Card, Col, Container, Row } from "../components/ui";
import RegisterForm from "../features/auth/components/RegisterForm";
import { useAuth } from "../features/auth/context/authContext";
import { useState } from "react";
import LoginForm from "../features/auth/components/LoginForm";
import { useNavigate } from "react-router-dom";
import { useSeo } from "../components/Seo";

interface Feature {
  title: string;
  description: string;
  to: string;
  action: string;
}

const features: Feature[] = [
  {
    title: "Code Playground",
    description: "Create, edit, and run code in multiple programming languages — all within your browser. Our web-based IDE is perfect for testing ideas, learning syntax, or building small projects without any setup.",
    to: "/Codes",
    action: "Go to Playground"
  },
  {
    title: "Feed",
    description: "Stay connected with the Webler community! The Feed lets you see the latest project updates, shared snippets, discussions, and highlights from developers around the world.",
    to: "/Feed",
    action: "Check Feed"
  },
  {
    title: "Courses",
    description: "Learn by doing with our interactive courses! Each one includes hands-on content, quizzes, and coding tasks to help you master web technologies, programming languages, and software tools at your own pace.",
    to: "/Courses",
    action: "Explore Courses"
  },
  {
    title: "Q&A Discussions",
    description: "Have a question about code or tech? Join our community-driven forum to ask, answer, and explore real-world programming problems. It’s a place to learn, share knowledge, and grow together.",
    to: "/Discuss",
    action: "Visit Forum"
  },
  {
    title: "Challenges",
    description: "Put your skills to the test! Solve coding challenges of varying difficulty in the language of your choice, run your solution against test cases, and earn XP for every challenge you complete.",
    to: "/Challenge",
    action: "Start Solving"
  }
];

const HomePage = () => {

    useSeo({
        title: "Webler Codes",
        description: "Welcome to Webler! We're a global team of independent developers passionate about building high-quality, accessible software."
    });

  const { userInfo } = useAuth();
  const [isRegisterForm, toggleForm] = useState(true);
  const navigate = useNavigate();

  return (
    <>

      <div className="wb-home-page">

        <div className="wb-home-banner text-light d-flex flex-column justify-content-center gap-2">
          <div className="wb-home-banner-logo">
            <img className="wb-home-banner-logo-image" src="../resources/images/logotransparent.svg" alt="Webler logo" />
          </div>
          <h2 className="wb-home-banner-title">Software Engineering</h2>
          <p className="wb-home-banner-slogan">- Building the future, one code at a time</p>
        </div>

        <div className="bg-body-tertiary wb-home-content">
          <Container>
            <h1 className="text-center mb-3">Information</h1>
            <p className="text-center">
              Welcome to Webler! We're a global team of independent developers passionate about building high-quality, accessible software. Our mission is to create useful and fun tools — always free and open to everyone. Whether you're a beginner or a pro, we aim to support your learning and creativity with practical, innovative applications.
            </p>
            <p className="text-center mt-4">Explore some of our core features below:</p>

            {/* justify-content-center keeps a lone card in the last row centered */}
            <Row xs="1" md="2" className="g-4 mt-2 justify-content-center">
              {features.map(feature => (
                <Col key={feature.to}>
                  <Card className="wb-home-feature-card h-100">
                    <Card.Body className="d-flex flex-column justify-content-between">
                      <Card.Title className="text-center py-4 border-bottom border-2">{feature.title}</Card.Title>
                      <Card.Text className="mt-4">{feature.description}</Card.Text>
                      <div className="text-center mt-4">
                        <Button to={feature.to} variant="primary">{feature.action}</Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
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
                  {/* Fixed light panel inside the always-dark band, so its form controls stay light too */}
                  <div className="wb-home-sign-up-form" data-bs-theme="light">
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
