import { Button, Card, CardImg, Col, Container } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { useState } from "react";
import LoginForm from "../features/auth/components/LoginForm";
import RegisterForm from "../features/auth/components/RegisterForm";
import PageTitle from "../layouts/PageTitle";
import { useNavigate } from "react-router-dom";

function Home() {

  const navigate = useNavigate();
  const [isUserRegistering, setUserAuthPage] = useState(true);
  PageTitle("Webler - Home", false);

  return (
    <>

      <div className="wb-home-container bg-light">
        <div className="wb-home-header__container bg-dark text-white">
          <h1 className="wb-home-header__title">
            The best way to learn to code
          </h1>
          <p className="wb-home-header__info">
            Courses designed by experts with real-world practice. Join our
            global community. <b>It's free.</b>
          </p>
          <LinkContainer to="/Users/Register">
            <Button size="lg" variant="primary">
              Start learning now!
            </Button>
          </LinkContainer>
        </div>

        {/* Webler home why webler cards */}
        <Container>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-5 text-center ">
            <Col>
              <Card className="w-100 wb-home-why_wb_card">
                <CardImg src="resources\images\placeHolderImage.jpg" alt="..."></CardImg>
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    This is a longer card with supporting text below as a
                    natural lead-in to additional content. This content is a
                    little bit longer.
                  </p>
                </div>
              </Card>
            </Col>

            <Col>
              <Card className="w-100 wb-home-why_wb_card">
                <CardImg src="resources\images\placeHolderImage.jpg" alt="..."></CardImg>
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    This is a longer card with supporting text below as a
                    natural lead-in to additional content. This content is a
                    little bit longer.
                  </p>
                </div>
              </Card>
            </Col>

            <Col>
              <Card className="w-100 wb-home-why_wb_card">
                <CardImg src="resources\images\placeHolderImage.jpg" alt="..."></CardImg>
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    This is a longer card with supporting text below as a
                    natural lead-in to additional content. This content is a
                    little bit longer.
                  </p>
                </div>
              </Card>
            </Col>
          </div>
        </Container>

        {/* Perfect platform info cards */}
        <div className="bg-white">
          <Container>
            <h1 className="text-center wb-home-platform_header">
              Perfect platform for you
            </h1>

            <div className="row row-cols-1 row-cols-md-2 g-6 text-center">
              <Col>
                <Card className="wb-home-perfect-platform_card">
                  <CardImg src="resources\images\placeholderImage1.png" alt="..."></CardImg>
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </Card>
              </Col>

              <Col>
                <Card className="wb-home-perfect-platform_card">
                  <CardImg src="resources\images\placeholderImage1.png" alt="..."></CardImg>
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </Card>
              </Col>
            </div>
          </Container>
        </div>

        {/* Why to code cards */}
        <section className="wb-home-why-code d-flex">
          <Container>

            <div className="row row-cols-1 row-cols-md-3 gy-5  text-center align-self-center">

              <h1 className="wb-why-code_header">Why Code?</h1>
              <Col>
                <Card className="wb_card">
                  <CardImg src="resources\images\pctemplate.png" alt="..."></CardImg>
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </Card>
              </Col>

              <Col>
                <Card className="wb_card">
                  <CardImg src="resources\images\pctemplate.png" alt="..."></CardImg>
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </Card>
              </Col>

              <Col>
                <Card className="wb_card">
                  <CardImg src="resources\images\pctemplate.png" alt="..."></CardImg>
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </Card>
              </Col>

            </div>
          </Container>
        </section>

        {/* Sign up section */}
        <section className="wb-home-join-us bg-dark">
          <Container>

            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-2 gx-2 gy-5 container">
              <Col>
                <h1 className="text-center text-white wb-home-join-us_header">
                  Join us right now!
                </h1>
              </Col>

              <Col>
                <div className="wb-home-sign-up-form">
                  {isUserRegistering == true ? (
                    <RegisterForm
                      onToggleClick={() => setUserAuthPage(false)}
                      onRegister={() => navigate("/Profile")}
                    />
                  ) : (
                    <LoginForm onToggleClick={() => setUserAuthPage(true)} onLogin={() => navigate("/Profile")} />
                  )}
                </div>
              </Col>

            </div>
          </Container>
        </section>

      </div>
    </>
  );
}

export default Home;
