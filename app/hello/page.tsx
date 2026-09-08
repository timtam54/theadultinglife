import { redirect } from "next/navigation";

// Friendly shortcut: /hello → the Hello tab of the Setup Guide.
export default function HelloShortcut() {
  redirect("/welcome?step=hello");
}
