import { Button, FormControl, Modal } from "react-bootstrap";
import FollowListProfile from "../../profile/components/FollowListProfile";
import useFollows from "../../profile/hooks/useFollows";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "../../auth/context/authContext";
import FormCheckInput from "react-bootstrap/esm/FormCheckInput";
import FormCheckLabel from "react-bootstrap/esm/FormCheckLabel";
import { useApi } from "../../../context/apiCommunication";
import {useNavigate } from "react-router-dom";


interface CreateGroupProps {
    onClose: () => void;
    
}
export function CreateGroupModal({onClose}: CreateGroupProps){
    const [pageNum, setPageNum] = useState(1)
    const {userInfo} = useAuth();
    const {sendJsonRequest} = useApi();
    const groupNameInput = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    if(!userInfo) throw("unreachable")
    const {
        isLoading,
        error,
        results,
        hasNextPage
    } = useFollows('/Profile/GetFollowers', userInfo.id, 10, pageNum)

    const intObserver = useRef<IntersectionObserver>()
    const lastProfileRef = useCallback((profile: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(profiles => {

            if (profiles[0].isIntersecting && hasNextPage) {

                setPageNum(prev => prev + 1)
            }
        })


        if (profile) intObserver.current.observe(profile)
    }, [isLoading, hasNextPage])
    const checkedUsers =new Set<string>();
    const content = results.map((user, i) => {

        return (
            <div key={user.id} className="mb-3">
                <FormCheckInput  className="btn-check" onChange={e=>{if(e.currentTarget.checked) checkedUsers.add(e.currentTarget.value); else checkedUsers.delete(e.currentTarget.value);}} value={user.id} id={`checkboxgc${user.id}`} autoComplete="off" />
                <FormCheckLabel className="btn  btn-outline-secondary w-100" htmlFor={`checkboxgc${user.id}`}>
                {
                    results.length === i + 1 ?
                        <FollowListProfile hideFollowButton ref={lastProfileRef} user={user} viewedUserId={userInfo.id} setCount={()=>null} />
                        :
                        <FollowListProfile hideFollowButton user={user} viewedUserId={userInfo.id} setCount={()=>null} />
                }
                </FormCheckLabel>
            </div>
        )
    })
    async function requestCreateGroup(e:React.FormEvent<HTMLFormElement>){
        e.preventDefault();
        console.log(checkedUsers);
        const result = await sendJsonRequest("/Channels/createGroupChat", "POST", {
            memberIds: [...checkedUsers.values()],
            groupName:groupNameInput.current?.value
        })
        navigate("/Channels/"+result.channelId)
        onClose();
    }
    return(
        <Modal show={true} onHide={onClose} className="d-flex justify-content-center align-items-center" fullscreen="sm-down" contentClassName="wb-modal__container follows">
            <Modal.Header closeButton>
                <Modal.Title className="fs-6">Select users from your followers list</Modal.Title>
            </Modal.Header>
            <Modal.Body className="overflow-auto " >
                <form onSubmit={requestCreateGroup} className="needs-validation d-flex flex-column justify-content-center align-items-stretch">
                <FormControl ref={groupNameInput} minLength={4} type="text" className="form-control mb-1" placeholder="name..." required />
                <Button type="submit" className="mb-1 " >Create Group</Button>
                {
                    error ?
                        <p>{error}</p>
                        :
                        <div className="d-flex flex-column align-items-stretch">
                            {
                                content
                            }
                        </div>
                }
                </form>
            </Modal.Body>
        </Modal>
    )
}