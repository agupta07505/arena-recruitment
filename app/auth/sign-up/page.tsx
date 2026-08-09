import { AuthScreen } from "@/app/auth/auth-screen";

type SignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  return (
    <AuthScreen
      error={typeof params.error === "string" ? params.error : null}
      message={typeof params.message === "string" ? params.message : null}
      mode="sign-up"
    />
  );
}
