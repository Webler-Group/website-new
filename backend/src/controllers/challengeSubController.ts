import { Request, Response } from "express";
import { ChallengeSub } from "../models/ChallengeSub";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import RolesEnum from "../data/RolesEnum";
import Challenge, { IChallengeTemplate } from "../models/Challenge";


// Create or update a challenge submission
export const createChallengeSubmission = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = req.userId;
    const { challengeId, language, code, executionTime } = req.body;

    if (!challengeId || !language || !code || !userId) {
      res.status(400).json({ success: false, message: "Missing required fields" });
      return;
    }

    // should only submit if the template exists
    const challenge = await Challenge.findById(challengeId);
    const template = challenge?.templates?.find((tpl: IChallengeTemplate) => tpl.name === language);

    if(!challenge || !template) {
      res.status(500).json({ success: false, message: "Challenge/Template does not exists"});
      return;
    }

    const existingSubmission = await ChallengeSub.findOne({
      challenge: challengeId,
      language,
      user: userId,
    });

    if (existingSubmission) {
      existingSubmission.code = code;
      existingSubmission.codeLength = code.length;

      if (executionTime) 
        existingSubmission.executionTime = executionTime;

      existingSubmission.updatedAt = new Date();

      try {
        await existingSubmission.save();
      } catch(err) {
        res.status(500).json({ success: false, message: err });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Submission updated successfully",
        submission: existingSubmission,
      });

      return;
    }

    const newSubmission = ChallengeSub.create({
        challenge: challengeId,
        language,
        user: userId,
        code,
        codeLength: code.length,
        executionTime,
    });

    if(!newSubmission) {
      res.status(500).json({ success: false, message: "Failed to create this submission" });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Submission created successfully",
      submission: newSubmission,
    });

});



export const getChallengeSubmissionTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const userId = req.userId;
  const { challengeId, language } = req.body;

  if (!challengeId || !language) {
    res.status(400).json({ success: false, message: "Missing required fields" });
    return;
  }

  // Get challenge and check author
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    res.status(404).json({ success: false, message: "Challenge not found" });
    return;
  }

  if (challenge.createdBy?.toString() !== userId) {
    res.status(403).json({ success: false, message: "Only the author can request the template" });
    return;
  }

  // Check for existing submission
  const existingSubmission = await ChallengeSub.findOne({
    challenge: challengeId,
    language: language,
    user: userId,
  });

  if (existingSubmission) {
    res.status(200).json({
      success: true,
      code: existingSubmission.code
    });

    return;
  }

  // Return template source for the requested language
  const template = challenge.templates?.find((tpl: IChallengeTemplate) => tpl.name === language);
  if (!template) {
    res.status(404).json({ success: false, message: "Template for this language not found" });
    return;
  }

  res.status(200).json({
    success: true,
    code: template.source
  });

});



export const deleteChallengeSubmission =  asyncHandler(async (req: IAuthRequest, res: Response) => {
  const userId = req.userId;
  const isAdmin = req.roles?.includes(RolesEnum.ADMIN);
  const { submissionId } = req.body;

  const submission = await ChallengeSub.findById(submissionId);
  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  if (submission.user.toString() !== userId && !isAdmin) {
    res.status(403).json({ error: "Not authorized to delete this submission" });
    return;
  }

  await ChallengeSub.findByIdAndDelete(submissionId);
  res.json({ message: "Submission deleted successfully" });
});


const updateSubmissionStatus = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { submissionId, status } = req.body;

  const submission = await ChallengeSub.findById(submissionId);
  if (!submission) {
    res.status(404).json({ success: false, message: "Challenge not found" });
    return;
  }

  submission.status = status;
  await submission.save();

  res.status(200).json({ success: true, message: "Submission status updated" });

});


const ChallengeSubController = {
  createChallengeSubmission,
  getChallengeSubmissionTemplate,
  deleteChallengeSubmission,
  updateSubmissionStatus
}

export default ChallengeSubController;