import React, { useState, useRef, useEffect } from "react";
import { ReactionsEnum, reactionsInfo } from "../../../data/ReactionsEnum";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa6";
import { cx } from "../../../components/ui";
import "../../../components/reactions/reactions.css";

interface ReactionPickerProps {
  onReactionChange: (reaction: ReactionsEnum | null) => void;
  currentState: ReactionsEnum | null;
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onReactionChange,
  currentState
}) => {
  const [selectedReaction, setSelectedReaction] =
    useState<ReactionsEnum | null>(currentState);
  const [showPicker, setShowPicker] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { userInfo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setSelectedReaction(currentState);
  }, [currentState]);

  const handleReactionClick = (id: ReactionsEnum.LIKE) => {
    const value = id === selectedReaction ? null : id;
    setSelectedReaction(value);
    onReactionChange(value);
    setShowPicker(false);
  };

  const handleMainClick = () => {
    if (!userInfo?.id) {
      navigate("/Users/Login");
      return;
    }

    setShowPicker(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="position-relative d-flex align-items-center"
    >
      <span
        className={cx("wb-feed-reaction-picker-button", selectedReaction && reactionsInfo[selectedReaction].colorClass)}
        onClick={handleMainClick}
      >
        <span>
          {selectedReaction
            ? reactionsInfo[selectedReaction].emoji
            : <FaThumbsUp />}
        </span>
        <span>
          {selectedReaction
            ? reactionsInfo[selectedReaction].label
            : reactionsInfo[ReactionsEnum.LIKE].label}
        </span>
      </span>

      {showPicker && (
        <div
          className="wb-feed-reaction-picker-popup position-absolute bg-body border rounded-pill shadow-lg d-flex align-items-center gap-1"
        >
          {Object.entries(reactionsInfo).map(([key, reaction]) => {
            const id = Number(key);

            return (
              <button
                key={id}
                type="button"
                className={cx(
                  "wb-feed-reaction-picker-option btn p-1 border-0 d-flex align-items-center justify-content-center",
                  reaction.colorClass,
                  selectedReaction === id && "wb-feed-reaction-picker-option--selected"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReactionClick(id);
                }}
                title={reaction.label}
              >
                {reaction.emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReactionPicker;
