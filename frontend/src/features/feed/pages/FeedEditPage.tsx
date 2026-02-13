import { useParams } from "react-router-dom";
import FeedCreatePage from "./FeedCreatePage";

const FeedEditPage = () => {
    const { feedId } = useParams();

    return (
        <FeedCreatePage feedId={feedId!} />
    )
}

export default FeedEditPage;