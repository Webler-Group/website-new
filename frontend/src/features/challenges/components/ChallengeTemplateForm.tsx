import { Dispatch, SetStateAction } from "react";
import { Button, Form } from "react-bootstrap";
import { FaPlus, FaTrash } from "react-icons/fa";
import { IChallengeTemplate } from "../types";

interface IChallengeLangFormProps {
  languages: IChallengeTemplate[];
  setLanguages: Dispatch<SetStateAction<IChallengeTemplate[]>>;
}


const ChallengeTemplateForm = ({ languages, setLanguages }: IChallengeLangFormProps) => {

  const handleChange = (index: number, field: keyof IChallengeTemplate, value: any) => {
    const updated = [...languages];
    updated[index][field] = value;
    setLanguages(updated);
  };

  const addLanguage = () => {
    setLanguages([...languages, { name: "", source: "" }]);
  };

  const removeLanguage = (index: number) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h5 className="mb-3">Templates</h5>
      <div className="d-flex flex-column gap-2">
        {languages.map((tc, index) => (
          <div key={index} className="border rounded p-2 d-flex flex-column gap-2 shadow-sm">
            <Form.Group>
              <Form.Label>Language</Form.Label>
              <Form.Control
                type="text"
                value={tc.name}
                placeholder="name"
                onChange={(e) =>
                  handleChange(index, "name", e.target.value)
                }
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Source</Form.Label>
              <Form.Control
                as="textarea"
                rows={10}
                value={tc.source}
                placeholder="source"
                onChange={(e) =>
                  handleChange(index, "source", e.target.value)
                }
              >
              </Form.Control>
            </Form.Group>
            <div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeLanguage(index)}
              >
                <FaTrash /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <Button variant="success" onClick={addLanguage}>
          <FaPlus className="me-2" />
          Add Template
        </Button>
      </div>
    </div>
  );
};

export default ChallengeTemplateForm;
