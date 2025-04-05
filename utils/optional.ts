import { dual, pipe } from "./funcs.ts";
import type { EmptyObject, Predicate, Refinement } from "./traits.ts";
import type { Result } from "./result.ts";
import * as R from "./result.ts";
import { invariant } from "./errors.ts";

export type Some<A> = NonNullable<A>;
export type None = null | undefined;
export type Optional<T extends NonNullable<any>> = Some<T> | None;

export const none: Optional<never> = null as Optional<never>;

export function some<T extends NonNullable<any>>(value: T): Optional<T> {
	return value as Optional<T>;
}

export const of = some;

export const Do: Optional<EmptyObject> = of({});

export function isSome<A>(value: A): value is NonNullable<A> {
	return value !== null && value !== undefined;
}
export function isNone<A>(value: Optional<A>): value is None {
	return value === null || value === undefined;
}

export function fromNullable<T extends NonNullable<any>>(
	value: T,
): Optional<T> {
	if (value === null || value === undefined) {
		return none;
	}
	return some(value);
}

export const fromPredicate: {
	<A, B extends A>(refinement: Refinement<A, B>): (a: A) => Optional<B>;
	<A, B extends A>(a: A, refinement: Refinement<A, B>): Optional<B>;
} = dual(
	2,
	<A, B extends A>(a: A, refinement: Refinement<A, B>): Optional<B> => {
		return refinement(a) ? some(a as any) : none;
	},
);

export function fromResult<A>(result: Result<A, unknown>): Optional<A> {
	if (R.isOk(result)) {
		return of(result.value);
	}
	return none;
}

export const refine: {
	<A, B extends A>(
		refinement: Refinement<A, B>,
	): (ma: Optional<A>) => Optional<B>;
	<A, B extends A>(
		ma: Optional<A>,
		refinement: Refinement<A, B>,
	): Optional<B>;
} = dual(
	2,
	<A, B extends A>(
		ma: Optional<A>,
		refinement: Refinement<A, B>,
	): Optional<B> => {
		return pipe(
			ma,
			chain((a) => {
				return refinement(a) ? some(a as any) : none;
			}),
		);
	},
);

export const alt: {
	<B>(second: () => Optional<B>): <A>(first: Optional<A>) => Optional<A | B>;
	<A, B>(first: Optional<A>, second: () => Optional<B>): Optional<A | B>;
} = dual(
	2,
	<A, B>(first: Optional<A>, second: () => Optional<B>): Optional<A | B> => {
		return first ?? second();
	},
);

export const filter: {
	<A>(predicate: Predicate<A>): (ma: Optional<A>) => Optional<A>;
	<A>(ma: Optional<A>, predicate: Predicate<A>): Optional<A>;
} = dual(2, <A>(ma: Optional<A>, predicate: Predicate<A>): Optional<A> => {
	return chain(ma, (a) => {
		if (predicate(a)) {
			return of(a);
		}
		return none;
	});
});

export const getOrElse: {
	<A, B>(onNone: () => B): (ma: Optional<A>) => A | B;
	<A, B>(ma: Optional<A>, onNone: () => B): A | B;
} = dual(2, <A, B>(ma: Optional<A>, onNone: () => B): A | B => {
	return isSome(ma) ? (ma as any) : onNone();
});

export const map: {
	<A extends NonNullable<any>, B extends NonNullable<any>>(
		f: (a: A) => B,
	): (ma: Optional<A>) => Optional<B>;
	<A extends NonNullable<any>, B extends NonNullable<any>>(
		ma: Optional<A>,
		f: (a: A) => B,
	): Optional<B>;
} = dual(2, <A, B>(ma: Optional<A>, f: (a: A) => B): Optional<B> => {
	if (isNone(ma)) {
		return none;
	}
	return some(f(ma));
});

export const tap: {
	<A extends NonNullable<any>>(
		f: (a: A) => void,
	): (ma: Optional<A>) => Optional<A>;
	<A extends NonNullable<any>>(
		ma: Optional<A>,
		f: (a: A) => void,
	): Optional<A>;
} = dual(2, <A>(ma: Optional<A>, f: (a: A) => void): Optional<A> => {
	return map(ma, (a) => {
		f(a);
		return a;
	});
});

export const chain: {
	<A, B>(f: (a: A) => Optional<B>): (ma: Optional<A>) => Optional<B>;
	<A, B>(ma: Optional<A>, f: (a: A) => Optional<B>): Optional<B>;
} = dual(2, <A, B>(ma: Optional<A>, f: (a: A) => Optional<B>): Optional<B> => {
	if (isNone(ma)) {
		return none;
	}
	const res = f(ma);
	if (isNone(res)) {
		return none;
	}
	return res;
});

export const ap: {
	<A>(ma: Optional<A>): <B>(mab: Optional<(a: A) => B>) => Optional<B>;
	<A, B>(mab: Optional<(a: A) => B>, ma: Optional<A>): Optional<B>;
} = dual(
	2,
	<A, B>(mab: Optional<(a: A) => B>, ma: Optional<A>): Optional<B> => {
		if (isNone(ma) || isNone(mab)) {
			return none;
		}
		return of(mab(ma));
	},
);

export const flap: {
	<A>(a: A): <B>(fab: Optional<(a: A) => B>) => Optional<B>;
	<A, B>(fab: Optional<(a: A) => B>, a: A): Optional<B>;
} = dual(2, <A, B>(fab: Optional<(a: A) => B>, a: A): Optional<B> => {
	if (isSome(fab)) {
		return of(fab(a));
	}
	return none;
});

export function flatten<T extends NonNullable<any>>(
	ma: Optional<Optional<T>>,
): Optional<T> {
	return chain(ma, (a) => a);
}

export const match: {
	<A, B, C = B>(
		options: { onNone: () => B; onSome: (a: A) => C },
	): (ma: Optional<A>) => B | C;
	<A, B, C = B>(
		ma: Optional<A>,
		options: {
			onNone: () => B;
			onSome: (a: A) => C;
		},
	): B | C;
} = dual(
	2,
	<A, B, C>(
		ma: Optional<A>,
		options: {
			onNone: () => B;
			onSome: (a: A) => C;
		},
	): B | C => {
		if (isSome(ma)) {
			return options.onSome(ma);
		}
		return options.onNone();
	},
);

export const bind: {
	<N extends string, A, B>(
		name: Exclude<N, keyof A>,
		f: (a: A) => Optional<B>,
	): (ma: Optional<A>) => Optional<
		{
			[K in keyof A | N]: K extends keyof A ? A[K] : B;
		}
	>;
	<N extends string, A, B>(
		ma: Optional<A>,
		name: Exclude<N, keyof A>,
		f: (a: A) => Optional<B>,
	): (ma: Optional<A>) => Optional<
		{
			[K in keyof A | N]: K extends keyof A ? A[K] : B;
		}
	>;
} = dual(3, (ma, name, f) => {
	if (isNone(ma)) {
		return none;
	}
	const value = f(ma);
	if (isNone(value)) {
		return none;
	}
	return Object.assign({}, ma, { [name]: value });
});

export const bindTo: {
	<N extends string>(
		name: N,
	): <A>(ma: Optional<A>) => Optional<{ readonly [K in N]: A }>;
	<N extends string, A>(
		ma: Optional<A>,
		name: N,
	): Optional<{ readonly [K in N]: A }>;
} = dual(2, (ma, name) => {
	return bind(Do, name, () => ma);
});

export const assign = bind;

export function unwrap<T>(ma: Optional<T>, message?: string): NonNullable<T> {
	invariant(isSome(ma), () => {
		const baseMsg = "Programming error. Unable to unwrap an error value";
		const msg = message ? `${baseMsg}: ${message}` : baseMsg;
		const trace = new Error().stack;
		return `${msg}: ${(ma as any).error.message}\n${trace}`;
	});
	return ma;
}
