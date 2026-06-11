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
    const [installerId, quoteId] = quoteCode.split("-");
    
    if (installerId && quoteId) {
      window.location.href = `/quotes/${installerId}/${quoteId}`;
    } else {
      window.location.href = `/share/${quoteCode}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-x-hidden">
      {/* Navegación */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="mx-auto flex h-18 w-72 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-bold text-white shadow-md">
                <img src="/logo2.png" alt="Logo" className="h-18 w-22 rounded-lg ml-2 mr-4 object-cover" />
                <div>Cocinas y Acabados</div>
              </div>
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
      <section className="pt-32 pb-20 px-4 relative">
        {/* Decoración dinámica de fondo */}
        <div className="absolute top-20 right-0 w-72 h-72 bg-amber-200 rounded-full filter blur-3xl opacity-30 -z-10 animate-pulse" />
        <div className="absolute top-40 left-10 w-96 h-96 bg-blue-100 rounded-full filter blur-3xl opacity-40 -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-6 font-medium shadow-sm">
                <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                Cotizaciones Inteligentes
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                Diseña y cotiza
                <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent"> cocinas perfectas</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Plataforma profesional para instaladores de cocinas. Cotizaciones precisas, 
                visualización 3D y gestión de proyectos en un solo lugar.
              </p>
              
              {/* Access Quote Form */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 mb-8 backdrop-blur-sm">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-amber-500" />
                  ¿Tienes un código de cotización?
                </h3>
                <form onSubmit={handleAccessQuote} className="flex gap-3">
                  <input
                    type="text"
                    value={quoteCode}
                    onChange={(e) => setQuoteCode(e.target.value)}
                    placeholder="Ej: inst_123-quote_456"
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl hover:shadow-lg transition font-medium flex items-center gap-2 disabled:opacity-50"
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
                  <div className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">+500</div>
                  <div className="text-sm text-slate-500">Instaladores</div>
                </div>
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">+2,500</div>
                  <div className="text-sm text-slate-500">Proyectos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">98%</div>
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
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl overflow-hidden min-h-[300px] flex flex-col justify-center">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1000')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10">
                  <div className="space-y-4">
                    <div className="h-2 w-3/4 bg-white/30 rounded-full animate-pulse"></div>
                    <div className="h-2 w-1/2 bg-white/20 rounded-full animate-pulse"></div>
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className="bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all">
                        <div className="h-16 bg-white/20 rounded-lg mb-2"></div>
                        <div className="h-2 w-full bg-white/30 rounded-full"></div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all">
                        <div className="h-16 bg-white/20 rounded-lg mb-2"></div>
                        <div className="h-2 w-full bg-white/30 rounded-full"></div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all">
                        <div className="h-16 bg-white/20 rounded-lg mb-2"></div>
                        <div className="h-2 w-full bg-white/30 rounded-full"></div>
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
      <section className="py-24 px-4 bg-slate-900 text-white relative overflow-hidden">
        {/* Fondo decorativo sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.1),transparent_40%)]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Todo lo que necesitas para cotizar
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Herramientas profesionales que transforman la forma de crear presupuestos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.03, y: -5 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="group relative h-72 rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex flex-col justify-end p-6 cursor-pointer"
              >
                {/* Imagen de Fondo */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url(${feature.image})` }}
                />
                {/* Capa de superposición oscura (Overlay) */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/40 transition-opacity duration-300 group-hover:opacity-90" />

                {/* Contenido de la Tarjeta */}
                <div className="relative z-10 transition-transform duration-300 group-hover:translate-y-[-4px]">
                  <div className="w-12 h-12 bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:border-transparent transition-all duration-300 shadow-md">
                    <feature.icon className="w-6 h-6 text-amber-400 group-hover:text-slate-950 transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed opacity-90 group-hover:opacity-100">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 rounded-3xl p-12 shadow-2xl relative overflow-hidden text-white"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
            <h2 className="text-4xl font-bold mb-4 relative z-10">
              ¿Eres instalador profesional?
            </h2>
            <p className="text-amber-50 mb-8 text-lg max-w-xl mx-auto relative z-10 opacity-90">
              Únete a cientos de profesionales que ya usan CocinasPro y multiplican sus ventas.
            </p>
            <div className="flex gap-4 justify-center flex-wrap relative z-10">
              <Link
                href="/register"
                className="px-8 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all hover:scale-105 shadow-xl"
              >
                Registrarme Gratis
              </Link>
              <Link
                href="/signin"
                className="px-8 py-3 bg-slate-950/30 text-white border border-white/20 rounded-xl font-semibold hover:bg-slate-950/50 backdrop-blur-sm transition-all"
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
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg"></div>
                <span className="font-semibold text-slate-800">CocinasPro</span>
              </div>
              <p className="text-sm text-slate-500">
                Plataforma profesional para cotización de cocinas
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="hover:text-slate-800 cursor-pointer transition">Características</li>
                <li className="hover:text-slate-800 cursor-pointer transition">Precios</li>
                <li className="hover:text-slate-800 cursor-pointer transition">Demo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-4">Compañía</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="hover:text-slate-800 cursor-pointer transition">Acerca de</li>
                <li className="hover:text-slate-800 cursor-pointer transition">Blog</li>
                <li className="hover:text-slate-800 cursor-pointer transition">Contacto</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="hover:text-slate-800 cursor-pointer transition">Privacidad</li>
                <li className="hover:text-slate-800 cursor-pointer transition">Términos</li>
                <li className="hover:text-slate-800 cursor-pointer transition">Cookies</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-8 pt-8 text-center text-sm text-slate-400">
            © 2026 CocinasPro. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Array con las imágenes de Unsplash añadidas (puedes cambiarlas por las tuyas de tu carpeta public/)
const features = [
  {
    title: "Cotizaciones Precisas",
    description: "Cálculo automático de materiales, herrajes y acabados con precios actualizados.",
    icon: CheckCircle,
    image: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?q=80&w=600"
  },
  {
    title: "Visualización 3D",
    description: "Muestra el diseño final en 3D para que el cliente visualice su cocina antes de fabricar.",
    icon: Clock,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600"
  },
  {
    title: "Rápido y Eficiente",
    description: "Reduce el tiempo de cotización en un 70% con templates predefinidos.",
    icon: Zap,
    image: "https://images.unsplash.com/photo-1539922980492-38f6673af8dd?q=80&w=600"
  },
  {
    title: "Panel para Clientes",
    description: "Comparte cotizaciones interactivas con tus clientes sin necesidad de registro.",
    icon: Users,
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=600"
  },
  {
    title: "Diseño Profesional",
    description: "Presentaciones elegantes que aumentan la tasa de conversión.",
    icon: Palette,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=600"
  },
  {
    title: "Gestión de Proyectos",
    description: "Seguimiento de cotizaciones aprobadas y proyectos en curso.",
    icon: TrendingUp,
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=600"
  }
];