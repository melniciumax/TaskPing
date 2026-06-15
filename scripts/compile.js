const fs = require("fs");
const path = require("path");
const solc = require("solc");

const source = fs.readFileSync(path.join(__dirname, "../contracts/TaskPing.sol"), "utf8");

const input = {
  language: "Solidity",
  sources: { "TaskPing.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) {
  let fatal = false;
  for (const e of out.errors) {
    console.log(e.formattedMessage);
    if (e.severity === "error") fatal = true;
  }
  if (fatal) process.exit(1);
}

const c = out.contracts["TaskPing.sol"]["TaskPing"];
const rawVersion = solc.version(); // e.g. 0.8.35+commit.xxxxxxxx.Emscripten.clang
const shortVersion = "v" + rawVersion.replace(/\.Emscripten.*$/, "");

const build = {
  contractName: "TaskPing",
  compilerVersion: shortVersion,
  evmVersion: "paris",
  optimizer: { enabled: true, runs: 200 },
  abi: c.abi,
  bytecode: "0x" + c.evm.bytecode.object,
  source,
};

fs.writeFileSync(path.join(__dirname, "../lib/taskping_build.json"), JSON.stringify(build, null, 2));
console.log("compiler:", shortVersion);
console.log("bytecode length:", build.bytecode.length);
console.log("abi entries:", c.abi.length);
console.log("→ lib/taskping_build.json");
