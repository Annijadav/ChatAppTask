export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body>{children}</body>
    </html>
  );
}
