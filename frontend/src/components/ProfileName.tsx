import { Link } from 'react-router-dom'

interface ProfileNameProps {
    userId: string;
    userName: string;
}

const ProfileName = ({ userId, userName }: ProfileNameProps) => {
    return (
        <Link to={"/Profile/" + userId} className="wb-p-follow-item__name">{userName}</Link>
    )
}

export default ProfileName