export type compilerLanguages = "web" | "c" | "cpp" | "python" | "ruby" | "lua";

export const languagesInfo: Record<
  compilerLanguages,
  {
    color: string;
    displayName: string;
    shortName: string;
    logo: string;
  }
> = {
  web: {
    color: "rgb(221, 72, 36)",
    displayName: "Web",
    shortName: "Web",
    logo: "/resources/images/web-original.svg",
  },
  c: {
    color: "rgb(49, 124, 226)",
    displayName: "C",
    shortName: "C",
    logo: "/resources/images/c-original.svg",
  },
  cpp: {
    color: "rgb(49, 124, 226)",
    displayName: "C++",
    shortName: "Cpp",
    logo: "/resources/images/cplusplus-original.svg",
  },
  python: {
    color: "rgb(230, 200, 70)",
    displayName: "Python",
    shortName: "Py",
    logo: "/resources/images/python-original.svg",
  },
  ruby: {
    color: "rgb(198, 42, 74)",
    displayName: "Ruby",
    shortName: "Ruby",
    logo: "/resources/images/ruby-original.svg",
  },
  lua: {
    color: "rgb(79, 45, 168)",
    displayName: "Lua",
    shortName: "Lua",
    logo: "/resources/images/lua-original.svg",
  },
};
