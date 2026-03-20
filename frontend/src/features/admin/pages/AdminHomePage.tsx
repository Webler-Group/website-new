import { Link } from "react-router-dom";
import { Container } from "react-bootstrap";

const AdminHomePage = () => {
    return (
        <Container className="mt-4">
            <h2>Admin Dashboard</h2>
            <p>Welcome to the admin panel.</p>

            <ul style={{ listStyleType: "disc" }}>
                <li>
                    <Link to="/Admin/UserSearch">User Search</Link>
                </li>
                <li>
                    <Link to="/Admin/IpList">IP List</Link>
                </li>
            </ul>
        </Container>
    );
}

export default AdminHomePage;
