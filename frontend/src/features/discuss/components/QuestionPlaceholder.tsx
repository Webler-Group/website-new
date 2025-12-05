
import { Placeholder } from 'react-bootstrap';

const QuestionPlaceholder = () => {

    return (
        <div className="rounded border p-2 mb-2 bg-white d-flex">
            <div className="flex-grow-1">
                <Placeholder as="h3" animation="glow">
                    <Placeholder xs={4} />
                </Placeholder>
                <Placeholder as="p" animation="glow">
                    <Placeholder xs={12} />
                    <Placeholder xs={12} />
                </Placeholder>
                <div className="d-flex">

                </div>
            </div>
            <div className="d-flex align-items-end">
                <div className="ms-2">
                    <Placeholder as="div" animation="glow">
                        <Placeholder xs={12} />
                    </Placeholder>
                </div>
            </div>
        </div>
    )
}

export default QuestionPlaceholder