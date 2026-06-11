import Link from "next/link";
import { isRegistrationClosed } from "@/lib/deadlines";
import RegistroForm from "./RegistroForm";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const closed = await isRegistrationClosed();

  if (closed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-5">🏁</div>
          <h1 className="text-2xl font-bold tracking-tight mb-3">
            O Bolão já começou!
          </h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            As inscrições foram encerradas no fechamento das apostas. Infelizmente
            você ficou de fora desta edição — mas pode acompanhar a disputa e
            participar da próxima!
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center bg-[#009C3B] text-white px-6 py-2.5 rounded-md font-medium hover:bg-[#006B2B] transition-colors"
          >
            Já tenho conta
          </Link>
        </div>
      </div>
    );
  }

  return <RegistroForm />;
}
