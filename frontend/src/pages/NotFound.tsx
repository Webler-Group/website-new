import { Container } from "react-bootstrap";
import PageTitle from "../layouts/PageTitle";

function NotFound() {
    PageTitle("Page not found")
    return (
        <Container>
            <div style={{ minHeight: "100vh" }}>
                <h1>Oops!</h1>
                <h2>The page you are looking is not found.</h2>
                <hr />
                <p>Error code: 404</p>
            </div>
        </Container>
    );
}

export default NotFound;