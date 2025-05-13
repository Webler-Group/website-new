import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import fs from 'fs';
import path from 'path';
import showdown from 'showdown';
import { config } from "../confg";

const blogsDir = path.join(config.rootDir, "uploads", "blogs")

const getBlogEntries = asyncHandler(async (req: Request, res: Response) => {

  const { page, count, searchQuery } = req.body;

  if (typeof page === "undefined" || typeof count === "undefined" || typeof searchQuery === "undefined") {
    res.status(400).json({ message: "Some fields are missing" });
    return
  }

  let postCount = 0;
  let posts = []

  if (fs.existsSync(blogsDir)) {
    let names = fs.readdirSync(blogsDir);
    console.log(names);


    posts = names.map(name => {
      const fileData = fs.readFileSync(path.join(blogsDir, name, "info.json"));
      const json = JSON.parse(fileData.toString());
      return json;
    })

    if (searchQuery.trim().length) {
      const regex = new RegExp("^" + searchQuery.trim(), "i")
      posts = posts.filter(post => {
        return regex.test(post.title);
      })
    }

    postCount = posts.length;

    posts = posts.slice((page - 1) * count, page * count);
  }

  res.json({
    posts,
    count: postCount
  })

})

const getBlogEntry = asyncHandler(async (req: Request, res: Response) => {
  const { entryName } = req.body;
  try {
    const jsonFileData = fs.readFileSync(path.join(blogsDir, entryName, 'info.json'));
    const json = JSON.parse(jsonFileData.toString());
    const fileData = fs.readFileSync(path.join(blogsDir, entryName, 'content.md'));

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
