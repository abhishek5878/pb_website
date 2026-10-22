/* js-yaml 4 ships no types; the two calls /tend makes. */
declare module 'js-yaml' {
  export function dump(obj: unknown, opts?: { lineWidth?: number; noRefs?: boolean }): string;
  export function load(text: string): unknown;
  const yaml: { dump: typeof dump; load: typeof load };
  export default yaml;
}
