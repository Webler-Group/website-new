import { Link } from 'react-router-dom'

interface ProfileNameProps {
    userId: string;
    userName: string;
    className?: string;
}

const ProfileName = ({ userId, userName , className=""}: ProfileNameProps) => {
    return (
        <Link to={"/Profile/" + userId} className={"wb-p-follow-item__name "+className} style={{ fontFamily: "monospace" }}>{userName}</Link>
    )
}

export default ProfileName