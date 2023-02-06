import Member from "./Member.js";
import { useState, useEffect } from "react";

function MemberList() {

    const [members, setMembers] = useState([{}]);

    useEffect(() => {
        fetch("/api/GetMembers")
            .then(res => res.json())
            .then(data => setMembers(data.members));
    }, []);

    return (
        <div>
            {members.map((member, idx) => 
                <Member key={idx} name={member.name} bio={member.bio} />
            )}
        </div>
    );
}

export default MemberList;