(() => {
  const doNotTrack = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (navigator.globalPrivacyControl === true || doNotTrack === "1" || doNotTrack === "yes") return;

  const endpoint = "https://fengzhuo-site-analytics.fengzhuozhang.workers.dev/collect";
  const body = JSON.stringify({ page: window.location.pathname || "/" });
  let sent = false;

  function send() {
    if (sent) return;
    sent = true;
    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
    fetch(endpoint, {
      method: "POST",
      body,
      credentials: "omit",
      keepalive: true,
      mode: "cors"
    }).catch(() => undefined);
  }

  if (document.readyState === "complete") send();
  else window.addEventListener("load", send, { once: true });
})();
