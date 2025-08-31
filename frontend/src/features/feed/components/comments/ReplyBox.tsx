import React, { useState, useEffect, useRef } from 'react';

interface ReplyBoxProps {
  onSubmit: (replyText: string) => Promise<void>;
  onCancel: () => void;
  onError?: (message: string) => void;
  autoFocus?: boolean; 
}

const ReplyBox: React.FC<ReplyBoxProps> = ({ onSubmit, onCancel, onError, autoFocus = false }) => {
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoFocus) {
      // Focus textarea
      textareaRef.current?.focus();

      // Scroll into view + temporary highlight
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      containerRef.current?.classList.add("replybox-highlight");
      const t = setTimeout(() => containerRef.current?.classList.remove("replybox-highlight"), 1200);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!replyText.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onSubmit(replyText.trim());
      setReplyText("");
    } catch (err: any) {
      console.error("Reply submission failed:", err);
      onError?.("Failed to post reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReplyText("");
    onCancel();
  };

  return (
    <div ref={containerRef} className="mt-2">
      <textarea
        ref={textareaRef}
        className="form-control mb-2"
        rows={2}
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Write a reply..."
        disabled={isSubmitting}
      />
      <button 
        onClick={handleSubmit} 
        className="btn btn-sm btn-primary me-2"
        disabled={!replyText.trim() || isSubmitting}
      >
        {isSubmitting ? "Posting..." : "Post Reply"}
      </button>
      <button
        onClick={handleCancel}
        className="btn btn-sm btn-outline-secondary"
        disabled={isSubmitting}
      >
        Cancel
      </button>
    </div>
  );
};

export default ReplyBox;
