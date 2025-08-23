import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/context/authContext";
import AdminTools from "./AdminTools";
import ModTools from "./ModTools";
import { isAdminOrModRole, isAdminRole } from "../data/roles";

export interface IPriviledgeInfo {
    name: string;
    url: string;
}

const makePriviledgeContent = (props: IPriviledgeInfo[]) => {
    const navigate = useNavigate();
    const content = props.map(({name, url}, idx) => {
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
    return content;
}

function ToolsHome() {
    const { userInfo } = useAuth();

    return(
        <div className="d-flex flex-column">
            <ul>
                {
                    isAdminRole(userInfo?.roles) && makePriviledgeContent(AdminTools)
                }

                {
                    isAdminOrModRole(userInfo?.roles) && makePriviledgeContent(ModTools)
                }

            </ul>
        </div>
    )
}


export default ToolsHome;