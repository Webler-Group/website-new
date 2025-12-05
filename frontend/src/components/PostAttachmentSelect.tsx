import { useCallback, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import CodeList, { ICodesState } from "../features/codes/components/CodeList";
import "./PostAttachmentSelect.css";

interface PostAttachmentSelectProps {
    onSubmit: (value: string[]) => void;
}

const PostAttachmentSelect = ({ onSubmit }: PostAttachmentSelectProps) => {
    const initialCodesState = {
        page: 1,
        filter: 1,
        searchQuery: "",
        language: null,
        ready: false
    };
    const [codesState, setCodesState] = useState<ICodesState>(initialCodesState);
    const [codesModalVisible, setCodesModalVisible] = useState(false);
    const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

    const showCodesModal = () => {
        setCodesState({ ...initialCodesState, ready: true });
        setCodesModalVisible(true);
    }

    const closeCodesModal = () => {
        setSelectedCodes([]);
        setCodesModalVisible(false);
    }

    const handleCodeSelect = (id: string) => {
        setSelectedCodes(prev => {
            if(prev.includes(id)) {
                return prev.filter(x => x != id);
            }
            return [...prev, id];
        });
    }

    const isCodeSelected = useCallback((id: string) => {
        return selectedCodes.includes(id);
    }, [selectedCodes]);

    const handleSubmit = () => {
        onSubmit(selectedCodes.map(id =>  window.location.origin + `/compiler-playground/${id}`));
        closeCodesModal();
    }

    return (
        <>
            <Button variant="link" className="text-secondary" onClick={showCodesModal}>
                <FaPlus />
            </Button>
            <Modal className="wb-post-attachment-select-modal" backdropClassName="wb-post-attachment-select-modal__backdrop" show={codesModalVisible} onHide={closeCodesModal} centered fullscreen="sm-down">
                <Modal.Header closeButton>
                    <Modal.Title>Codes</Modal.Title>
                </Modal.Header>
                <Modal.Body className="overflow-auto wb-post-attachment-select-modal__body">
                    <CodeList codesState={codesState} setCodesState={setCodesState} onCodeClick={handleCodeSelect} isCodeSelected={isCodeSelected} showNewCodeBtn={false} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeCodesModal}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit}>Done { selectedCodes.length > 0 && "(" + selectedCodes.length + ")" }</Button>
                </Modal.Footer>
            </Modal>
        </>
    )
}

export default PostAttachmentSelect;