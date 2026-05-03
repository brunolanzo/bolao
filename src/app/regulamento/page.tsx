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
        "Cada participante faz seus palpites da fase de grupos, chaveamento e campeão antes do início da Copa do Mundo. E a cada nova rodada do mata-mata, novos palpites são liberados.",
        "Os palpites são divididos em três etapas: resultados dos jogos da fase de grupos, previsão de classificados em cada fase eliminatória e resultados dos jogos da fase eliminatória.",
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
        "⚽ Vencedor errado + acertou os gols de um dos times: 1 ponto",
        "❌ Resultado errado: 0 pontos",
        "A pontuação é não-cumulativa: vale sempre a maior pontuação aplicável.",
      ],
    },
    {
      title: "Previsão de Classificados",
      items: [
        "Antes da primeira partida da Copa, todos os palpites de classificados de cada fase devem estar preenchidos: Segunda Fase, Oitavas, Quartas, Semifinais e Finalistas.",
        "Após o início da Copa, esses palpites ficam travados e não podem mais ser alterados.",
        "Pontuação por time classificado corretamente:",
        "→ Segunda Fase (32 times classificados da fase de grupos): 2 pontos por time",
        "→ Oitavas de final (32 → 16): 4 pontos por time",
        "→ Quartas de final (16 → 8): 6 pontos por time",
        "→ Semifinais (8 → 4): 8 pontos por time",
        "→ Finalistas (os 2 times na grande final): 14 pontos por time",
      ],
    },
    {
      title: "Campeão, Vice e 3º Lugar",
      items: [
        "Você deve selecionar sua previsão de campeão, vice-campeão e terceiro colocado antes do início do torneio.",
        "Esses palpites também ficam travados após o início da Copa.",
        "🏆 Campeão correto: 25 pontos",
        "🥈 Vice-campeão correto: 20 pontos",
        "🥉 Terceiro colocado correto: 15 pontos",
        "O terceiro colocado deve ser um dos dois times eliminados nas semifinais.",
      ],
    },
    {
      title: "Palpites de Placar — Eliminatórias",
      items: [
        "Os palpites de placar dos jogos eliminatórios são abertos progressivamente ao longo do torneio:",
        "→ Ao final da fase de grupos: abre o preenchimento dos jogos da Segunda Fase, até o início do primeiro jogo dessa fase.",
        "→ Ao final da Segunda Fase: abre o preenchimento dos jogos das Oitavas, até o início do primeiro jogo das Oitavas.",
        "→ Ao final das Oitavas: abre o preenchimento dos jogos das Quartas, até o início do primeiro jogo das Quartas.",
        "→ Ao final das Quartas: abre o preenchimento dos jogos das Semifinais, até o início do primeiro jogo das Semifinais.",
        "→ Ao final das Semifinais: abre o preenchimento dos jogos da Final e da Disputa de 3º e 4º Lugar, até o início desses jogos.",
        "A pontuação por palpite de placar segue a mesma regra da fase de grupos.",
      ],
    },
    {
      title: "Prazos",
      items: [
        "Fase de grupos, previsão de classificados (todas as fases) e campeão/vice/3º: antes da primeira partida da Copa.",
        "Palpites de placar das eliminatórias: cada fase trava no início do seu primeiro jogo.",
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
      title: "Transparência",
      items: [
        "Após o prazo de palpites ser encerrado, todos os participantes terão acesso aos palpites de qualquer outro jogador — incluindo previsões de classificados, campeão/vice/3º e palpites de placares futuros.",
        "O ranking é atualizado em tempo real e todos podem acompanhar a pontuação de cada participante a qualquer momento.",
        "Os organizadores do bolão não participam como jogadores. Seu papel é exclusivamente a gestão do bolão: inserir resultados, gerenciar prazos e garantir o bom funcionamento da plataforma.",
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
          Leia com atenção as regras do Nosso Bolão 2026.
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
                    item.startsWith("→") || item.startsWith("🥇") || item.startsWith("🥈") || item.startsWith("🥉") || item.startsWith("🏆") || item.startsWith("⚽") || item.startsWith("❌") || item.match(/^\d\./)
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
        <p className="font-semibold mb-1">Nosso Bolão 2026</p>
        <p className="text-green-200 text-xs">Boa sorte a todos os participantes!</p>
      </div>
    </div>
  );
}
