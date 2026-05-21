/**
 * Single-user placeholder for the no-auth milestone.
 *
 * Every server-side handler that would normally read `session.user.id`
 * should use `USER_KEY` instead. When real auth lands, replace the
 * single export with a request-scoped resolver and update callers.
 */

export const USER_KEY = process.env.DEMO_USER_KEY ?? "demo-user";
