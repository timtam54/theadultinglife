// Turn a document + (optional) person into a title that browsers use as
// the default filename when the user picks "Save as PDF". Chrome derives
// the download name from <title>, then strips characters that would be
// invalid on disk. Keep the output short, ASCII-friendly, and pipe-free
// so the resulting *.pdf name is descriptive.

function sanitize(s: string): string {
  return (
    s
      .replace(/[\\/:*?"<>|·—]+/g, " ") // strip path-hostile chars + our fancy separators
      .replace(/\s+/g, " ")
      .trim()
  );
}

// e.g. printFilename("Employee Information Form", "Tim HAMS")
//   → "Employee Information Form - Tim HAMS"
// Chrome then saves it as "Employee Information Form - Tim HAMS.pdf".
export function printFilename(
  document: string,
  person?: string | null
): string {
  const doc = sanitize(document);
  const name = person ? sanitize(person) : "";
  if (!doc && !name) return "The Adulting Life";
  if (!name) return doc;
  return `${doc} - ${name}`;
}
