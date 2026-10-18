import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";
import { BecomeCreatorForm } from "./become-creator-form";

export const metadata = { title: "Become a creator · ferrel-forge" };

export default function Page() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Become a creator</CardTitle>
          <CardDescription>Set up your artist profile to start listing tracks. You can still buy as usual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96" />}>
            <Gate />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function Gate() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.creator) redirect("/dashboard");
  return <BecomeCreatorForm />;
}
