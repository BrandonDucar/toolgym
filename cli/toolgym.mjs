#!/usr/bin/env node

import { readFile } from "node:fs/promises";

function flags(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith("--")) continue;
    result[value.slice(2)] = args[index + 1];
    index += 1;
  }
  return result;
}

function usage() {
  console.log(`ToolGym CLI

Commands:
  exercises --url URL
  dashboard --url URL --key API_KEY
  submit --url URL --key API_KEY --agent ID --exercise ID --file answer.json
`);
}

async function request(url, path, options = {}) {
  const response = await fetch(new URL(path, url), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data;
}

const [command, ...rest] = process.argv.slice(2);
const options = flags(rest);

if (!command || !options.url) {
  usage();
  process.exitCode = 1;
} else {
  try {
    if (command === "exercises") {
      console.log(JSON.stringify(await request(options.url, "/api/exercises"), null, 2));
    } else if (command === "dashboard") {
      if (!options.key) throw new Error("--key is required");
      console.log(JSON.stringify(await request(options.url, "/api/dashboard", {
        headers: { authorization: `Bearer ${options.key}` },
      }), null, 2));
    } else if (command === "submit") {
      for (const required of ["key", "agent", "exercise", "file"]) {
        if (!options[required]) throw new Error(`--${required} is required`);
      }
      const response = JSON.parse(await readFile(options.file, "utf8"));
      console.log(JSON.stringify(await request(options.url, "/api/attempts", {
        method: "POST",
        headers: { authorization: `Bearer ${options.key}`, "content-type": "application/json" },
        body: JSON.stringify({ agentId: options.agent, exerciseId: options.exercise, response }),
      }), null, 2));
    } else {
      usage();
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
