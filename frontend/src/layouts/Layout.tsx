import { Outlet } from 'react-router-dom';
import { ReactNode } from 'react';

interface LayoutProps {
    Header: ReactNode | null;
    Footer: ReactNode | null;
}

const Layout = ({ Header, Footer }: LayoutProps) => {
    return (
        <div className="d-flex flex-column min-vh-100">
            {Header !== null && Header}
            {/* flex-grow keeps the footer at the bottom while the page is still loading */}
            <main className="flex-grow-1">
                <Outlet />
            </main>
            {Footer !== null && Footer}
        </div>
    )
}
export default Layout;