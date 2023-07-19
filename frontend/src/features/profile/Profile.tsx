import { useEffect, useState } from "react";
import ApiCommunication from "../../helpers/apiCommunication";
import Header from "../../layouts/Header";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { Container } from "react-bootstrap";

interface ProfileProps {
    userId: string;
}

interface UserDetails {
    name: string;
}

const Profile = ({ userId }: ProfileProps) => {

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [searchParams] = useSearchParams();
    const [_, setSettingsVisibility] = useState(false);

    useEffect(() => {
        ApiCommunication.sendJsonRequest(`/Profile/${userId}`, "GET")
            .then(data => {
                if (data.userDetails) {
                    setUserDetails(data.userDetails);
                }
            })
    }, []);

    useEffect(() => {
        setSettingsVisibility(searchParams.get("settings") === "true");
    }, [searchParams]);

    return (
        <>
            <Header />
            {
                userDetails &&
                <Container>
                    <h2>{userDetails.name}</h2>
                </Container>
            }
        </>
    )
}

const ProfileFromParams = () => {
    const params = useParams();

    return (
        <Profile userId={params.userId as string} />
    )
}

const ProfileFromAuth = () => {
    const { userInfo } = useAuth()

    return (
        <>
            {
                userInfo ?
                    <Profile userId={userInfo.id} />
                    :
                    <Navigate to="/Login" state={{ from: location }} replace />
            }
        </>
    )
}

export { ProfileFromParams, ProfileFromAuth }

export default Profile;