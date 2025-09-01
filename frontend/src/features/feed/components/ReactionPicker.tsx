import React, { useState, useRef, useEffect } from "react";
import { ReactionChange } from "./types";

interface Reaction {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

interface ReactionPickerProps {
  onReactionChange: (reaction: ReactionChange) => void;
  currentState: { reaction: string | null };
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onReactionChange,
  currentState,
}) => {
  const [selectedReaction, setSelectedReaction] = useState<string | null>(
    currentState?.reaction || null
  );
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressed = useRef(false);
  const touchHandled = useRef(false);

  const reactions: Reaction[] = [
    { id: "like", emoji: "👍", label: "Like", color: "#1877f2" },
    { id: "love", emoji: "❤️", label: "Love", color: "#e91e63" },
    { id: "haha", emoji: "😂", label: "Haha", color: "#f39c12" },
    { id: "wow", emoji: "😮", label: "Wow", color: "#f39c12" },
    { id: "sad", emoji: "😢", label: "Sad", color: "#f39c12" },
    { id: "angry", emoji: "😡", label: "Angry", color: "#e74c3c" },
  ];

  const handleReactionClick = (reaction: Reaction | null) => {
    const newReaction = reaction ? reaction.id : null;
    setSelectedReaction(newReaction);
    setShowPicker(false);

    onReactionChange({
      currentReaction: newReaction,
      hasVoted: newReaction !== null,
    });
  };

  const handleMainClick = () => {
    if (touchHandled.current) {
      touchHandled.current = false;
      return;
    }

    if (selectedReaction) {
      handleReactionClick(null);
    } else {
      handleReactionClick(reactions.find((r) => r.id === "like") || null);
    }
  };

  const currentReaction = reactions.find((r) => r.id === selectedReaction);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); 
    longPressed.current = false;
    touchHandled.current = false;
    
    pressTimer.current = setTimeout(() => {
      setShowPicker(true);
      longPressed.current = true;
      touchHandled.current = true;
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); 
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }

    if (longPressed.current) {
      touchHandled.current = true;
    } else {
      touchHandled.current = false;
      setTimeout(() => {
        handleMainClick();
      }, 0);
    }
  };

  const handleTouchCancel = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    longPressed.current = false;
    touchHandled.current = false;
  };

  const handleMouseEnter = () => {
    if (!('ontouchstart' in window)) {
      setShowPicker(true);
    }
  };

  const handleMouseLeave = () => {
    if (!('ontouchstart' in window)) {
      setShowPicker(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showPicker]);

  // Prevent popup going off screen
  useEffect(() => {
    if (showPicker && pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      if (rect.left < 0) {
        pickerRef.current.style.left = "0";
        pickerRef.current.style.transform = "none";
      } else if (rect.right > window.innerWidth) {
        pickerRef.current.style.right = "0";
        pickerRef.current.style.left = "auto";
        pickerRef.current.style.transform = "none";
      }
    }
  }, [showPicker]);

  return (
    <div style={styles.container}>
      <div
        style={styles.reactionContainer}
        onMouseLeave={handleMouseLeave}
      >
        {/* Main reaction button */}
        <button
          style={{
            ...styles.mainButton,
            ...(currentReaction
              ? { color: currentReaction.color }
              : {
                  ...styles.noReactionButton,
                  border: "1px solid #dadde1",
                }),
          }}
          onClick={handleMainClick}
          onMouseEnter={handleMouseEnter}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {currentReaction ? (
            <>
              <span style={styles.emoji}>{currentReaction.emoji}</span>
              {currentReaction.label}
            </>
          ) : (
            <>
              <span style={{ ...styles.emoji, ...styles.outlinedThumb }}>👍</span>
              Like
            </>
          )}
        </button>

        {/* Reaction picker popup */}
        {showPicker && (
          <div ref={pickerRef} style={styles.picker}>
            {reactions.map((reaction) => (
              <button
                key={reaction.id}
                style={{
                  ...styles.reactionButton,
                  transform:
                    selectedReaction === reaction.id
                      ? "scale(1.3)"
                      : hoveredReaction === reaction.id
                      ? "scale(1.5)"
                      : "scale(1)",
                  backgroundColor:
                    selectedReaction === reaction.id ? "#f0f2f5" : "transparent",
                }}
                onClick={() => handleReactionClick(reaction)}
                onMouseEnter={() => setHoveredReaction(reaction.id)}
                onMouseLeave={() => setHoveredReaction(null)}
                title={reaction.label}
              >
                <span style={styles.reactionEmoji}>{reaction.emoji}</span>
              </button>
            ))}

            {/* Clear selection button */}
            {selectedReaction && (
              <button
                style={{
                  ...styles.reactionButton,
                  ...styles.clearButton,
                  transform:
                    hoveredReaction === "clear" ? "scale(1.2)" : "scale(1)",
                }}
                onClick={() => handleReactionClick(null)}
                onMouseEnter={() => setHoveredReaction("clear")}
                onMouseLeave={() => setHoveredReaction(null)}
                title="Remove reaction"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: "inline-block",
  },
  reactionContainer: {
    position: "relative",
    display: "inline-block",
  },
  mainButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    border: "none",
    backgroundColor: "transparent",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: 600,
    transition: "all 0.2s ease",
    userSelect: "none",
    // Prevent text selection on mobile
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    // Improve touch target size for mobile
    minHeight: "44px",
    minWidth: "44px",
  },
  noReactionButton: {
    color: "#65676b",
    backgroundColor: "#f8f9fa",
  },
  outlinedThumb: {
    filter: "grayscale(1) brightness(0.7)",
    opacity: 0.8,
  },
  emoji: {
    fontSize: "16px",
  },
  picker: {
    position: "absolute",
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "white",
    borderRadius: "25px",
    padding: "8px",
    display: "flex",
    gap: "4px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    border: "1px solid #dadde1",
    marginBottom: "-4px",
    zIndex: 1000,
    animation: "popUp 0.2s ease-out",
    // Prevent picker from being too close to screen edges on mobile
    maxWidth: "90vw",
  },
  reactionButton: {
    width: "40px",
    height: "40px",
    border: "none",
    borderRadius: "50%",
    backgroundColor: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
    transformOrigin: "center",
    // Better touch targets for mobile
    minWidth: "40px",
    minHeight: "40px",
  },
  reactionEmoji: {
    fontSize: "24px",
    lineHeight: "1",
  },
  clearButton: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#65676b",
    backgroundColor: "#f0f2f5",
  },
};

// Inject animation styles
if (!document.getElementById("reaction-picker-styles")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "reaction-picker-styles";
  styleSheet.textContent = `
    @keyframes popUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(10px) scale(0.8);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ReactionPicker;