import { Form } from "react-bootstrap"

type Option_t = string | number | { label: string; value: any };

interface ISelectFormFieldProps {
    options: Option_t[];
    value: any;
    onChange: (value: any) => void;
}



export const SelectFormField = ({ options, value, onChange }: ISelectFormFieldProps) => {

    const normalize = (opt: Option_t) => typeof opt === "string" || typeof opt === "number" ?
        { label: String(opt), value: opt }: opt;

    return (
        <Form.Select style={{ width: "140px" }} size='sm'  onChange={e=> onChange(e.target.value)} value={value ?? ""}>
            {
                options.map((opt, idx) => {
                    const { label, value } = normalize(opt);
                    return (<option key={idx} value={value}>{label}</option>)
                })
            }
        </Form.Select>
    )    
}