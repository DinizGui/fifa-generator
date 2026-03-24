import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getProjectRoot() {
  const fromConfig = __dirname;
  if (fs.existsSync(path.join(fromConfig, "node_modules", "tailwindcss"))) {
    return fromConfig;
  }
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "node_modules", "tailwindcss"))) {
    return cwd;
  }
  return fromConfig;
}

const projectRoot = getProjectRoot();

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,

  turbopack: {
    root: projectRoot,
    resolveAlias: {
      tailwindcss: path.join(projectRoot, "node_modules", "tailwindcss"),
      "tw-animate-css": path.join(projectRoot, "node_modules", "tw-animate-css"),
      shadcn: path.join(projectRoot, "node_modules", "shadcn"),
    },
  },
};

export default nextConfig;
