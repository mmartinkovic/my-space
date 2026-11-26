import { defaultLocale } from '@projectu/core-i18n';
import type { ReactNode } from 'react';

type RootLayoutProps = { readonly children: ReactNode };

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang={defaultLocale}>
    <body>{children}</body>
  </html>
);

export default RootLayout;
