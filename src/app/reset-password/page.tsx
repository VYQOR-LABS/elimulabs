import ResetPasswordForm from "../../components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}): Promise<React.ReactElement> {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}
