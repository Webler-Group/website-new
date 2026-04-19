import { Modal } from "react-bootstrap";
import { UserBadgeMinimal } from "../types";

interface BadgeSectionProps {
    badges: UserBadgeMinimal[],
    onClose: () => void;
}

type ListItemProps = {
    icon: string;
    title: string;
    description: string;
};

export const ListItem = ({ icon, title, description }: ListItemProps) => {
  return (
    <div className="d-flex align-items-center justify-content-between p-3 border rounded-4 shadow-sm mb-2 bg-white">

      <img
        className="d-flex align-items-center justify-content-center bg-light me-3"
        style={{ width: 50, height: 50 }}
        src={icon}
      />

      <div className="flex-grow-1">
        <div className="fw-semibold">{title.split("_").map(i => i[0].toUpperCase() + i.substring(1)).join(" ")}</div>
        <small className="text-muted">{description}</small>
      </div>

      
      {/* <button
        className="btn btn-primary btn-sm ms-3 rounded-pill px-3"
        onClick={() => {}}
      >
        Unlock
      </button> */}
    </div>
  );
};


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
                <Modal.Title>Badges</Modal.Title>
            </Modal.Header>

            <Modal.Body className="overflow-auto">
                <div>
                    {badges.map((badge, index) => (
                        <ListItem key={index}
                        icon={`/resources/images/badges/${badge.key}.svg`}
                        title={badge.key}
                        description={"Some description lorem ipsum just do it agaun right now"}
                        />
                    ))}
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default BadgeSection;