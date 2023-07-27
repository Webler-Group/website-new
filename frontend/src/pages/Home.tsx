import { Button, Container } from "react-bootstrap";
import Header from "../layouts/Header";
import { LinkContainer } from "react-router-bootstrap";

function Home() {
  return (
    <>
      <Header variant="dark" />

      <div className="wb-home-container bg-light">
        <div className="wb-home-header__container bg-dark text-white">
          <h1 className="wb-home-header__title">The best way to learn to code</h1>
          <p className="wb-home-header__info">
            Courses designed by experts with real-world practice. Join our global community. <b>It's free.</b>
          </p>
          <LinkContainer to="/Register">
            <Button size="lg" variant="primary">Start learning now!</Button>
          </LinkContainer>
        </div>

        <Container>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-5 text-center ">
            <div className="col">
              <div className="card w-100 h-100">
                <img
                  width={"100%"}
                  src="resources\images\placeHolderImage.jpg"
                  className="card-img-top"
                  alt="..."
                />
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    This is a longer card with supporting text below as a natural
                    lead-in to additional content. This content is a little bit
                    longer.
                  </p>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card w-100 h-100">
                <img
                  width={"100%"}
                  src="resources\images\placeHolderImage.jpg"
                  className="card-img-top"
                  alt="..."
                />
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    This is a longer card with supporting text below as a natural
                    lead-in to additional content. This content is a little bit
                    longer.
                  </p>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card w-100 h-100">
                <img
                  width={"100%"}
                  src="resources\images\placeHolderImage.jpg"
                  className="card-img-top"
                  alt="..."
                />
                <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text">
                    This is a longer card with supporting text below as a natural
                    lead-in to additional content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>

        <div className="bg-white">
          <Container>
            <h1 className="text-center">Perfect platform for you</h1>
            <div className="row row-cols-2 row-cols-md-2 text-center">

              <div className="col">
                <div className="card">
                  <img
                    src="resources\images\placeholderImage1.png"
                    className="card-img-top"
                    alt="..."
                  />
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a natural
                      lead-in to additional content. This content is a little bit
                      longer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card">
                  <img
                    src="resources\images\placeholderImage1.png"
                    className="card-img-top"
                    alt="..."
                  />
                  <div className="card-body">
                    <h5 className="card-title">Card title</h5>
                    <p className="card-text">
                      This is a longer card with supporting text below as a natural
                      lead-in to additional content. This content is a little bit
                      longer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Container>

        </div>
      </div>
    </>
  );
}

export default Home;
