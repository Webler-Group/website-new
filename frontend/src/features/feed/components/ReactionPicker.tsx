import React, { useState, useRef, useEffect } from "react";
import { validReactions } from "./types";

interface ReactionChange {
  currentReaction: validReactions | null;
  hasVoted: boolean;
}


interface Reaction {
  id: validReactions;
  emoji: string;
  label: string;
  color: string;
}

interface ReactionPickerProps {
  onReactionChange: (reaction: ReactionChange) => void;
  currentState: { reaction: validReactions | null };
}

const reactions: Reaction[] = [
  { id: validReactions.LIKE, emoji: "👍", label: "Like", color: "#1877f2" },
  { id: validReactions.LOVE, emoji: "❤️", label: "Love", color: "#e91e63" },
  { id: validReactions.HAHA, emoji: "😂", label: "Haha", color: "#f39c12" },
  { id: validReactions.WOW, emoji: "😮", label: "Wow", color: "#f39c12" },
  { id: validReactions.SAD, emoji: "😢", label: "Sad", color: "#f39c12" },
  { id: validReactions.ANGRY, emoji: "😡", label: "Angry", color: "#e74c3c" },
];

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onReactionChange,
  currentState,
}) => {
  const [selectedReaction, setSelectedReaction] = useState<validReactions | null>(
    currentState?.reaction || null
  );
  const [showPicker, setShowPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const currentReaction = reactions.find((r) => r.id === selectedReaction);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

const handleReactionClick = (reaction: Reaction) => {
  let newReaction: validReactions | null;

  if (reaction && reaction.id === selectedReaction) {
    newReaction = validReactions.NONE;
  } else {
    newReaction = reaction ? reaction.id : validReactions.NONE;
  }

  setSelectedReaction(newReaction);
  setShowPicker(false);


  onReactionChange({
    currentReaction: newReaction,
    hasVoted: newReaction !== validReactions.NONE,
  });
};

const handleMainClick = () => {
    setShowPicker(!showPicker);
};

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile) {
      const timer = window.setTimeout(() => {
        setShowPicker(true);
      }, 500);
      setLongPressTimer(timer);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handlePickerMouseEnter = () => {
    if (!isMobile && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  }, [showPicker, longPressTimer]);

  return (
    <>
      <link 
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css" 
        rel="stylesheet"
      />
      
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
              color: currentReaction ? currentReaction.color : '#65676b',
              fontSize: '15px',
              fontWeight: currentReaction ? '600' : '500',
              border: 'none',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isMobile && !currentReaction) {
                e.currentTarget.style.backgroundColor = '#f2f3f4';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile && !currentReaction) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>
              {currentReaction ? currentReaction.emoji : ''}
            </span>
            <span>
              {currentReaction ? currentReaction.label : 'Like'}
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
              {reactions.map((reaction) => (
                <button
                  key={reaction.id}
                  type="button"
                  className="btn p-1 border-0 d-flex align-items-center justify-content-center"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: selectedReaction === reaction.id 
                      ? `${reaction.color}20` 
                      : 'transparent',
                    fontSize: '24px',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReactionClick(reaction);
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'scale(1.3)';
                      e.currentTarget.style.backgroundColor = selectedReaction === reaction.id 
                        ? `${reaction.color}20` 
                        : '#f0f2f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = selectedReaction === reaction.id 
                        ? `${reaction.color}20` 
                        : 'transparent';
                    }
                  }}
                  title={reaction.label}
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .btn:focus {
          box-shadow: none !important;
        }
        
        .btn:active {
          transform: scale(0.95) !important;
        }
        
        /* Disable text selection */
        * {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        /* Hide webkit tap highlight */
        .btn {
          -webkit-tap-highlight-color: transparent !important;
          touch-action: manipulation;
        }
        
        /* Better mobile touch targets */
        @media (max-width: 768px) {
          .btn {
            min-width: 44px !important;
            min-height: 44px !important;
          }
        }
      `}</style>
    </>
  );
};

export default ReactionPicker;