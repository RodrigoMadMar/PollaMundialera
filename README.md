# Polla Mundialera

Aplicación web de pronósticos del Mundial de Fútbol. Construida con Next.js 15, Drizzle ORM, Neon PostgreSQL y TailwindCSS.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: TailwindCSS + shadcn/ui
- **Base de datos**: Neon PostgreSQL + Drizzle ORM
- **Datos en tiempo real**: SWR (refresco cada 120s)
- **API de fútbol**: football-data.org v4
- **Deploy**: Vercel

---

## Variables de entorno

Crea un archivo `.env.local` con:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
FOOTBALL_DATA_API_KEY=tu_api_key_aqui
```

**Nunca** commitees este archivo.

---

## Configuración de Neon PostgreSQL

1. Crea una cuenta en [neon.tech](https://neon.tech)
2. Crea un nuevo proyecto
3. Copia la **Connection string** y ponla en `DATABASE_URL`
4. Ejecuta las migraciones:

```bash
npm run db:push
# o usando el SQL directo:
# drizzle/0000_initial.sql
# drizzle/0001_phase_predictions.sql
```

5. Ejecuta el seed inicial:

```bash
npm run db:seed
```

---

## Configuración de Football Data API

1. Regístrate en [football-data.org](https://www.football-data.org/)
2. Copia tu API key y ponla en `FOOTBALL_DATA_API_KEY`
3. La API gratuita permite acceder a la competición **WC** (FIFA World Cup)

---

## Configuración de Vercel

1. Conecta este repositorio en [vercel.com](https://vercel.com)
2. Agrega las variables de entorno en **Settings → Environment Variables**:
   - `DATABASE_URL`
   - `FOOTBALL_DATA_API_KEY`
3. El deploy es automático en cada push a `main`
4. El cron job `/api/sync-matches` se ejecuta cada 15 minutos automáticamente (configurado en `vercel.json`)

---

## Instalación local

```bash
npm install
npm run dev
```

La app estará en http://localhost:3000

---

## Comandos disponibles

```bash
# Desarrollo
npm run dev

# Build producción
npm run build
npm run start

# Base de datos
npm run db:generate   # Generar migraciones desde schema
npm run db:migrate    # Aplicar migraciones
npm run db:push       # Push directo del schema (desarrollo)
npm run db:studio     # Drizzle Studio (GUI)

# Seed y datos
npm run db:seed                              # Seed inicial con usuarios y datos demo
npm run db:import-predictions predictions.csv  # Importar pronósticos desde CSV

# Tests
npm test
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                # Dashboard público
│   ├── login/page.tsx          # Login por email
│   ├── picks/page.tsx          # Pronósticos (requiere login)
│   ├── layout.tsx
│   └── api/
│       ├── leaderboard/        # GET tabla de posiciones
│       ├── matches/            # GET partidos
│       ├── predictions/        # GET/POST pronósticos
│       ├── login/              # POST autenticación
│       ├── logout/             # POST cerrar sesión
│       └── sync-matches/       # GET sincronizar con API fútbol
├── components/
│   ├── header.tsx
│   ├── leaderboard-table.tsx
│   ├── matches-section.tsx
│   ├── picks-form.tsx
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema
│   │   └── index.ts            # DB connection
│   ├── auth.ts                 # Auth server-side
│   ├── auth-client.ts          # Auth client-side (isMatchLocked)
│   ├── football-data.ts        # API fútbol
│   ├── points.ts               # Cálculo de puntos por fase
│   └── utils.ts
└── __tests__/
    └── points.test.ts
scripts/
├── seed.ts                     # Seed inicial
└── import-predictions.ts       # Importar CSV
drizzle/
├── 0000_initial.sql            # SQL migración inicial
└── 0001_phase_predictions.sql  # SQL migración para fases y clasificados
```

---

## Sistema de puntuación

Los puntos son acumulativos: si un pronóstico acierta marcador exacto y ganador/clasificado, suma ambos conceptos.

| Fase | Marcador exacto | Ganador / clasificado |
|------|----------------:|----------------------:|
| Fase de grupos | 5 pts | 3 pts |
| Ronda de 32 | 10 pts | 6 pts |
| Octavos de final | 14 pts | 8 pts |
| Cuartos de final | 20 pts | 12 pts |
| Semifinales | 28 pts | 16 pts |
| Tercer lugar | 30 pts | 18 pts |
| Final | 40 pts | 25 pts |

En fase de grupos, un empate pronosticado correctamente cuenta como acierto de resultado general. En eliminación, el clasificado es el equipo que gana la llave incluso si avanza por penales; el marcador exacto corresponde al marcador oficial antes de penales.

**Ejemplos:**
- Grupos: pronóstico 2-1, resultado 2-1 → **8 pts**
- Grupos: pronóstico 1-0, resultado 3-2 → **3 pts**
- Ronda de 32: pronóstico 1-1 y clasifica A, resultado 1-1 y clasifica B → **10 pts**
- Final: pronóstico 2-0 y campeón correcto, resultado 2-0 → **65 pts**

---

## Autenticación

La app usa autenticación simple por email:

1. El usuario ingresa su email en `/login`
2. Si el email está en la tabla `users`, se crea una cookie httpOnly
3. La cookie se verifica en cada request protegido
4. Logout elimina la cookie

---

## Importar pronósticos desde CSV

Formato esperado del CSV:

```csv
email,external_match_id,predicted_home,predicted_away,predicted_winner
rodrigo.madariaga@alumni.ie.edu,12345,2,1,
jbmartinez93@hotmail.com,12346,1,1,home
```

`predicted_winner` es opcional para fase de grupos y para llaves con ganador claro en el marcador pronosticado. Es obligatorio cuando un pronóstico de eliminación queda empatado y se debe elegir clasificado.

Ejecutar:

```bash
npm run db:import-predictions mis-pronosticos.csv
```

---

## Sincronización de partidos

El endpoint `/api/sync-matches` se ejecuta automáticamente cada 15 minutos vía Vercel Cron.

Para ejecutar manualmente:

```bash
curl https://tu-app.vercel.app/api/sync-matches
```

---

## GitHub + Vercel

1. Push a GitHub:
```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

2. En Vercel:
   - Import project desde GitHub
   - Configurar env vars
   - Deploy automático activado

3. Para cada push a `main`, Vercel hace build y deploy automático.
