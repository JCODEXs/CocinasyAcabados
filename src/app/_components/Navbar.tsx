"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { ChevronLeft, Home, LayoutGrid, Folder, Plus } from "lucide-react"

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()

  if (pathname?.includes("/auth/")) return null

  const isHome = pathname === "/"
  const isProjects = pathname?.includes("/projects")
  const isCatalog = pathname?.includes("/catalog")
  const isBuilder = pathname?.includes("/builder")

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo / Marca */}
          <Link
            href="/"
            className="font-bold text-lg text-blue-600 hover:text-blue-700"
          >
            KitchenQuoter
          </Link>

          {/* Navegación principal */}
          <div className="flex gap-6 items-center">

            <Link
              href="/dashboard"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                isProjects ? "text-blue-600" : "text-gray-600 hover:text-blue-600"
              }`}
            >
              <Folder size={18} />
              Proyectos
            </Link>

            <Link
              href="/dashboard/catalog"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                isCatalog ? "text-blue-600" : "text-gray-600 hover:text-blue-600"
              }`}
            >
              <LayoutGrid size={18} />
              Catálogo
            </Link>

            {/* Acción rápida */}
            {isProjects && (
              <Link
                href="/projects/new"
                className="flex items-center gap-2 text-sm font-medium bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
              >
                <Plus size={16} />
                Nuevo Proyecto
              </Link>
            )}
          </div>

          {/* Lado derecho */}
          <div className="flex items-center gap-4">

            {/* Botón Home */}
            {!isHome && (
              <Link
                href="/"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Home size={18} />
              </Link>
            )}

            {/* Botón atrás */}
            {!isHome && (
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <ChevronLeft size={18} />
                Atrás
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}