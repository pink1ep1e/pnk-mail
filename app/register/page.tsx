import { redirect } from "next/navigation";

/** Registration goes through pnk ID. */
export default function Page() {
  redirect("/api/auth/start?kind=register");
}
