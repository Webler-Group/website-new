import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import {Channel, ChannelMessage} from "../models/Channel";
import { Response } from "express";
import mongoose from "mongoose";

export const PAGE_SIZE = 30;

export const getChannelsList = asyncHandler(async (req: IAuthRequest, res: Response)=>{
    const userId = req.userId;
    const {pageNumber = 1} = req.body;
    const channels = await Channel.find({ 'participants.user': userId }).sort({updatedAt:"desc"}).skip((pageNumber-1)*PAGE_SIZE).limit(PAGE_SIZE).select("chatName chatIcon").exec();
    res.json({
        channels
    })
    
});

export const getChannelMessages = asyncHandler(async (req: IAuthRequest, res: Response)=>{

    const userId = new mongoose.Types.ObjectId(req.userId);
    const {pageNumber = 1} = req.body;
    let channelId : mongoose.Types.ObjectId | undefined = req.body.channelId; //whether this should be in url or body might change.
    if(!channelId){
        res.status(404).json({message:"missing information"});
        return;
    }
    channelId = new mongoose.Types.ObjectId(channelId);

    if(! await Channel.isParticipantOf(channelId,userId)){
        res.sendStatus(404); // no 403 for security standards
        return;
    }

    if(!(await Channel.getPermissions(channelId,userId)).canSeeMessages){
        res.status(403).json({message:"muted"});
        return;
    }
    const unfilteredMessages = await ChannelMessage.find({channel:channelId}).sort({'createdAt':"desc"}).skip((pageNumber-1)*PAGE_SIZE).limit(PAGE_SIZE);

    const messages = unfilteredMessages.map(v=>{ // remove content of deleted message but send their footage; also check for hiddenSender.
        if(!v.hidden) return v;
        else return {...v, content:null, sender: v.hiddenSender? null: v.sender};
    }).filter(v=>{ // remove the footage if specifed.
        return ! (v.content == null && v.hiddenFootage)
    });

    res.json({
        messages
    })

});


export const sendChannelMessage = asyncHandler(async (req: IAuthRequest, res: Response)=>{

    const userId = new mongoose.Types.ObjectId(req.userId);
    let channelId : mongoose.Types.ObjectId | undefined = req.body.channelId; //whether this should be in url or body might change.
    let content: string|undefined = req.body.content;
    if(!channelId || !content?.trim()){
        res.status(404).json({message:"missing information"});
        return;
    }
    channelId = new mongoose.Types.ObjectId(channelId);

    if(! await Channel.isParticipantOf(channelId,userId)){
        res.sendStatus(404); // no 403 for security standards
        return;
    }
    //
    if(!(await Channel.getPermissions(channelId,userId)).canSendText){ 
        // TODO: handle other media permissions espicialy image
        // TODO: check for attachemnts that point to media and filter based on permissions
        res.status(403).json({message:"no perm"});
        return;
    }
    // wait for so if it throws we are informig the user an error
    await ChannelMessage.create({
           content,
           sender:userId,
           channel:channelId,
    });
    res.sendStatus(200);
});