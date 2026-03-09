import React from "react";
import { Button, Card } from "react-bootstrap";
import ProfileAvatar from "../../../components/ProfileAvatar";
import ProfileName from "../../../components/ProfileName";
import { ChannelBase, InviteDetails } from "../types";

interface InvitesListItemProps {
    invite: InviteDetails<undefined, ChannelBase>;
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
}

const InvitesListItem = React.forwardRef(({ invite, onAccept, onDecline }: InvitesListItemProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    let body = (<Card className="mb-3">
        <Card.Body className="d-flex align-items-center gap-2">
            <ProfileAvatar avatarUrl={invite.author.avatarUrl} size={42} />
            <div className="flex-grow-1">
                <div><strong>{invite.channel.title}</strong></div>
                <div className="text-muted small">
                    Invited by <ProfileName userId={invite.author.id} userName={invite.author.name} />
                </div>
            </div>
            <div className="d-flex flex-column gap-2 ms-3">
                <Button variant="success" size="sm" onClick={() => onAccept(invite.id)}>Accept</Button>
                <Button variant="outline-danger" size="sm" onClick={() => onDecline(invite.id)}>Decline</Button>
            </div>
        </Card.Body>
    </Card>);

    const content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>
    return content;
});

export default InvitesListItem;