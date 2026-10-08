/** An export file as returned by the API (base64 so it can travel inside JSON). */
export interface ExportFile {
  filename: string;
  mimeType: string;
  base64: string;
}

/** Turns the API's base64 file into a real download in the browser. */
export function downloadFile(file: ExportFile) {
  const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: file.mimeType.split(';')[0] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
