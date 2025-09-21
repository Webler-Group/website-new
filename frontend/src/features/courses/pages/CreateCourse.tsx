import { Button, Form, FormControl, FormGroup, FormLabel, Modal } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import ToggleSwitch from "../../../components/ToggleSwitch";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import RequestResultAlert from "../../../components/RequestResultAlert";

interface CreateCourseProps {
    courseId: string | null;
}

const CreateCourse = ({ courseId }: CreateCourseProps) => {
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState<any[] | undefined>();
    const [editMessage, setEditMessage] = useState("");
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [uploadMessage, setUploadMessage] = useState<{ errors?: any[]; message?: string; }>({});

    useEffect(() => {
        if (courseId) {
            getCourse();
        }
    }, [courseId]);

    const getCourse = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/CourseEditor/GetCourse`, "POST", {
            courseId
        });
        if (result && result.course) {
            setCode(result.course.code);
            setTitle(result.course.title);
            setDescription(result.course.description);
            setVisible(result.course.visible);
            setCoverImage(result.course.coverImage);
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
        setError(undefined);
        const result = await sendJsonRequest("/CourseEditor/CreateCourse", "POST", { code, title, description, visible });
        if (result && result.course) {
            navigate("/Courses/Editor");
        }
        else {
            setError(result.error);
        }
    }

    const editCourse = async () => {
        setError(undefined);
        setEditMessage("");
        const result = await sendJsonRequest("/CourseEditor/EditCourse", "PUT", { courseId, title, code, description, visible });
        if (result && result.success) {
            setEditMessage("Course edited successfully");
        }
        else {
            setError(result.error);
        }
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const handleDeleteCourse = async () => {
        setLoading(true);
        const result = await sendJsonRequest("/CourseEditor/DeleteCourse", "DELETE", { courseId });
        if (result && result.success) {
            closeDeleteModal();
            navigate("/Courses/Editor")
        }
        else {
            setError(result?.error ? result.error.message : result.message);
        }
        setLoading(false);
    }

    const handleCoverImageUpload = async (e: FormEvent) => {
        e.preventDefault();

        setUploadMessage({});
        setLoading(true);
        const result = await sendJsonRequest("/CourseEditor/UploadCourseCoverImage", "POST", { courseId, coverImage: coverImageFile }, {}, true);
        if (result && result.success) {
            setCoverImage(result.data.coverImage);
            setUploadMessage({ message: "Course cover image updated successfully" })
        }
        else {
            setUploadMessage({ errors: result?.error });
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
            <div className="row">
                {
                    courseId !== null &&
                    <div className="col-12 col-md-4">
                        <div className="d-flex justify-content-center">
                            <div className="rounded-circle">
                                <img className="wb-courses-course__cover-image" src={coverImage ? "/uploads/courses/" + coverImage : "/resources/images/logoicon.png"} />
                            </div>
                        </div>
                        <Form onSubmit={handleCoverImageUpload}>
                            <RequestResultAlert errors={uploadMessage.errors} message={uploadMessage.message} />
                            <FormGroup>
                                <FormLabel>Cover image</FormLabel>
                                <FormControl size="sm" type="file" required onChange={handleCoverImageChange} accept="image/png" />
                            </FormGroup>
                            <div className="d-flex justify-content-end mt-2">
                                <Button size="sm" className="ms-2" variant="primary" type="submit" disabled={loading}>Upload</Button>
                            </div>
                        </Form>
                    </div>
                }
                <div className="col-12 col-md-8">
                    <Form onSubmit={handleSubmit}>
                        <RequestResultAlert errors={error} message={editMessage} />
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
            </div>
        </>
    );
}

export default CreateCourse;