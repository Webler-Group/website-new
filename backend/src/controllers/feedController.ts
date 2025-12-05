import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Post from "../models/Post";
import Tag from "../models/Tag";
import Upvote from "../models/Upvote";
import Notification from "../models/Notification";
import mongoose, { PipelineStage, Types } from "mongoose";
import PostAttachment from "../models/PostAttachment";
import { escapeMarkdown, escapeRegex } from "../utils/regexUtils";
import UserFollowing from "../models/UserFollowing";
import { truncate } from "../utils/StringUtils";
import PostTypeEnum from "../data/PostTypeEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import ReactionsEnum from "../data/ReactionsEnum";
import {
  createFeedSchema,
  editFeedSchema,
  deleteFeedSchema,
  createReplySchema,
  editReplySchema,
  deleteReplySchema,
  shareFeedSchema,
  getFeedListSchema,
  getFeedSchema,
  getRepliesSchema,
  togglePinFeedSchema,
  votePostSchema,
  getUserReactionsSchema
} from "../validation/feedSchema";
import { parseWithZod } from "../utils/zodUtils";
import RolesEnum from "../data/RolesEnum";


const createFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(createFeedSchema, req);
  const { message } = body;
  const currentUserId = req.userId;

  const feed = await Post.create({
    _type: PostTypeEnum.FEED,
    title: "Untitled",
    message,
    user: currentUserId
  });

  const followers = await UserFollowing.find({ following: currentUserId });

  await Notification.sendToUsers(
    followers.filter(x => x.user != currentUserId).map(x => x.user) as Types.ObjectId[],
    {
      title: "New post",
      type: NotificationTypeEnum.FEED_FOLLOWER_POST,
      actionUser: currentUserId!,
      message: `{action_user} made a new post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
      feedId: feed._id
    }
  );

  res.json({
    success: true,
    feed: {
      type: feed._type,
      id: feed._id,
      title: feed.title,
      message: feed.message,
      date: feed.createdAt,
      userId: feed.user,
      isAccepted: feed.isAccepted,
      votes: feed.votes,
      answers: feed.answers
    }
  });
});

const getUserReactions = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(getUserReactionsSchema, req);
  const { parentId, page, count } = body;
  const currentUserId = req.userId;

  const skip = (page - 1) * count;

  const parentObjectId = new mongoose.Types.ObjectId(parentId);
  const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);

  const reactions = await Upvote.aggregate([
    { $match: { parentId: parentObjectId } },
    { $sort: { _id: -1 } },
    { $skip: skip },
    { $limit: count },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails"
      }
    },
    { $unwind: "$userDetails" },
    {
      $lookup: {
        from: "userfollowings",
        let: { targetUserId: "$user" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user", currentUserObjectId] },
                  { $eq: ["$following", "$$targetUserId"] }
                ]
              }
            }
          }
        ],
        as: "isFollowing"
      }
    },
    {
      $project: {
        userId: "$userDetails._id",
        userName: "$userDetails.name",
        userAvatar: "$userDetails.avatarImage",
        level: "$userDetails.level",
        roles: "$userDetails.roles",
        reaction: { $ifNull: ["$reaction", ReactionsEnum.LIKE] },
        isFollowing: { $gt: [{ $size: "$isFollowing" }, 0] }
      }
    }
  ]);

  const totalCount = await Upvote.countDocuments({ parentId });

  res.json({
    count: totalCount,
    userReactions: reactions
  });
});

const editFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(editFeedSchema, req);
  const { feedId, message } = body;
  const currentUserId = req.userId;

  const feed = await Post.findById(feedId);

  if (!feed) {
    res.status(404).json({ error: [{ message: "Feed not found" }] });
    return;
  }

  if (feed.user != currentUserId) {
    res.status(401).json({ error: [{ message: "Unauthorized" }] });
    return;
  }

  feed.message = message;

  await feed.save();

  const attachments = await PostAttachment.getByPostId({ post: feed._id });

  res.json({
    success: true,
    data: {
      id: feed._id,
      title: feed.title,
      message: feed.message,
      attachments
    }
  });
});

const deleteFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(deleteFeedSchema, req);
  const { feedId } = body;
  const currentUserId = req.userId;

  const feed = await Post.findById(feedId);

  if (!feed) {
    res.status(404).json({ error: [{ message: "Feed not found" }] });
    return;
  }

  if (feed.user != currentUserId && !req.roles?.some(role => [RolesEnum.ADMIN, RolesEnum.MODERATOR].includes(role))) {
    res.status(401).json({ error: [{ message: "Unauthorized" }] });
    return;
  }

  await Post.deleteAndCleanup({ _id: feedId });

  res.json({ success: true });
});

const createReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(createReplySchema, req);
  const { message, feedId, parentId } = body;
  const currentUserId = req.userId;

  const feed = await Post.findById(feedId);
  if (!feed) {
    res.status(404).json({ error: [{ message: "Feed not found" }] });
    return;
  }

  let parentComment = null;
  if (parentId) {
    parentComment = await Post.findById(parentId);
    if (!parentComment) {
      res.status(404).json({ error: [{ message: "Parent comment not found" }] });
      return;
    }
  }

  const reply = await Post.create({
    _type: PostTypeEnum.FEED_COMMENT,
    message,
    feedId,
    parentId,
    user: currentUserId
  });

  if (parentComment && parentComment.user != currentUserId) {
    await Notification.sendToUsers([parentComment.user as Types.ObjectId], {
      title: "New reply",
      type: NotificationTypeEnum.FEED_COMMENT,
      actionUser: currentUserId!,
      message: `{action_user} replied to your comment on post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
      feedId: feed._id,
      postId: reply._id
    });
  }
  if (feed.user != currentUserId && (!parentComment || feed.user.toString() != parentComment.user.toString())) {
    await Notification.sendToUsers([feed.user as Types.ObjectId], {
      title: "New comment",
      type: NotificationTypeEnum.FEED_COMMENT,
      actionUser: currentUserId!,
      message: `{action_user} commented on your post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
      feedId: feed._id,
      postId: reply._id
    });
  }

  feed.$inc("answers", 1);
  await feed.save();

  if (parentComment) {
    parentComment.$inc("answers", 1);
    await parentComment.save();
  }

  const attachments = await PostAttachment.getByPostId({ post: reply._id });

  res.json({
    post: {
      id: reply._id,
      message: reply.message,
      date: reply.createdAt,
      userId: reply.user,
      parentId: reply.parentId,
      votes: reply.votes,
      answers: reply.answers ?? 0,
      attachments
    }
  });
});

const votePost = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(votePostSchema, req);
  const { postId, vote, reaction } = body;
  const currentUserId = req.userId;

  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json({ error: [{ message: "Post not found" }] });
    return;
  }

  let upvote = await Upvote.findOne({ parentId: postId, user: currentUserId });
  if (vote) {
    if (!upvote) {
      upvote = await Upvote.create({ user: currentUserId, parentId: postId, reaction: reaction || ReactionsEnum.LIKE });
      post.$inc("votes", 1);
      await post.save();
    } else if (reaction) {
      upvote.reaction = reaction || ReactionsEnum.LIKE;
      await upvote.save();
    }
  } else {
    if (upvote) {
      await Upvote.deleteOne({ _id: upvote._id });
      upvote = null;
      post.$inc("votes", -1);
      await post.save();
    }
  }

  res.json({ success: true, vote: upvote ? 1 : 0 });
});

const editReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(editReplySchema, req);
  const { id, message } = body;
  const currentUserId = req.userId;

  const reply = await Post.findById(id);

  if (!reply) {
    res.status(404).json({ error: [{ message: "Post not found" }] });
    return;
  }

  if (currentUserId != reply.user) {
    res.status(401).json({ error: [{ message: "Unauthorized" }] });
    return;
  }

  reply.message = message;

  await reply.save();

  const attachments = await PostAttachment.getByPostId({ post: reply._id });

  res.json({
    success: true,
    data: {
      id: reply._id,
      message: reply.message,
      attachments
    }
  });
});

const deleteReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(deleteReplySchema, req);
  const { id } = body;
  const currentUserId = req.userId;

  const reply = await Post.findById(id);

  if (!reply) {
    res.status(404).json({ error: [{ message: "Post not found" }] });
    return;
  }

  if (currentUserId != reply.user) {
    res.status(401).json({ error: [{ message: "Unauthorized" }] });
    return;
  }

  const feed = await Post.findById(reply.feedId);
  if (!feed) {
    res.status(404).json({ error: [{ message: "Feed not found" }] });
    return;
  }

  await Post.deleteAndCleanup({ _id: id });

  res.json({ success: true });
});

const shareFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(shareFeedSchema, req);
  const { feedId, message } = body;
  const currentUserId = req.userId;

  const originalFeed = await Post.findById(feedId);
  if (!originalFeed) {
    res.status(404).json({ error: [{ message: "Feed not found" }] });
    return;
  }

  const feed = await Post.create({
    _type: PostTypeEnum.SHARED_FEED,
    title: "Untitled",
    message,
    user: currentUserId,
    parentId: feedId
  });

  if (feed) {
    originalFeed.$inc("shares", 1);
    await originalFeed.save();

    if (originalFeed.user != currentUserId) {
      await Notification.sendToUsers([originalFeed.user as Types.ObjectId], {
        title: "Feed share",
        type: NotificationTypeEnum.FEED_SHARE,
        actionUser: currentUserId!,
        message: `{action_user} shared your Post "${truncate(escapeMarkdown(originalFeed.message), 20).replaceAll(/\n+/g, " ")}"`,
        feedId: feed._id
      });
    }

    res.json({
      success: true,
      feed: {
        id: feed._id,
        title: feed.title,
        message: feed.message,
        date: feed.createdAt,
        userId: feed.user,
        votes: feed.votes,
        answers: feed.answers,
        parentId: feedId
      }
    });
  } else {
    res.status(500).json({ error: [{ message: "Error creating shared feed" }] });
  }
});

const getFeedList = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(getFeedListSchema, req);
  const { page, count, filter, searchQuery, userId } = body;
  const currentUserId = req.userId;

  let pipeline: PipelineStage[] = [
    {
      $match: {
        _type: { $in: [PostTypeEnum.FEED, PostTypeEnum.SHARED_FEED] },
        hidden: false,
        ...(filter !== 7 && { isPinned: false })
      }
    },
    {
      $set: {
        score: { $add: ["$votes", "$shares", "$answers"] }
      }
    }
  ];

  if (searchQuery && searchQuery.trim().length > 0) {
    const safeQuery = escapeRegex(searchQuery.trim());
    const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");
    pipeline.push({
      $match: { message: searchRegex }
    });
  }

  switch (filter) {
    case 1: // Recent
      pipeline.push({ $sort: { createdAt: -1 } });
      break;
    case 2: // My Posts
      if (!userId) {
        res.status(400).json({ error: [{ message: "Invalid request - userId required" }] });
        return;
      }
      pipeline.push(
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        { $sort: { createdAt: -1 } }
      );
      break;
    case 3: // Following
      if (!userId) {
        res.status(400).json({ error: [{ message: "Invalid request - userId required" }] });
        return;
      }
      const followingUsers = await UserFollowing.find({ user: userId }).select("following");
      const followingUserIds = followingUsers.map(f => f.following);
      if (followingUserIds.length === 0) {
        res.status(200).json({ count: 0, feeds: [], success: true });
        return;
      }
      pipeline.push({ $match: { user: { $in: followingUserIds } } }, { $sort: { createdAt: -1 } });
      break;
    case 4: // Hot Today
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      pipeline.push({ $match: { createdAt: { $gt: dayAgo } } }, { $sort: { score: -1 } });
      break;
    case 5: // Trending
      pipeline.push({ $sort: { score: -1 } });
      break;
    case 6: // Most Shared
      pipeline.push({ $sort: { shares: -1 } });
      break;
    case 7: // Pinned
      pipeline.push({ $match: { isPinned: true } }, { $sort: { createdAt: -1 } });
      break;
    default:
      res.status(400).json({ error: [{ message: "Unknown filter" }] });
      return;
  }

  const countPipeline = [...pipeline];
  countPipeline.push({ $count: "total" });
  const countResult = await Post.aggregate(countPipeline);
  const feedCount = countResult.length > 0 ? countResult[0].total : 0;

  pipeline.push(
    { $skip: (page - 1) * count },
    { $limit: count },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "users"
      }
    },
    {
      $lookup: {
        from: "postattachments",
        localField: "_id",
        foreignField: "postId",
        as: "attachments"
      }
    },
    {
      $lookup: {
        from: "posts",
        localField: "parentId",
        foreignField: "_id",
        as: "originalPost",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "users"
            }
          },
          { $limit: 1 }
        ]
      }
    }
  );

  const result = await Post.aggregate(pipeline);

  const data = await Promise.all(
    result.map(async x => {
      const reactionsAgg = await Upvote.aggregate([
        { $match: { parentId: x._id } },
        {
          $group: {
            _id: "$reaction",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const totalReactions = reactionsAgg.reduce((sum, r) => sum + r.count, 0);
      const topReactions = reactionsAgg.slice(0, 3).map(r => ({
        reaction: r._id,
        count: r.count
      }));

      const feed: any = {
        id: x._id,
        type: x._type,
        title: x.title || null,
        message: x.message,
        date: x.createdAt,
        userId: x.user,
        userName: x.users.length ? x.users[0].name : "Unknown User",
        userAvatarImage: x.users.length ? x.users[0].avatarImage || null : null,
        answers: x.answers || 0,
        votes: x.votes || 0,
        shares: x.shares || 0,
        level: x.users[0].level,
        roles: x.users[0].roles,
        isUpvoted: false,
        reaction: "",
        score: x.score || 0,
        isPinned: x.isPinned,
        attachments:
          x.attachments?.map((a: any) => ({
            id: a._id,
            type: a.type,
            url: a.url,
            meta: a.meta || null
          })) || [],
        originalPost: x.originalPost.length
          ? {
            id: x.originalPost[0]._id,
            title: x.originalPost[0].title || null,
            message: truncate(escapeMarkdown(x.originalPost[0].message), 40),
            userId: x.originalPost[0].user,
            userName: x.originalPost[0].users.length
              ? x.originalPost[0].users[0].name
              : "Unknown User",
            userAvatarImage: x.originalPost[0].users.length
              ? x.originalPost[0].users[0].avatarImage || null
              : null,
            date: x.originalPost[0].createdAt
          }
          : null,
        totalReactions,
        topReactions
      };

      if (currentUserId) {
        const upvote = await Upvote.findOne({ parentId: feed.id, user: currentUserId });
        feed.isUpvoted = !!upvote;
        feed.reaction = upvote?.reaction ?? "";

        feed.attachments = await PostAttachment.getByPostId({ post: feed.id });
      }

      return feed;
    })
  );

  res.status(200).json({
    count: feedCount,
    feeds: data,
    success: true
  });
});

const getFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(getFeedSchema, req);
  const { feedId } = body;
  const currentUserId = req.userId;

  const feedAgg = await Post.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(feedId) } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "posts",
        localField: "parentId",
        foreignField: "_id",
        as: "originalPost",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "users"
            }
          },
          { $limit: 1 }
        ]
      }
    }
  ]);

  if (!feedAgg.length) {
    res.status(404).json({ error: [{ message: "Feed not found" }] });
    return;
  }

  const feed = feedAgg[0];

  const reactionsAgg = await Upvote.aggregate([
    { $match: { parentId: new mongoose.Types.ObjectId(feedId) } },
    {
      $group: {
        _id: "$reaction",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const totalReactions = reactionsAgg.reduce((sum, r) => sum + r.count, 0);
  const topReactions = reactionsAgg.slice(0, 3).map(r => ({
    reaction: r._id,
    count: r.count
  }));

  const attachments = await PostAttachment.getByPostId({ post: feedId });

  const data: any = {
    id: feed._id,
    type: feed._type,
    title: feed.title || null,
    message: feed.message,
    date: feed.createdAt,
    userId: feed.user._id,
    userName: feed.user.name,
    userAvatarImage: feed.user.avatarImage,
    answers: feed.answers,
    votes: feed.votes,
    shares: feed.shares,
    level: feed.user.level,
    roles: feed.user.roles,
    isPinned: feed.isPinned,
    attachments,
    reaction: "",
    isUpvoted: false,
    originalPost: feed.originalPost.length
      ? {
        id: feed.originalPost[0]._id,
        title: feed.originalPost[0].title || null,
        message: truncate(escapeMarkdown(feed.originalPost[0].message), 40),
        userId: feed.originalPost[0].user,
        userName: feed.originalPost[0].users.length
          ? feed.originalPost[0].users[0].name
          : "Unknown User",
        userAvatarImage: feed.originalPost[0].users.length
          ? feed.originalPost[0].users[0].avatarImage || null
          : null,
        date: feed.originalPost[0].createdAt
      }
      : null,
    totalReactions,
    topReactions
  };

  if (currentUserId) {
    const upvote = await Upvote.findOne({ parentId: data.id, user: currentUserId });
    data.isUpvoted = !!upvote;
    data.reaction = upvote?.reaction ?? "";
  }

  res.json({ feed: data, success: true });
});

const getReplies = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(getRepliesSchema, req);
  const { feedId, parentId, index, count, filter, findPostId } = body;
  const currentUserId = req.userId;

  let parentPost: any = null;
  if (parentId) {
    parentPost = await Post.findById(parentId).populate("user", "name avatarImage countryCode level roles");
    if (!parentPost) {
      res.status(404).json({ error: [{ message: "Parent post not found" }] });
      return;
    }
  }

  let dbQuery = Post.find({ feedId, _type: PostTypeEnum.FEED_COMMENT, hidden: false });

  let skipCount = index;

  if (findPostId) {
    const reply = await Post.findById(findPostId);
    if (!reply) {
      res.status(404).json({ error: [{ message: "Post not found" }] });
      return;
    }

    parentPost = reply.parentId
      ? await Post.findById(reply.parentId).populate("user", "name avatarImage countryCode level roles")
      : null;

    dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null });

    skipCount = Math.max(
      0,
      await dbQuery.clone().where({ createdAt: { $lt: reply.createdAt } }).countDocuments()
    );

    dbQuery = dbQuery.sort({ createdAt: "asc" });
  } else {
    dbQuery = dbQuery.where({ parentId });

    switch (filter) {
      case 1: // Most popular
        dbQuery = dbQuery.sort({ votes: "desc", createdAt: "desc" });
        break;
      case 2: // Oldest first
        dbQuery = dbQuery.sort({ createdAt: "asc" });
        break;
      case 3: // Newest first
        dbQuery = dbQuery.sort({ createdAt: "desc" });
        break;
      default:
        res.status(400).json({ error: [{ message: "Unknown filter" }] });
        return;
    }
  }

  const result = await dbQuery
    .skip(skipCount)
    .limit(count)
    .populate("user", "name avatarImage countryCode level roles") as any[];

  const data = (findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
    id: x._id,
    parentId: x.parentId,
    message: x.message,
    date: x.createdAt,
    userId: x.user._id,
    userName: x.user.name,
    userAvatar: x.user.avatarImage,
    level: x.user.level,
    roles: x.user.roles,
    votes: x.votes,
    isUpvoted: false,
    answers: x.answers,
    index: findPostId && parentPost ? (offset === 0 ? -1 : skipCount + offset - 1) : skipCount + offset,
    attachments: new Array()
  }));

  const promises = data.map((item, i) => [
    currentUserId
      ? Upvote.findOne({ parentId: item.id, user: currentUserId }).then(upvote => {
        data[i].isUpvoted = !!upvote;
      })
      : Promise.resolve(),
    PostAttachment.getByPostId({ post: item.id }).then(attachments => {
      data[i].attachments = attachments;
    })
  ]).flat();

  await Promise.all(promises);

  res.json({ posts: data });
});

const togglePinFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { body } = parseWithZod(togglePinFeedSchema, req);
  const { feedId, pinned } = body;
  const currentUserId = req.userId;

  const feed = await Post.findById(feedId);

  if (!feed) {
    res.status(404).json({ error: [{ message: "Feed not found" }] });
    return;
  }

  if (currentUserId != feed.user) {
    if (pinned) {
      await Notification.sendToUsers([feed.user as Types.ObjectId], {
        title: "Feed pin",
        type: NotificationTypeEnum.FEED_PIN,
        actionUser: currentUserId!,
        message: `{action_user} pinned your Post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
        feedId: feed._id
      });
    } else {
      await Notification.deleteOne({
        _type: NotificationTypeEnum.FEED_PIN,
        user: feed.user,
        actionUser: currentUserId,
        feedId: feed._id
      });
    }
  }

  feed.isPinned = pinned;
  await feed.save();

  res.json({ success: true, data: { isPinned: feed.isPinned } });
});

const feedController = {
  createFeed,
  editFeed,
  deleteFeed,
  createReply,
  editReply,
  deleteReply,
  shareFeed,
  getFeedList,
  getFeed,
  getReplies,
  togglePinFeed,
  votePost,
  getUserReactions
}

export default feedController;