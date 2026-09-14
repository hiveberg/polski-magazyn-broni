import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  redirect(user ? user.isBootstrap ? "/onboarding" : user.forcePasswordChange ? "/change-password" : "/dashboard" : "/login");
}
