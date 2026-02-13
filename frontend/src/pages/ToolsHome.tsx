import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/context/authContext";
import PageTitle from "../layouts/PageTitle";

export interface IPriviledgeInfo {
    name: string;
    url: string;
    roles: string[];
}

const tools = [
    { name: "Tag Executor", url: "/Tools/Tags", roles: ["Moderator"] },
    { name: "Course Editor", url: "/Courses/Editor", roles: ["Creator"] },
    { name: "Admin Panel", url: "/Admin", roles: ["Moderator"] }
];

const ToolsHomePage = () => {
    PageTitle("Tools");

    const { userInfo } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="d-flex flex-column">
            <ul>
                {
                    tools
                        .filter(item => userInfo?.roles.some(role => ["Admin", ...item.roles].includes(role)))
                        .map((item) => (
                            <li key={item.name}
                                className="m-1 p-1 bg-hover-primary"
                                style={{ cursor: "pointer" }}
                                onClick={() => { navigate(item.url) }}
                            >
                                {item.name}
                            </li>
                        ))
                }
            </ul>
        </div>
    )
}

export default ToolsHomePage;