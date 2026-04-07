"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Share2, CheckCircle } from "lucide-react";
import Link from "next/link";

// Página de visualización de cotización para clientes
export default function QuoteViewPage() {
  const params = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aquí haces el fetch de la cotización usando el installerId y quoteId
    const fetchQuote = async () => {
      try {
        // const response = await api.get(`/quotes/${params.installerId}/${params.quoteId}`);
        // setQuote(response.data);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    fetchQuote();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <div className="flex gap-3">
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido de la cotización */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Cotización Válida</span>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Cotización #001
          </h1>
          <p className="text-slate-500 mb-8">
            Emitida el 15 de Noviembre, 2024
          </p>

          {/* Aquí va el detalle de la cotización */}
          <div className="border-t border-slate-100 pt-6">
            <p className="text-center text-slate-400">
              Detalle de la cotización...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}