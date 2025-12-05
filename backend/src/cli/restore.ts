import path from "path";
import { restore } from "../utils/dbUtils";

const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error("Usage: node restore.js <dump_path>");
  process.exit(1);
}

const dumpPath = path.resolve(args[0]);

restore(dumpPath);