const reg = ['win32'].includes(process.platform) ? /^file:\/\/\// : /^file:\/\// ;
const fileUrl = new URL('../input.scss-gBH0lusG.css', import.meta.url).href.replace(reg, '');

export { fileUrl as default };
