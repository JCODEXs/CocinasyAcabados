"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Sparkles, 
  Shield, 
  Clock, 
  Palette,
  CheckCircle,
  Zap,
  Users,
  TrendingUp
} from "lucide-react";

export default function HomePage() {
  const [quoteCode, setQuoteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAccessQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteCode.trim()) return;
    
    setIsLoading(true);
    // El formato esperado: installerId-quoteId o directamente el token
    // Ejemplo: "inst_123-quote_456" o el shareToken
    const [installerId, quoteId] = quoteCode.split("-");
    
    if (installerId && quoteId) {
      window.location.href = `/quotes/${installerId}/${quoteId}`;
    } else {
      // Si es un token único
      window.location.href = `/share/${quoteCode}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Navegación */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="mx-auto  flex h-20 w-50 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-lg">
            <img src="/logo.png" alt="Logo" className="h20 w-40  rounded-xl" />
          </div>
              <span className="font-semibold text-slate-800 text-lg">Cocinas<span className="text-slate-400"> y Acabados</span></span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/signin"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition px-3 py-2"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition shadow-sm"
              >
                Comenzar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                Cotizaciones Inteligentes
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                Diseña y cotiza
                <span className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent"> cocinas perfectas</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Plataforma profesional para instaladores de cocinas. Cotizaciones precisas, 
                visualización 3D y gestión de proyectos en un solo lugar.
              </p>
              
              {/* Access Quote Form */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-slate-500" />
                  ¿Tienes un código de cotización?
                </h3>
                <form onSubmit={handleAccessQuote} className="flex gap-3">
                  <input
                    type="text"
                    value={quoteCode}
                    onChange={(e) => setQuoteCode(e.target.value)}
                    placeholder="Ej: inst_123-quote_456"
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? "Cargando..." : "Ver Cotización"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
                <p className="text-xs text-slate-400 mt-3">
                  Introduce el código que recibiste por email o WhatsApp
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-8">
                <div>
                  <div className="text-2xl font-bold text-slate-900">+500</div>
                  <div className="text-sm text-slate-500">Instaladores</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">+2,500</div>
                  <div className="text-sm text-slate-500">Proyectos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">98%</div>
                  <div className="text-sm text-slate-500">Satisfacción</div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Animated Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl p-8 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-transparent rounded-3xl"></div>
                <div className="relative z-10">
                  {/* <Layout3D className="w-16 h-16 text-slate-700 mb-6" /> */}
                  <div className="space-y-4">
                    <div className="h-2 w-3/4 bg-slate-300 rounded-full"></div>
                    <div className="h-2 w-1/2 bg-slate-300 rounded-full"></div>
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className="bg-white/50 rounded-xl p-3 backdrop-blur-sm">
                        <div className="h-16 bg-slate-200 rounded-lg mb-2"></div>
                        <div className="h-2 w-full bg-slate-300 rounded-full"></div>
                      </div>
                      <div className="bg-white/50 rounded-xl p-3 backdrop-blur-sm">
                        <div className="h-16 bg-slate-200 rounded-lg mb-2"></div>
                        <div className="h-2 w-full bg-slate-300 rounded-full"></div>
                      </div>
                      <div className="bg-white/50 rounded-xl p-3 backdrop-blur-sm">
                        <div className="h-16 bg-slate-200 rounded-lg mb-2"></div>
                        <div className="h-2 w-full bg-slate-300 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Todo lo que necesitas para cotizar
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Herramientas profesionales que transforman la forma de crear presupuestos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group p-6 rounded-2xl hover:shadow-lg transition-all duration-300 border border-slate-100 hover:border-slate-200"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-900 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-slate-700 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-12 shadow-2xl"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              ¿Eres instalador profesional?
            </h2>
            <p className="text-slate-300 mb-8 text-lg">
            Únete a cientos de profesionales que ya usan CocinasPro
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/register"
                className="px-8 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition shadow-lg"
              >
                Registrarme Gratis
              </Link>
              <Link
                href="/signin"
                className="px-8 py-3 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition"
              >
                Iniciar Sesión
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-600 rounded-lg"></div>
                <span className="font-semibold text-slate-800">CocinasPro</span>
              </div>
              <p className="text-sm text-slate-500">
                Plataforma profesional para cotización de cocinas
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>Características</li>
                <li>Precios</li>
                <li>Demo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-4">Compañía</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>Acerca de</li>
                <li>Blog</li>
                <li>Contacto</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>Privacidad</li>
                <li>Términos</li>
                <li>Cookies</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-8 pt-8 text-center text-sm text-slate-400">
            © 2024 CocinasPro. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: "Cotizaciones Precisas",
    description: "Cálculo automático de materiales, herrajes y acabados con precios actualizados.",
    icon: CheckCircle
  },
  {
    title: "Visualización 3D",
    description: "Muestra el diseño final en 3D para que el cliente visualice su cocina antes de fabricar.",
    icon: Clock
  },
  {
    title: "Rápido y Eficiente",
    description: "Reduce el tiempo de cotización en un 70% con templates predefinidos.",
    icon: Zap
  },
  {
    title: "Panel para Clientes",
    description: "Comparte cotizaciones interactivas con tus clientes sin necesidad de registro.",
    icon: Users
  },
  {
    title: "Diseño Profesional",
    description: "Presentaciones elegantes que aumentan la tasa de conversión.",
    icon: Palette
  },
  {
    title: "Gestión de Proyectos",
    description: "Seguimiento de cotizaciones aprobadas y proyectos en curso.",
    icon: TrendingUp
  }
];