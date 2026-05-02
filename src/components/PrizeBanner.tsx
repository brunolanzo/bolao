import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ENTRY_FEE = 47;

export default async function PrizeBanner() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "admin") return null;

  const userCount = await prisma.user.count({ where: { role: "user" } });
  const prize = userCount * ENTRY_FEE;

  return (
    <div className="bg-[#006B2B] text-white">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm">
        <span className="text-lg leading-none">🏆</span>
        <span className="font-medium">
          Prêmio Atual:{" "}
          <span className="text-[#FFDF00] font-bold">
            R$&nbsp;{prize.toLocaleString("pt-BR")}
          </span>
        </span>
        <span className="text-green-400 text-xs">•</span>
        <span className="text-green-200 text-xs">
          {userCount} {userCount === 1 ? "apostador" : "apostadores"}
        </span>
      </div>
    </div>
  );
}
