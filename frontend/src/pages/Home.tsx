import { Button, Container } from "react-bootstrap";
import Header from "../layouts/Header";
import { LinkContainer } from "react-router-bootstrap";
import { useState } from "react";
import LoginForm from "../features/auth/components/LoginForm";
import RegisterForm from "../features/auth/components/RegisterForm";

function Home() {
  const [isUserRegistering, setUserAuthPage] = useState(true);

  return (
    <>
      <Header variant="dark" />

      <div className="wb-home-container bg-light">
        <div className="wb-home-header__container bg-dark text-white">
          <h1 className="wb-home-header__title">
            The best way to learn to code
          </h1>
          <p className="wb-home-header__info">
            Courses designed by experts with real-world practice. Join our
            global community. <b>It's free.</b>
          </p>
          <LinkContainer to="/Register">
            <Button size="lg" variant="primary">
              Start learning now!
            </Button>
          </LinkContainer>
        </div>

        <Container>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-5 text-center ">
            <div className="col">
              <div className="card w-100 h-100 wb-home-why_wb_card">
                <img
                  width={"100%"}
                  src="resources\images\placeHolderImage.jpg"
                  className="card-img-top"
                  alt="..."
                />
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    This is a longer card with supporting text below as a
                    natural lead-in to additional content. This content is a
                    little bit longer.
                  </p>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card w-100 h-100 wb-home-why_wb_card">
                <img
                  width={"100%"}
                  src="resources\images\placeHolderImage.jpg"
                  className="card-img-top"
                  alt="..."
                />
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    This is a longer card with supporting text below as a
                    natural lead-in to additional content. This content is a
                    little bit longer.
                  </p>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card w-100 h-100 wb-home-why_wb_card">
                <img
                  width={"100%"}
                  src="resources\images\placeHolderImage.jpg"
                  className="card-img-top"
                  alt="..."
                />
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    This is a longer card with supporting text below as a
                    natural lead-in to additional content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>

        <div className="bg-white">
          <Container>
            <h1 className="text-center wb-home-platform_header">
              Perfect platform for you
            </h1>
            <div className="row row-cols-1 row-cols-md-2 g-6 text-center">
              <div className="col">
                <div className="card wb-home-perfect-platform_card">
                  <img
                    src="resources\images\placeholderImage1.png"
                    className="card-img-top"
                    alt="..."
                  />
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card wb-home-perfect-platform_card">
                  <img
                    src="resources\images\placeholderImage1.png"
                    className="card-img-top"
                    alt="..."
                  />
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </div>

        <section className="wb-home-why-code d-flex ">
          <Container>
            <div className="row row-cols-1 row-cols-md-3 gy-5  text-center align-self-center">
              <h1 className="wb-why-code_header">Why Code?</h1>
              <div className="col">
                <div className="card wb_card">
                  <img
                    src="resources\images\pctemplate.png"
                    className="card-img-top"
                    alt="..."
                  />
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card wb_card">
                  <img
                    src="resources\images\pctemplate.png"
                    className="card-img-top"
                    alt="..."
                  />
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card wb_card">
                  <img
                    src="resources\images\pctemplate.png"
                    className="card-img-top"
                    alt="..."
                  />
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a
                      natural lead-in to additional content. This content is a
                      little bit longer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Sign up section */}
        <section className="wb-home-join-us bg-dark">
          <Container>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-2 gx-2 gy-5 container">
              <div className="col">
                <h1 className="text-center text-white wb-home-join-us_header">
                  Join us right now!
                </h1>
              </div>
              <div className="col">
                <div className="wb-home-sign-up-form">
                  {isUserRegistering == true ? (
                    <RegisterForm
                      onToggleClick={() => setUserAuthPage(false)}
                    />
                  ) : (
                    <LoginForm onToggleClick={() => setUserAuthPage(true)} />
                  )}
                </div>
              </div>
            </div>
          </Container>
        </section>

        <footer className="bg-black ">
          <Container>
            <div className="row row-cols-4 row-cols-6 d-flex wb-home-footer">
            <div className="p-2">Home</div>
              <div className="p-2">Pro</div>
              <div className="p-2">FAQ</div>
              <div className="p-2">Contact</div>
              
              <div className="p-2">Terms of Use</div>
              <div className="me-auto p-2">Privacy Policy</div>
              < br/>< br/>< br/>
              <div className="p-2 w-100">
                <div className="text-center wb-made-by">
                  Made with :heart: by <b>Webler</b>
                </div>
              </div>
            </div>
          </Container>
        </footer>
      </div>
    </>
  );
}

export default Home;
