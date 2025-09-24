import React, { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import { Container, Row, Col, Button, Offcanvas } from "react-bootstrap";
import SnackbarProvider from "../context/SnackbarProvider";

interface LayoutProps {
  Header?: ReactNode;
  Footer?: ReactNode;
  SideMenu?: ReactNode;
  AsideMenu?: ReactNode;
}

const SnackbarLayout: React.FC<LayoutProps> = ({ Header, Footer, SideMenu, AsideMenu }) => {
  const [showSide, setShowSide] = useState(false);
  const [showAside, setShowAside] = useState(false);

  return (
    <SnackbarProvider>
      <div className="d-flex flex-column min-vh-100">
        {/* Sticky Header */}
        {Header && (
          <header className="sticky-top bg-light shadow-sm d-flex align-items-center justify-content-between p-2 bg-warning">
            {Header}
            <div className="d-md-none d-flex gap-2">
              {SideMenu && (
                <Button size="sm" variant="outline-primary" onClick={() => setShowSide(true)}>
                  Menu
                </Button>
              )}
              {AsideMenu && (
                <Button size="sm" variant="outline-secondary" onClick={() => setShowAside(true)}>
                  Info
                </Button>
              )}
            </div>
          </header>
        )}

        <Container fluid className="flex-grow-1">
          <Row>
            {/* Side Menu (desktop) */}
            {SideMenu && (
              <Col xs={12} md={2} className="bg-light border-end d-none d-md-block">
                {SideMenu}
              </Col>
            )}

            {/* Main Content */}
            <Col xs={12} md={AsideMenu ? 8 : 10} className="p-3">
              <Outlet />
            </Col>

            {/* Aside Menu (desktop) */}
            {AsideMenu && (
              <Col xs={12} md={2} className="bg-white border-start d-none d-md-block">
                {AsideMenu}
              </Col>
            )}
          </Row>
        </Container>

        {Footer && <footer className="bg-dark text-white p-3 mt-auto">{Footer}</footer>}

        {/* Mobile Offcanvas - Side Menu */}
        {SideMenu && (
          <Offcanvas show={showSide} onHide={() => setShowSide(false)} responsive="md">
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>Menu</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>{SideMenu}</Offcanvas.Body>
          </Offcanvas>
        )}

        {/* Mobile Offcanvas - Aside Menu */}
        {AsideMenu && (
          <Offcanvas show={showAside} onHide={() => setShowAside(false)} responsive="md" placement="end">
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>Info</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>{AsideMenu}</Offcanvas.Body>
          </Offcanvas>
        )}
      </div>
    </SnackbarProvider>
  );
};

export default SnackbarLayout;
