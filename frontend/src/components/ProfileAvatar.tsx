interface ProfileAvatarProps {
    avatarImage: string | null;
    size: number;
}

const ProfileAvatar = ({ avatarImage, size }: ProfileAvatarProps) => {
    return (
        <img className="rounded-circle" width={size} height={size} src={avatarImage ? "/uploads/users/" + avatarImage : "/resources/images/user.svg"} />
    );
}

export default ProfileAvatar;