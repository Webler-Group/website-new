import { Outlet } from 'react-router-dom';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';

interface LayoutProps {
    header: string | null;
    footer: boolean;
}

const Layout = ({ header, footer }: LayoutProps) => {
    return (
        <>
            {header !== null && <Header variant={header} />}
            <main style={{ minHeight: "calc(100vh)" }} className="bg-light">
                <Outlet />
            </main>
            {footer && <Footer />}
        </>
    )
}
export default Layout;