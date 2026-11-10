import {execFileSync} from "node:child_process";
import {lstat, readFile, readdir} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const policyPath = ".privacy-policy.json";
const outputFiles = ["index.html", "map.js", "style.css"];
const pageLinkFiles = new Set(["src/index.html", "dist/index.html", "scripts/check-privacy.mjs"]);
const publicLinks = new Set([
  "https://jonathan-dolan.vercel.app/",
  "https://jonathan-dolan.vercel.app/#contact",
  "https://jonathan-dolan.vercel.app/projects/igor",
  "https://jonathan-dolan.vercel.app/projects/trellife",
]);
const forbidden = [
  ["IPv4 address", /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
  ["private hostname", /\b(?:local[h]ost|[a-z0-9-]+\.(?:local|internal|lan|ts\.net))\b/i],
  ["absolute machine path", /(?:^|[\s"'=])\/(?:Users|home|private|Volumes|var\/log)\//m],
  ["email address", /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i],
  ["credential marker", /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:api[_-]?key|access[_-]?token|password)\s*[:=]/i],
];

async function loadPolicy() {
  let source;
  try {
    source = await readFile(join(root, policyPath), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw new Error("Required local privacy policy is missing: " + policyPath);
    throw new Error("Unable to read the local privacy policy.");
  }

  try {
    const {patterns} = JSON.parse(source);
    if (!Array.isArray(patterns) || patterns.length === 0) throw new Error();
    return patterns.map((pattern, index) => {
      if (typeof pattern !== "string" || pattern.trim() === "") throw new Error();
      const regex = new RegExp(pattern, "i");
      if (regex.test("")) throw new Error();
      return ["local policy rule " + (index + 1), regex];
    });
  } catch {
    throw new Error("Invalid local privacy policy. Expected a nonempty patterns array of regular expressions.");
  }
}

function git(args) {
  return execFileSync("git", args, {cwd: root, stdio: ["ignore", "pipe", "pipe"]});
}

function trackedPaths() {
  try {
    return new TextDecoder("utf-8", {fatal: true}).decode(git(["ls-files", "--cached", "-z"]))
      .split("\0").filter(Boolean);
  } catch {
    throw new Error("Unable to enumerate tracked files. Run the privacy scan from a Git checkout.");
  }
}

function checkText(source, label, permitsLinks, rules) {
  const urls = source.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  if (urls.some(url => !permitsLinks || !publicLinks.has(url))) {
    throw new Error(label + ": unexpected URL");
  }
  const text = source.replace(/https?:\/\/[^\s"'<>]+/gi, "");
  for (const [name, pattern] of rules) {
    if (pattern.test(text)) throw new Error(label + ": " + name);
  }
}

async function readText(path) {
  try {
    const file = join(root, path);
    if (!(await lstat(file)).isFile()) throw new Error();
    const text = new TextDecoder("utf-8", {fatal: true}).decode(await readFile(file));
    if (text.includes("\0")) throw new Error();
    return text;
  } catch {
    throw new Error(path + ": expected a readable UTF-8 text file");
  }
}

async function scan() {
  const paths = trackedPaths();
  if (paths.includes(policyPath)) throw new Error("The local privacy policy must never be tracked.");
  if (!paths.includes("scripts/check-privacy.mjs")) throw new Error("Stage the scanner and other publication files before scanning.");
  try {
    git(["diff", "--quiet", "--no-ext-diff", "--"]);
  } catch {
    throw new Error("Tracked files differ from the index. Stage the intended snapshot before scanning.");
  }

  const rules = [...forbidden, ...await loadPolicy()];
  const actualOutput = (await readdir(join(root, "dist"))).sort();
  if (actualOutput.join("\0") !== outputFiles.join("\0")) {
    throw new Error("Unexpected build output. Rebuild with only the approved files in dist.");
  }

  for (const [index, path] of paths.entries()) {
    checkText(path, "Tracked path #" + (index + 1), false, rules);
  }
  for (const path of [...paths, ...outputFiles.map(file => "dist/" + file)]) {
    checkText(await readText(path), path, pageLinkFiles.has(path), rules);
  }

  console.log("Privacy pattern scan passed for " + paths.length + " tracked files and " + outputFiles.length + " built files.");
}

try {
  await scan();
} catch (error) {
  console.error("Privacy scan failed: " + error.message);
  process.exitCode = 1;
}
