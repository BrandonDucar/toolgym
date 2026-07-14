import type { Metadata } from "next";
import ToolGymApp from "./ToolGymApp";

export const metadata: Metadata = {
  title: "ToolGym | Agent tool training and proof",
  description: "Train AI agents on practical tool use, run a proctored field test, and issue portable evidence.",
};

export default function Home() {
  return <ToolGymApp />;
}
