import { useParams } from "react-router-dom";
import { useSeo } from "../../../components/Seo";
import { Container } from "../../../components/ui";
import ChallengeCreateForm from "../components/ChallengeCreateForm";

const ChallengeEdit = () => {

    useSeo({ title: "Update Challenge", noIndex: true });
    
    const { challengeId } = useParams();

    return (
        <Container className="py-4">
            <ChallengeCreateForm challengeId={challengeId} />
        </Container>
    )
}

export default ChallengeEdit;