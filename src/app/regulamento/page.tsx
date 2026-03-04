import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegulamentoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const sections = [
    {
      title: "Como funciona",
      items: [
        "Cada participante faz seus palpites antes do início da Copa do Mundo.",
        "Os palpites são divididos em três etapas: resultados dos jogos da fase de grupos, previsão de classificados em cada fase eliminatória e previsão de campeão, vice e terceiro colocado.",
        "Pontos são acumulados ao longo do torneio e um ranking geral é atualizado automaticamente.",
      ],
    },
    {
      title: "Palpites da Fase de Grupos",
      items: [
        "Todos os palpites da fase de grupos devem ser enviados antes do apito inicial da primeira partida da Copa.",
        "Para cada jogo você deve palpitar o placar exato (gols do mandante e do visitante).",
        "Não é possível alterar os palpites após o prazo.",
      ],
    },
    {
      title: "Pontuação — Resultados dos Jogos",
      items: [
        "🥇 Placar exato: 7 pontos",
        "🥈 Vencedor correto + acertou os gols de um dos times: 4 pontos",
        "🥉 Vencedor correto ou empate correto (sem acertar o placar): 3 pontos",
        "❌ Resultado errado: 0 pontos",
        "A pontuação é não-cumulativa: vale sempre a maior pontuação aplicável.",
      ],
    },
    {
      title: "Previsão de Classificados",
      items: [
        "Antes do início de cada fase eliminatória, você deve selecionar quais seleções acredita que irão avançar.",
        "Os palpites de classificados devem ser feitos antes da primeira partida de cada fase.",
        "Pontuação por time classificado corretamente:",
        "→ Oitavas de final (32 → 16): 2 pontos por time",
        "→ Quartas de final (16 → 8): 4 pontos por time",
        "→ Semifinais (8 → 4): 6 pontos por time",
        "→ Final (4 → 2 finalistas): 8 pontos por time",
        "→ Finalistas (os 2 times na grande final): 14 pontos por time",
      ],
    },
    {
      title: "Campeão, Vice e 3º Lugar",
      items: [
        "Você deve selecionar sua previsão de campeão, vice-campeão e terceiro colocado antes do início do torneio.",
        "🏆 Campeão correto: 25 pontos",
        "🥈 Vice-campeão correto: 20 pontos",
        "🥉 Terceiro colocado correto: 15 pontos",
        "O terceiro colocado deve ser um dos dois times eliminados nas semifinais.",
      ],
    },
    {
      title: "Prazos",
      items: [
        "Fase de grupos e previsão de campeão/vice/3º: antes da primeira partida da Copa (10 de junho de 2026).",
        "Classificados de cada fase eliminatória: antes da primeira partida daquela fase.",
        "Palpites enviados após o prazo não serão computados.",
      ],
    },
    {
      title: "Desempate no Ranking",
      items: [
        "Em caso de empate na pontuação total, o critério de desempate é:",
        "1. Maior pontuação nos resultados dos jogos",
        "2. Maior pontuação nas previsões de classificados",
        "3. Pontuação de campeão/vice/3º lugar",
      ],
    },
    {
      title: "Regras Gerais",
      items: [
        "Cada participante pode ter apenas uma conta no bolão.",
        "Palpites só podem ser feitos pelo próprio participante, dentro do prazo estabelecido.",
        "O administrador do bolão pode atualizar os resultados dos jogos e gerenciar as fases.",
        "Qualquer dúvida ou contestação deve ser enviada ao administrador antes da final da Copa.",
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Regulamento</h1>
        <p className="text-gray-500">
          Leia com atenção as regras do Bolão Copa 2026.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FFDF00] text-[#004D20] text-xs flex items-center justify-center font-bold shrink-0">
                {i + 1}
              </span>
              {section.title}
            </h2>
            <ul className="space-y-2">
              {section.items.map((item, j) => (
                <li
                  key={j}
                  className={`text-sm leading-relaxed ${
                    item.startsWith("→") || item.startsWith("🥇") || item.startsWith("🥈") || item.startsWith("🥉") || item.startsWith("🏆") || item.startsWith("❌") || item.match(/^\d\./)
                      ? "pl-4 text-gray-700"
                      : "text-gray-600"
                  }`}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-[#006B2B] text-white rounded-xl text-sm text-center">
        <p className="font-semibold mb-1">Bolão Copa do Mundo 2026</p>
        <p className="text-green-200 text-xs">Boa sorte a todos os participantes!</p>
      </div>
    </div>
  );
}
