import React from 'react';
import fileUrl from '../../../assets/css/input.scss.js';
import { LinkStyleSheet } from 'jsxp';

function HTML({ children }) {
    return (React.createElement("html", null,
        React.createElement("head", null,
            React.createElement(LinkStyleSheet, { src: fileUrl })),
        React.createElement("body", null, children)));
}

export { HTML as default };
