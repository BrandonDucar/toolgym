import { LABS, publicLab } from "@/lib/labs";

export async function GET() {
  return Response.json({
    catalogVersion: "toolgym-labs-1.0.0",
    labs: LABS.map(publicLab),
  });
}
