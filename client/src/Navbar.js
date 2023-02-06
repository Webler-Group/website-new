import { Link } from "react-router-dom"

function Navbar() {
    return (
        <div>
            <h1>Webler</h1>
            <div>
                <Link to="/">Home</Link>
                <Link to="/members">Members</Link>
            </div>
        </div>
    );
}

export default Navbar;