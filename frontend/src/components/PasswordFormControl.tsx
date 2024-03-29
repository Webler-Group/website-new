import React, { useState } from "react";
import { Button, FormControl, InputGroup } from "react-bootstrap";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

interface PasswordFormControlProps {
    password: string;
    setPassword: React.Dispatch<React.SetStateAction<string>>;
}

const PasswordFormControl = ({ password, setPassword }: PasswordFormControlProps) => {

    const [passwordShow, setPasswordShow] = useState(false);

    return (
        <InputGroup>
            <InputGroup>
                <FormControl type={passwordShow ? "text" : "password"} required value={password} minLength={6} onChange={(e) => setPassword(e.target.value)} />
                <Button onClick={() => setPasswordShow(!passwordShow)}>{passwordShow ? <FaEyeSlash /> : <FaEye />}</Button>
            </InputGroup>
        </InputGroup>
    )
}

export default PasswordFormControl;