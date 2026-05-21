type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | Array<ClassValue>;

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flatMap((input): string[] => {
      if (!input) {
        return [];
      }

      if (Array.isArray(input)) {
        return [cn(...input)];
      }

      return [String(input)];
    })
    .filter(Boolean)
    .join(" ");
}
