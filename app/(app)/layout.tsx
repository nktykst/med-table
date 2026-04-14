import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Calendar, BookOpen, Settings } from "lucide-react";
import { NavItem } from "./NavItem";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 pb-20 overflow-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-area-pb">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
          <NavItem href="/" icon={<Calendar className="w-5 h-5" />} label="時間割" />
          <NavItem href="/assignments" icon={<BookOpen className="w-5 h-5" />} label="課題" />
          <NavItem href="/settings" icon={<Settings className="w-5 h-5" />} label="設定" />
        </div>
      </nav>
    </div>
  );
}

