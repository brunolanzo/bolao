"use client";

import { useState, useEffect } from "react";

interface BankDetailsData {
  fullName: string;
  cpf: string;
  bank: string;
  agency: string;
  account: string;
  pix: string;
}

interface PaymentData {
  paid: boolean;
  paidAt: string | null;
  bankDetails: BankDetailsData | null;
}

export default function PaymentClient() {
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Bank details form state
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [bank, setBank] = useState("");
  const [agency, setAgency] = useState("");
  const [account, setAccount] = useState("");
  const [pix, setPix] = useState("");

  useEffect(() => {
    fetch("/api/payment")
      .then((res) => res.json())
      .then((data: PaymentData) => {
        setPaymentData(data);
        if (data.bankDetails) {
          setFullName(data.bankDetails.fullName);
          setCpf(data.bankDetails.cpf);
          setBank(data.bankDetails.bank);
          setAgency(data.bankDetails.agency);
          setAccount(data.bankDetails.account);
          setPix(data.bankDetails.pix);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveBankDetails() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, cpf, bank, agency, account, pix }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment status */}
      <div
        className={`border rounded-xl p-6 ${
          paymentData?.paid
            ? "border-green-300 bg-green-50"
            : "border-yellow-300 bg-yellow-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              paymentData?.paid
                ? "bg-[#009C3B] text-white"
                : "bg-[#FFDF00] text-[#004D20]"
            }`}
          >
            {paymentData?.paid ? "✓" : "⏳"}
          </div>
          <div>
            <h2 className="font-bold text-lg">
              {paymentData?.paid
                ? "Pagamento Confirmado"
                : "Pagamento Pendente"}
            </h2>
            <p className="text-sm text-gray-600">
              {paymentData?.paid
                ? `Confirmado em ${new Date(paymentData.paidAt!).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`
                : "Realize o pagamento via PIX para confirmar sua inscrição"}
            </p>
          </div>
        </div>
      </div>

      {/* Payment info */}
      <div className="border border-green-200 rounded-xl p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#FFDF00] text-[#004D20] text-xs flex items-center justify-center font-bold">
            $
          </span>
          Dados para Pagamento
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">Valor da inscrição</span>
            <span className="font-bold text-xl text-[#006B2B]">R$ 50,00</span>
          </div>

          <div className="py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Chave PIX</p>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-3 py-1.5 rounded-md text-sm font-mono font-medium">
                bruno.lanzo@gmail.com
              </code>
              <button
                onClick={() => navigator.clipboard.writeText("bruno.lanzo@gmail.com")}
                className="text-xs text-[#009C3B] hover:text-[#006B2B] transition-colors px-2 py-1 rounded border border-green-200 hover:border-green-400"
              >
                Copiar
              </button>
            </div>
          </div>

          <div className="py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Titular</p>
            <p className="font-medium">Bruno Lanzo</p>
          </div>

          <div className="py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Contato para dúvidas</p>
            <p className="font-medium">Bruno Lanzo</p>
            <p className="text-sm text-gray-600">
              WhatsApp:{" "}
              <a
                href="https://wa.me/5511981315913"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#009C3B] hover:text-[#006B2B] underline"
              >
                (11) 98131-5913
              </a>
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-[#006B2B]">Como funciona:</span>{" "}
              Dos R$ 50,00 de inscrição, <strong>R$ 47,00</strong> são revertidos
              integralmente para a premiação dos vencedores e{" "}
              <strong>R$ 3,00</strong> são destinados aos custos do site
              (desenvolvimento e hospedagem).
            </p>
          </div>
        </div>
      </div>

      {/* Bank details form */}
      <div className="border border-green-200 rounded-xl p-6">
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#FFDF00] text-[#004D20] text-xs flex items-center justify-center font-bold">
            🏦
          </span>
          Dados Bancários para Premiação
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Preencha seus dados bancários para receber a premiação caso seja um dos
          vencedores.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-500 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] focus:border-[#009C3B]"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">CPF</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] focus:border-[#009C3B]"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Banco</label>
            <input
              type="text"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Ex: Nubank, Itaú, Bradesco..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] focus:border-[#009C3B]"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Agência</label>
            <input
              type="text"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              placeholder="0000"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] focus:border-[#009C3B]"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Conta Corrente
            </label>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="00000-0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] focus:border-[#009C3B]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-500 mb-1">
              Chave PIX (para recebimento)
            </label>
            <input
              type="text"
              value={pix}
              onChange={(e) => setPix(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] focus:border-[#009C3B]"
            />
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={handleSaveBankDetails}
            disabled={saving || !fullName || !cpf || !bank || !agency || !account || !pix}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-[#009C3B] text-white hover:bg-[#006B2B]"
            } disabled:opacity-50`}
          >
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Dados Bancários"}
          </button>
        </div>
      </div>
    </div>
  );
}
