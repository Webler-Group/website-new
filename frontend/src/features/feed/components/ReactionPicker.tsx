import React, { useState, useRef, useEffect } from "react";
import { ReactionsEnum, reactionsInfo } from "../../../data/reactions";
import { useAuth } from "../../auth/context/authContext";
import { useNavigate } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa6";

interface ReactionPickerProps {
  onReactionChange: (reaction: ReactionsEnum | null) => void;
  currentState: ReactionsEnum | null;
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onReactionChange,
  currentState
}) => {
  const [selectedReaction, setSelectedReaction] = useState<ReactionsEnum | null>(currentState);
  const [showPicker, setShowPicker] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const { userInfo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setSelectedReaction(currentState);
  }, [currentState]);

  const handleReactionClick = (id: ReactionsEnum.LIKE) => {
    const value = id == selectedReaction ? null : id;
    setSelectedReaction(value);
    onReactionChange(value);
    setShowPicker(false);
  };

  const handleMainClick = () => {
    if (!userInfo?.id) {
      navigate("/Users/Login");
    }
    setShowPicker(!showPicker);
  };

  const handleTouchStart = () => {
    const timer = window.setTimeout(() => {
      setShowPicker(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handlePickerMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  }, [longPressTimer]);

  return (
    <div
      ref={containerRef}
      className="position-relative d-flex align-items-center"
    >
      <span
        className="wb-reaction-picker-btn"
        onClick={handleMainClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          color: selectedReaction ? reactionsInfo[selectedReaction].color : '#65676b',
        }}
      >
        <span>
          {selectedReaction ? reactionsInfo[selectedReaction].emoji : <FaThumbsUp />}
        </span>
        <span>
          {selectedReaction ? reactionsInfo[selectedReaction].label : reactionsInfo[ReactionsEnum.LIKE].label}
        </span>
      </span>

      {showPicker && (
        <div
          className="position-absolute bg-white border rounded-pill shadow-lg d-flex align-items-center gap-1"
          style={{
            bottom: '100%',
            left: '0',
            marginBottom: '8px',
            zIndex: 1000,
            animation: 'slideUp 0.2s ease-out',
            whiteSpace: 'nowrap',
            borderColor: '#dadde1',
          }}
          onMouseEnter={handlePickerMouseEnter}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {Object.entries(reactionsInfo).map(([key, reaction]) => {
            const id = Number(key);
            return (
              <button
                key={id}
                type="button"
                className="btn p-1 border-0 d-flex align-items-center justify-content-center"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: selectedReaction == id
                    ? `${reaction.color}20`
                    : 'transparent'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReactionClick(id);
                }}
                title={reaction.label}
              >
                {reaction.emoji}
              </button>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default ReactionPicker;