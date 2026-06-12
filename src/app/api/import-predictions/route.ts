import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

// Spanish name → possible API name variants (lowercase, no accents)
const NAME_MAP: Record<string, string[]> = {
  "méxico": ["mexico"],
  "sudáfrica": ["south africa"],
  "república de corea": ["korea republic", "south korea"],
  "chequia": ["czechia", "czech republic"],
  "canadá": ["canada"],
  "bosnia y herzegovina": ["bosnia and herzegovina", "bosnia & herzegovina"],
  "catar": ["qatar"],
  "suiza": ["switzerland"],
  "brasil": ["brazil"],
  "marruecos": ["morocco"],
  "escocia": ["scotland"],
  "haití": ["haiti"],
  "ee. uu.": ["usa", "united states", "united states of america"],
  "paraguay": ["paraguay"],
  "australia": ["australia"],
  "turquía": ["turkey", "türkiye"],
  "costa de marfil": ["ivory coast", "côte d'ivoire", "cote d'ivoire"],
  "ecuador": ["ecuador"],
  "alemania": ["germany"],
  "curazao": ["curaçao", "curacao"],
  "países bajos": ["netherlands"],
  "japón": ["japan"],
  "suecia": ["sweden"],
  "túnez": ["tunisia"],
  "ri de irán": ["iran", "ir iran"],
  "nueva zelanda": ["new zealand"],
  "bélgica": ["belgium"],
  "egipto": ["egypt"],
  "arabia saudí": ["saudi arabia"],
  "uruguay": ["uruguay"],
  "españa": ["spain"],
  "cabo verde": ["cape verde"],
  "francia": ["france"],
  "senegal": ["senegal"],
  "irak": ["iraq"],
  "noruega": ["norway"],
  "argentina": ["argentina"],
  "argelia": ["algeria"],
  "austria": ["austria"],
  "jordania": ["jordan"],
  "portugal": ["portugal"],
  "rd congo": ["dr congo", "congo dr", "democratic republic of congo"],
  "uzbekistán": ["uzbekistan"],
  "colombia": ["colombia"],
  "ghana": ["ghana"],
  "panamá": ["panama"],
  "inglaterra": ["england"],
  "croacia": ["croatia"],
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function matchTeam(spanish: string, dbName: string): boolean {
  const spNorm = normalize(spanish);
  const dbNorm = normalize(dbName);
  if (spNorm === dbNorm) return true;
  const variants = NAME_MAP[spNorm];
  if (variants) return variants.some((v) => normalize(v) === dbNorm);
  return false;
}

// All predictions from the spreadsheet (matches 3-72, excluding 1-2 which have no predictions)
const PREDICTIONS = [
  { n:3,  home:"México",               away:"República de Corea",    ben:[2,1], cha:[1,2], rod:[0,2], mr:[1,1] },
  { n:4,  home:"Chequia",              away:"Sudáfrica",             ben:[1,0], cha:[3,2], rod:[0,0], mr:[2,0] },
  { n:5,  home:"Chequia",              away:"México",                ben:[1,1], cha:[1,1], rod:[1,1], mr:[2,2] },
  { n:6,  home:"Sudáfrica",            away:"República de Corea",    ben:[0,2], cha:[2,1], rod:[1,2], mr:[1,2] },
  { n:7,  home:"Canadá",               away:"Bosnia y Herzegovina",  ben:[2,1], cha:[0,1], rod:[2,0], mr:[3,1] },
  { n:8,  home:"Catar",                away:"Suiza",                 ben:[0,3], cha:[0,3], rod:[1,2], mr:[1,4] },
  { n:9,  home:"Canadá",               away:"Catar",                 ben:[2,0], cha:[1,0], rod:[1,1], mr:[2,0] },
  { n:10, home:"Suiza",                away:"Bosnia y Herzegovina",  ben:[2,1], cha:[1,1], rod:[2,1], mr:[2,1] },
  { n:11, home:"Suiza",                away:"Canadá",                ben:[1,1], cha:[2,1], rod:[2,2], mr:[1,1] },
  { n:12, home:"Bosnia y Herzegovina", away:"Catar",                 ben:[2,1], cha:[2,0], rod:[1,0], mr:[3,1] },
  { n:13, home:"Brasil",               away:"Marruecos",             ben:[2,1], cha:[1,1], rod:[2,1], mr:[3,2] },
  { n:14, home:"Escocia",              away:"Haití",                 ben:[2,0], cha:[4,1], rod:[4,1], mr:[2,0] },
  { n:15, home:"Brasil",               away:"Escocia",               ben:[2,1], cha:[2,0], rod:[3,0], mr:[3,0] },
  { n:16, home:"Haití",                away:"Marruecos",             ben:[0,3], cha:[0,3], rod:[0,3], mr:[0,3] },
  { n:17, home:"Haití",                away:"Brasil",                ben:[0,4], cha:[0,4], rod:[0,5], mr:[0,6] },
  { n:18, home:"Marruecos",            away:"Escocia",               ben:[2,1], cha:[0,1], rod:[2,0], mr:[2,1] },
  { n:19, home:"EE. UU.",              away:"Paraguay",              ben:[2,1], cha:[2,1], rod:[1,1], mr:[1,2] },
  { n:20, home:"Australia",            away:"Turquía",               ben:[1,2], cha:[1,1], rod:[1,2], mr:[0,3] },
  { n:21, home:"EE. UU.",              away:"Australia",             ben:[2,0], cha:[3,1], rod:[2,1], mr:[2,1] },
  { n:22, home:"Turquía",              away:"Paraguay",              ben:[2,1], cha:[2,0], rod:[0,1], mr:[3,2] },
  { n:23, home:"Turquía",              away:"EE. UU.",               ben:[1,1], cha:[1,3], rod:[1,1], mr:[3,1] },
  { n:24, home:"Paraguay",             away:"Australia",             ben:[2,1], cha:[1,2], rod:[1,0], mr:[2,0] },
  { n:25, home:"Costa de Marfil",      away:"Ecuador",               ben:[1,1], cha:[2,2], rod:[2,2], mr:[2,3] },
  { n:26, home:"Alemania",             away:"Curazao",               ben:[4,0], cha:[5,0], rod:[3,0], mr:[8,0] },
  { n:27, home:"Costa de Marfil",      away:"Alemania",              ben:[0,2], cha:[2,3], rod:[1,2], mr:[1,4] },
  { n:28, home:"Curazao",              away:"Ecuador",               ben:[0,3], cha:[1,2], rod:[0,3], mr:[0,3] },
  { n:29, home:"Curazao",              away:"Costa de Marfil",       ben:[0,2], cha:[1,3], rod:[1,3], mr:[0,3] },
  { n:30, home:"Ecuador",              away:"Alemania",              ben:[1,2], cha:[1,2], rod:[1,2], mr:[0,2] },
  { n:31, home:"Países Bajos",         away:"Japón",                 ben:[2,1], cha:[3,1], rod:[2,2], mr:[2,2] },
  { n:32, home:"Suecia",               away:"Túnez",                 ben:[2,1], cha:[1,0], rod:[1,2], mr:[2,1] },
  { n:33, home:"Países Bajos",         away:"Suecia",                ben:[1,1], cha:[2,0], rod:[2,0], mr:[1,1] },
  { n:34, home:"Túnez",                away:"Japón",                 ben:[0,2], cha:[1,3], rod:[0,2], mr:[1,3] },
  { n:35, home:"Túnez",                away:"Países Bajos",          ben:[0,2], cha:[0,3], rod:[0,2], mr:[0,4] },
  { n:36, home:"Japón",                away:"Suecia",                ben:[2,1], cha:[1,1], rod:[2,1], mr:[1,1] },
  { n:37, home:"RI de Irán",           away:"Nueva Zelanda",         ben:[1,0], cha:[1,0], rod:[1,2], mr:[2,0] },
  { n:38, home:"Bélgica",              away:"Egipto",                ben:[3,1], cha:[2,1], rod:[2,0], mr:[1,1] },
  { n:39, home:"RI de Irán",           away:"Bélgica",               ben:[1,2], cha:[0,3], rod:[0,2], mr:[0,2] },
  { n:40, home:"Egipto",               away:"Nueva Zelanda",         ben:[2,1], cha:[2,1], rod:[1,1], mr:[3,0] },
  { n:41, home:"Egipto",               away:"RI de Irán",            ben:[1,1], cha:[2,1], rod:[1,1], mr:[2,2] },
  { n:42, home:"Nueva Zelanda",        away:"Bélgica",               ben:[0,3], cha:[0,4], rod:[1,2], mr:[0,5] },
  { n:43, home:"Arabia Saudí",         away:"Uruguay",               ben:[0,2], cha:[0,2], rod:[2,3], mr:[0,3] },
  { n:44, home:"España",               away:"Cabo Verde",            ben:[3,0], cha:[6,0], rod:[3,0], mr:[7,0] },
  { n:45, home:"Arabia Saudí",         away:"España",                ben:[1,3], cha:[1,3], rod:[1,2], mr:[1,4] },
  { n:46, home:"Cabo Verde",           away:"Uruguay",               ben:[0,3], cha:[1,1], rod:[0,3], mr:[0,2] },
  { n:47, home:"Cabo Verde",           away:"Arabia Saudí",          ben:[1,1], cha:[2,1], rod:[0,2], mr:[0,0] },
  { n:48, home:"Uruguay",              away:"España",                ben:[1,2], cha:[0,3], rod:[2,2], mr:[1,1] },
  { n:49, home:"Francia",              away:"Senegal",               ben:[3,1], cha:[3,1], rod:[3,1], mr:[2,2] },
  { n:50, home:"Irak",                 away:"Noruega",               ben:[0,2], cha:[0,2], rod:[0,2], mr:[0,3] },
  { n:51, home:"Francia",              away:"Irak",                  ben:[4,0], cha:[4,0], rod:[3,0], mr:[4,0] },
  { n:52, home:"Noruega",              away:"Senegal",               ben:[2,2], cha:[2,1], rod:[2,2], mr:[3,3] },
  { n:53, home:"Noruega",              away:"Francia",               ben:[1,2], cha:[1,2], rod:[0,2], mr:[2,1] },
  { n:54, home:"Senegal",              away:"Irak",                  ben:[3,0], cha:[2,0], rod:[2,0], mr:[2,0] },
  { n:55, home:"Argentina",            away:"Argelia",               ben:[3,0], cha:[1,1], rod:[2,0], mr:[0,0] },
  { n:56, home:"Austria",              away:"Jordania",              ben:[2,0], cha:[3,0], rod:[1,1], mr:[3,0] },
  { n:57, home:"Argentina",            away:"Austria",               ben:[2,0], cha:[2,1], rod:[2,0], mr:[1,1] },
  { n:58, home:"Jordania",             away:"Argelia",               ben:[1,2], cha:[0,2], rod:[0,0], mr:[0,2] },
  { n:59, home:"Jordania",             away:"Argentina",             ben:[0,3], cha:[0,4], rod:[0,3], mr:[0,4] },
  { n:60, home:"Argelia",              away:"Austria",               ben:[1,1], cha:[1,2], rod:[2,1], mr:[1,1] },
  { n:61, home:"Portugal",             away:"RD Congo",              ben:[3,1], cha:[2,0], rod:[3,1], mr:[3,1] },
  { n:62, home:"Uzbekistán",           away:"Colombia",              ben:[0,2], cha:[0,3], rod:[1,4], mr:[0,1] },
  { n:63, home:"Portugal",             away:"Uzbekistán",            ben:[2,0], cha:[3,0], rod:[3,0], mr:[1,0] },
  { n:64, home:"Colombia",             away:"RD Congo",              ben:[3,0], cha:[2,1], rod:[2,2], mr:[4,0] },
  { n:65, home:"Colombia",             away:"Portugal",              ben:[1,2], cha:[1,3], rod:[2,3], mr:[2,1] },
  { n:66, home:"RD Congo",             away:"Uzbekistán",            ben:[1,1], cha:[1,1], rod:[2,0], mr:[0,1] },
  { n:67, home:"Ghana",                away:"Panamá",                ben:[1,2], cha:[1,0], rod:[2,2], mr:[2,1] },
  { n:68, home:"Inglaterra",           away:"Croacia",               ben:[2,1], cha:[3,0], rod:[2,0], mr:[0,2] },
  { n:69, home:"Ghana",                away:"Inglaterra",            ben:[0,3], cha:[0,2], rod:[0,1], mr:[1,3] },
  { n:70, home:"Croacia",              away:"Panamá",                ben:[2,0], cha:[2,0], rod:[2,1], mr:[4,0] },
  { n:71, home:"Croacia",              away:"Ghana",                 ben:[2,1], cha:[1,1], rod:[2,1], mr:[2,0] },
  { n:72, home:"Panamá",               away:"Inglaterra",            ben:[0,2], cha:[0,5], rod:[0,3], mr:[0,4] },
];

const USERS = [
  { email: "jbmartinez93@hotmail.com",        preds: "ben" as const },
  { email: "carlos.rodriguezp@mail.udp.cl",   preds: "cha" as const },
  { email: "rodrigo.madariaga@alumni.ie.edu", preds: "rod" as const },
  { email: "marpandres1994@gmail.com",        preds: "mr"  as const },
];

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Load all matches and users from DB
    const dbMatches = await sql`SELECT id, home_team, away_team FROM matches WHERE finished = false`;
    const dbUsers   = await sql`SELECT id, email FROM users`;

    let imported = 0;
    let skipped  = 0;
    const unmatched: string[] = [];

    for (const pred of PREDICTIONS) {
      // Find matching match in DB
      const match = (dbMatches as Array<{id:number; home_team:string; away_team:string}>).find(
        (m) => matchTeam(pred.home, m.home_team) && matchTeam(pred.away, m.away_team)
      );

      if (!match) {
        unmatched.push(`${pred.home} vs ${pred.away}`);
        skipped++;
        continue;
      }

      for (const u of USERS) {
        const scores = pred[u.preds] as [number, number];
        const user = (dbUsers as Array<{id:number; email:string}>).find(
          (usr) => usr.email === u.email
        );
        if (!user) continue;

        await sql`
          INSERT INTO predictions (user_id, match_id, predicted_home, predicted_away)
          VALUES (${user.id}, ${match.id}, ${scores[0]}, ${scores[1]})
          ON CONFLICT (user_id, match_id) DO UPDATE SET
            predicted_home = EXCLUDED.predicted_home,
            predicted_away = EXCLUDED.predicted_away,
            updated_at = NOW()
        `;
        imported++;
      }
    }

    return NextResponse.json({ ok: true, imported, skipped, unmatched });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
