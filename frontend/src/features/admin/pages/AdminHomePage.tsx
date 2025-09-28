import { Link } from "react-router-dom";
import { Button, Container } from "react-bootstrap";

const AdminHomePage = () => {
    return (
        <Container className="mt-4">
            <h2>Admin Dashboard</h2>
            <p>Welcome to the admin panel.</p>

            <Link to="/Admin/UserSearch">
                <Button variant="primary">Go to User Search</Button>
            </Link>
        </Container>
    );
}

export default AdminHomePage;
