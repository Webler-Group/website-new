import { Dispatch, useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Modal, Tab, Nav, ListGroup, Badge } from "react-bootstrap";
import { FaCheckCircle, FaCode, FaInfoCircle, FaTimesCircle } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import IChallenge from "../IChallenge";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import allowedUrls from "../../../data/discussAllowedUrls";
import PageTitle from "../../../layouts/PageTitle";
import { ICode } from "../../codes/components/Code";
import CodeEditor from "../../compiler-playground/components/CodeEditor";
import { SelectFormField } from "../../../components/FormField";
import Loader from "../../../components/Loader";
import { compilerLanguages } from "../../../data/compilerLanguages";
import { useAuth, UserInfo } from "../../auth/context/authContext";
import { useSnackbar } from "../../../context/SnackbarProvider";

interface IDescriptionViewProps {
  challenge: IChallenge | undefined;
  userInfo: UserInfo | null;
  handleEdit: () => void;
  handleDelete: () => Promise<void>;
}


interface IEditorViewProps {
  availableLang: string[];
  selectedLanguage: string;
  setSelectedLanguage: Dispatch<React.SetStateAction<string>>;
  templateLoading: boolean;
  code: ICode;
  source: string;
  setSource: Dispatch<React.SetStateAction<string>>;
  editorOptions: any;
  handleSubmit: () => Promise<void>;
  submitLoading: boolean;
}


const DescriptionView = ({ challenge, userInfo , handleEdit, handleDelete }: IDescriptionViewProps) => {
  return (
    <Card className="p-3 shadow">
      <h4>
        <FaInfoCircle className="me-2 text-primary" /> { challenge?.title }
      </h4>
      <div>
        <MarkdownRenderer content={(challenge?.description as string)} allowedUrls={allowedUrls} />
      </div>
      <p className="bg-success-subtle text-success m-1 p-1 rounded fw-bold">+{challenge?.xp} XP Reward</p>
      {
        userInfo && (userInfo.roles.includes("Admin") || userInfo.id === challenge?.author) &&
        <Row>
          <button className="col btn bg-info m-1" onClick={handleEdit}>Edit</button>
          <button className="col btn bg-danger-subtle text-danger m-1" onClick={handleDelete}>Delete</button>
        </Row>
      }
    </Card>
  )
}


const EditorView = ({ availableLang, selectedLanguage, setSelectedLanguage, 
  templateLoading, code, source, setSource, editorOptions, handleSubmit, submitLoading  }: IEditorViewProps) => {
  return (
    <Card className="p-3 shadow bg-dark text-light">
      <div className="m-1 d-flex justify-content-between">
          <h4>
            <FaCode className="me-2 text-success" /> Code Editor
          </h4>
          <SelectFormField 
            options={availableLang}
            value={selectedLanguage}
            onChange={setSelectedLanguage}
          />
      </div>
      
      <div className="d-flex justify-content-end mt-3">
        <Button onClick={handleSubmit} variant="primary" disabled={submitLoading}>
          { submitLoading ? "Running...": "Submit" }
        </Button>
      </div>
    </Card>
  )
}


function ChallengeDetails() {
  PageTitle("Solve Challenge");

  const { sendJsonRequest } = useApi();
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [availableLang, setAvailableLang] = useState<string[]>(["python", "c"]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [challenge, setChallenge] = useState<IChallenge>();
  const [loading, setLoading] = useState(false);
  const [submissionLoading, setSubmissionLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [code, setCode] = useState<ICode>();

  const [source, setSource] = useState("");
  const [editorOptions, setEditorOptions] = useState<any>({ scale: 1.0 });

  const { userInfo } = useAuth();
  const { showMessage } = useSnackbar();


  // Dummy test results
  // @todo: from the backend, only non-hidden testcases should actually return the input.
  // otherwise it should just return a *** for every hidden testcases. The expected result
  // can still be left visible but i will make that an implementation based.
  const testCases = [
    { id: 1, input: "nums=[2,7,11,15], target=9", output: "[0,1]", passed: true },
    { id: 2, input: "nums=[3,2,4], target=6", output: "[1,2]", passed: true },
    { id: 3, input: "nums=[3,3], target=6", output: "[0,1]", passed: false },
    { id: 4, input: "nums=[1,2,3], target=5", output: "N/A", passed: true },
    { id: 5, input: "nums=[10,20], target=40", output: "N/A", passed: false },
    { id: 6, input: "nums=[5,5,5], target=10", output: "[0,1]", passed: true },
  ];

  useEffect(() => {
    setError("");
    getChallenge();
  }, [challengeId]);


  useEffect(() => {
    setError("");
    getSubmissionTemplate();
  }, [selectedLanguage]);


  const getSubmissionTemplate = async() => {
      setSubmissionLoading(true);

      if(selectedLanguage === "") return;

      const response = await sendJsonRequest(`/ChallengeSub/GetEntry`, "POST", {
        challengeId,
        language: selectedLanguage
      });
      
      if(response.success && response.code)
        setSource(response.code);
      else {
        setError(response.message);
        return;
      }

      setCode({ 
        language: (selectedLanguage.toLocaleLowerCase()) as compilerLanguages,
        comments: 0,
        votes: 0,
        isUpvoted: false,
        isPublic: false
      });

      setSubmissionLoading(false);
  }

  const getChallenge = async () => {
      setLoading(true);

      const result = await sendJsonRequest(`/Challenge/GetChallenge`, "POST", {
          challengeId
      });
     
      if (result.success && result.challenge) {
        const challenge = result.challenge as IChallenge;

        // set all available languages
        if(challenge.templates && challenge.templates.length > 0) {
          const lang: string[] = [];
          for(let template of challenge.templates) {
              lang.push(template.name);
          }

          setAvailableLang(lang);
          setSelectedLanguage(availableLang[0]);
        }

        setChallenge(challenge);
        setLoading(false);

        return;

      }

      setLoading(false);
      navigate("/PageNotFound");
      
    }

  const handleSubmit = async() => {
    setSubmitLoading(true);
    const submission = await sendJsonRequest(`/ChallengeSub/AddOrUpdateEntry`, "POST", {
      challengeId,
      language: selectedLanguage,
      code: source
    });

    if(!submission.success) {
      showMessage(submission.message);
      return;
    }

    const job = await sendJsonRequest(`/ChallengeSub/CreateEntryJob`, "POST", {
      submissionId: submission.submission._id,
      challengeId,
    });

    console.log(job);

    setSubmitLoading(false);
    showMessage("Testcase ran successfully");
    setShowModal(true);
    
  };

  const handleDelete = async () => {
    // using prompt for now, a frontend modal box is needed later
    const q = prompt("Do you want to delete this challenge");
    if(q) {
      const req = await sendJsonRequest(`/Challenge/Delete`, "POST", {
        challengeId
      });

      if(req.success) {
        navigate("/Challenge");
        return;
      }

      showMessage("Error:" + req.message);
    }
  }

  const handleEdit = () => {
    // only author or admin can visit this route tho
    navigate("/Challenge/Edit/" + challengeId);
  }

  return (
    <Container fluid className="py-4">

      <Row className="d-none d-md-flex">
        <Col md={6}>
        {
              loading ? 
              <Loader />
            : challenge &&
            <DescriptionView challenge={challenge} userInfo={userInfo} 
              handleEdit={handleEdit} handleDelete={handleDelete} 
            />
          }
        </Col>

        <Col md={6}>
          {
            loading ? <Loader /> :
              <EditorView availableLang={availableLang} selectedLanguage={selectedLanguage} 
                setSelectedLanguage={setSelectedLanguage} 
                templateLoading={submissionLoading} 
                code={code as ICode} 
                source={source} 
                setSource={setSource} 
                editorOptions={editorOptions} 
                handleSubmit={handleSubmit} 
                submitLoading={submitLoading} 
              />
          }
        </Col>
      </Row>

      {/* For mobile -> tabs */}
      <div className="d-md-none">
        <Tab.Container defaultActiveKey="description">
          <Nav variant="tabs">
            <Nav.Item>
              <Nav.Link eventKey="description">Description</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="editor">Code</Nav.Link>
            </Nav.Item>
          </Nav>
          <Tab.Content className="mt-3">
            <Tab.Pane eventKey="description">
              {
                loading ? 
                  <Loader />
                : challenge &&
                <DescriptionView challenge={challenge} userInfo={userInfo} 
                  handleEdit={handleEdit} handleDelete={handleDelete} 
                />
              }
            </Tab.Pane>
            <Tab.Pane eventKey="editor">
              {
                loading ? <Loader /> :
                  <EditorView availableLang={availableLang} selectedLanguage={selectedLanguage} 
                    setSelectedLanguage={setSelectedLanguage} 
                    templateLoading={submissionLoading} 
                    code={code as ICode} 
                    source={source} 
                    setSource={setSource} 
                    editorOptions={editorOptions} 
                    handleSubmit={handleSubmit} 
                    submitLoading={submitLoading} 
                  />
              }
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </div>

      {/* Modal for test results */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Dummy Testcase Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup>
            {testCases.map((tc, idx) => (
              <ListGroup.Item key={idx} className="d-flex justify-content-between">
                <div>
                  <strong>Input:</strong> {tc.input} <br />
                  <strong>Expected Output:</strong> {tc.output}
                </div>
                <div>
                  {tc.passed ? (
                    <Badge bg="success">
                      <FaCheckCircle className="me-1" /> Passed
                    </Badge>
                  ) : (
                    <Badge bg="danger">
                      <FaTimesCircle className="me-1" /> Failed
                    </Badge>
                  )}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}


export default ChallengeDetails;