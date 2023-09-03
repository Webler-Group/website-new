import { useState } from "react";
import { Container } from "react-bootstrap";

interface IBlogEntry {
  title: string;
  content: string;
  date: string;
  link: string;
}

const BlogEntry = (props) => {
  return (
    <>
      <a href={props.link}><h5>{props.title}</h5></a>
      <p>{props.content}</p>
      <p>{props.date}</p>
    </>
  );
};

export type {IBlogEntry}

export default BlogEntry;
