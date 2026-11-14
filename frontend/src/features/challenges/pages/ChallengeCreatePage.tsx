import PageTitle from "../../../layouts/PageTitle";
import { Container } from "../../../components/ui";
import ChallengeCreateForm from "../components/ChallengeCreateForm";


const ChallengeCreate = () => {
    PageTitle("Create Challenge");

    return (
        <Container className="py-4">
            <ChallengeCreateForm />
        </Container>
    );
}


export default ChallengeCreate;