import { createContext, useContext, useState, ReactNode } from "react";
import { Toast, ToastContainer } from "react-bootstrap";

interface SnackbarContextType {
  showMessage: (msg: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar must be used within SnackbarProvider");
  return ctx;
};

const SnackbarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <SnackbarContext.Provider value={{ showMessage }}>
      {children}
      <ToastContainer position="bottom-end" className="p-3">
        <Toast bg="dark" show={!!message} onClose={() => setMessage(null)} delay={3000} autohide>
          <Toast.Body className="text-white">{message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </SnackbarContext.Provider>
  );
};

export default SnackbarProvider;
