import { Link } from 'react-router-dom'

interface ProfileNameProps {
    userId: string;
    userName: string;
    roles?: string[],
    className?: string;
}


const ProfileBadgeBadge = ({roles}: {roles:string[]} ) => {
    const isOrdinaryUser = roles && roles.length == 1 && roles[0].toLocaleLowerCase() === "user";

    if (isOrdinaryUser) return <span></span>;

    const role = !isOrdinaryUser && roles && (
        roles.includes("Admin") ? "Admin":
        roles.includes("Creator") ? "Creator":
        roles.includes("Moderator") ? "Mod":
        "Staff"
    );

    const color = role === "Admin" ? "info":
        role === "Creator" ? "warning":
        role === "Mod" ? "danger":
        "primary";

    const content = <span className={`badge rounded-pill bg-${color}-subtle text-${color}-emphasis border border-${color}-subtle`}>
                        {role}
                    </span>;
    return content;
}

const ProfileName = ({ userId, userName , roles = [], className=""}: ProfileNameProps) => {
    return (
        <Link to={"/Profile/" + userId} className={"wb-p-follow-item__name "+className} style={{ fontFamily: "monospace" }}>
            <span className='m-1'>{userName}</span>
            <ProfileBadgeBadge roles={roles} />
        </Link>
    )
}

export default ProfileName