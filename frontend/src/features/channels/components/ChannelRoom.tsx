import { useParams } from "react-router-dom"
import { useApi } from "../../../context/apiCommunication";
import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import ProfileAvatar from "../../../components/ProfileAvatar";
import DateUtils from "../../../utils/DateUtils";
import ProfileName from "../../../components/ProfileName";

const MAX_BATCHING_TIME_DIFF = 5 // in minitues
const PROFILE_IMG_SIZE = 38 // in pixels
export function ChannelRoom(){
    const {channelId} = useParams();
    const {sendJsonRequest} = useApi();
    const [messages, setMessages]= useState<any[]>([]);
    const [typedMessage, setTypedMessage]= useState("");
    useEffect(()=>{
        //TODO: check for older messages if user scrolled up
        //TODO: check for update on messages 
        const intervalId = setInterval(async ()=>{
            const result = await sendJsonRequest("/Channels/getChannelMessages","POST",{
                pageNumber:1,
                channelId,
            });
            if(messages[0]?.id != result.messages[0]?.id) setMessages(result.messages) ;
            
        }, 5*1000);
        return () => clearInterval(intervalId);
    },[channelId])
    function handleSubmit(){
        sendJsonRequest("/Channels/sendChannelMessage/","POST",{
            content: typedMessage,
            channelId,
        })
        setTypedMessage('')
    }
    function handleEnter(e: React.KeyboardEvent<HTMLTextAreaElement> ){
        if(e.key=="Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }
    // barcthing messages
    for(let i=messages.length-2;i>=0;i--){
        const current = messages[i];
        const last = messages[i+1];
        const timeDiffrence =  new Date(current.createdAt).getTime() - new Date(last.createdAt).getTime();
        if(current.senderId==last.senderId && timeDiffrence < MAX_BATCHING_TIME_DIFF*60*1000) messages[i].batched=true;
    }
    return (
    <div className="d-flex flex-column justify-content-end">
        <div className="d-flex flex-column-reverse justify-content-end">
            {
                messages.map((message)=> 
                <div className="d-flex channel-message" key={message.id}> {/* the container for a message */}
                    <div className="flex-grow-1 d-flex flex-column"> {/* the messeage is splitted to 2 part: replied part and content part */}
                        <div>{/* the replied part */}</div> 
                        <div className="d-flex">{/* the content part: profile and message data */}
                            <div className="d-flex justify-content-center flex-shrink-0" style={{visibility:message.batched?"hidden":"visible", width:`${PROFILE_IMG_SIZE}px`}}> {/* Prfile in the start, only visibl if not bathched but the layout effect will remain*/}
                                {!message.batched && <ProfileAvatar size={PROFILE_IMG_SIZE}  avatarImage={message.senderAvatarImage}/>} {/* the image */}
                            </div>
                            <div className="d-flex flex-column flex-grow-1 ps-1"> {/* the message data growing to the end; content arranged vertically*/}
                                {!message.batched && // show the name and date only if not batched 
                                <div className="text-primary"> <small className="text-secondary">
                                    <ProfileName className="text-decoration-none" userId={message.senderId} userName={message.senderName}/> 
                                    <span className="float-end">{DateUtils.format(new Date(message.createdAt))} </span>
                                </small></div>} 
                                
                                    <div className="flex-grow-1" style={{whiteSpace:"pre-wrap"}}>{message.content}</div>
                                
                            </div>
                        </div>
                        
                    </div>
                </div>)
            }
        </div>
        <div className="d-flex ">
            <textarea className="w-75 m-2 form-control" placeholder="Message..." required value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)} onKeyDown={handleEnter} /> 
            <Button className="ms-1" onClick={handleSubmit}>send</Button>
        </div>
    </div>)
}