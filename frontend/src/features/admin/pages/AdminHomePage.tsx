import { Container } from "../../../components/ui";
import { Link } from "react-router-dom";
import { useSeo } from "../../../components/Seo";

const AdminHomePage = () => {
    useSeo({ title: "Admin", noIndex: true });
    return (
        <Container className="mt-4">
            <h2>Admin Dashboard</h2>
            <p>Welcome to the admin panel.</p>

            <ul className="wb-util-list-disc">
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
