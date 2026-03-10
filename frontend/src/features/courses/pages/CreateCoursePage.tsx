import { Button, Form, FormControl, FormGroup, FormLabel, Modal } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import ToggleSwitch from "../../../components/ToggleSwitch";
import { ChangeEvent, SubmitEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import RequestResultAlert from "../../../components/RequestResultAlert";
import { EditorCreateCourseData, EditorEditCourseData, EditorGetCourseData, EditorImportCourseData, EditorUploadCourseCoverImageData } from "../types";

interface CreateCoursePageProps {
    courseId: string | null;
}

const CreateCoursePage = ({ courseId }: CreateCoursePageProps) => {
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState<{ message: string }[] | undefined>();
    const [editMessage, setEditMessage] = useState("");
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [uploadMessage, setUploadMessage] = useState<{ errors?: { message: string }[]; message?: string; }>({});
    const [importMessage, setImportMessage] = useState<{ errors?: { message: string }[]; message?: string; }>({});
    const [showJsonHelp, setShowJsonHelp] = useState(false);

    useEffect(() => {
        if (courseId) {
            getCourse();
        }
    }, [courseId]);

    const getCourse = async () => {
        setLoading(true);
        const result = await sendJsonRequest<EditorGetCourseData>(`/CourseEditor/GetCourse`, "POST", {
            courseId
        });
        if (result.data) {
            setCode(result.data.course.code);
            setTitle(result.data.course.title);
            setDescription(result.data.course.description);
            setVisible(result.data.course.visible);
            setCoverImageUrl(result.data.course.coverImageUrl);
        }
        setLoading(false);
    }

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        setLoading(true);
        if (importedLessons) {
            await importCourseWithData();
        } else {
            courseId ?
                await editCourse() :
                await createCourse();
        }
        setLoading(false);
    }

    const importCourseWithData = async () => {
        setError(undefined);
        const payload = {
            code,
            title,
            description,
            visible,
            lessons: importedLessons
        };

        const result = await sendJsonRequest<EditorImportCourseData>("/CourseEditor/ImportCourse", "POST", payload);

        if (result.data) {
            navigate("/Courses/Editor" + result.data.course.id);
        } else {
            setError(result.error);
        }
    }

    const createCourse = async () => {
        setError(undefined);
        const result = await sendJsonRequest<EditorCreateCourseData>("/CourseEditor/CreateCourse", "POST", { code, title, description, visible });
        if (result.data) {
            navigate("/Courses/Editor/" + result.data.course.id);
        }
        else {
            setError(result.error);
        }
    }

    const editCourse = async () => {
        setError(undefined);
        setEditMessage("");
        const result = await sendJsonRequest<EditorEditCourseData>("/CourseEditor/EditCourse", "PUT", { courseId, title, code, description, visible });
        if (result.data) {
            setVisible(result.data.visible);
            setCode(result.data.code);
            setTitle(result.data.title);
            setDescription(result.data.description);

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
            navigate("/Courses/Editor");
        }
        else {
            setError(result.error);
        }
        setLoading(false);
    }

    const handleCoverImageUpload = async (e: SubmitEvent) => {
        e.preventDefault();

        setUploadMessage({});
        setLoading(true);
        const result = await sendJsonRequest<EditorUploadCourseCoverImageData>("/CourseEditor/UploadCourseCoverImage", "POST", { courseId, coverImage: coverImageFile }, {}, true);
        if (result.data) {
            setCoverImageUrl(result.data.coverImageUrl);
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

    const [importedLessons, setImportedLessons] = useState<any[] | null>(null);

    const handleImportFileChange = (e: ChangeEvent) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) {
            const file = files[0];
            setImportedLessons(null);

            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target?.result as string;
                try {
                    const json = JSON.parse(text);

                    if (json.code) setCode(json.code);
                    if (json.title) setTitle(json.title);
                    if (json.description) setDescription(json.description);
                    if (json.visible !== undefined) setVisible(json.visible);

                    if (json.lessons && Array.isArray(json.lessons)) {
                        setImportedLessons(json.lessons);
                        setImportMessage({ message: `Loaded ${json.lessons.length} lessons from file. Review details below and click 'Create/Save' to finish import.` });
                    } else {
                        setImportMessage({ errors: [{ message: "JSON invalid: missing 'lessons' array" }] });
                    }

                } catch (err) {
                    setImportMessage({ errors: [{ message: "Invalid JSON file" }] });
                }
            };
            reader.readAsText(file);
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
                                <img className="wb-courses-course__cover-image" src={coverImageUrl || "/resources/images/logoicon.svg"} alt="Cover image" />
                            </div>
                        </div>
                        <Form onSubmit={handleCoverImageUpload}>
                            <RequestResultAlert errors={uploadMessage.errors} message={uploadMessage.message} />
                            <FormGroup>
                                <FormLabel>Cover image</FormLabel>
                                <FormControl size="sm" type="file" required onChange={handleCoverImageChange} accept="image/png, image/jpeg, image/jpg" />
                            </FormGroup>
                            <div className="d-flex justify-content-end mt-2">
                                <Button size="sm" className="ms-2" variant="primary" type="submit" disabled={loading}>Upload</Button>
                            </div>
                        </Form>
                    </div>
                }
                <div className="col-12 col-md-8">
                    {
                        !courseId &&
                        <div className="mb-4 p-3 border rounded bg-light">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5>Load Course Data from JSON</h5>
                                <Button variant="link" size="sm" onClick={() => setShowJsonHelp(true)}>JSON Format Guide</Button>
                            </div>
                            <RequestResultAlert errors={importMessage.errors} message={importMessage.message} />
                            <FormGroup className="mb-2">
                                <FormLabel>Select JSON File to Populate</FormLabel>
                                <FormControl type="file" accept=".json, application/json" onChange={handleImportFileChange} />
                            </FormGroup>
                        </div>
                    }

                    <Modal show={showJsonHelp} onHide={() => setShowJsonHelp(false)} size="lg" centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Course Import JSON Format</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <p>To import a course, your JSON file must follow this structure:</p>
                            <pre className="bg-light p-3 border rounded" style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem' }}>
                                {`{
  "code": "course-code-unique",
  "title": "Course Title",
  "description": "Description...",
  "visible": false,
  "lessons": [
    {
      "title": "Lesson 1",
      "nodes": [
        {
          "type": 1, // 1=Text, 2=SingleChoice, 3=MultiChoice
          "text": "Markdown content here...",
          // For Questions (Type 2 & 3):
          "answers": [
            { "text": "Option A", "correct": true },
            { "text": "Option B", "correct": false }
          ]
        }
      ]
    }
  ]
}`}
                            </pre>
                            <h6>Node Types:</h6>
                            <ul className="small text-muted">
                                <li><strong>1 (Text):</strong> Standard content node (Markdown supported)</li>
                                <li><strong>2 (Single Choice):</strong> Question with one correct answer</li>
                                <li><strong>3 (Multi Choice):</strong> Question with multiple correct answers</li>
                            </ul>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowJsonHelp(false)}>Close</Button>
                        </Modal.Footer>
                    </Modal>

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
                            <LinkContainer to={courseId ? "/Courses/Editor/" + courseId : "/Courses/Editor/"}>
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

export default CreateCoursePage;
