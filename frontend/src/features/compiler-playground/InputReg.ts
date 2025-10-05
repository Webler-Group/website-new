export default function codeRequiresInput(code: string, language: string): boolean {
  const lowerLang = language.toLowerCase();
  
  const patterns: Record<string, RegExp[]> = {

    "c": [
      /\bscanf\s*\(/,         // scanf()
      /\bfgets\s*\(/,         // fgets()
      /\bgetchar\s*\(/,       // getchar()
    ],

    "cpp": [
      /\bcin\s*>>/,           // cin >>
      /\bscanf\s*\(/,
      /\bgetline\s*\(/,
    ],

    "python": [
      /\binput\s*\(/,         // input()
      /\bsys\.stdin\.read/,   // sys.stdin.read()
    ],

    "lua": [
      /\bio\.read\s*\(/,      // io.read()
    ],

    "nodejs": [
      /\bprocess\.stdin/,     // process.stdin
      /\breadline/,           // readline
      /\bprompt-sync/,        // prompt-sync
    ],


    "typescript": [
      /\bprocess\.stdin/,
      /\breadline/,
      /\bprompt\s*\(/,
    ],

    "rust": [
      /\bstd::io::stdin\s*\(/,
      /\bstdin\s*\(/,
      /\bread_line\s*\(/,
    ],

    "kotlin": [
      /\breadLine\s*\(/,
      /\breadln\s*\(/,
    ],

    "java": [
      /\bScanner\s*\(/,       // new Scanner(System.in)
      /\bSystem\.in\b/,
      /\bBufferedReader\s*\(/,
    ],

    "cs": [
      /\bConsole\.ReadLine\s*\(/,
      /\bConsole\.Read\s*\(/,
    ],

    "swift": [
      /\breadLine\s*\(/,
    ],

    "r": [
      /\bscan\s*\(/,
      /\breadline\s*\(/,
    ],

    "go": [
      /\bfmt\.Scan/,
      /\bbufio\.NewReader/,
      /\bReadString\s*\(/,
    ],

    "ruby": [
      /\bgets\s*\(/,
      /\bSTDIN\.read/,
    ],

  };

  const langPatterns = patterns[lowerLang];

  if (!langPatterns) return false;

  return langPatterns.some((regex) => regex.test(code));
}
