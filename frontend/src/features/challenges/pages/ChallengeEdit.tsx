import { useEffect, useState } from "react";
import PageTitle from "../../../layouts/PageTitle";
import { useParams } from "react-router-dom";
import IChallenge from "../IChallenge";
import { useNavigate } from "react-router-dom";
import { useApi } from '../../../context/apiCommunication';
import Loader from "../../../components/Loader";
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
        getChallengeEditInfo();
    }, []);

    const getChallengeEditInfo = async() => {
        setLoading(true);

        const req = await sendJsonRequest(`/Challenge/GetEditInfo`, "POST", {
            challengeId
        });

        if(!req.success) {
            navigate("/PageNotFound");
            return;
        }

        const challenge = req.challenge as IChallenge;
        setChallenge(challenge);
        setLoading(false);
    }

    return <>
        {
            loading ?  <Loader />
            : <ChallengeCreateForm challenge={challenge} challengeId={challengeId} />
        }
    </>
}

export default ChallengeEdit;