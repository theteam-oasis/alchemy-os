import './globals.css'

export const metadata = {
  title: 'Alchemy OS',
  description: 'AI-powered creative ads agency platform',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
