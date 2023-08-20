import { Outlet } from 'react-router-dom';
import { ReactNode } from 'react';

interface LayoutProps {
    Header: ReactNode | null;
    Footer: ReactNode | null;
}

const Layout = ({ Header, Footer }: LayoutProps) => {
    return (
        <>
            {Header !== null && Header}
            <main className="bg-light">
                <Outlet />
            </main>
            {Footer !== null && Footer}
        </>
    )
}
export default Layout;