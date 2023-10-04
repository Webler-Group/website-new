import React from 'react'

interface ICodeComment {
    id: string;
    userId: string;
    userName: string;
    date: string;
    message: string;
    answers: number;
    votes: number;
    isUpvote: boolean;
}

interface CommentNodeProps {
    data: ICodeComment;
}

const CommentNode = React.forwardRef(({ }: CommentNodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    let body = (
        <div>
            hi
        </div>
    )
    let content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>
    return content
})

export type {
    ICodeComment
}

export default CommentNode