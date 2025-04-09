export function makeDirUrl(path: string, directoryId: string | null): string {
    if (!directoryId) return path;
    return `/${directoryId}${path.startsWith('/') ? path : '/' + path}`;
  }