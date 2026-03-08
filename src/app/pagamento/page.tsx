import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PaymentClient from "./PaymentClient";

export const dynamic = "force-dynamic";

export default async function PagamentoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Pagamento</h1>
        <p className="text-gray-500">
          Informações sobre inscrição e dados bancários para premiação.
        </p>
      </div>

      <PaymentClient />
    </div>
  );
}
