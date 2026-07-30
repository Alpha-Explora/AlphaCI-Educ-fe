"use client";
// VIEW LAYER — Student: what CI/CD is and how it checks their work.
//
// A reference page with no data dependency, so it renders for a student who has
// not been given an assignment yet — which is exactly when they most need it.
import { PageHeader } from "@/components/domain/PageHeader";
import { CicdExplainer } from "@/components/domain/CicdExplainer";

export default function StudentHowItWorksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="How it works"
        subtitle="What CI/CD is, what runs when you push, and how to read your results."
      />
      <CicdExplainer />
    </div>
  );
}
