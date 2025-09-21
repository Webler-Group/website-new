const allowedUrls = [
  /^https?:\/\/(?:i\.)?imgur\.com/i,
  /^https?:\/\/(?:i\.)?ibb\.co/i,
  /^https?:\/\/(?:i\.)?postimg\.cc/i,
  /^https?:\/\/(?:www\.)?github\.com/i,
  /^https?:\/\/(?:[a-z0-9-]+)\.github\.io/i,              // GitHub Pages
  /^https?:\/\/raw\.githubusercontent\.com/i,             // Raw content
  /^https?:\/\/(?:www\.)?dropbox\.com\/s\//i,             // Dropbox share
  /^https?:\/\/dl\.dropboxusercontent\.com\/s\//i,        // Direct Dropbox
  /^https?:\/\/(?:www\.)?weblercodes\.com/i,
  /^\/.*/                                                 // relative paths
];

export default allowedUrls;