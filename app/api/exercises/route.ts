import { EXERCISES, publicExercise } from "@/lib/catalog";

export async function GET() {
  return Response.json({
    catalogVersion: "toolgym-core-1.0.0",
    exercises: EXERCISES.map(publicExercise),
  });
}
