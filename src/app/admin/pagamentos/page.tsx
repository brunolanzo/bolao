import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PaymentsAdmin from "./PaymentsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminPagamentosPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Gerenciar Pagamentos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Controle de pagamentos e dados bancários dos participantes
        </p>
      </div>

      <PaymentsAdmin />
    </div>
  );
}
