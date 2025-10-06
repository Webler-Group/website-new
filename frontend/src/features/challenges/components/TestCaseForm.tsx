import { Dispatch, SetStateAction } from "react";
import { Button, Form } from "react-bootstrap";
import { FaTrash, FaPlus } from "react-icons/fa";
import { ITestCase } from "../IChallenge";

interface ITestCaseFormProps {
  testCases: ITestCase[];
  setTestCases: Dispatch<SetStateAction<ITestCase[]>>;
}


const TestCaseForm = ({ testCases, setTestCases }: ITestCaseFormProps) => {

  const handleChange = (index: number, field: keyof ITestCase, value: any) => {
    const updated = [...testCases];
    // @ts-ignore
    updated[index][field] = value;
    setTestCases(updated);
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "", isHidden: true }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h5 className="mb-3">Test Cases</h5>
      <div className="d-flex flex-column">
        {testCases.map((tc, index) => (
          <div key={index} className="border rounded p-2 d-flex flex-column gap-2 shadow-sm">
            <Form.Group>
              <Form.Control
                type="text"
                value={tc.input}
                placeholder="Input"
                onChange={(e) =>
                  handleChange(index, "input", e.target.value)
                }
              />
            </Form.Group>
            <Form.Group>
              <Form.Control
                type="text"
                value={tc.expectedOutput}
                placeholder="Output"
                onChange={(e) =>
                  handleChange(index, "expectedOutput", e.target.value)
                }
              />
            </Form.Group>
            <Form.Check
              type="checkbox"
              label="Hidden?"
              checked={tc.isHidden}
              onChange={(e) =>
                handleChange(index, "isHidden", e.target.checked)
              }
            />

            <div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeTestCase(index)}
              >
                <FaTrash /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button variant="success" onClick={addTestCase} className="m-2">
        <FaPlus className="me-2" />
        Add TestCases
      </Button>
    </div>
  );
};

export default TestCaseForm;
