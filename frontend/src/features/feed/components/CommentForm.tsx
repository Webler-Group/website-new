import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface CommentFormProps {
  feedId: string;
  sendJsonRequest: (method: string, url: string, reqBody?: any) => Promise<any>;
  onCommentPosted: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({
  feedId,
  sendJsonRequest,
  onCommentPosted
}) => {
  const [comment, setComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) return;

    try {
      setIsPosting(true);
      
      let response = await sendJsonRequest("/Feed/CreateReply", "POST", { 
        message: comment.trim(),
        feedId: feedId
      });

      if(!response.post) {
        alert(response.message)
      }
      
      setComment('');
      onCommentPosted();
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="bg-white rounded shadow-sm border p-4 mb-4">
      <form onSubmit={handleSubmit}>
        <div className="d-flex gap-3">
          <div className="flex-grow-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="form-control"
              disabled={isPosting}
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
