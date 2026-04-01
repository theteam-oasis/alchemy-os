import './globals.css'

export const metadata = {
  title: 'Alchemy Studios',
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
