import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminSettings from "./AdminSettings";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/");

  const settings = await prisma.settings.findMany();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
      </div>
      <AdminSettings
        settings={JSON.parse(JSON.stringify(settings))}
        users={JSON.parse(JSON.stringify(users))}
        teams={JSON.parse(JSON.stringify(teams))}
      />
    </div>
  );
}
