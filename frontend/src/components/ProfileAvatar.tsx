interface ProfileAvatarProps {
    avatarUrl?: string | null;
    size: number;
}

const ProfileAvatar = ({ avatarUrl, size }: ProfileAvatarProps) => {
    return (
        <img className="rounded-circle" width={size} height={size} src={avatarUrl || "/resources/images/user.svg"} alt="Avatar" />
    );
}

export default ProfileAvatar;