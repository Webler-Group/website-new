import React, { useState, useRef, useEffect } from "react";
import { ReactionsEnum, reactionsInfo } from "../../../data/reactions";

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


  const handleReactionClick = (id: ReactionsEnum.LIKE) => {
    const value = id == selectedReaction ? null : id;
    setSelectedReaction(value);
    onReactionChange(value);
    setShowPicker(false);
  };

  const handleMainClick = () => {
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
    <>
      <div>
        <div
          ref={containerRef}
          className="position-relative d-inline-block"
        >
          <button
            type="button"
            className="btn btn-link text-decoration-none d-flex align-items-center gap-2"
            onClick={handleMainClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              color: selectedReaction ? reactionsInfo[selectedReaction].color : '#65676b',
              fontSize: '15px',
              fontWeight: selectedReaction ? '600' : '500',
              border: 'none',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f2f3f4';
            }}
            onMouseLeave={(e) => {
              if (!selectedReaction) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>
              {selectedReaction ? reactionsInfo[selectedReaction].emoji : ""}
            </span>
            <span>
              {selectedReaction ? reactionsInfo[selectedReaction].label : reactionsInfo[ReactionsEnum.LIKE].label}
            </span>
          </button>

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
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: selectedReaction == id
                        ? `${reaction.color}20`
                        : 'transparent',
                      fontSize: '24px',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReactionClick(id);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.3)';
                      e.currentTarget.style.backgroundColor = selectedReaction === id
                        ? `${reaction.color}20`
                        : '#f0f2f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = selectedReaction === id
                        ? `${reaction.color}20`
                        : 'transparent';
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
      </div>
    </>
  );
};

export default ReactionPicker;