import SafeImage from "./SafeImage";

interface ProfileAvatarProps {
    avatarUrl?: string | null;
    size: number;
}

const DEFAULT_AVATAR = "/resources/images/user.svg";

const ProfileAvatar = ({ avatarUrl, size }: ProfileAvatarProps) => {
    return (
        <SafeImage className="rounded-circle" width={size} height={size} src={avatarUrl || DEFAULT_AVATAR} fallbackSrc={DEFAULT_AVATAR} alt="Avatar" />
    );
}

export default ProfileAvatar;
