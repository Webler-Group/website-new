import { Response } from "express";
import asyncHandler from "express-async-handler";
import fs from 'fs';
import path from 'path';
const showdown = require('showdown');

const getBlogEntries = asyncHandler(async (req, res) => {
  const jsonsInDir = fs.readdirSync(__dirname + '/../../blogJSONs/').filter(file => path.extname(file) === '.json');
  const result = jsonsInDir.map( (file: string) => {
    const fileData = fs.readFileSync(path.join(__dirname + '/../../blogJSONs', file));
    const json = JSON.parse(fileData.toString());
    return json;
  });
  res.json(result);
})

const getBlogEntry = asyncHandler(async (req, res) => {
  const entryName = req.params.entryName;
  try{
    const fileData = fs.readFileSync(path.join(__dirname + '/../../blogMDs', entryName+'.md'));
    if(fileData){
      const converter = new showdown.Converter();
      const text = fileData.toString();
      const html = converter.makeHtml(text);
      res.json({content: html});
    }
  }catch(e){
    res.status(404)
       .json({content: 'error - blog entry not found'});
  }
})


const controller = {
  getBlogEntries,
  getBlogEntry
}

export default controller;
