import { redirect } from "next/navigation";

// proxy.ts sends signed-out visitors to /login before this runs.
export default function Home() {
  redirect("/dashboard");
}
