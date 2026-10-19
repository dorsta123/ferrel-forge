"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, LayoutDashboardIcon, LogOutIcon, SparklesIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { signOut } from "@/lib/auth-client";

type Props = { name: string; email: string; isCreator: boolean };

const itemClass =
  "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground";

export function UserMenu({ name, email, isCreator }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh(); // re-render server components (the header) without the session
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={buttonVariants({ variant: "ghost", className: "h-9 gap-2 px-1.5 sm:pr-2.5" })}
      >
        <Avatar name={name} />
        <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{name}</span>
        <ChevronDownIcon className="hidden text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="truncate text-xs font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <MenuPrimitive.LinkItem
          className={itemClass}
          render={<Link href={isCreator ? "/dashboard" : "/become-creator"} />}
        >
          {isCreator ? <LayoutDashboardIcon /> : <SparklesIcon />}
          {isCreator ? "Dashboard" : "Become a creator"}
        </MenuPrimitive.LinkItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="gap-2 px-2 py-1.5">
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
