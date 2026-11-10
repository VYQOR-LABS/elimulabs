import type { Metadata } from "next";
import "../styles.css";

export const metadata: Metadata = {
  title: "ElimuLabs | Learn. Create. Prepare. Choose.",
  description:
    "A welcoming home for learning resources, teacher tools, assessments and career guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
