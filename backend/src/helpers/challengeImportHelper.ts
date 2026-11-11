import { z } from "zod";
import { Types } from "mongoose";
import ChallengeModel from "../models/Challenge";
import ChallengeCollectionModel, { ChallengeCollectionSection } from "../models/ChallengeCollection";
import ChallengeDifficultyEnum from "../data/ChallengeDifficultyEnum";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";
import HttpError from "../exceptions/HttpError";
import { withTransaction } from "../utils/transaction";
import { getOrCreateTagsByNames } from "./discussionHelper";

const importedChallengeSchema = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(8192),
    difficulty: z.enum(ChallengeDifficultyEnum),
    xp: z.number().int().min(0).default(10),
    tags: z.array(z.string().trim().min(1).max(64)).max(10).default([]),
    solution: z.string().default(""),
    isPublic: z.boolean().default(true),
    testCases: z.array(z.object({
        input: z.string().max(500).default(""),
        expectedOutput: z.string().min(1).max(500),
        isHidden: z.boolean().default(true)
    })).min(1),
    templates: z.array(z.object({
        name: z.enum(CompilerLanguagesEnum),
        source: z.string().min(1)
    })).default([])
});

export const challengeSetSchema = z.object({
    collection: z.object({
        title: z.string().trim().min(1).max(120),
        description: z.string().max(4096).default(""),
        sections: z.array(z.object({
            title: z.string().trim().min(1).max(120),
            description: z.string().max(1000).default(""),
            challenges: z.array(z.string().trim().min(1)).min(1)
        })).default([])
    }).optional(),
    challenges: z.array(importedChallengeSchema).max(1000).default([])
});

export type ChallengeSet = z.infer<typeof challengeSetSchema>;

export interface ChallengeImportSummary {
    challenges: { title: string; action: "create" | "update" }[];
    collection: { title: string; action: "create" | "update"; sections: { title: string; count: number }[] } | null;
}

const CHALLENGE_LINK = /\]\(challenge:([a-z0-9-]+)\)/g;

const slugify = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Challenges and the collection are matched by title; sections not in the file are kept
export const importChallengeSet = async (data: ChallengeSet, authorId: string, dryRun: boolean): Promise<ChallengeImportSummary> => {
    if (data.challenges.length === 0 && !data.collection) {
        throw new HttpError("The file contains no challenges and no collection", 400);
    }

    const seen = new Set<string>();
    for (const c of data.challenges) {
        if (seen.has(c.title)) throw new HttpError(`Challenge "${c.title}" appears more than once in the file`, 400);
        seen.add(c.title);
    }

    const existing = await ChallengeModel.find({}, { _id: 1, title: 1 }).lean();
    const idByTitle = new Map(existing.map(c => [c.title, c._id]));
    const existingTitles = new Set(idByTitle.keys());
    for (const c of data.challenges) {
        if (!idByTitle.has(c.title)) idByTitle.set(c.title, new Types.ObjectId());
    }
    const idBySlug = new Map([...idByTitle].map(([title, id]) => [slugify(title), id]));

    for (const c of data.challenges) {
        for (const [, slug] of `${c.description}\n${c.solution}`.matchAll(CHALLENGE_LINK)) {
            if (!idBySlug.has(slug)) throw new HttpError(`"${c.title}" links to unknown challenge "${slug}"`, 400);
        }
    }
    for (const s of data.collection?.sections ?? []) {
        for (const title of s.challenges) {
            if (!idByTitle.has(title)) throw new HttpError(`Section "${s.title}" lists unknown challenge "${title}"`, 400);
        }
    }

    const existingCollection = data.collection
        ? await ChallengeCollectionModel.findOne({ title: data.collection.title }, { _id: 1 }).lean()
        : null;

    const summary: ChallengeImportSummary = {
        challenges: data.challenges.map(c => ({ title: c.title, action: existingTitles.has(c.title) ? "update" : "create" })),
        collection: data.collection ? {
            title: data.collection.title,
            action: existingCollection ? "update" : "create",
            sections: data.collection.sections.map(s => ({ title: s.title, count: s.challenges.length }))
        } : null
    };

    if (dryRun) return summary;

    const resolveLinks = (text: string) =>
        text.replace(CHALLENGE_LINK, (_m, slug: string) => `](/Challenge/${idBySlug.get(slug)})`);

    await withTransaction(async session => {
        for (const c of data.challenges) {
            const tags = (await getOrCreateTagsByNames(c.tags.map(t => t.toLowerCase()), session)).map(t => t._id);
            const fields = {
                description: resolveLinks(c.description),
                difficulty: c.difficulty,
                xp: c.xp,
                tags,
                solution: resolveLinks(c.solution),
                isPublic: c.isPublic,
                testCases: c.testCases,
                templates: c.templates
            };
            const doc = await ChallengeModel.findOne({ title: c.title }).session(session);
            if (doc) {
                doc.set(fields);
                await doc.save({ session });
            } else {
                await ChallengeModel.create([{ _id: idByTitle.get(c.title), title: c.title, author: authorId, ...fields }], { session });
            }
        }

        if (data.collection) {
            const incoming: ChallengeCollectionSection[] = data.collection.sections.map(s => ({
                title: s.title,
                description: s.description,
                challenges: s.challenges.map(t => idByTitle.get(t)!)
            }));
            const collection = await ChallengeCollectionModel.findOne({ title: data.collection.title }).session(session);
            if (collection) {
                const sections = [...collection.sections];
                for (const section of incoming) {
                    const index = sections.findIndex(s => s.title === section.title);
                    if (index >= 0) sections[index] = section;
                    else sections.push(section);
                }
                collection.description = data.collection.description;
                collection.sections = sections;
                await collection.save({ session });
            } else {
                await ChallengeCollectionModel.create([{
                    title: data.collection.title,
                    description: data.collection.description,
                    sections: incoming,
                    author: authorId
                }], { session });
            }
        }
    });

    return summary;
};
