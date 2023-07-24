import { Container } from "react-bootstrap";
import Header from "../layouts/Header";
import PageTitle from "../layouts/PageTitle";

function NotFound() {
    PageTitle("Page not found")
    return (
        <>
            <Header />

            <Container>
                <h1>Oops!</h1>
                <h2>The page you are looking is not found.</h2>
                <hr />
                <p>Error code: 404</p>
            </Container>
        </>
    );
}

export default NotFound;