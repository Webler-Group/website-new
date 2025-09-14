import { Response } from "express";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import ChallengeSubmission from "../models/ChallengeSubmission";


const createSubmission = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { challengeId, code, language } = req.body;

    const submission = await ChallengeSubmission.create({
      challenge: challengeId,
      user: req.userId,
      code,
      language,
    });

    //// TODO: trigger code execution service here
    // res.status(201).json({ success: true, submission });
})


const getSubmissionsByChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { challengeId } = req.body;
  const submissions = await ChallengeSubmission.findByChallenge(challengeId);

  if(!submissions.length) {
    res.json({ success: false, message: "No submission for this challenge" });
    return;
  }

  res.json({ success: true, submissions });
})


const getSubmissionsByUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
  // const submissions = await ChallengeSubmission.findByUser(req.userId as string);
  // res.json({ success: true, submissions });
})

//   static async updateSubmissionStatus(req: Request, res: Response) {
//     try {
//       const { status, resultOutput } = req.body;
//       const submission = await ChallengeSubmission.findById(req.params.id);

//       if (!submission) {
//         return res.status(404).json({ success: false, message: "Submission not found" });
//       }

//       await submission.updateStatus(status, resultOutput);
//       res.json({ success: true, submission });
//     } catch (err: any) {
//       res.status(400).json({ success: false, message: err.message });
//     }
//   }
// }
