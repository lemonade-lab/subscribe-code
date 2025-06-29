import React from 'react';
import { BackgroundImage } from 'jsxp';
import HTML from './HTML.js';

function Help({ data }) {
    return (React.createElement(HTML, null,
        React.createElement(BackgroundImage, { className: "px-4", id: "root", "data-theme": data?.theme || 'dark' },
            React.createElement("div", { className: "min-h-4" }),
            React.createElement("div", { className: "bg-blue-200 bg-opacity-50 border-2 border-cyan-600 px-8 pb-2 rounded-md flex justify-center items-center flex-col gap-4" },
                React.createElement("div", { className: "text-3xl text-white p-2 border-b-2 border-cyan-900 bg-blue-400 bg-opacity-60 shadow-2xl  min-w-96 text-center " }, "\u4FEE\u4ED9\u5E2E\u52A9"),
                React.createElement("div", { className: "flex flex-col w-full gap-2 mb-5 overflow-hidden relative  " },
                    React.createElement("div", { className: " mx-16  shadow-2xl bg-cyan-600 bg-opacity-70 text-white rounded-md text-lg font-bold px-2 text-center" }, "\u4F7F\u7528 /\u5E2E\u52A91 \u67E5\u770B\u7B2C\u4E00\u9875\uFF0C\u4F7F\u7528 /\u5E2E\u52A92 \u67E5\u770B\u7B2C\u4E8C\u9875\uFF0C\u4EE5\u6B64\u7C7B\u63A8"),
                    React.createElement("div", { className: "text-center" }, "\u5927\u7FA4\uFF08806943302\uFF09"),
                    React.createElement("div", { className: " flex flex-col gap-4" }, data.value.map((item, index) => (React.createElement("div", { key: index, className: "px-4 py-2 bg-white bg-opacity-60 rounded-full shadow-md" },
                        React.createElement("div", { className: "flex justify-between" },
                            React.createElement("div", { className: " font-bold" }, item.title),
                            React.createElement("div", { className: "px-2" }, item.desc)))))))),
            React.createElement("div", { className: "min-h-4" }))));
}

export { Help as default };
