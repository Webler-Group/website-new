import { Container } from "../components/ui";
import PageTitle from "../layouts/PageTitle";

const NotFoundPage = () => {
    PageTitle("Webler Codes")
    return (
        <Container>
            <div className="min-vh-100">
                <h1>Oops!</h1>
                <h2>The page you are looking is not found.</h2>
                <hr />
                <p>Error code: 404</p>
            </div>
        </Container>
    );
}

export default NotFoundPage;