import React, { useEffect, useState } from "react";

interface NotificationToastProps {
  notification: {
    type: "success" | "error";
    message: string;
  } | null;
  onClose: () => void;
  duration?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  duration = 3000,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [notification, duration, onClose]);

  if (!notification || !visible) return null;

  return (
    <div
      className="position-fixed top-0 end-0 p-3"
      style={{ zIndex: 1055 }}
    >
      <div
        className={`alert ${
          notification.type === "success" ? "alert-success" : "alert-danger"
        } alert-dismissible fade show shadow`}
        role="alert"
      >
        {notification.message}
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          onClick={() => {
            setVisible(false);
            onClose();
          }}
        ></button>
      </div>
    </div>
  );
};

export default NotificationToast;
