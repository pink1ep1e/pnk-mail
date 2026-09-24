import { redirect } from "next/navigation";

/** Always authenticate via pnk ID OAuth — no local mail password form. */
export default function Page() {
  redirect("/api/auth/start?kind=login");
}
