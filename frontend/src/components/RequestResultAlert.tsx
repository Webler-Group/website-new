import { Alert } from "react-bootstrap";

interface RequestResultAlertProps {
    message?: string;
    errors?: { message: string }[];
}

const RequestResultAlert = ({ message, errors }: RequestResultAlertProps) => {
    return (
        <>
            {
                <div>
                    {
                        errors &&
                        errors.map((error, idx) => {
                            return <Alert key={idx} variant="danger" dismissible>{error.message}</Alert>
                        })
                    }
                </div>
            }
            {
                message &&
                <Alert variant="success" dismissible>{message}</Alert>
            }
        </>
    )
}

export default RequestResultAlert;