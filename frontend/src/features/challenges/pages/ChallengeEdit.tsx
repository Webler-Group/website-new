import { useParams } from "react-router-dom";
import PageTitle from "../../../layouts/PageTitle";
import ChallengeCreateForm from "../components/ChallengeCreateForm";

const ChallengeEdit = () => {

    PageTitle("Update Challenge");
    
    const { challengeId } = useParams();

    return (
        <ChallengeCreateForm challengeId={challengeId} />
    )
}

export default ChallengeEdit;