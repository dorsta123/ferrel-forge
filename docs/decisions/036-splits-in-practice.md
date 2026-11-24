# 036 — Contributor splits in practice: versions, invite links and consent
**Status:** Accepted · **Date:** 2026-11-24 · **Phase:** 5 (part 3)
**Builds on:** [019](019-contributor-splits.md) (splits and settlement).

## Context
Decision 019 set the rules: shares in basis points totalling 100%, everyone accepts, invites by link, each license locks its split. Building it raised practical questions, answered by the user on 2026-11-24 or in the code review.

## Decision
- **Versions, never edits.** `split_versions` (numbered per track; the highest is the split in force) and `split_shares` (name, role, basis points, account once claimed, invite-code hash, pending/accepted/declined). Saving writes a new version; only a contributor's answer ever changes a share row.
- **Limits (PRODUCT.md 11, 12):** fixed roles (producer, vocalist, writer, mixer, musician, other + a short note); at most 50 people; each at least 0.5%; shares entered with up to 2 decimals; names unique within a split. The total of exactly 10,000 is checked by the server when a version is written.
- **The lead artist always keeps a share** (user), is the first row, and is accepted automatically.
- **Consent (review):** anyone who has **accepted** the split in force stays on the next version. Their share can change, and then they must accept again, but the lead can't remove them or take 100% without them. People still pending, or who declined, can be removed (PRODUCT.md 14: the lead edits and re-sends; the track stays published but unlicensable meanwhile).
- **Edits while licensed (user):** allowed. Running licenses keep the version they locked; new licenses wait until everyone accepts the new one.
- **Saving safely (review):** the editor says which version it was showing. A save based on an older version is refused, saves are one at a time per track, and an unchanged split makes no new version (nobody is asked again for nothing).
- **Invite links:** 32 random bytes; only the SHA-256 is stored (a database leak hands out no working links). A link works only while that share is pending on the split in force; the lead can make a new one at any time, which kills the old one. Opening it needs an account (sign in or up and come back). Accepting or declining ties the share to the account; one person holds at most one share per version. People already tied to an account answer later versions from **My splits**. The invite page isn't indexed and sends no referrer.
- **Transparency (user):** contributors see the whole split (names, roles, shares, who has answered) before answering.
- **Licensing:** a track is licensable only when nobody on the split in force is left to accept. A track with no split is 100% the lead artist's: its first license creates version 1 for that, and the migration gave existing licenses the same. A license points at (split version, track) together, so it can only lock a split of its own track.

## Alternatives considered
- **Editing shares in place:** simpler, but running licenses would lose the split they agreed to.
- **Storing invite codes:** lets the lead re-copy a link, but a leaked database would expose working links.
- **Letting the lead remove anyone:** decision 019 rejected one person setting everyone else's pay.
- **Email invites:** needs a paid or configured email service ($0 rule).

## Consequences
- Settlement (phase 7) pays each license by its locked version. Shares never claimed are held (PRODUCT.md 13, phase 7).
- A contributor who declines a changed share can then be removed; consent protects against silent removal, not against a renegotiation they turn down.
- Anyone holding a live invite link can claim that share: the lead sends it privately and can replace it.
