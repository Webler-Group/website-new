import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import {Channel, ChannelMessage} from "../models/Channel";
import { Response } from "express";
import mongoose, { Schema } from "mongoose";
import User from "../models/User";

export const PAGE_SIZE = 30;

export const getChannelsList = asyncHandler(async (req: IAuthRequest, res: Response)=>{
    const userId = req.userId;
    const {pageNumber = 1} = req.body;
    const query = Channel.find({ participants: {$in:userId} }).sort({updatedAt:"desc"}).skip((pageNumber-1)*PAGE_SIZE).limit(PAGE_SIZE+1);
    const result = await query.clone().select("channelName channelIcon").exec();
    

    let availablePage = false;
    
    const channels=await Promise.all(result.map(async c=>{
        let {channelName, channelIcon } = c;
        if(!channelName){
            const ch = await Channel.findById(c._id).select("participants");

            const targetUserId = userId == ch?.participants[0] ? ch?.participants[1]: ch?.participants[0];
            const targetUser = await User.findById(targetUserId?._id).select("name avatarImage")
            if(!targetUser) throw("unreachable");
            channelName = targetUser.name;
            channelIcon = targetUser.avatarImage ? ("/uploads/users/" + targetUser.avatarImage ): "/resources/images/user.svg";
        }
       return{
        id:c._id,
        channelName,
        channelIcon,
       }
    }));
    if(channels.length>PAGE_SIZE) {
        availablePage = true;
        channels.pop();
    }
    res.json({
        channels, availablePage
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
    const unfilteredMessages = await ChannelMessage.find({channel:channelId}).sort({'createdAt':"desc"}).skip((pageNumber-1)*PAGE_SIZE).limit(PAGE_SIZE).populate("sender","name avatarImage");

    const messages = unfilteredMessages.map(v=>{ // remove content of deleted message but send their footage; also check for hiddenSender.
        if(!v.hidden) return v;
        else return {...v, content:null, sender: v.hiddenSender? null: v.sender};
    }).filter(v=>{ // remove the footage if specifed.
        return ! (v.content == null && v.hiddenFootage)
    });
    
    res.json({
        messages: messages.map(m=>{return {
            id: m.id,
            content: m.content,
            createdAt: m.createdAt,
            senderName: (m.sender as any).name,
            senderAvatarImage: (m.sender as any).avatarImage,
            senderId: (m.sender as any).id,
        }})
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
    console.log(channelId);
    
    channelId = new mongoose.Types.ObjectId(channelId);

    if(! await Channel.isParticipantOf(channelId,userId)){
        res.sendStatus(404); // no 403 for security standards
        return;
    }
    
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
    res.status(200).json({message:"OK"});
});



export const createDirect = asyncHandler(async (req: IAuthRequest, res: Response)=>{

    const userId = new mongoose.Types.ObjectId(req.userId);
    let memberId : mongoose.Types.ObjectId | undefined = req.body.memberId; 
    
    if(!memberId || !(await User.findById(memberId))){
        res.status(404).json({message:"missing information"});
        return;
    }
    memberId = new mongoose.Types.ObjectId(memberId);
    if(memberId.equals(userId)){
        res.status(403).json({message:"You can't send a direct to yourself"});
        return;
    }

    let channel = await Channel.findOne({$or:[{participants:[userId,memberId]}, {participants:[userId,memberId]}]})
    //TODO: ask target user for confirmation of firect message from this user.
    if(!channel){
    // wait for so if it throws we are informig the user an error
        channel = await Channel.create({
            participants:[userId,memberId],
            permissions:[],
            createdBy:userId,
            pinnedMessages:[],
        });
    }
    res.status(200).json({channelId:channel._id});
});

export const createGroupChat = asyncHandler(async (req: IAuthRequest, res: Response)=>{

    const userId = new mongoose.Types.ObjectId(req.userId);
    
    if(!Array.isArray(req.body.memberIds)){
        res.status(404).json({message:"wrong information"});
        return;
    }
    const groupName = req.body.groupName as string|undefined;
    if(!groupName){
        res.status(404).json({message:"missing name for group"});
        return
    }
    let rawMemberIds : string[] = req.body.memberIds; 
    console.log(rawMemberIds);
    const prmss= rawMemberIds.map(async id=> await User.findById(id));
    const checkIds = await Promise.all(prmss);
    if(checkIds.filter(v=>!v).length>0 || rawMemberIds.length < 2){
        res.status(404).json({message:"wrong or insufficent information"});
        return;
    }

    
    const memberIds = new Set(rawMemberIds.map(id=>new mongoose.Types.ObjectId(id)));
    //TODO: Check for max groups limit
    //TODO: ask target user for confirmation of firect message from this user.
    // wait for so if it throws we are informig the user an error
    const channel = await Channel.create({
            participants:[userId,...memberIds.values()],
            permissions:[],
            createdBy:userId,
            pinnedMessages:[],
            channelName:groupName
    });
    
    res.status(200).json({channelId:channel._id});
});