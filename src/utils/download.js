// The browser's download of bytes it holds: a link to a Blob, clicked. Shared by the Export
// button and the download_gpx agent tool, so both save the file the same way.
export function download(name, bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/gpx+xml" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next task: some browsers cancel a download whose URL is revoked at once.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
