import { Modal } from "react-bootstrap";
import { UserBadgeMinimal } from "../types";

interface BadgeSectionProps {
    badges: UserBadgeMinimal[],
    onClose: () => void;
}

const BadgeSection = ({ badges, onClose }: BadgeSectionProps) => {

    return (
        <Modal
            show={true}
            onHide={onClose}
            className="d-flex justify-content-center align-items-center"
            fullscreen="sm-down"
            contentClassName="wb-modal__container codes"
        >
            <Modal.Header closeButton>
                <Modal.Title> {badges.length} Badges</Modal.Title>
            </Modal.Header>

            <Modal.Body className="overflow-auto">
                <div>
                    {badges.map((badge, index) => (
                        <img src={`/resources/images/badges/${badge.key}.svg`} className="p-1"  key={index} />
                    ))}
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default BadgeSection;