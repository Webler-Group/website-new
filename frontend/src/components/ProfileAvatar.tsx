interface ProfileAvatarProps {
    avatarImage: string | null;
    size: number;
}

const ProfileAvatar = ({ avatarImage, size }: ProfileAvatarProps) => {
    return (
        <img className="rounded-circle" width={size} height={size} src={avatarImage ? "/media/files/" + avatarImage : "/resources/images/user.svg"} alt="Avatar" />
    );
}

export default ProfileAvatar;