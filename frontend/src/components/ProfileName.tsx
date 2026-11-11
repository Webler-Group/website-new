import { cx } from "./ui";
import { Link } from 'react-router-dom'

interface ProfileNameProps {
    userId: string;
    userName: string;
    className?: string;
}

const ProfileName = ({ userId, userName, className }: ProfileNameProps) => {
    return (
        <Link to={"/Profile/" + userId} className={cx("wb-profile-name text-nowrap", className)}>{userName}</Link>
    )
}

export default ProfileName