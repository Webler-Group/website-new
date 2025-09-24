import { Response } from "express";
import { ChallengeSub } from "../models/ChallengeSub";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import Challenge, { IChallengeTemplate } from "../models/Challenge";
import { parseWithZod } from "../utils/zodUtils";
import { challengeSubTemplateSchema, createOrUpdateSubmissionSchema, submitChallengeJobSchema } from "../validation/challengeSubSchema";


export const createOrUpdateSubmission = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = req.userId;
    const { body } = parseWithZod(createOrUpdateSubmissionSchema, req);
    const { challengeId, language, code } = body;

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
      author: userId,
    });

    if (existingSubmission) {
      existingSubmission.code = code;
      existingSubmission.codeLength = code.length;
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

    const newSubmission = await ChallengeSub.create({
        challenge: challengeId,
        language,
        author: userId,
        code,
        codeLength: code.length,
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


export const submitChallengeJob =  asyncHandler(async (req: IAuthRequest, res: Response) => {
    const deviceId = req.deviceId;
    const { body } = parseWithZod(submitChallengeJobSchema, req);
    const { submissionId, challengeId } = body;

    const submission = await ChallengeSub.findById(submissionId);
    const challenge = await Challenge.findById(challengeId);

    if(!submission || !challenge) {
      res.status(404).json({ success: false, message: "Challenge or submission does not exists" });
      return;
    }

    // const language = submission?.language;
    // const source = submission?.code;
    // const testCases = challenge?.testCases;

    // let executionTime = 0;
    const allJobs: any[] = [];

    // for(const test of testCases) {
    //     const jobDoc = await EvaluationJob.create({ language, source, stdin: test.input, deviceId });
    //     const jobId = jobDoc._id;

    //     let getJobResult = null;
    //     let status = "pending";
    //     let attempt = 0;

    //     // Poll for job status up to 30 times (30 seconds)
    //     while (status === "pending" || status === "running") {
    //       ++attempt;
    //       if (attempt > 10) {
    //         break;
    //       }
    //       getJobResult = await EvaluationJob.findById(jobId).select("-source");
    //       if (getJobResult) {
    //         status = getJobResult.status;
      
    //         if (status === "pending" || status === "running") {
    //           await new Promise((resolve) => setTimeout(resolve, 1000));
    //         }
    //       } else {
    //         // If job not found, break early
    //         break;
    //       }
    //     }

    //     allJobs.push(getJobResult);
    // }


    res.status(200).json({ success: true, allJobs });

})



export const getChallengeSubmissionTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const userId = req.userId;
  const { body } = parseWithZod(challengeSubTemplateSchema, req);
  const { challengeId, language } = body;

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    res.status(404).json({ success: false, message: "Challenge not found" });
    return;
  }

  // Return backend template source for the requested language since ->
  // users are not allowed to make submissions unless the template for such language exists
  const template = challenge.templates?.find((tpl: IChallengeTemplate) => tpl.name === language);
  if (!template) {
    res.status(404).json({ success: false, message: "Template for this language not found" });
    return;
  }

  // Check for existing submission
  const existingSubmission = await ChallengeSub.findOne({ 
      challenge: challengeId, language: language, author: userId,
  });

  if (existingSubmission) {
    res.status(200).json({ success: true, code: existingSubmission.code });
    return;
  }

  res.status(200).json({ success: true, code: template.source });

});



const ChallengeSubController = {
  createOrUpdateSubmission,
  getChallengeSubmissionTemplate,
  submitChallengeJob
}

export default ChallengeSubController;