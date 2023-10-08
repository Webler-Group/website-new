import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import fs from 'fs';
import path from 'path';
import showdown from 'showdown';

const rootDir = process.env.ROOT_DIR as string;

const getBlogEntries = asyncHandler(async (req: Request, res: Response) => {

  const query = req.query;

  const page = Number(query.page);
  const count = Number(query.count);
  const searchQuery = typeof query.query !== "string" ? "" : query.query.trim();

  if (!Number.isInteger(page) || !Number.isInteger(count)) {
    res.status(400).json({ message: "Invalid query params" });
    return
  }

  const regex = new RegExp("^" + searchQuery, "i")

  let names = fs.readdirSync(path.join(rootDir, "uploads", "blogs"));

  let posts = names.map(name => {
    const fileData = fs.readFileSync(path.join(rootDir, "blogs", name, "info.json"));
    const json = JSON.parse(fileData.toString());
    return json;
  })

  if (searchQuery.length) {
    posts = posts.filter(post => {
      return regex.test(post.title);
    })
  }

  const postCount = posts.length;

  posts = posts.slice((page - 1) * count, page * count);

  res.json({
    posts,
    count: postCount
  })

})

const getBlogEntry = asyncHandler(async (req: Request, res: Response) => {
  const entryName = req.params.entryName;
  try {
    const jsonFileData = fs.readFileSync(path.join(rootDir, 'blogs', entryName, 'info.json'));
    const json = JSON.parse(jsonFileData.toString());
    const fileData = fs.readFileSync(path.join(rootDir, 'blogs', entryName, 'content.md'));

    const converter = new showdown.Converter();
    const text = fileData.toString();
    const html = converter.makeHtml(text);
    res.json({
      blog: {
        title: json.title,
        content: html
      }
    });
  }
  catch (e) {
    res.status(404)
      .json({
        message: "Blog not found"
      });
  }
})


const controller = {
  getBlogEntries,
  getBlogEntry
}

export default controller;
