import * as F from "./future.ts";
import * as R from "./result.ts";
import * as O from "./optional.ts";
import { dual } from "./funcs.ts";
import { invariant } from "./errors.ts";
import { type Future, Result } from "./mod.ts";
import type { Predicate } from "./traits.ts";

export type FutureResult<T, E> = F.Future<R.Result<T, E>>;

export function ok<T>(value: T): FutureResult<T, never> {
	return F.of(R.of(value));
}

export function err<E>(error: E): FutureResult<never, E> {
	return F.of(R.err(error));
}

export const tryCatch: {
	<E>(
		onErr: (e: unknown) => E,
	): <T>(f: () => F.Future<T>) => FutureResult<T, E>;
	<T, E>(
		f: () => F.Future<T>,
		onError: (e: unknown) => E,
	): FutureResult<T, E>;
} = dual(
	2,
	async <T, E>(
		f: () => F.Future<T>,
		onErr: (e: unknown) => E,
	): FutureResult<T, E> => {
		try {
			return ok(await f());
		} catch (e) {
			return err(onErr(e));
		}
	},
);

export const fromOptional: {
	<T extends NonNullable<any>, E>(
		onErr: () => E,
	): (value: O.Optional<T>) => FutureResult<T, E>;
	<T extends NonNullable<any>, E>(
		value: O.Optional<T>,
		onErr: () => E,
	): FutureResult<T, E>;
} = dual(2, <T, E>(value: O.Optional<T>, onErr: () => E) => {
	if (O.isSome(value)) {
		return ok(value);
	}
	return err(onErr());
});

export const fromNullable: {
	<T extends NonNullable<any>, E>(
		onErr: () => E,
	): (value: T) => FutureResult<T, E>;
	<T extends NonNullable<any>, E>(
		value: T,
		onErr: () => E,
	): FutureResult<T, E>;
} = dual(2, <T, E>(value: T, onErr: () => E): FutureResult<T, E> => {
	return fromOptional(O.fromNullable(value), () => onErr());
});

export const filter: {
	<A, E2>(
		pred: Predicate<A>,
		onErr: () => E2,
	): <E1>(ma: FutureResult<A, E1>) => FutureResult<A, E1 | E2>;
	<A, E1, E2>(
		ma: FutureResult<A, E1>,
		pred: Predicate<A>,
		onErr: () => E2,
	): FutureResult<A, E1 | E2>;
} = dual(
	3,
	async <A, E1, E2>(
		ma: FutureResult<A, E1>,
		pred: Predicate<A>,
		onErr: () => E2,
	): FutureResult<A, E1 | E2> => {
		const res = await ma;
		if (res.success && pred(res.value)) {
			return Result.ok(res.value);
		}
		return Result.err(onErr());
	},
);

export const match: {
	<T1, E1, E2, T2>(options: {
		readonly onOk: (ok: T1) => T2;
		readonly onErr: (err: E1) => E2;
	}): (ma: FutureResult<T1, E1>) => Future.Future<T2 | E2>;
	<T1, E1, E2, T2>(
		ma: FutureResult<T1, E1>,
		options: {
			readonly onOk: (ok: T1) => T2;
			readonly onErr: (err: E1) => E2;
		},
	): Future.Future<T2 | E2>;
} = dual(
	2,
	async <T1, E1, T2, E2>(
		ma: FutureResult<T1, E1>,
		options: {
			readonly onOk: (ok: T1) => T2;
			readonly onErr: (err: E1) => E2;
		},
	) => {
		const result = await ma;
		if (R.isOk(result)) {
			return options.onOk(result.value);
		}
		return options.onErr(result.error);
	},
);

export const map: {
	<T1, T2>(
		f: (value: T1) => T2,
	): <E>(ma: FutureResult<T1, E>) => FutureResult<T2, E>;
	<T1, T2, E>(
		ma: FutureResult<T1, E>,
		f: (value: T1) => T2,
	): FutureResult<T2, E>;
} = dual(
	2,
	async <T1, E, T2>(
		ma: FutureResult<T1, E>,
		f: (value: T1) => T2,
	): FutureResult<T2, E> => {
		const result = await ma;
		if (R.isOk(result)) {
			return ok(f(result.value));
		}
		return ma as any;
	},
);

export const tap: {
	<T>(
		f: (value: T) => void,
	): <E>(ma: FutureResult<T, E>) => FutureResult<T, E>;
	<T, E>(ma: FutureResult<T, E>, f: (value: T) => void): FutureResult<T, E>;
} = dual(
	2,
	async <T, E>(
		ma: FutureResult<T, E>,
		f: (value: T) => void,
	): FutureResult<T, E> => {
		const result = await ma;
		if (R.isOk(result)) {
			f(result.value);
		}
		return ma;
	},
);

export const tapError: {
	<E>(
		f: (error: E) => void,
	): <T>(ma: FutureResult<T, E>) => FutureResult<T, E>;
	<T, E>(ma: FutureResult<T, E>, f: (error: E) => void): FutureResult<T, E>;
} = dual(
	2,
	async <T, E>(
		ma: FutureResult<T, E>,
		f: (error: E) => void,
	): FutureResult<T, E> => {
		const result = await ma;
		if (R.isErr(result)) {
			f(result.error);
		}
		return ma;
	},
);

export const chain: {
	<T1, T2, E2>(
		f: (value: T1) => FutureResult<T2, E2>,
	): <E1>(ma: FutureResult<T1, E1>) => FutureResult<T2, E1 | E2>;
	<T1, T2, E1, E2>(
		ma: FutureResult<T1, E1>,
		f: (value: T1) => FutureResult<T2, E2>,
	): FutureResult<T2, E1 | E2>;
} = dual(
	2,
	async <T1, T2, E1, E2>(
		ma: FutureResult<T1, E1>,
		f: (value: T1) => FutureResult<T2, E2>,
	): FutureResult<T2, E1 | E2> => {
		return match(ma, { onOk: (value) => f(value), onErr: (a) => err(a) });
	},
);

export const alt: {
	<T1, T2, E2>(
		f: () => FutureResult<T2, E2>,
	): <E1>(ma: FutureResult<T1, E1>) => FutureResult<T1 | T2, E2>;
	<T1, T2, E1, E2>(
		ma: FutureResult<T1, E1>,
		f: () => FutureResult<T2, E2>,
	): FutureResult<T1 | T2, E2>;
} = dual(
	2,
	async <T1, T2, E1, E2>(
		ma: FutureResult<T1, E1>,
		f: () => FutureResult<T2, E2>,
	): FutureResult<T1 | T2, E2> => {
		return match(ma, { onOk: (value) => ok(value), onErr: () => f() });
	},
);

export const unwrap = async <A>(
	ma: FutureResult<A, any>,
	msg?: string,
): F.Future<A> => {
	const result = await ma;
	invariant(R.isOk(result), () => {
		const baseMsg = "Programming error. Unable to unwrap an error value";
		const message = msg ? `${baseMsg}: ${msg}` : baseMsg;
		const trace = new Error().stack;
		return `${message}: ${(ma as any).error.message}\n${trace}`;
	});
	return result.value;
};

export const Do: FutureResult<Record<string, never>, never> = ok({});

export const bind: {
	<N extends string, T1, T2, E2>(
		name: Exclude<N, keyof T1>,
		f: (a: T1) => FutureResult<T2, E2>,
	): <E1>(ma: FutureResult<T1, E1>) => FutureResult<
		{
			[K in keyof T1 | N]: K extends keyof T1 ? T1[K] : T2;
		},
		E1 | E2
	>;
	<N extends string, T1, T2, E1, E2>(
		ma: FutureResult<T1, E1>,
		name: Exclude<N, keyof T1>,
		f: (a: T1) => FutureResult<T2, E2>,
	): FutureResult<
		{
			[K in keyof T1 | N]: K extends keyof T1 ? T1[K] : T2;
		},
		E1 | E2
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
	): <T, E>(
		res: FutureResult<T, E>,
	) => FutureResult<{ readonly [K in N]: T }, E>;
	<N extends string, A, E>(
		ma: FutureResult<A, E>,
		name: N,
	): FutureResult<{ readonly [K in N]: A }, E>;
} = dual(2, async (ma, name) => {
	return bind(Do, name, () => ma);
});

export const assign = bind;
