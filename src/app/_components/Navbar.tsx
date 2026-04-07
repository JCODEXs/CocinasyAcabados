"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { ChevronLeft, Home } from "lucide-react"

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()

  // No mostrar navbar en login/register
  if (pathname?.includes("/auth/")) {
    return null
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo/Home */}
          <Link href="/" className="font-bold text-lg text-blue-600 hover:text-blue-700">
            Inventario
          </Link>

          {/* Navegación Central */}
          <div className="flex gap-6">
            {pathname !== "/" && pathname !== "/inventory" && (
              <Link 
                href="/inventory"
                className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Home size={18} />
                Inventarios
              </Link>
            )}
          </div>

          {/* Botón Atrás */}
          {pathname !== "/" && (
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
    </nav>
  )
}
