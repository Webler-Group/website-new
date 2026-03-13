import { useCallback, useEffect, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import CodeList, { ICodesState } from "../../features/codes/components/CodeList";
import "./PostAttachmentSelect.css";
import { CodeMinimal } from "../../features/codes/types";
import { UserMinimal } from "../../features/profile/types";

interface PostAttachmentSelectProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (value: string[]) => void;
}

const PostAttachmentSelect = ({ show, onClose, onSubmit }: PostAttachmentSelectProps) => {
    const initialCodesState = {
        page: 1,
        filter: 1,
        searchQuery: "",
        language: null,
        ready: false
    };
    const [codesState, setCodesState] = useState<ICodesState>(initialCodesState);
    const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

    useEffect(() => {
        if(show) {
            setCodesState({ ...initialCodesState, ready: true });
        } else {
            setSelectedCodes([]);
        }
    }, [show]);

    const handleCodeSelect = (code: CodeMinimal<UserMinimal>) => {
        setSelectedCodes(prev => {
            if (prev.includes(code.id)) {
                return prev.filter(x => x != code.id);
            }
            return [...prev, code.id];
        });
    }

    const isCodeSelected = useCallback((id: string) => {
        return selectedCodes.includes(id);
    }, [selectedCodes]);

    const handleSubmit = () => {
        onSubmit(selectedCodes.map(id => window.location.origin + `/compiler-playground/${id}`));
        onClose();
    }

    return (
        <Modal className="wb-post-attachment-select-modal" backdropClassName="wb-post-attachment-select-modal__backdrop" show={show} onHide={onClose} centered fullscreen="sm-down">
            <Modal.Header closeButton>
                <Modal.Title>Codes</Modal.Title>
            </Modal.Header>
            <Modal.Body className="overflow-auto wb-post-attachment-select-modal__body">
                <CodeList codesState={codesState} setCodesState={setCodesState} onCodeClick={handleCodeSelect} isCodeSelected={isCodeSelected} showNewCodeBtn={false} />
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmit}>Done {selectedCodes.length > 0 && "(" + selectedCodes.length + ")"}</Button>
            </Modal.Footer>
        </Modal>
    )
}

export default PostAttachmentSelect;