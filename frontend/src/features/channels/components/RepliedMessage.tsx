import ProfileAvatar from '../../../components/ProfileAvatar';
import { IChannelMessage } from './ChannelMessage';
import ProfileName from '../../../components/ProfileName';
import { FaReply } from 'react-icons/fa6';

interface RepliedMessageProps {
    message: IChannelMessage;
};

const RepliedMessage = ({ message }: RepliedMessageProps) => {
    return (
        <div className='small d-flex gap-1 align-items-center'>
            <FaReply className="flex-shrink-0" />
            <ProfileAvatar size={20} avatarImage={message.userAvatar} />
            <ProfileName userId={message.userId} userName={"@" + message.userName} />
            {message.deleted ? <i className="text-muted">Deleted</i> : <span className="wb-channels-reply__text">{message.content}</span>}
        </div>
    )
}

export default RepliedMessage;