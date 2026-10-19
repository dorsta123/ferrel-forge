"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/avatar";
import { ARTIST_NAME_MAX, BIO_MAX, SLUG_MAX, slugify } from "@/lib/creator-profile";
import { becomeCreator, type BecomeCreatorState } from "./actions";

const initialState: BecomeCreatorState = { errors: {} };

export function BecomeCreatorForm() {
  const [state, formAction, pending] = useActionState(becomeCreator, initialState);
  const [artistName, setArtistName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [bio, setBio] = useState("");

  // Hide a field's server error once the user edits that field; reset on each new submit result.
  const [seenState, setSeenState] = useState(state);
  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set());
  if (state !== seenState) {
    setSeenState(state);
    setCleared(new Set());
  }
  const clear = (field: string) => setCleared((prev) => new Set(prev).add(field));
  const errors = Object.fromEntries(
    Object.entries(state.errors).filter(([field]) => !cleared.has(field)),
  ) as BecomeCreatorState["errors"];

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
    <form action={formAction} className="flex flex-col gap-5 rounded-2xl border bg-card p-6 sm:p-8" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="artistName">Artist name</Label>
        <Input
          className="h-10"
          id="artistName"
          name="artistName"
          value={artistName}
          maxLength={ARTIST_NAME_MAX}
          aria-invalid={!!errors.artistName}
          onChange={(e) => {
            setArtistName(e.target.value);
            clear("artistName");
            if (!slugEdited) {
              setSlug(slugify(e.target.value)); // suggest until the user edits it
              clear("slug");
            }
          }}
          required
        />
        <FieldError message={errors.artistName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Profile URL</Label>
        <Input
          className="h-10"
          id="slug"
          name="slug"
          value={slug}
          maxLength={SLUG_MAX}
          aria-invalid={!!errors.slug}
          aria-describedby="slug-preview"
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value.toLowerCase());
            clear("slug");
          }}
          required
        />
        <p id="slug-preview" className="text-xs text-muted-foreground">
          ferrel-forge.com/creators/<span className="font-medium text-foreground">{slug || "your-name"}</span>
          {" · "}You can&apos;t change this yet.
        </p>
        <FieldError message={errors.slug} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">
          Bio <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          value={bio}
          maxLength={BIO_MAX}
          aria-invalid={!!errors.bio}
          onChange={(e) => {
            setBio(e.target.value);
            clear("bio");
          }}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        />
        <p className="text-right text-xs text-muted-foreground">
          {bio.length}/{BIO_MAX}
        </p>
        <FieldError message={errors.bio} />
      </div>

      <FieldError message={errors.form} />
      <Button type="submit" disabled={pending} className="h-10 w-full font-semibold">
        {pending ? "Creating profile…" : "Become a creator"}
      </Button>
    </form>
    <ProfilePreview artistName={artistName} slug={slug} bio={bio} />
    </div>
  );
}

/** Live preview of the public profile card, updated as the user types. */
function ProfilePreview({ artistName, slug, bio }: { artistName: string; slug: string; bio: string }) {
  const name = artistName.trim() || "Your artist name";
  return (
    <aside aria-label="Profile preview" className="flex flex-col gap-3 lg:sticky lg:top-20">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Preview</p>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="grain ember-glow h-24 border-b" />
        <div className="-mt-8 flex flex-col gap-3 p-5">
          <Avatar name={artistName.trim() || "?"} className="size-16 text-xl ring-4 ring-card" />
          <div className="min-w-0">
            <p className={`truncate font-display text-xl font-semibold ${artistName.trim() ? "" : "text-muted-foreground"}`}>
              {name}
            </p>
            <p className="truncate font-mono text-xs text-muted-foreground">/creators/{slug || "your-name"}</p>
          </div>
          <p className="line-clamp-4 text-sm break-words whitespace-pre-line text-muted-foreground">
            {bio.trim() || "Your bio will appear here."}
          </p>
          <div className="flex gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-0.5">0 tracks</span>
            <span className="rounded-full bg-secondary px-2 py-0.5">New creator</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
