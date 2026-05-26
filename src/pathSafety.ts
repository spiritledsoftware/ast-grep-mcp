import fs from "node:fs";
import path from "node:path";

function isInsideOrEqual(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function resolveWorkspaceRoot(
  workspaceRoot: string | undefined,
  cwd = process.cwd(),
): string {
  const resolvedCwd = path.resolve(cwd);
  const resolvedRoot = workspaceRoot ? path.resolve(resolvedCwd, workspaceRoot) : resolvedCwd;

  if (!isInsideOrEqual(resolvedRoot, resolvedCwd)) {
    throw new Error(
      `Workspace root must not resolve outside the current working directory: ${workspaceRoot}`,
    );
  }

  return resolvedRoot;
}

export function safeRelativePaths(paths: string[] | undefined, workspaceRoot: string): string[] {
  if (!paths || paths.length === 0) {
    return ["."];
  }

  const root = path.resolve(workspaceRoot);

  return paths.map((inputPath) => {
    if (inputPath.length === 0) {
      throw new Error("Path entries must not be empty");
    }

    if (path.isAbsolute(inputPath)) {
      throw new Error(`Path must be relative, not absolute: ${inputPath}`);
    }

    const resolvedPath = path.resolve(root, inputPath);
    if (!isInsideOrEqual(resolvedPath, root)) {
      throw new Error(`Path must not resolve outside the workspace: ${inputPath}`);
    }

    const relativePath = path.relative(root, resolvedPath) || ".";
    assertNoSymlinkEscape(relativePath, root);
    return relativePath;
  });
}

export function safeRelativePath(inputPath: string, workspaceRoot: string): string {
  return safeRelativePaths([inputPath], workspaceRoot)[0];
}

export function assertNoSymlinkEscape(relativePath: string, workspaceRoot: string): void {
  const resolvedRoot = path.resolve(workspaceRoot);
  if (!fs.existsSync(resolvedRoot)) {
    return;
  }

  const root = fs.realpathSync.native(resolvedRoot);
  const segments = relativePath.split(/[\\/]+/).filter(Boolean);
  let current = root;

  for (const segment of segments) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      return;
    }

    const real = fs.realpathSync.native(current);
    if (!isInsideOrEqual(real, root)) {
      throw new Error(
        `Path must not resolve outside the workspace through symlinks: ${relativePath}`,
      );
    }
  }
}
