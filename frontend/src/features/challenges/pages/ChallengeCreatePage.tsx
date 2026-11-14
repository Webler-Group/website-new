import { useSeo } from "../../../components/Seo";
import { Container } from "../../../components/ui";
import ChallengeCreateForm from "../components/ChallengeCreateForm";


const ChallengeCreate = () => {
    useSeo({ title: "Create Challenge", noIndex: true });

    return (
        <Container className="py-4">
            <ChallengeCreateForm />
        </Container>
    );
}


export default ChallengeCreate;