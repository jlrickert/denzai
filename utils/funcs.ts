// deno-lint-ignore-file ban-types

import type { Json } from "./mod.ts";

export type AnyFn = (...args: Array<any>) => any;

/**
 * A utility function that allows for dual arity handling of functions.
 * It enables a function to be called with a varying number of arguments,
 * either directly or in a curried form, based on the provided arity.
 *
 * @param arity - The number of parameters the function expects.
 * @param body - The function to be executed based on the arity.
 * @returns A new function that can be called with the specified arity
 *          or in a curried form.
 */
export const dual: {
	<DataLast extends AnyFn, DataFirst extends AnyFn>(
		arity: Parameters<DataFirst>["length"],
		body: DataFirst,
	): DataLast & DataFirst;
	<DataLast extends AnyFn, DataFirst extends AnyFn>(
		isDataFirst: (args: IArguments) => boolean,
		body: DataFirst,
	): DataLast & DataFirst;
} = function (arity, body) {
	if (typeof arity === "function") {
		return function () {
			if (arity(arguments)) {
				// @ts-expect-error arguments is not typed well
				return body.apply(this, arguments);
			}
			return ((self: any) => body(self, ...arguments)) as any;
		};
	}

	switch (arity) {
		case 0:
		case 1:
			throw new RangeError(`Invalid arity ${arity}`);

		case 2:
			return function (a, b) {
				if (arguments.length >= 2) {
					return body(a, b);
				}
				return function (self: any) {
					return body(self, a);
				};
			};

		case 3:
			return function (a, b, c) {
				if (arguments.length >= 3) {
					return body(a, b, c);
				}
				return function (self: any) {
					return body(self, a, b);
				};
			};

		case 4:
			return function (a, b, c, d) {
				if (arguments.length >= 4) {
					return body(a, b, c, d);
				}
				return function (self: any) {
					return body(self, a, b, c);
				};
			};

		case 5:
			return function (a, b, c, d, e) {
				if (arguments.length >= 5) {
					return body(a, b, c, d, e);
				}
				return function (self: any) {
					return body(self, a, b, c, d);
				};
			};

		default:
			return function () {
				if (arguments.length >= arity) {
					// @ts-expect-error ???
					return body.apply(this, arguments);
				}
				const args = arguments;
				return function (self: any) {
					return body(self, ...args);
				};
			};
	}
};

export function absurd<A>(_: never): A {
	throw new Error("Called `absurd` function which should be uncallable");
}

export const hole: <T>() => T = absurd as any;

export const pipe: {
	<A>(a: A): A;
	<A, B>(a: A, ab: (a: A) => B): B;
	<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
	<A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;
	<A, B, C, D, E>(
		a: A,
		ab: (a: A) => B,
		bc: (b: B) => C,
		cd: (c: C) => D,
		de: (d: D) => E,
	): E;
	<A, B, C, D, E, F>(
		a: A,
		ab: (a: A) => B,
		bc: (b: B) => C,
		cd: (c: C) => D,
		de: (d: D) => E,
		ef: (e: E) => F,
	): F;
	<A, B, C, D, E, F, G>(
		a: A,
		ab: (a: A) => B,
		bc: (b: B) => C,
		cd: (c: C) => D,
		de: (d: D) => E,
		ef: (e: E) => F,
		fg: (f: F) => G,
	): G;
	<A, B, C, D, E, F, G, H>(
		a: A,
		ab: (a: A) => B,
		bc: (b: B) => C,
		cd: (c: C) => D,
		de: (d: D) => E,
		ef: (e: E) => F,
		fg: (f: F) => G,
		gh: (g: G) => H,
	): H;
	<A, B, C, D, E, F, G, H, I>(
		a: A,
		ab: (a: A) => B,
		bc: (b: B) => C,
		cd: (c: C) => D,
		de: (d: D) => E,
		ef: (e: E) => F,
		fg: (f: F) => G,
		gh: (g: G) => H,
		hi: (h: H) => I,
	): I;
} = function (
	a: unknown,
	ab?: Function,
	bc?: Function,
	cd?: Function,
	de?: Function,
	ef?: Function,
	fg?: Function,
	gh?: Function,
	hi?: Function,
): unknown {
	switch (arguments.length) {
		case 1:
			return a;
		case 2:
			return ab!(a);
		case 3:
			return bc!(ab!(a));
		case 4:
			return cd!(bc!(ab!(a)));
		case 5:
			return de!(cd!(bc!(ab!(a))));
		case 6:
			return ef!(de!(cd!(bc!(ab!(a)))));
		case 7:
			return fg!(ef!(de!(cd!(bc!(ab!(a))))));
		case 8:
			return gh!(fg!(ef!(de!(cd!(bc!(ab!(a)))))));
		case 9:
			return hi!(gh!(fg!(ef!(de!(cd!(bc!(ab!(a))))))));
		default: {
			let ret = arguments[0];
			for (let i = 1; i < arguments.length; i++) {
				ret = arguments[i](ret);
			}
			return ret;
		}
	}
};

// export function pipe<A>(a: A): A;
// export function pipe<A, B>(a: A, ab: (a: A) => B): B;
// export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
// export function pipe<A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;
// export function pipe<A, B, C, D, E>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// ): E;
// export function pipe<A, B, C, D, E, F>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// ): F;
// export function pipe<A, B, C, D, E, F, G>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// ): G;
// export function pipe<A, B, C, D, E, F, G, H>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// ): H;
// export function pipe<A, B, C, D, E, F, G, H, I>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// ): I;
// export function pipe<A, B, C, D, E, F, G, H, I, J>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// ): J;
// export function pipe<A, B, C, D, E, F, G, H, I, J, K>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// ): K;
// export function pipe<A, B, C, D, E, F, G, H, I, J, K, L>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// 	kl: (k: K) => L,
// ): L;
// export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// 	kl: (k: K) => L,
// 	lm: (l: L) => M,
// ): M;
// export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// 	kl: (k: K) => L,
// 	lm: (l: L) => M,
// 	mn: (m: M) => N,
// ): N;
// export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// 	kl: (k: K) => L,
// 	lm: (l: L) => M,
// 	mn: (m: M) => N,
// 	no: (n: N) => O,
// ): O;
//
// export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// 	kl: (k: K) => L,
// 	lm: (l: L) => M,
// 	mn: (m: M) => N,
// 	no: (n: N) => O,
// 	op: (o: O) => P,
// ): P;
//
// export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// 	kl: (k: K) => L,
// 	lm: (l: L) => M,
// 	mn: (m: M) => N,
// 	no: (n: N) => O,
// 	op: (o: O) => P,
// 	pq: (p: P) => Q,
// ): Q;
//
// export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// 	kl: (k: K) => L,
// 	lm: (l: L) => M,
// 	mn: (m: M) => N,
// 	no: (n: N) => O,
// 	op: (o: O) => P,
// 	pq: (p: P) => Q,
// 	qr: (q: Q) => R,
// ): R;
//
// export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// 	kl: (k: K) => L,
// 	lm: (l: L) => M,
// 	mn: (m: M) => N,
// 	no: (n: N) => O,
// 	op: (o: O) => P,
// 	pq: (p: P) => Q,
// 	qr: (q: Q) => R,
// 	rs: (r: R) => S,
// ): S;
//
// export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
// 	a: A,
// 	ab: (a: A) => B,
// 	bc: (b: B) => C,
// 	cd: (c: C) => D,
// 	de: (d: D) => E,
// 	ef: (e: E) => F,
// 	fg: (f: F) => G,
// 	gh: (g: G) => H,
// 	hi: (h: H) => I,
// 	ij: (i: I) => J,
// 	jk: (j: J) => K,
// 	kl: (k: K) => L,
// 	lm: (l: L) => M,
// 	mn: (m: M) => N,
// 	no: (n: N) => O,
// 	op: (o: O) => P,
// 	pq: (p: P) => Q,
// 	qr: (q: Q) => R,
// 	rs: (r: R) => S,
// 	st: (s: S) => T,
// ): T;
// export function pipe(
// 	a: unknown,
// 	ab?: Function,
// 	bc?: Function,
// 	cd?: Function,
// 	de?: Function,
// 	ef?: Function,
// 	fg?: Function,
// 	gh?: Function,
// 	hi?: Function,
// ): unknown {
// 	switch (arguments.length) {
// 		case 1:
// 			return a;
// 		case 2:
// 			return ab!(a);
// 		case 3:
// 			return bc!(ab!(a));
// 		case 4:
// 			return cd!(bc!(ab!(a)));
// 		case 5:
// 			return de!(cd!(bc!(ab!(a))));
// 		case 6:
// 			return ef!(de!(cd!(bc!(ab!(a)))));
// 		case 7:
// 			return fg!(ef!(de!(cd!(bc!(ab!(a))))));
// 		case 8:
// 			return gh!(fg!(ef!(de!(cd!(bc!(ab!(a)))))));
// 		case 9:
// 			return hi!(gh!(fg!(ef!(de!(cd!(bc!(ab!(a))))))));
// 		default: {
// 			let ret = arguments[0];
// 			for (let i = 1; i < arguments.length; i++) {
// 				ret = arguments[i](ret);
// 			}
// 			return ret;
// 		}
// 	}
// }
//
export function deepCopy<T>(obj: T): T {
	// Handle the 3 simple types, and null or undefined
	if (
		obj === null ||
		obj === undefined ||
		typeof obj === "string" ||
		typeof obj === "number" ||
		typeof obj === "boolean"
	) {
		return obj;
	}

	// Handle Array
	if (Array.isArray(obj)) {
		const copy: any[] = [];
		for (let i = 0, len = obj.length; i < len; i++) {
			copy[i] = deepCopy(obj[i]);
		}
		return copy as T;
	}

	// Handle Date
	if (obj instanceof Date) {
		const copy = new Date();
		copy.setTime(obj.getTime());
		return copy as T;
	}

	// Handle Object
	if (obj instanceof Object) {
		const copy: Json.JsonObject = {};
		for (const attr in obj) {
			if (Object.hasOwn(obj, attr)) {
				copy[attr] = deepCopy((obj as any)[attr]);
			}
		}
		return copy as T;
	}

	throw new Error("Unable to copy obj! Its type isn't supported.");
}

/**
 * Picks specific properties from an object based on the provided keys.
 *
 * @param obj - The object to pick properties from.
 * @param keys - The keys of the properties to pick.
 * @returns An object containing only the picked properties.
 */
export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
	const result: Partial<T> = {};
	for (const key of keys) {
		if (key in (obj as any)) {
			result[key] = obj[key];
		}
	}
	return result as Pick<T, K>;
}

/**
 * Creates a new object by omitting the specified keys from the given
 * object. The resulting object retains only the properties that are
 * not excluded.
 *
 * @param {T} obj - The object from which to omit properties.
 * @param {K[]} keys - The keys of properties to omit from the object.
 * @returns {Omit<T, K>} A new object containing all properties of
 * the original object except those specified by the keys.
 */
export function omit<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
	const result = {} as Omit<T, K>;
	for (const key in obj) {
		// @ts-expect-error this works
		if (!keys.includes(key as K)) {
			// @ts-expect-error this works
			result[key as keyof T] = obj[key];
		}
	}
	return result;
}
