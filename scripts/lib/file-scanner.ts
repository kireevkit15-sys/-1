import * as fs from 'fs';
import * as path from 'path';

export interface SourceFile {
  filePath: string;      // absolute path
  relativePath: string;  // relative to inputDir
  format: 'pdf' | 'txt' | 'fb2';
  fileName: string;      // without extension
  dirName: string;       // parent directory name
  sourceName: string;    // derived: "dirName/fileName" e.g. "markaryan/lecture-01"
  fileSize: number;
}

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.txt', '.fb2']);
const MIN_FILE_SIZE = 100;

/**
 * Extracts "blogger/filename" style source name from path relative to baseDir.
 *
 * Example:
 *   content/sources/bloggers/markaryan/raw/lecture-01.txt → "markaryan/lecture-01"
 */
export function deriveSourceName(filePath: string, baseDir: string): string {
  const absolute = path.resolve(filePath);
  const base = path.resolve(baseDir);
  const relative = path.relative(base, absolute);
  const parts = relative.split(path.sep);

  const fileName = path.parse(parts[parts.length - 1]).name;

  if (parts.length >= 2) {
    // Skip top-level category folders (like "bloggers"), take the next one
    let dirIndex: number;
    if (parts.length === 2) {
      dirIndex = 0;
    } else {
      dirIndex = parts.length >= 3 ? 1 : 0;
    }
    const dirName = parts[dirIndex];
    return `${dirName}/${fileName}`;
  }

  return fileName;
}

/**
 * Recursively scans inputDir for .pdf and .txt files.
 *
 * - Skips hidden files (starting with .)
 * - Skips .gitkeep files
 * - Skips files smaller than 100 bytes
 * - Sorts: directories alphabetically, then files alphabetically
 */
export async function scanForFiles(
  inputDir: string,
  options: { verbose?: boolean } = {},
): Promise<SourceFile[]> {
  const absoluteInputDir = path.resolve(inputDir);

  if (!fs.existsSync(absoluteInputDir)) {
    throw new Error(`Input directory does not exist: ${absoluteInputDir}`);
  }

  const results: SourceFile[] = [];

  scanDirectory(absoluteInputDir, absoluteInputDir, results);

  // Sort: group by directory (alphabetically), then by filename alphabetically
  results.sort((a, b) => {
    const dirCmp = a.dirName.localeCompare(b.dirName);
    if (dirCmp !== 0) return dirCmp;
    return a.fileName.localeCompare(b.fileName);
  });

  if (options.verbose) {
    console.log(`[file-scanner] Found ${results.length} file(s) in ${absoluteInputDir}`);
  }

  return results;
}

function scanDirectory(
  currentDir: string,
  baseDir: string,
  results: SourceFile[],
): void {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const files = entries
    .filter((e) => e.isFile())
    .sort((a, b) => a.name.localeCompare(b.name));

  // Recurse into directories first
  for (const dir of dirs) {
    scanDirectory(path.join(currentDir, dir.name), baseDir, results);
  }

  // Process files
  for (const file of files) {
    const { name } = file;

    // Skip hidden files and .gitkeep
    if (name.startsWith('.') || name === '.gitkeep') {
      continue;
    }

    const ext = path.extname(name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      continue;
    }

    const filePath = path.join(currentDir, name);
    const stat = fs.statSync(filePath);

    // Skip files smaller than minimum size
    if (stat.size < MIN_FILE_SIZE) {
      continue;
    }

    const format = ext.slice(1) as 'pdf' | 'txt' | 'fb2';
    const fileName = path.parse(name).name;
    const dirName = path.basename(currentDir);
    const relativePath = path.relative(baseDir, filePath);
    const sourceName = deriveSourceName(filePath, baseDir);

    results.push({
      filePath,
      relativePath,
      format,
      fileName,
      dirName,
      sourceName,
      fileSize: stat.size,
    });
  }
}
