import React from 'react';
import ProfileAvatar from '../../../../components/ProfileAvatar';

interface UserAvatarProps {
  src: string | null;
  name: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ src, name }) => {
  return (
    <div
      className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-semibold"
      style={{ width: 32, height: 32 }}
    >
      {src ? (
        <ProfileAvatar size={32} avatarImage={src} />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
};

export default UserAvatar;