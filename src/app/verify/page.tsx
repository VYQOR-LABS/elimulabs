import VerifyAccount from "../../components/VerifyAccount";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}): Promise<React.ReactElement> {
  const { token } = await searchParams;
  return <VerifyAccount token={token ?? ""} />;
}
