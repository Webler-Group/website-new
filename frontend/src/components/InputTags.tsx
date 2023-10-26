import { useState } from 'react';
import { Button, FormControl } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa6';

interface InputTagsProps {
    values: string[];
    setValues: (callback: (data: string[]) => string[]) => void;
    placeholder: string;
}

const InputTags = ({ values, setValues, placeholder }: InputTagsProps) => {

    const [input, setInput] = useState("");

    const handleSubmit = () => {

        let newTagName = input.toLowerCase().trim()

        if (newTagName.length === 0) {
            return
        }

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
            <div className="d-flex gap-1">
                <FormControl
                    type="text"
                    size="sm"
                    style={{ width: "80px" }}
                    value={input} onChange={e => setInput(e.target.value)}
                    placeholder={placeholder}
                />
                <Button size="sm" onClick={handleSubmit}>
                    <FaPlus />
                </Button>
            </div>
        </div>
    )
}

export default InputTags