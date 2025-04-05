import { invariant } from "./errors.ts";

export type EmptyObject = Record<string | number | symbol, never>;

export type Stringer =
	| string
	| Date
	| number
	| {
		stringify: () => string;
	};

export interface Refinement<A, B extends A> {
	(a: A): a is B;
}

export interface Predicate<A> {
	(a: A): boolean;
}

export function stringify(value: Stringer): string {
	if (typeof value === "string") {
		return value;
	} else if (typeof value === "number") {
		return String(value);
	} else if (value instanceof Date) {
		const s = value.toISOString().split(".")[0];
		invariant(s !== undefined, "");
		return s.replace("T", " ") + "Z";
	}

	return value.stringify();
}
