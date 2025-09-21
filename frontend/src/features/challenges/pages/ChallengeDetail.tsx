import { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Tab,
  Nav,
  ListGroup
} from "react-bootstrap";
import { FaCode, FaInfoCircle } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import IChallenge, { IChallengeTemplate } from "../IChallenge";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import allowedUrls from "../../../data/discussAllowedUrls";
import PageTitle from "../../../layouts/PageTitle";
import { ICode } from "../../codes/components/Code";
import CodeEditor from "../../compiler-playground/components/CodeEditor";
import { SelectFormField } from "../../../components/FormField";
import { EllipsisLoaderPlaceholder } from "../../../components/Loader";
import { compilerLanguages } from "../../../data/compilerLanguages";
import { useAuth } from "../../auth/context/authContext";

// Dummy test results
// const testCases = [
//   { id: 1, input: "nums=[2,7,11,15], target=9", output: "[0,1]", passed: true },
//   { id: 2, input: "nums=[3,2,4], target=6", output: "[1,2]", passed: true },
//   { id: 3, input: "nums=[3,3], target=6", output: "[0,1]", passed: false },
//   { id: 4, input: "nums=[1,2,3], target=5", output: "N/A", passed: true },
//   { id: 5, input: "nums=[10,20], target=40", output: "N/A", passed: false },
//   { id: 6, input: "nums=[5,5,5], target=10", output: "[0,1]", passed: true },
// ];

function ChallengeDetails() {
  PageTitle("Solve Challange");

  const { sendJsonRequest } = useApi();
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [availableLang, setAvailableLang] = useState<string[]>(["python", "c"]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [challenge, setChallenge] = useState<IChallenge>();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [code, setCode] = useState<ICode>();

  const [source, setSource] = useState("");
  const [css, setCss] = useState("");
  const [js, setJs] = useState("");
  const [editorOptions, setEditorOptions] = useState<any>({ scale: 1.0 });

  const { userInfo } = useAuth();

  useEffect(() => {
    getChallenge();
  }, [challengeId]);

  useEffect(() => {

    if(challenge) {
      const t = (((challenge?.templates) as IChallengeTemplate[]).filter(i => i.name === selectedLanguage));
      if(t.length > 0) {
        setSource(t[0].source);
      }
    }

    setCode({ 
      language: (selectedLanguage.toLocaleLowerCase()) as compilerLanguages,
      comments: 0,
      votes: 0,
      isUpvoted: false,
      isPublic: false
     })
  }, [selectedLanguage]);

  const getChallenge = async () => {
      setLoading(true);

      const result = await sendJsonRequest(`/Challenge/GetChallenge`, "POST", {
          challengeId
      });
     
      if (result.success && result.challenge) {
        setChallenge(result.challenge);

        const lang: string[] = [];
        const challenge = result.challenge as any;
        const c = (challenge.templates);

        for(let i = 0; i < c.length; i++) 
          lang.push((challenge.templates)[i].name);

        setAvailableLang(lang);
        setSelectedLanguage(availableLang[0]);

      } else {
          setLoading(false);
          navigate("/PageNotFound");
      }

       setLoading(false);
      
  }

  const handleSubmit = async() => {
    // setShowModal(true);
    // console.log(testCases);
    const submission = await sendJsonRequest(`/Challenge/Submission/AddEntry`, "POST", {
      challengeId,
      language: selectedLanguage,
      code: source
    });

    console.log(submission);

    // alert("This challenge is currently locked");
    
  };

  const handleDelete = async () => {
    const req = await sendJsonRequest(`/Challenge/Delete`, "POST", {
      challengeId
    });

    if(req.success) {
      navigate("/Challenge");
    }
  }

  const handleEdit = () => {
    navigate("/Challenge/Edit/" + challengeId);
  }

  return (
    <Container fluid className="py-4">
      {/* For desktop/laptops -> side by side */}
      <Row className="d-none d-md-flex">
        <Col md={6}>
        {
              loading ? 
              <EllipsisLoaderPlaceholder />
            :
            <Card className="p-3 shadow">
              <h4>
                <FaInfoCircle className="me-2 text-primary" /> { challenge?.title }
              </h4>
              <div>
                {
                  challenge && 
                  <MarkdownRenderer content={(challenge?.description as string)} allowedUrls={allowedUrls} />
                }
              </div>
              <p className="bg-success-subtle text-success m-1 p-1 rounded fw-bold">+{challenge?.xp} XP Reward</p>
              {
                challenge && userInfo && (userInfo.roles.includes("Admin") || userInfo.id === challenge.createdBy) &&
                <Row>
                  <button className="col btn bg-info m-1" onClick={handleEdit}>Edit</button>
                  <button className="col btn bg-danger-subtle text-danger m-1" onClick={handleDelete}>Delete</button>
                </Row>
              }
            </Card>
          }
        </Col>

        <Col md={6}>
          <Card className="p-3 shadow bg-dark text-light">
            <div className="m-1 d-flex justify-content-between">
                <h4>
                  <FaCode className="me-2 text-success" /> Code Editor
                </h4>
                {
                  challenge && <SelectFormField 
                  options={availableLang}
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                />
                }
            </div>
            {
              loading || source === "" ? <EllipsisLoaderPlaceholder />
              :
              <CodeEditor
                    loading={false}
                    code={code as ICode}
                    source={source}
                    setSource={(value: string) => setSource(value)}
                    css={css}
                    setCss={(value: string) => setCss(value)}
                    js={js}
                    setJs={(value: string) => setJs(value)}
                    options={editorOptions}
                    hideOutput={true}
                />
            }
            <div className="d-flex justify-content-end mt-3">
              <Button onClick={handleSubmit} variant="primary">
                Submit
              </Button>
            </div>
          </Card>
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
                  <EllipsisLoaderPlaceholder />
                :
                <Card className="p-3 shadow">
                  <h4>
                    <FaInfoCircle className="me-2 text-primary" /> { challenge?.title }
                  </h4>
                  <div>
                    {
                      challenge && 
                      <MarkdownRenderer content={(challenge?.description as string)} allowedUrls={allowedUrls} />
                    }
                  </div>
                  <p className="bg-success-subtle text-success m-1 p-1 rounded fw-bold">+{challenge?.xp} XP Reward</p>
                </Card>
              }
            </Tab.Pane>
            <Tab.Pane eventKey="editor">
              <Card className="p-1 bg-dark shadow">
                  <div className="m-1 d-flex justify-content-between">
                      <h4>
                        <FaCode className="me-2 text-success" /> Code Editor
                      </h4>
                      {
                        challenge && <SelectFormField 
                        options={availableLang}
                        value={selectedLanguage}
                        onChange={setSelectedLanguage}
                      />
                      }
                  </div>
                  {
                    loading || source === "" ? <EllipsisLoaderPlaceholder />
                    :
                    <CodeEditor
                          loading={false}
                          code={code as ICode}
                          source={source}
                          setSource={(value: string) => setSource(value)}
                          css={css}
                          setCss={(value: string) => setCss(value)}
                          js={js}
                          setJs={(value: string) => setJs(value)}
                          options={editorOptions}
                          hideOutput={true}
                      />
                  }
                <div className="d-flex justify-content-end mt-3">
                  <Button onClick={handleSubmit} variant="primary">
                    Submit
                  </Button>
                </div>
              </Card>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </div>

      {/* Modal for test results */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Test Case Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup>
            {/* {testCases.map((tc, idx) => (
              <ListGroup.Item key={idx} className="d-flex justify-content-between">
                <div>
                  <strong>Input:</strong> {tc.input} <br />
                  <strong>Expected Output:</strong> {tc.expectedOutput}
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
            ))} */}
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