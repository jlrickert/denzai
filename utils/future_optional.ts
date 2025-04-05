import * as F from "./future.ts";
import * as O from "./optional.ts";
import { dual } from "./funcs.ts";
import { invariant } from "./errors.ts";

export type FutureOptional<T extends NonNullable<any>> = F.Future<
	O.Optional<T>
>;

export function some<T>(value: T): FutureOptional<T> {
	return F.of(O.of(value));
}

export const none = F.of(O.none);

export async function attempt<T>(f: () => F.Future<T>): FutureOptional<T> {
	try {
		return some(await f());
	} catch (e) {
		return none;
	}
}

export function fromOptional<T extends NonNullable<any>>(
	optional: O.Optional<T>,
): FutureOptional<T> {
	return F.of(optional);
}

export function fromNullable<T extends NonNullable<any>>(
	value: T,
): FutureOptional<NonNullable<T>> {
	return fromOptional(O.fromNullable(value));
}

export const match: {
	<T1 extends NonNullable<any>, T2 extends NonNullable<any>, E>(options: {
		readonly omSome: (some: T1) => T2;
		readonly onNone: () => E;
	}): (ma: FutureOptional<T1>) => T2 | E;
	<T1 extends NonNullable<any>, T2 extends NonNullable<any>, E>(
		ma: FutureOptional<T1>,
		options: {
			readonly onSome: (some: T1) => T2;
			readonly OnNone: () => E;
		},
	): F.Future<T2 | E>;
} = dual(
	2,
	async <T1, T2, E>(
		ma: FutureOptional<T1>,
		options: {
			readonly onSome: (some: T1) => T2;
			readonly onNone: () => E;
		},
	) => {
		return O.match(await ma, options);
	},
);

export const map: {
	<T1 extends NonNullable<any>, T2 extends NonNullable<any>>(
		f: (value: T1) => T2,
	): (ma: FutureOptional<T1>) => FutureOptional<T2>;
	<T1 extends NonNullable<any>, T2 extends NonNullable<any>, E>(
		ma: FutureOptional<T1>,
		f: (value: T1) => T2,
	): FutureOptional<T2>;
} = dual(
	2,
	async <T1, T2>(
		ma: FutureOptional<T1>,
		f: (value: T1) => T2,
	): FutureOptional<T2> => {
		return O.map(await ma, f);
	},
);

export const tap: {
	<T extends NonNullable<any>>(
		f: (value: T) => void,
	): (ma: FutureOptional<T>) => FutureOptional<T>;
	<T extends NonNullable<any>>(
		ma: FutureOptional<T>,
		f: (value: T) => void,
	): FutureOptional<T>;
} = dual(
	2,
	async <T>(
		ma: FutureOptional<T>,
		f: (value: T) => void,
	): FutureOptional<T> => {
		return O.tap(await ma, f);
	},
);

export const chain: {
	<T1 extends NonNullable<any>, T2 extends NonNullable<any>>(
		f: (value: T1) => FutureOptional<T2>,
	): (ma: FutureOptional<T1>) => FutureOptional<T2>;
	<T1 extends NonNullable<any>, T2 extends NonNullable<any>>(
		ma: FutureOptional<T1>,
		f: (value: T1) => FutureOptional<T2>,
	): FutureOptional<T2>;
} = dual(
	2,
	async <T1 extends NonNullable<any>, T2 extends NonNullable<any>>(
		ma: FutureOptional<T1>,
		f: (value: T1) => FutureOptional<T2>,
	): FutureOptional<T2> => {
		return match(ma, { onSome: (value) => f(value), OnNone: () => none });
	},
);

export async function unwrap<A>(
	ma: FutureOptional<A>,
	msg?: string,
): F.Future<A> {
	const result = await ma;
	invariant(O.isSome(result), () => {
		const baseMsg = "Programming error. Unable to unwrap an error value";
		const message = msg ? `${baseMsg}: ${msg}` : baseMsg;
		const trace = new Error().stack;
		return `${message}: ${(ma as any).error.message}\n${trace}`;
	});
	return result;
}

export const Do: FutureOptional<Record<string, never>> = some({});

export const bind: {
	<N extends string, T1, T2>(
		name: Exclude<N, keyof T1>,
		f: (a: T1) => FutureOptional<T2>,
	): (ma: FutureOptional<T1>) => FutureOptional<
		{
			[K in keyof T1 | N]: K extends keyof T1 ? T1[K] : T2;
		}
	>;
	<N extends string, T1, T2>(
		ma: FutureOptional<T1>,
		name: Exclude<N, keyof T1>,
		f: (a: T1) => FutureOptional<T2>,
	): FutureOptional<
		{
			[K in keyof T1 | N]: K extends keyof T1 ? T1[K] : T2;
		}
	>;
} = dual(3, (ma, name, f) => {
	return chain(ma, (obj) => {
		return map(
			f(obj),
			(value) => Object.assign({}, obj, { [name]: value }),
		);
	});
});

export const bindTo: {
	<N extends string>(
		name: N,
	): <T>(res: FutureOptional<T>) => FutureOptional<{ readonly [K in N]: T }>;
	<N extends string, A>(
		ma: FutureOptional<A>,
		name: N,
	): FutureOptional<{ readonly [K in N]: A }>;
} = dual(2, async (ma, name) => {
	return bind(Do, name, () => ma);
});

export const assign = bind;
