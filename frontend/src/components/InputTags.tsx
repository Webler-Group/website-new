import { FormEvent, useState } from 'react';
import { Button, Form, FormControl } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa6';

interface InputTagsProps {
    values: string[];
    setValues: (callback: (data: string[]) => string[]) => void;
    placeholder: string;
}

const InputTags = ({ values, setValues, placeholder }: InputTagsProps) => {

    const [input, setInput] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()

        let newTagName = input.toLowerCase()

        setValues(values => values.includes(newTagName) ? [...values] : [...values, newTagName])
        setInput("")
    }

    let content = values.map(tagName => {

        const handleRemove = () => {
            setValues(values => values.filter(val => val !== tagName))
        }

        return (
            <div key={tagName} className="small rounded p-1 bg-secondary text-white">
                <span>{tagName}</span>
                <button className="ms-2 text-white" onClick={handleRemove} style={{ outline: "none", background: "none", border: "none" }}>&times;</button>
            </div>
        )
    })

    return (
        <div className="d-flex flex-wrap gap-1">
            {content}
            <Form className="d-flex gap-1" onSubmit={handleSubmit}>
                <FormControl
                    maxLength={20}
                    minLength={1}
                    required placeholder={placeholder}
                    type="text"
                    size="sm"
                    style={{ width: "80px" }}
                    value={input} onChange={e => setInput(e.target.value)}
                />
                <Button size="sm" type="submit">
                    <FaPlus />
                </Button>
            </Form>
        </div>
    )
}

export default InputTags