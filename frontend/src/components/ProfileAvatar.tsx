interface ProfileAvatarProps {
    avatarImage: string | null;
    size: number;
    name?: string
}

const ProfileAvatar = ({ avatarImage, name, size }: ProfileAvatarProps) => {
    const firstLetter = name ? name.charAt(0).toUpperCase() : "?";
    const content = avatarImage && 
        <img className="wb-user__image" 
            width={size} 
            height={size} 
            src={avatarImage ? "/uploads/users/" + avatarImage : "/resources/images/user.svg"} 
            onError={(e: any) => (e.target.style.display = "none")} // hide broken images
        /> || 
        <div style={{
            width: size + "px",
            height: size + "px",
            backgroundColor: "#" + (~~(Math.random() * 0xffffff)).toString(16).padStart(6, "0"),
            fontSize: "1.2rem",
            display: "inline-block"
            }}

            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
        >
            {firstLetter}
        </div>

    return content;
}

export default ProfileAvatar;