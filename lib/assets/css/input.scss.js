const reg = ['win32'].includes(process.platform) ? /^file:\/\/\// : /^file:\/\// ;
const fileUrl = new URL('../input.scss-C6mUY-XP.css', import.meta.url).href.replace(reg, '');

export { fileUrl as default };
