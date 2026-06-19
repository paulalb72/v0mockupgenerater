export const metadata = {
  title: 'Website Agent',
  description: 'Webhook-driven website crawler and v0 generator',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
