import { useState, useRef, useEffect } from 'react';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { IChannelMessage } from './ChannelMessage';
import ProfileName from '../../../components/ProfileName';
import { FaReply } from 'react-icons/fa6';

interface RepliedMessageProps {
    message: IChannelMessage;
}

const RepliedMessage = ({ message }: RepliedMessageProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTextClick = () => {
        setIsExpanded(!isExpanded);
    };

    // Scroll to show the full message when expanded
    useEffect(() => {
        if (isExpanded && containerRef.current) {
            setTimeout(() => {
                containerRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 50);
        }
    }, [isExpanded]);

    return (
        <>
            <div ref={containerRef} className='small'>
                <div className="d-flex gap-1 align-items-start">
                    <FaReply className="flex-shrink-0" />
                    <ProfileAvatar size={20} avatarImage={message.userAvatar} />
                    <ProfileName userId={message.userId} userName={"@" + message.userName} />
                    {message.deleted ? (
                        <i className="text-muted">Deleted</i>
                    ) : (
                        <span
                            className={`wb-channels-reply__text ${isExpanded ? 'wb-channels-reply__text--expanded' : ''}`}
                            onClick={handleTextClick}
                            style={{ cursor: 'pointer' }}
                        >
                            {message.content}
                        </span>
                    )}
                </div>
                {isExpanded && !message.deleted && (
                    <div 
                        className="wb-channels-reply__full-content"
                        onClick={handleTextClick}
                        style={{ cursor: 'pointer' }}
                    >
                        {message.content}
                    </div>
                )}
            </div>
        </>
    )
}

export default RepliedMessage;