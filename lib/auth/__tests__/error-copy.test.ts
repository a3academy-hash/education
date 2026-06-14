import { describe, expect, it } from "vitest";
import {
  GENERIC_SIGNIN_ERROR,
  UNCONFIRMED_SIGNIN_MESSAGE,
  mapSignInError,
} from "../error-copy";

// LB1 L3: unconfirmed sign-in is the ONLY non-generic branch; matched by the
// stable Supabase code (message check is a no-code fallback). Everything else
// stays the non-enumerating generic copy (P2).
describe("mapSignInError (LB1)", () => {
  it("maps the stable email_not_confirmed code to the unconfirmed copy", () => {
    expect(
      mapSignInError({ code: "email_not_confirmed", message: "Email not confirmed" }),
    ).toBe(UNCONFIRMED_SIGNIN_MESSAGE);
  });

  it("falls back to the message check only when no code is present", () => {
    expect(mapSignInError({ message: "Email not confirmed" })).toBe(
      UNCONFIRMED_SIGNIN_MESSAGE,
    );
    expect(mapSignInError({ message: "EMAIL NOT CONFIRMED" })).toBe(
      UNCONFIRMED_SIGNIN_MESSAGE,
    );
  });

  it("does NOT use the message fallback when a different code is present (code wins)", () => {
    // Guards against enumeration: a non-unconfirmed code stays generic even if
    // the message happens to mention confirmation.
    expect(
      mapSignInError({ code: "invalid_credentials", message: "not confirmed" }),
    ).toBe(GENERIC_SIGNIN_ERROR);
  });

  it("keeps the generic copy for invalid credentials", () => {
    expect(
      mapSignInError({ code: "invalid_credentials", message: "Invalid login credentials" }),
    ).toBe(GENERIC_SIGNIN_ERROR);
  });

  it("keeps the generic copy for a null error", () => {
    expect(mapSignInError(null)).toBe(GENERIC_SIGNIN_ERROR);
  });
});
