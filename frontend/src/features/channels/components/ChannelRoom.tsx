import { useParams } from "react-router-dom"
import { useApi } from "../../../context/apiCommunication";
import { useEffect, useState } from "react";
import { Button, FormControl } from "react-bootstrap";
import ProfileAvatar from "../../../components/ProfileAvatar";
import DateUtils from "../../../utils/DateUtils";


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
            
        }, 1*1000);
        return () => clearInterval(intervalId);
    },[channelId])
    function handleSubmit(){
        sendJsonRequest("/Channels/sendChannelMessage/","POST",{
            content: typedMessage,
            channelId,
        })
        setTypedMessage('')
    }
    for(let i=messages.length-2;i>=0;i--){
        if(messages[i].senderId==messages[i+1].senderId) messages[i].batched=true;
    }
    return (
    <div className="d-flex flex-column justify-content-end">
        <div className="d-flex flex-column-reverse justify-content-end">
            {
                messages.map((message)=> 
                <div className="d-flex p-1" key={message.id}>
                    <div style={{visibility:message.batched?"hidden":"visible"}}><ProfileAvatar size={30}  avatarImage={message.senderAvatarImage}/></div>
                    <div className="flex-grow-1 d-flex flex-column ps-1">
                        {/*a placeholder for reply,etc */} 
                        <div className="d-flex">
                            <div className="flex-grow-1" style={{whiteSpace:"pre-wrap"}}>{message.content}</div>
                            <div className="text-secondary"><small>{DateUtils.format(new Date(message.createdAt))}</small></div>
                        </div>
                    </div>
                </div>)
            }
        </div>
        <div className="d-flex ">
            <textarea className="w-75 m-2 form-control" placeholder="Message..." required value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)} onKeyDown={e=>e.key=="Enter" && !e.shiftKey && handleSubmit()} /> 
            <Button className="ms-1" onClick={handleSubmit}>send</Button>
        </div>
    </div>)
}