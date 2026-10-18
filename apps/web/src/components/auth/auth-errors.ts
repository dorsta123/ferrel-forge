// Better Auth error codes -> messages shown under the forms.
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
  USER_ALREADY_EXISTS: "That email is already registered. Try signing in.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "That email is already registered. Try signing in.",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  PASSWORD_TOO_LONG: "Password must be at most 128 characters.",
  INVALID_EMAIL: "Enter a valid email address.",
};

export function authErrorMessage(error: { code?: string; message?: string; status?: number }): string {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  return error.message || "Something went wrong. Please try again.";
}
