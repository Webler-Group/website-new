import { dump } from "../utils/dbUtils";
import path from "path"

const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error("Usage: node dump.js <dump_dir>");
  process.exit(1);
}

const dumpDir = path.resolve(args[0]);
dump(dumpDir);