import type { Metadata } from "next";
import CredentialView from "./CredentialView";

export const metadata: Metadata = {
  title: "Verify agent mastery",
  description: "Inspect and verify a ToolGym agent tool-mastery credential.",
};

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CredentialView id={id} />;
}
