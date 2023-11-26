import { Col, Container } from "react-bootstrap";
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

    </>
  );
}

export default Home;
