import React, { useState } from 'react';
import { Send } from 'lucide-react';
import NotificationToast from './comments/NotificationToast';
import PostTextareaControl from '../../../components/PostTextareaControl';


interface CommentFormProps {
  feedId: string;
  sendJsonRequest: (method: string, url: string, reqBody?: any) => Promise<any>;
  onCommentPosted: (comment: Comment) => void;
}

const CommentForm: React.FC<CommentFormProps> = ({
  feedId,
  sendJsonRequest,
  onCommentPosted
}) => {
  const [comment, setComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);


  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) return;

    try {
      setIsPosting(true);

      let response = await sendJsonRequest("/Feed/CreateReply", "POST", {
        message: comment.trim(),
        feedId: feedId
      });

      if (!response.success) {
        throw new Error(response.message)
      }

      setComment('');
      onCommentPosted(response.post);
    } catch (error) {
      console.error('Failed to post comment:', error);
      showNotification("error", String(error))
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="bg-white rounded shadow-sm border p-4 mb-4">
      {/* Notification Toast */}
      <NotificationToast
        notification={notification}
        onClose={() => setNotification(null)}
      />
      <form onSubmit={handleSubmit}>
        <div className="d-flex gap-3">
          <div className="flex-grow-1">
            <PostTextareaControl
              value={comment}
              setValue={setComment}
              placeholder="Write a comment..."
              rows={3}
            />
          </div>
        </div>

        <div className="d-flex justify-content-end mt-3">
          <button
            type="submit"
            disabled={!comment.trim() || isPosting}
            className="btn btn-primary d-inline-flex align-items-center gap-2 px-4 py-2"
          >
            <Send size={16} />
            {isPosting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;
