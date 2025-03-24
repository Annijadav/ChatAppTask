import { redirect } from "next/navigation"

export default function Home() {
  // In a real app, this would check server-side
  // For now, we'll redirect to login
  return redirect("/login")
}

