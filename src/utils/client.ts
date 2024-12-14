const ua = navigator.userAgent;

export function isSafari() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf('safari') !== -1) {
    if (ua.indexOf('chrome') > -1) {
      // alert("1") // Chrome
    } else {
      return true;
    }
  }
  return false;
}

export function isFirefox() {
  const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
  return isFirefox;
}

const newLocal = !!ua.match(/msie|trident/i);
const clientType = {
  isAndroid: !!ua.match(/Android/i), // android
  isIOS: !!ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/i), // mac or ios
  isIPad: !!ua.match(/iPad/i), // iPad
  isIPhone: !!ua.match(/iPhone/i), // iPhone
  isLinux: !!ua.match(/Linux/i), // linux
  isMac: !!ua.match(/Macintosh/i), // mac
  isMobile: !!ua.match(/AppleWebKit.*Mobile.*/i), // mobile
  isWindows: !!ua.match(/Window/i), // windows
  isIe: newLocal, // IE
  isSafari: isSafari(),
  isMobileSafari: false,
};

clientType.isMobileSafari = clientType.isMobile && clientType.isSafari;

export { clientType };
