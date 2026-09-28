import { redirect } from "next/navigation";

export default async function QcmModuleRedirect({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;

  redirect(`/qcm?moduleId=${moduleId}`);
}