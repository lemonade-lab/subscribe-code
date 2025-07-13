import { appName, alemonjsCodeVersion } from '../../../models/config.js';
import { BackgroundImage } from 'jsxp';
import React from 'react';
import HTML from './HTML.js';

function Help({ data, theme = 'dark' }) {
    return (React.createElement(HTML, null,
        React.createElement(BackgroundImage, { className: "px-4", id: "root", "data-theme": theme },
            React.createElement("div", { className: "min-h-4" }),
            React.createElement("div", { className: "bg-blue-200 bg-opacity-50 border-2 border-pink-400 px-4 pb-2 rounded-md flex justify-center items-center flex-col gap-0.5" },
                React.createElement("div", { className: "bg-pink-100 bg-opacity-60 text-pink-600 text-2xl px-6 py-2 rounded-2xl border border-pink-400 shadow font-bold text-center mt-4 mb-2" }, "CODE-HELP"),
                React.createElement("div", { className: "flex flex-col w-full gap-2 mb-3 overflow-visible relative" },
                    data.map((val, index) => (React.createElement("div", { className: "relative rounded-xl mt-6 mb-4 px-0 pt-4 pb-2 bg-white bg-opacity-40 border border-pink-400 shadow-lg", key: index },
                        React.createElement("div", { className: "absolute -top-3 -left-2 flex items-center" },
                            React.createElement("span", { className: "w-3 h-3 bg-pink-200 border border-pink-400 rotate-45 mr-2 block" }),
                            React.createElement("span", { className: "bg-pink-100 bg-opacity-60 text-pink-600 text-sm px-4 py-1 rounded-2xl border border-pink-400 shadow" }, val.title),
                            React.createElement("span", { className: "w-3 h-3 bg-pink-200 border border-pink-400 rotate-45 ml-2 block" })),
                        React.createElement("div", { className: "flex flex-wrap pt-2 pb-2 px-6 gap-x-4 gap-y-2" }, val.list.map((item, itemIndex) => (React.createElement("div", { className: "flex items-center min-w-[250px] max-w-[330px] flex-1 basis-0 bg-white bg-opacity-80 shadow-md rounded-lg px-3 py-2 border border-pink-200", key: itemIndex },
                            React.createElement("div", { className: "ml-1 break-all" },
                                React.createElement("div", { className: "font-bold text-sm text-gray-800" }, item.title),
                                React.createElement("div", { className: "text-xs text-blue-900 mt-1" }, item.desc))))))))),
                    React.createElement("div", { className: "text-center text-sm text-gray-700 mt-2" },
                        "Created By -",
                        React.createElement("span", { className: "font-bold text-black-600" },
                            " ",
                            appName,
                            " "),
                        "- v",
                        React.createElement("span", { className: "italic" }, alemonjsCodeVersion)))),
            React.createElement("div", { className: "min-h-4" }))));
}

export { Help as default };
