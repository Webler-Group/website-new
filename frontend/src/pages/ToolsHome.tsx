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
    { name: "Admin Panel", url: "/Admin", roles: ["Moderator"] },
    { name: "Challenge Editor", url: "/Challenge/Create", roles: ["Creator"] }
];

const makePriviledgeContent = (props: IPriviledgeInfo[]) => {
    const { userInfo } = useAuth();
    const navigate = useNavigate();

    return props.map(({name, url, roles}, idx) => {
        if(!userInfo || !userInfo.roles.some(role => ["Admin", ...roles].includes(role))) {
            return (<></>);
        }
        return (
            <li key={idx} 
                className="m-1 p-1 bg-hover-primary" 
                style={{ cursor: "pointer" }}
                onClick={() => { navigate(url) }}
            >
                {name}
            </li>
        )
    });
}

const ToolsHomePage = () => {
    PageTitle("Tools");

    return(
        <div className="d-flex flex-column">
            <ul>
                {makePriviledgeContent(tools)}
            </ul>
        </div>
    )
}

export default ToolsHomePage;