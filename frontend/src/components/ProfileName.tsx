import { Link } from 'react-router-dom'

interface ProfileNameProps {
    userId: string;
    userName: string;
    className?: string;
}

const ProfileName = ({ userId, userName , className=""}: ProfileNameProps) => {
    return (
        <Link to={"/Profile/" + userId} className={"text-nowrap "+className} style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{userName}</Link>
    )
}

export default ProfileName