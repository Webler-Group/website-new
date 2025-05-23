import { useParams } from "react-router-dom";
import CreateCourse from "./CreateCourse";

const EditCourse = () => {
    const { courseCode } = useParams();

    return (
        <CreateCourse courseCode={courseCode!} />
    );
}

export default EditCourse;