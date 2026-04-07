"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

// Redirección por token único (shareToken)
export default function SharePage() {
  const params = useParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchByToken = async () => {
      try {
        // Buscar la cotización por token
        // const response = await api.get(`/quotes/share/${params.token}`);
        // Redirigir a la URL real
        // window.location.href = `/quotes/${response.installerId}/${response.id}`;
        
        // Simulación:
        setTimeout(() => {
          window.location.href = "/quotes/inst_123/quote_456";
        }, 1000);
      } catch (error) {
        setError(true);
      }
    };

    fetchByToken();
  }, [params.token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Enlace Inválido</h1>
          <p className="text-slate-600">
            Esta cotización no existe o ha expirado. Por favor contacta al instalador.
          </p>
          <a href="/" className="inline-block mt-6 text-slate-700 underline">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Redirigiendo a tu cotización...</p>
      </div>
    </div>
  );
}