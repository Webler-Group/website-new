import { useParams } from "react-router-dom";
import PageTitle from "../../../layouts/PageTitle";
import { Container } from "../../../components/ui";
import ChallengeCreateForm from "../components/ChallengeCreateForm";

const ChallengeEdit = () => {

    PageTitle("Update Challenge");
    
    const { challengeId } = useParams();

    return (
        <Container className="py-4">
            <ChallengeCreateForm challengeId={challengeId} />
        </Container>
    )
}

export default ChallengeEdit;