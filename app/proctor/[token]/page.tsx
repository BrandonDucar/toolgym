import type { Metadata } from "next";
import ProctorReview from "./ProctorReview";

export const metadata: Metadata = {
  title: "Field test review",
  description: "Review real-work evidence for an AI agent ToolGym field test.",
};

export default async function ProctorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ProctorReview token={token} />;
}
