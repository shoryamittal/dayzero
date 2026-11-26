// Keep progress, coaching and exports consistent about incomplete content.
// An honest statement that a test has not happened is content; an edit prompt is not.
export function hasDraftContent(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && !/\[\s*(?:ADD\s+(?:DATA|EVIDENCE|SOURCE|FACTS?)|TODO|TBD)\b/i.test(text) &&
    !/^(?:TBD|TODO|\[?not provided\]?)\s*[.!]?$/i.test(text);
}
