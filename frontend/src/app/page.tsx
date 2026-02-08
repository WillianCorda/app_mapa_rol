import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Shield, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600">
          Pathfinder Tablero interactivo
          <br />
          ❤️❤️LUCRE ENTREGA A COSITA LINDA DE MI CORAZON!!!!❤️❤️
        </h1>
        <p className="text-lg text-zinc-400">
          Bienvenido a la plataforma de gestión de mapas y niebla de guerra.
          Selecciona tu rol para comenzar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link href="/gm">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-red-500/50 transition-all cursor-pointer h-full group">
              <CardHeader>
                <div className="mb-4 w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <Shield className="w-6 h-6 text-red-500" />
                </div>
                <CardTitle className="text-white">Game Master</CardTitle>
                <CardDescription>Controla el mapa, la niebla y la sesión.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/player">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-all cursor-pointer h-full group">
              <CardHeader>
                <div className="mb-4 w-12 h-12 rounded-full bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle className="text-white">Jugador</CardTitle>
                <CardDescription>Visualiza el mapa y la partida en tiempo real.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
