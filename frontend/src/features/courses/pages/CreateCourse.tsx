import { Alert, Button, Form, FormControl, FormGroup, FormLabel, Modal } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import ToggleSwitch from "../../../components/ToggleSwitch";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import ApiCommunication from "../../../helpers/apiCommunication";
import { useNavigate } from "react-router-dom";

interface CreateCourseProps {
    courseCode: string | null;
}

const CreateCourse = ({ courseCode }: CreateCourseProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [courseId, setCourseId] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState("");
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

    useEffect(() => {
        if (courseCode) {
            getCourse();
        }
    }, [courseCode]);

    const getCourse = async () => {
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/CourseEditor/GetCourse`, "POST", {
            courseCode
        });
        if (result && result.course) {
            setCourseId(result.course.id);
            setCode(result.course.code);
            setTitle(result.course.title);
            setDescription(result.course.description);
            setVisible(result.course.visible);
        }
        setLoading(false);
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setLoading(true);
        courseId ?
            await editCourse() :
            await createCourse();
        setLoading(false);
    }

    const createCourse = async () => {
        setError("");
        const result = await ApiCommunication.sendJsonRequest("/CourseEditor/CreateCourse", "POST", { code, title, description, visible });
        if (result && result.course) {
            navigate("/Courses/Editor");
        }
        else {
            setError(result.error ? result.error.message : result.message);
        }
    }

    const editCourse = async () => {
        setError("");
        const result = await ApiCommunication.sendJsonRequest("/CourseEditor/EditCourse", "PUT", { courseId, title, code, description, visible });
        if (result && result.success) {
            navigate("/Courses/Editor");
        }
        else {
            setError(result.error ? result.error.message : result.message);
        }
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const handleDeleteCourse = async () => {
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest("/CourseEditor/DeleteCourse", "DELETE", { courseId });
        if (result && result.success) {
            closeDeleteModal();
            navigate("/Courses/Editor")
        }
        else {
            setError(result.error ? result.error.message : result.message);
        }
        setLoading(false);
    }

    const handleCoverImageUpload = async (e: FormEvent) => {
        e.preventDefault();

        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest("/CourseEditor/UploadCourseCoverImage", "POST", { courseId, coverImage: coverImageFile }, {}, true);
        if (result && result.success) {
            console.log(result);
        }
        else {
            setError(result.error ? result.error.message : result.message);
        }
        setLoading(false);
    }

    const handleCoverImageChange = (e: ChangeEvent) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) {
            setCoverImageFile(files[0]);
        }
    }

    return (
        <>
            <Modal show={deleteModalVisiblie} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Course will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteCourse}>Delete</Button>
                </Modal.Footer>
            </Modal>
            <div className="d-md-flex gap-3">
                {
                    courseId !== null &&
                    <Form onSubmit={handleCoverImageUpload}>
                        <FormGroup>
                            <FormLabel>Cover image</FormLabel>
                            <FormControl size="sm" type="file" required onChange={handleCoverImageChange} />
                        </FormGroup>
                        <div className="d-flex justify-content-end mt-2">
                            <Button size="sm" className="ms-2" variant="primary" type="submit" disabled={loading}>Upload</Button>
                        </div>
                    </Form>
                }
                <Form className="flex-grow-1" onSubmit={handleSubmit}>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <FormGroup>
                        <FormLabel>Course title</FormLabel>
                        <FormControl type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                        <FormLabel>Course code</FormLabel>
                        <FormControl type="text" required value={code} onChange={(e) => setCode(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                        <FormLabel>Course description</FormLabel>
                        <FormControl as="textarea" rows={8} maxLength={1000} required value={description} onChange={(e) => setDescription(e.target.value)} />
                    </FormGroup>
                    <FormGroup className="d-flex align-items-center mt-2 gap-2">
                        <FormLabel>Is visible</FormLabel>
                        <ToggleSwitch value={visible} onChange={(e) => setVisible((e.target as HTMLInputElement).checked)} />
                    </FormGroup>
                    <div className="d-flex justify-content-end">
                        <LinkContainer to="/Courses/Editor">
                            <Button size="sm" type="button" variant="secondary" disabled={loading}>Cancel</Button>
                        </LinkContainer>
                        {
                            courseId ?
                                <>
                                    <Button size="sm" variant="secondary" className="ms-2" type="button" onClick={() => setDeleteModalVisible(true)} disabled={loading}>Delete</Button>
                                    <Button size="sm" variant="primary" className="ms-2" type="submit" disabled={loading}>Save changes</Button>
                                </>
                                :
                                <>
                                    <Button size="sm" className="ms-2" variant="primary" type="submit" disabled={loading}>Create course</Button>
                                </>
                        }
                    </div>
                </Form>
            </div>
        </>
    );
}

export default CreateCourse;