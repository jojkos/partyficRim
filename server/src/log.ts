export function log(scope: string, msg: string, ...rest: unknown[]): void {
  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  if (rest.length === 0) console.log(`[${ts}] [${scope}] ${msg}`);
  else console.log(`[${ts}] [${scope}] ${msg}`, ...rest);
}
