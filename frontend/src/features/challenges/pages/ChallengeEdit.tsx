import { useEffect, useState } from "react";
import PageTitle from "../../../layouts/PageTitle";
import { useParams } from "react-router-dom";
import IChallenge from "../IChallenge";
import { useNavigate } from "react-router-dom";
import { useApi } from '../../../context/apiCommunication';
import { EllipsisLoaderPlaceholder } from "../../../components/Loader";
import ChallengeCreateForm from "../components/ChallengeCreateForm";

const ChallengeEdit = () => {

    PageTitle("Update Challenge");

    const { challengeId } = useParams();
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [challenge, setChallenge] = useState<IChallenge>();

    useEffect(() => {
        console.log(challengeId);
        getChallenge();
    }, []);

    const getChallenge = async() => {
        setLoading(true);

        const req = await sendJsonRequest(`/Challenge/GetEditInfo`, "POST", {
            challengeId
        });

        if(!req.success || !req.challenge) {
            navigate("/PageNotFound");
            return;
        }

        const challenge = req.challenge as IChallenge;
        setChallenge(challenge);
        setLoading(false);
    }

    return <>
        {
            loading ?  <EllipsisLoaderPlaceholder />
            : <ChallengeCreateForm challenge={challenge} challengeId={challengeId} />
        }
    </>
}

export default ChallengeEdit;