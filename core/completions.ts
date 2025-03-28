import { CompArgs } from "./types.ts";

function getWordNumber(paragraph: string, charPosition: number): number | null {
	// Ensure the charPosition is within bounds
	if (charPosition < 1 || charPosition > paragraph.length) {
		return null; // Return null if the position is out of bounds
	}

	// Split the paragraph into words
	const words = paragraph.split(/\s+/);

	// Initialize character count to zero
	let currentCharCount = 0;

	// Loop through each word and count the characters
	for (let i = 0; i < words.length; i++) {
		currentCharCount += words[i]!.length + 1;

		// Check if the character position falls within the current word
		if (currentCharCount >= charPosition) {
			return i + 1; // Return the word number (1-based index)
		}
	}

	return null; // If charPosition is beyond the last word
}

export type MakeCompArgs = {
	line: string;
	point?: number;
};
/**
 * Creates a CompArgs object from the provided command line input.
 */
export function makeCompArgs({ line, point }: MakeCompArgs): CompArgs {
	const p = point ?? line.length;

	const args = line.split(/\s+/).map((a) => a.trim());
	return {
		line,
		point: p,
		cword: getWordNumber(line, p) ?? args.length,
		args,
	};
}
