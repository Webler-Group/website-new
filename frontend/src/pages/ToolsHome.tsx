import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/context/authContext";
import PageTitle from "../layouts/PageTitle";
import RolesEnum from "../data/RolesEnum";
import { Container } from "react-bootstrap";

export interface IPriviledgeInfo {
    name: string;
    url: string;
    roles: RolesEnum[];
}

const tools = [
    { name: "Tag Executor", url: "/Tools/Tags", roles: [RolesEnum.MODERATOR] },
    { name: "Course Editor", url: "/Courses/Editor", roles: [RolesEnum.CREATOR] },
    { name: "Admin Panel", url: "/Admin", roles: [RolesEnum.MODERATOR] }
];

const ToolsHomePage = () => {
    PageTitle("Tools");

    const { userInfo } = useAuth();

    return (
        <Container className="mt-4">
            <ul style={{ listStyleType: "disc" }}>
                {
                    tools
                        .filter(item => userInfo?.roles.some(role => [RolesEnum.ADMIN, ...item.roles].includes(role)))
                        .map((item) => (
                            <li key={item.name}>
                                <Link to={item.url}>{item.name}</Link>
                            </li>
                        ))
                }
            </ul>
        </Container>
    )
}

export default ToolsHomePage;