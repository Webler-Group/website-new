import { Outlet } from 'react-router-dom';
import { ReactNode } from 'react';
import { FaTimes } from 'react-icons/fa';
import ProfileAvatar from '../components/ProfileAvatar';
import { useAuth } from '../features/auth/context/authContext';
import ProfileName from '../components/ProfileName';

interface LayoutProps {
    Header: ReactNode | null;
    Footer: ReactNode | null;
}

const Layout = ({ }: LayoutProps) => {
    const { userInfo } = useAuth();

    return (
        <div className='wb-theme-dark'>
            <div className='wb-page'>
                <div className='wb-header wb-header-active'></div>
                <div className='wb-footer-bar'></div>
                <div className='wb-page-content'>
                    <Outlet />
                </div>
                <div className='wb-menu-hider'></div>
            </div>
            <div className='wb-menu-main wb-menu-box-left'>
                <div className='wb-menu-main__header card rounded-0'>
                    <div className='wb-menu-main__header__card-top d-md-none'>
                        <span className='text-white'>
                            <FaTimes />
                        </span>
                    </div>
                    <div className='wb-menu-main__header__card-bottom'>
                        <h1 className='wb-menu-main__header__title text-white pl-3 mb-n1'>Webler Codes</h1>
                        {
                            userInfo &&
                            <div className='px-3 mb-2 d-flex gap-2 align-items-center'>
                                <ProfileAvatar size={32} avatarImage={userInfo.avatarImage} />
                                <ProfileName userId={userInfo.id} userName={userInfo.name} />
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}
export default Layout;