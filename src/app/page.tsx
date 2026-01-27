export default async function HomePage() {
  // Avoid any upstream calls on initial load.
  // This route exists only as a convenience entrypoint.
  const { redirect } = await import("next/navigation");
  redirect("/login");
}
