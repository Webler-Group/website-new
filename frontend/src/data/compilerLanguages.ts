export type compilerLanguages = "web" | "c" | "cpp" | "python" | "ruby" | "lua" | "nodejs" | "java";

export const languagesInfo = {
    web: { color: "rgb(221, 72, 36)", displayName: "Web", shortName: "Web" },
    c: { color: "rgb(49, 124, 226)", displayName: "C", shortName: "C" },
    cpp: { color: "rgb(49, 124, 226)", displayName: "C++", shortName: "Cpp" },
    python: { color: "rgb(255, 224, 91)", displayName: "Python", shortName: "Py" },
    ruby: { color: "rgb(198, 42, 74)", displayName: "Ruby", shortName: "Ruby" },
    lua: { color: "rgb(79, 45, 168)", displayName: "Lua", shortName: "Lua" },
    nodejs: { color: "rgb(75, 137, 38)", displayName: "Node.JS", shortName: "Node" },
    java: { color: "rgb(240, 140, 56)", displayName: "Java", shortName: "Java" }
};
