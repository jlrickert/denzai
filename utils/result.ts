import { dual } from "./funcs.ts";
import * as O from "./optional.ts";
import { invariant } from "./errors.ts";
import type { EmptyObject, Predicate, Refinement } from "./traits.ts";
import type { Result } from "./mod.ts";

export interface Ok<out T, out _E> {
	success: true;
	value: T;
}
export interface Err<out _T, out E> {
	success: false;
	error: E;
}

export type Result<T, E> = Ok<T, E> | Err<T, E>;

export function ok<T>(value: T): Result<T, never> {
	return { success: true, value };
}

export function err<E>(error: E): Result<never, E> {
	return { success: false, error };
}

export function isOk<T, E>(res: Result<T, E>): res is Ok<T, E> {
	if (res !== null && typeof res === "object" && "success" in res) {
		return res.success === true;
	}
	return false;
}

export function isErr<T, E>(res: unknown): res is Err<T, E> {
	if (res !== null && typeof res === "object" && "success" in res) {
		return res.success === false;
	}
	return false;
}

export const fromOptional: {
	<T extends NonNullable<any>, E>(
		onErr: () => E,
	): (value: O.Optional<T>) => Result<T, E>;
	<T extends NonNullable<any>, E>(
		value: O.Optional<T>,
		onErr: () => E,
	): Result<T, E>;
} = dual(2, <T, E>(value: O.Optional<T>, onErr: () => E) => {
	if (O.isSome(value)) {
		return ok(value);
	}
	return err(onErr());
});

export const tryCatch: {
	<E>(onErr: (e: unknown) => E): <T>(f: () => T) => Result<T, E>;
	<T, E>(f: () => T, onError: (e: unknown) => E): Result<T, E>;
} = dual(2, <T, E>(f: () => T, onErr: (e: unknown) => E): Result<T, E> => {
	try {
		return ok(f());
	} catch (e) {
		return err(onErr(e));
	}
});

export const fromNullable: {
	<T extends NonNullable<any>, E>(onErr: () => E): (value: T) => Result<T, E>;
	<T extends NonNullable<any>, E>(value: T, onErr: () => E): Result<T, E>;
} = dual(2, <T, E>(value: T, onErr: () => E): Result<T, E> => {
	return fromOptional(O.fromNullable(value), () => onErr());
});

export const match: {
	<T1, E1, E2, T2>(options: {
		readonly onOk: (ok: T1) => T2;
		readonly onErr: (err: E1) => E2;
	}): (ma: Result<T1, E1>) => T2 | E2;
	<T1, E1, E2, T2>(
		ma: Result<T1, E1>,
		options: {
			readonly onOk: (ok: T1) => T2;
			readonly onErr: (err: E1) => E2;
		},
	): T2 | E2;
} = dual(
	2,
	<T1, E1, T2, E2>(
		ma: Result<T1, E1>,
		options: {
			readonly onOk: (ok: T1) => T2;
			readonly onErr: (err: E1) => E2;
		},
	) => {
		if (isOk(ma)) {
			return options.onOk(ma.value);
		}
		return options.onErr(ma.error);
	},
);

export const getOrElse: {
	<B, E>(onErr: (err: E) => B): <A>(ma: Result<A, E>) => A | B;
	<A, B, E>(ma: Result<A, E>, onErr: (err: E) => B): A | B;
} = dual(2, <A, B, E>(ma: Result<A, E>, onErr: (err: E) => B) => {
	if (isOk(ma)) {
		return ma.value;
	}
	return onErr(ma.error);
});

/**
 * This crashes the application if inner value is an error.
 */
export const unwrap = <A>(ma: Result<A, any>, msg?: string): A => {
	invariant(isOk(ma), () => {
		const baseMsg = "Programming error. Unable to unwrap an error value";
		const message = msg ? `${baseMsg}: ${msg}` : baseMsg;
		const trace = new Error().stack;
		return `${message}: ${(ma as any).error.message}\n${trace}`;
	});
	return ma.value;
};

/**
 * This crashes the application if inner value is an error.
 */
export function unwrapErr<E>(ma: Result<any, E>): E {
	invariant(isErr(ma), "Programming error. Unable to unwrap an error value");
	return ma.error;
}

export const refineOrErr: {
	<T1, T2 extends T1, E1, E2>(
		refinement: Refinement<T1, T2>,
		onErr: (value: T1) => E1,
	): (ma: Result<T1, E1>) => Result<T2, E1 | E2>;
	<T1, T2 extends T1, E1, E2>(
		ma: Result<T1, E1>,
		refinement: Refinement<T1, T2>,
		onErr: (value: T1) => E2,
	): Result<T2, E1 | E2>;
} = dual(
	3,
	<T1, T2 extends T1, E>(
		ma: Result<T1, E>,
		refinement: Refinement<T1, T2>,
		onErr: (value: T1) => E,
	): Result<T2, E> => {
		if (isErr(ma)) {
			return err(ma.error);
		}
		if (refinement(ma.value)) {
			return ok(ma.value) as any;
		}
		return err(onErr(ma.value));
	},
);

export const filterOrErr: {
	<T, E1, E2>(
		Predicate: Predicate<T>,
		onErr: (value: T) => E1,
	): (ma: Result<T, E1>) => Result<T, E1 | E2>;
	<T, E1, E2>(
		ma: Result<T, E1>,
		predicate: Predicate<T>,
		onErr: (value: T) => E2,
	): Result<T, E1 | E2>;
} = dual(
	3,
	<T1, E>(
		ma: Result<T1, E>,
		predicate: Predicate<T1>,
		onErr: (value: T1) => E,
	): Result<T1, E> => {
		if (isErr(ma)) {
			return ma;
		}
		if (predicate(ma.value)) {
			return ma;
		}
		return err(onErr(ma.value));
	},
);

export const filter: {
	<T, E>(
		pred: Predicate<T>,
		onFalse: (value: T) => E,
	): (ma: Result<T, E>) => Result<T, E>;
	<T, E>(
		ma: Result<T, E>,
		pred: Predicate<T>,
		onFalse: (value: T) => E,
	): Result<T, E>;
} = dual(
	3,
	<T1, T2 extends T1, E>(
		ma: Result<T1, E>,
		refinement: Refinement<T1, T2>,
		onFalse: (value: T1) => E,
	): Result<T2, E> => {
		if (isErr(ma)) {
			return err(ma.error);
		}
		if (refinement(ma.value)) {
			return ma as any;
		}
		return err(onFalse(ma.value));
	},
);

export function of<T>(value: T): Result<T, never> {
	return ok(value);
}

export const map: {
	<T1, T2>(f: (value: T1) => T2): <E>(ma: Result<T1, E>) => Result<T2, E>;
	<T1, T2, E>(ma: Result<T1, E>, f: (value: T1) => T2): Result<T2, E>;
} = dual(
	2,
	<T1, E, T2>(ma: Result<T1, E>, f: (value: T1) => T2): Result<T2, E> => {
		if (isOk(ma)) {
			return ok(f(ma.value));
		}
		return ma as any;
	},
);

export const mapErr: {
	<E1, E2>(f: (value: E1) => E2): <T>(ma: Result<T, E1>) => Result<T, E2>;
	<T, E1, E2>(ma: Result<T, E1>, f: (value: E1) => E2): Result<T, E2>;
} = dual(
	2,
	<T, E1, E2>(ma: Result<T, E1>, f: (value: E1) => E2): Result<T, E2> => {
		if (isErr(ma)) {
			return err(f(ma.error));
		}
		return ma as any;
	},
);

export const tap: {
	<T>(f: (value: T) => void): <E>(ma: Result<T, E>) => Result<T, E>;
	<T, E>(ma: Result<T, E>, f: (value: T) => void): Result<T, E>;
} = dual(2, <T, E>(ma: Result<T, E>, f: (value: T) => void): Result<T, E> => {
	if (isOk(ma)) {
		f(ma.value);
	}
	return ma;
});

export const tapError: {
	<E>(f: (error: E) => void): <T>(ma: Result<T, E>) => Result<T, E>;
	<T, E>(ma: Result<T, E>, f: (error: E) => void): Result<T, E>;
} = dual(2, <T, E>(ma: Result<T, E>, f: (error: E) => void): Result<T, E> => {
	if (isErr(ma)) {
		f(ma.error);
	}
	return ma;
});

export const chain: {
	<T1, T2, E2>(
		f: (value: T1) => Result<T2, E2>,
	): <E1>(ma: Result<T1, E1>) => Result<T2, E1 | E2>;
	<T1, T2, E1, E2>(
		ma: Result<T1, E1>,
		f: (value: T1) => Result<T2, E2>,
	): Result<T2, E1 | E2>;
} = dual(
	2,
	<T1, T2, E1, E2>(
		ma: Result<T1, E1>,
		f: (value: T1) => Result<T2, E2>,
	): Result<T2, E1 | E2> => {
		return match(ma, { onOk: (value) => f(value), onErr: (a) => err(a) });
	},
);

export const ap: {
	<T1, E2>(
		ma: Result<T1, E2>,
	): <T2, E1>(mab: Result<(value: T1) => T2, E1>) => Result<T2, E1 | E2>;
	<T1, E2, T2, E1>(): (
		mab: Result<(value: T1) => T2, E1>,
		ma: Result<T1, E2>,
	) => Result<T2, E1 | E2>;
} = dual(
	2,
	<T1, T2, E1, E2>(
		mab: Result<(value: T1) => T2, E2>,
		ma: Result<T1, E1>,
	): Result<T2, E1 | E2> => {
		if (isErr(mab)) {
			return err(mab.error);
		}
		if (isErr(ma)) {
			return err(ma.error);
		}
		return of(mab.value(ma.value));
	},
);

export const alt: {
	<T2, E2>(
		f: () => Result<T2, E2>,
	): <T1>(ma: Result<T1, E2>) => Result<T1 | T2, E2>;

	<T1, E2, T2, E1>(
		ma: Result<T1, E1>,
		f: () => Result<T2, E2>,
	): Result<T1 | T2, E2>;
} = dual(
	2,
	<T1, T2, E1, E2>(
		ma: Result<T1, E1>,
		f: () => Result<T2, E2>,
	): Result<T1 | T2, E2> => {
		return match(ma, { onErr: () => f(), onOk: (_value) => ma as any });
	},
);

export const getOk = <T, E>(ma: Result<T, E>): O.Optional<T> => {
	if (isOk(ma)) {
		return O.of(ma.value);
	}
	return O.none;
};

export const getErr = <T, E>(ma: Result<T, E>): O.Optional<E> => {
	if (isErr(ma)) {
		return O.of(ma.error);
	}
	return O.none;
};

export const Do: Result<EmptyObject, never> = ok({});

export const bind: {
	<N extends string, T1, T2, E2>(
		name: Exclude<N, keyof T1>,
		f: (a: T1) => Result<T2, E2>,
	): <E1>(ma: Result<T1, E1>) => Result<
		{
			[K in keyof T1 | N]: K extends keyof T1 ? T1[K] : T2;
		},
		E1 | E2
	>;
	<N extends string, T1, T2, E1, E2>(
		ma: Result<T1, E1>,
		name: Exclude<N, keyof T1>,
		f: (a: T1) => Result<T2, E2>,
	): Result<
		{
			[K in keyof T1 | N]: K extends keyof T1 ? T1[K] : T2;
		},
		E1 | E2
	>;
} = dual(
	3,
	<N extends string, T1, T2, E1, E2>(
		ma: Result<T1, E1>,
		name: N,
		f: (value: T1) => Result<T2, E2>,
	) => {
		return chain(ma, (obj) => {
			return map(
				f(obj),
				(value) => Object.assign({}, obj, { [name]: value }),
			);
		});
	},
);

export const bindTo: {
	<N extends string>(
		name: N,
	): <T, E>(res: Result<T, E>) => Result<{ readonly [K in N]: T }, E>;
	<N extends string, A, E>(
		ma: Result<A, E>,
		name: N,
	): Result<{ readonly [K in N]: A }, E>;
} = dual(2, (ma, name) => {
	return bind(Do, name, () => ma);
});

export const assign = bind;
