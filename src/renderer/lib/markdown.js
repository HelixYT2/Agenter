import { marked } from "marked";

marked.setOptions({
  breaks: true,
  gfm: true,
  mangle: false,
  headerIds: false
});

export const renderMarkdown = (content = "") => marked.parse(content);
