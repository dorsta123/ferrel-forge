// Download the licensed master: checks the license, then hands the browser a 5-minute private link.
import { NextResponse } from "next/server";
import { masterDownload } from "@/features/licensing/master-download";
import { getCurrentUser } from "@/lib/session";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request, ctx: RouteContext<"/licenses/[id]/master">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in?next=%2Flicenses", request.url), { status: 303, headers: NO_STORE });
  const { id } = await ctx.params;
  const result = await masterDownload(user.id, id);
  if (!result.ok) return new NextResponse(result.error, { status: 404, headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" } });
  return NextResponse.redirect(result.url, { status: 303, headers: NO_STORE });
}
