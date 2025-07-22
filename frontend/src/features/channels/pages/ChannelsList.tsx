import { ReactElement, useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication";
import QuestionPlaceholder from "../../discuss/components/QuestionPlaceholder";
import { Link } from "react-router-dom";
import { ChannelRoom } from "../components/ChannelRoom";



export function ChannelsList({openChannel=false}){
    const [loading,setLoading] = useState(false);
    const {sendJsonRequest} = useApi();
    const [pageNumber, setPageNumber] = useState(1);
    const [channels, setChannels] = useState<any[]>([])


    useEffect(()=>{ getChannelsList()},[pageNumber])

    const getChannelsList = async ()=>{
        setLoading(true);
        const result = (await sendJsonRequest("/Channels",'POST',{
            pageNumber,
        }));
        
        setChannels(result.channels);
        setLoading(false);
    };

    let placeholders = [];
    for (let i = 0; i < 30; ++i) {
        placeholders.push(<QuestionPlaceholder key={i} />);
    }
    console.group(channels)
    return (<div className="d-flex mb-1">
        <div className="my-3 w-25 h-100 ">
                {
                    loading ?
                        placeholders
                        :
                        channels.length == 0?
                            <div className="wb-discuss-empty-questions">
                                <h3>Nothing to show</h3>
                            </div>
                            :
                            channels.map(channel => {
                                return (
                                    
                                <div key={channel.id} className="container align-items-end mt-3">
                                     
                                    
                                    <Link to={"/Channels/" + channel.id} className="ms-2 text-decoration-none align-bottom" > <img width={42} height={42} style={{borderRadius:"50%"}} src={channel.channelIcon} /> {channel.channelName}</Link>
                
                                    
                                </div>
                                 
                                )
                            })

                }
        
        </div>
        {openChannel&&
        <div className="flex-grow-1"><ChannelRoom /> </div>
        }
    </div>)
}
