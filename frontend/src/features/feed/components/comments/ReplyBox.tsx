import React, { useState } from 'react';

interface ReplyBoxProps {
  onSubmit: (replyText: string) => Promise<void>;
  onCancel: () => void;
  onError?: (message: string) => void;
}

const ReplyBox: React.FC<ReplyBoxProps> = ({ onSubmit, onCancel, onError }) => {
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(replyText);
      setReplyText("");
    } catch (err: any) {
      // Error is already handled in parent component
      console.error("Reply submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReplyText("");
    onCancel();
  };

  return (
    <div className="mt-2">
      <textarea
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