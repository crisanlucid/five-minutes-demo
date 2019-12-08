import * as t from 'io-ts';
import { withMessage } from 'io-ts-types/lib/withMessage';
import isEmail from 'validator/lib/isEmail';
import isMobilePhone from 'validator/lib/isMobilePhone';

// io-ts is a trojan; come for the codec, stay for the Either
// https://twitter.com/GiulioCanti/status/1197459999276056576

// The best way how to explain functional programming is with examples.
// We will start with io-ts, a runtime type system for IO decoding/encoding
// for TypeScript. It's built on top of fp-ts. We will use it for Sign Up form.
//
// For example, that's how we can define runtime User type:
// const User = t.type({
//   userId: t.number,
//   name: t.string
// })

// And that's how we can extract its TypeScript type:
// type User = t.TypeOf<typeof User>
// Which is the same as:
// type User = {
//   userId: number
//   name: string
// }

// We can use User to decode any unknown value in runtime safely:
// const either = User.decode(anything)

// What is Either?
// The Either type returned by decode is defined in fp-ts, a library containing
// implementations of common algebraic types in TypeScript.

// The Either type represents a value of one of two possible types (a disjoint union).
// An instance of Either is either an instance of Left or Right:
// type Either<E, A> =
//   | {
//       readonly _tag: 'Left';
//       readonly left: E;
//     }
//   | {
//       readonly _tag: 'Right';
//       readonly right: A;
//     };
// Convention dictates that Left is used for failure and Right is used for success.

// In functional programming, we don't use either directly. We pipe all the things!
// TODO: Better snippet.
// pipe(
//   User.decode(...),
//   fold(onFail, onSuccess)
// )

// With io-ts and Either, we can type and validate everything.
// But before a validation, we need to define some model to be validated.
// We will use two super usefull abstractions: Option and branded types.

// 1) Option type
// Instead of null / undefined, we use fp-ts Option type.
// Option is Monad, a wrapped value with some helpers, to express not existing thing.
// Helpers? Imagine Promise.all, but for null/undefined values instead of promises.
// Option (and Promise) is one of many monads.

// 2) Branded type, which is even more wonderfull.
// We can have type safe non empty string or email string. No kidding.
// You, as developer, can define by type system solely, that function foo can
// accept only non empty string, for example. Traditionally, this is possible
// only with throwing exceptions (no way) or complex value objects (unnecessary).

// The best thing is, with functional programming, we can compose all things
// infinitely without source code rot, because pure functions do not rot.
// That's why functional programming is so awesome. Code does not rot so easily.

// Let's start with things we need for sign up form. Types and validation errors.

// Almost all forms use strings and strings must be trimmed and restricted for max
// length at least. We don't want untrimmed ' some@email.com  ' strings.
// But where we should do that? In UI? Before saving to database? Everywhere?
// We don't know and we can't know, because classical type system can't tell us.
// Haskell approach is to tell via types explicitly where we can expect already
// trimmed string and where we have to trim. Basically, we validate only
// values from IO boundary (HTTP, HTML forms, file system, database, ...)
// Inside the aplication, we use branded type (similar to Haskel newtype), so
// the code is both perfectly readable and safe.

// As for validation errors, we will use an object, because with one object,
// we can enforce everything is translated by types. Also, translation is out
// of the scope of validation.

export const validationErrors = {
  TypeString: 'Invalid string type.',
  NonEmptyString: 'Can not be empty.',
  TrimmedString: 'Please remove leading and trailing whitespaces.',
  TooLong: 'Too long.',
  TooShort: 'Too short.',
  EmailString: 'Email is not valid.',
  PhoneString: 'Invalid phone number.',
};

// Helper types.

// Just give t.string a validation error message.
export const TypeString = withMessage(
  t.string,
  () => validationErrors.TypeString,
);
// console.log(PathReporter.report(TypeString.decode(''))); // ok
// console.log(PathReporter.report(TypeString.decode(null))); // ["Invalid string."]

// Create branded NonEmptyString.
// Take a look how compiler protects us. We can't assign a wrong value:
// Error: Type '""' is not assignable to type 'Branded<string, NonEmptyStringBrand>'.
// const a: NonEmptyString = ''; // ' ' doesn't work either.
// We can't assign any string, not even empty.
// But we can use branded string directly:
// const toUpperCase = (foo: NonEmptyString) => foo.toUpperCase();
interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol;
}
export const NonEmptyString = withMessage(
  t.brand(
    t.string,
    (s): s is t.Branded<string, NonEmptyStringBrand> => s.length > 0,
    'NonEmptyString',
  ),
  () => validationErrors.NonEmptyString,
);

interface TrimmedStringBrand {
  readonly TrimmedString: unique symbol;
}
export const TrimmedString = withMessage(
  t.brand(
    t.string,
    (s): s is t.Branded<string, TrimmedStringBrand> =>
      s.trim().length === s.length,
    'TrimmedString',
  ),
  () => validationErrors.TrimmedString,
);

export const NonEmptyTrimmedString = t.intersection([
  // The order matters. We want to check TypeString first.
  TypeString,
  NonEmptyString,
  TrimmedString,
]);

interface Max64StringBrand {
  readonly Max64String: unique symbol;
}
export const Max64String = withMessage(
  t.brand(
    t.string,
    (s): s is t.Branded<string, Max64StringBrand> => s.length <= 64,
    'Max64String',
  ),
  () => validationErrors.TooLong,
);

interface Max512StringBrand {
  readonly Max512String: unique symbol;
}
export const Max512String = withMessage(
  t.brand(
    t.string,
    (s): s is t.Branded<string, Max512StringBrand> => s.length <= 512,
    'Max512String',
  ),
  () => validationErrors.TooLong,
);

interface Min4StringBrand {
  readonly Min4String: unique symbol;
}
export const Min4String = withMessage(
  t.brand(
    t.string,
    (s): s is t.Branded<string, Min4StringBrand> => s.length >= 4,
    'Min4String',
  ),
  () => validationErrors.TooShort,
);

interface EmailStringBrand {
  readonly EmailString: unique symbol;
}
export const EmailString = withMessage(
  t.brand(
    t.string,
    (s): s is t.Branded<string, EmailStringBrand> => isEmail(s),
    'EmailString',
  ),
  () => validationErrors.EmailString,
);

interface PhoneStringBrand {
  readonly PhoneString: unique symbol;
}
export const PhoneString = withMessage(
  t.brand(
    t.string,
    (s): s is t.Branded<string, PhoneStringBrand> => isMobilePhone(s),
    'PhoneString',
  ),
  () => validationErrors.PhoneString,
);

// Domain types.

export const String64 = t.intersection([NonEmptyTrimmedString, Max64String]);
export type String64 = t.TypeOf<typeof String64>;

export const String512 = t.intersection([NonEmptyTrimmedString, Max512String]);
export type String512 = t.TypeOf<typeof String512>;

export const Email = t.intersection([String64, EmailString]);
export type Email = t.TypeOf<typeof Email>;

export const Password = t.intersection([String512, Min4String]);
export type Password = t.TypeOf<typeof Password>;

export const Phone = t.intersection([NonEmptyTrimmedString, PhoneString]);
export type Phone = t.TypeOf<typeof Phone>;

export const SignUpForm = t.type({
  company: String64,
  email: Email,
  password: Password,
  phone: Phone,
  sendNewsletter: t.boolean,
});
export type SignUpForm = t.TypeOf<typeof SignUpForm>;
