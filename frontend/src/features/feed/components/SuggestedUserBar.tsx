import {UserMinimal} from "../../profile/types.ts";
import {useCallback, useState} from "react";
import {useApi} from "../../../context/apiCommunication.tsx";
import ProfileAvatar from "../../../components/ProfileAvatar.tsx";
import ProfileName from "../../../components/ProfileName.tsx";

interface iSuggestedUserBar {
    users: UserMinimal[]
}

const SuggestedUsersBar = ({ users }: iSuggestedUserBar) => {
    const { sendJsonRequest } = useApi();
    const [, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const handleFollow = async (user: UserMinimal, btn: HTMLButtonElement) => {
        const result = await sendJsonRequest(`/Profile/Follow`, "POST", { userId: user.id });
        if (result.success) {
            btn.disabled = true;
        } else {
            showNotification("error", result.error?.[0].message ?? `Unable to follow ${name}`);
        }
    };

    const showNotification = useCallback((type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    return (
        <div className="card shadow-sm mb-3 border-0">
            <div className="card-body py-3">

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 fw-semibold">Webler Elite</h6>
                    {/*<button className="btn btn-sm btn-outline-secondary">*/}
                    {/*    Refresh*/}
                    {/*</button>*/}
                </div>

                <div
                    className="d-flex gap-3 overflow-auto pb-2"
                    style={{ scrollBehavior: "smooth" }}
                >
                    {users.slice(0, 10).map((user) => (
                        <div
                            key={user.id}
                            className="text-center flex-shrink-0"
                            style={{ width: 110 }}
                        >
                            <div className="position-relative mb-2">
                                <ProfileAvatar size={64} avatarUrl={user.avatarUrl} />
                                <span
                                    className="position-absolute bottom-0 end-0 badge bg-primary rounded-circle p-1"
                                    style={{ fontSize: "0.6rem" }}
                                >
                  {user.level}
                </span>
                            </div>

                            {/* Name */}
                            <div
                                className="fw-semibold text-truncate"
                                style={{ fontSize: "0.9rem" }}
                                title={user.name}
                            >
                                <ProfileName userId={user.id} userName={user.name} />
                            </div>

                            <div className="text-muted small mb-2">
                                {user.followersCount} followers
                            </div>

                            <button
                                className="btn btn-sm btn-primary w-100"
                                onClick={(e)=>handleFollow(user, e.target as HTMLButtonElement)}
                            >
                                Follow
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


export default SuggestedUsersBar;