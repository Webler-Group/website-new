// File: Layout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FaBell, FaComment, FaBars, FaTimes, FaArrowUp } from 'react-icons/fa';
import './layout.css';
import { useAuth } from '../features/auth/context/authContext';
import ProfileAvatar from '../components/ProfileAvatar';

const MENU_ITEMS = [
    { to: '/courses', label: 'Courses' },
    { to: '/codes', label: 'Codes' },
    { to: '/discuss', label: 'Discuss' },
    { to: '/feed', label: 'Feed' },
    { to: '/challenges', label: 'Challenges' },
    { to: '/tools', label: 'Tools' },
];

const Layout: React.FC = () => {
    const { userInfo } = useAuth() as any;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 50);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth > 880) setMobileOpen(false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const toggleMobile = () => setMobileOpen(v => !v);
    const closeMobile = () => setMobileOpen(false);

    const handleLogout = async () => { };

    return (
        <div className="wb-root">
            <div className="wb-layout">
                <aside className={`wb-sidebar ${mobileOpen ? 'wb-open' : ''}`}>
                    <div className="wb-side-card">
                        <div className="wb-side-card-bg" />
                        <div className="wb-side-card-content">
                            <h2 className="wb-side-title">Webler Codes</h2>
                            {userInfo ? (
                                <div className="wb-user-info">
                                    <Link to={`/profile/${userInfo.id}`} className="wb-user-link" onClick={closeMobile}>
                                        <ProfileAvatar avatarImage={userInfo.avatarImage} size={32} />
                                        <span className="wb-username">{userInfo.name}</span>
                                    </Link>
                                    <button className="wb-logout" onClick={() => { handleLogout(); closeMobile(); }}>Logout</button>
                                </div>
                            ) : (
                                <div className="wb-auth-links">
                                    <Link to="/login" className="wb-auth-link" onClick={closeMobile}>Login</Link>
                                    <Link to="/register" className="wb-auth-link wb-register" onClick={closeMobile}>Register</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <nav className="wb-nav">
                        {MENU_ITEMS.map(item => (
                            <Link key={item.to} to={item.to} className="wb-nav-item" onClick={closeMobile}>{item.label}</Link>
                        ))}
                    </nav>

                    <button className="wb-close-mobile" onClick={closeMobile} aria-label="Close menu">
                        <FaTimes />
                    </button>
                </aside>

                {mobileOpen && <div className="wb-overlay" onClick={closeMobile} />}

                <main className={`wb-main ${mobileOpen ? 'wb-main-shift' : ''}`}>
                    <header className="wb-header">
                        <div className="wb-header-left">
                            {
                                showScrollTop &&
                                <button className="wb-scroll-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                    <FaArrowUp />
                                </button>
                            }
                        </div>
                        <div className="wb-header-right">
                            {userInfo && (
                                <div className="wb-header-icons">
                                    <Link to={`/profile/${userInfo.id}`} className="wb-header-icon" title="Profile">
                                        <ProfileAvatar avatarImage={userInfo.avatarImage} size={32} />
                                    </Link>
                                    <Link to="/messages" className="wb-header-icon" title="Direct messages">
                                        <FaComment />
                                    </Link>
                                    <Link to="/notifications" className="wb-header-icon" title="Notifications">
                                        <FaBell />
                                    </Link>
                                </div>
                            )}
                            <button className="wb-menu-toggle" onClick={toggleMobile} aria-label="Toggle menu">
                                <FaBars />
                            </button>
                        </div>
                    </header>

                    <section className="wb-content">
                        <Outlet />
                    </section>
                </main>
            </div>
        </div>
    );
};

export default Layout;