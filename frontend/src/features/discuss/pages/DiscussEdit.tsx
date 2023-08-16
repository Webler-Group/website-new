import { useParams } from "react-router-dom";
import AskQuestion from "./DiscussAsk";


const DiscussEdit = () => {
    const { questionId } = useParams();

    return (
        <AskQuestion questionId={questionId!} />
    )
}

export default DiscussEdit