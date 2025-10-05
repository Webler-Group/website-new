import { useParams } from "react-router-dom";
import DiscussAskPage from "./DiscussAskPage";


const DiscussEditPage = () => {
    const { questionId } = useParams();

    return (
        <DiscussAskPage questionId={questionId!} />
    )
}

export default DiscussEditPage