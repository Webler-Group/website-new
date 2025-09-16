
import { GoReply } from 'react-icons/go'
import { useApi } from '../../../context/apiCommunication'
import { useEffect, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { IChannelMessage } from './ChannelMessage';
interface RepliedMessageProps {
    channelId : string;
    iconWidth: string;
    maxWidth: string;
    message: IChannelMessage | string; // string if only id given 
    onClose? : (() => void );
};

export const RepliedMessage = ({message, channelId, iconWidth, maxWidth, onClose}:RepliedMessageProps) => {
    const {sendJsonRequest} = useApi();
    const [loading, setLoading] = useState(typeof message == 'string');
    const [renderMessage, setRenderMessage] = useState<IChannelMessage|null>(null);
    
    useEffect(()=>{
        if(typeof message=='string'){
            sendJsonRequest("/Channels/getMessage", "POST",{id:message, channelId})
            .then((r)=>{
                console.log(r);
                
                if(r) setRenderMessage(r);
            }).finally(()=>setLoading(false));
        } else{
            setRenderMessage(message);
        }
    },[message])
    
    return (<div className=' d-flex text-body-secondary small' style={{width:maxWidth ,overflow:"hidden", whiteSpace:'nowrap' ,textOverflow:"ellipsis"}}> 
        <div className='d-flex justify-content-center' style={{width:iconWidth}}> <GoReply style={{transform:"rotateY(180deg) scaleX(1.3)"}} /> </div>
        <div className='flex-grow-1'>
            {loading && "loading..."}
            {!loading && !renderMessage && "couldn't load"}
            {!loading  && renderMessage && <><ProfileAvatar size={20} avatarImage={renderMessage.userAvatar}/> <span className='text-primary'>{renderMessage.userName}</span> {renderMessage.content} </>}
        </div>
        {onClose && <IoClose className='float-end' onClick={onClose}/> }
    </div>)
}