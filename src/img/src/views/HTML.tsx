import React, { PropsWithChildren } from 'react';
import cssURL from '@src/assets/css/input.scss';
import { LinkStyleSheet } from 'jsxp';
export default function HTML({ children }: PropsWithChildren) {
  return (
    <html>
      <head>
        <LinkStyleSheet src={cssURL} />
      </head>
      <body>{children}</body>
    </html>
  );
}
