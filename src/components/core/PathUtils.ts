export function makeDirUrl(path: string, directoryId?: string | null): string {
    // In single directory mode, ignore directoryId and just return the path
    return path.startsWith('/') ? path : '/' + path;
  }