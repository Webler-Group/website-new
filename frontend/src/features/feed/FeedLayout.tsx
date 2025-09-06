import React from 'react';
import { useNavigate, useLocation, useMatch } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import FeedList from './components/FeedList';
import FeedDetails from './components/FeedDetail';
import Header from '../../layouts/Header';
import Footer from '../../layouts/Footer';

const FeedLayout: React.FC = () => {
  const navigate = useNavigate();
  
  // useMatch to check if route matches
  const detailsMatch = useMatch('/Feed/:id');

  const handleClose = () => {
    navigate('/Feed');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <main className="flex-grow-1">
        {/* Always render FeedList so its state is preserved */}
        <FeedList />

        {/* Details Modal */}
        <Modal
          show={!!detailsMatch}
          onHide={handleClose}
          fullscreen
          backdrop="static"
        >
          <Modal.Body className="p-0">
            {detailsMatch && <FeedDetails />}
          </Modal.Body>
        </Modal>
      </main>
      <Footer />
    </div>
  );
};

export default FeedLayout;