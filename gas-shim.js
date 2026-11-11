// gas-shim.js — meniru google.script.run lewat fetch ke Apps Script (Api.gs)
(function () {
  var API_URL = 'https://script.google.com/macros/s/AKfycbyIQ96mPN2iBhfA4Py7Ag6d7Lthf-5GrKTIDw9C3HCzAnMQK6VbUwy98mFw546w-KxQ/exec';
  var SESSION_KEY = 'absensiAppSession';

  function getToken() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return s && s.token ? s.token : null;
    } catch (e) { return null; }
  }

  function panggil(fn, args, ok, fail) {
    // fungsi lokal pengganti
    if (fn === 'getDeploymentUrl') { if (ok) setTimeout(function () { ok(API_URL); }, 0); return; }

    fetch(API_URL, {
      method: 'POST',
      // text/plain supaya tidak memicu preflight CORS (Apps Script tidak mendukung OPTIONS)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: fn, args: args, token: getToken() }),
      redirect: 'follow'
    })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (res && res.ok) { if (ok) ok(res.result); }
      else {
        var err = new Error((res && res.error) || 'Terjadi kesalahan server.');
        if (fail) fail(err); else console.error(fn, err);
      }
    })
    .catch(function (e) {
      var err = new Error('Gagal terhubung ke server: ' + (e && e.message ? e.message : e));
      if (fail) fail(err); else console.error(fn, err);
    });
  }

  function buatRunner(ok, fail) {
    var dasar = {
      withSuccessHandler: function (f) { return buatRunner(f, fail); },
      withFailureHandler: function (f) { return buatRunner(ok, f); },
      withUserObject: function () { return buatRunner(ok, fail); }
    };
    return new Proxy(dasar, {
      get: function (t, nama) {
        if (nama in t) return t[nama];
        if (typeof nama !== 'string') return undefined;
        return function () {
          panggil(nama, Array.prototype.slice.call(arguments), ok, fail);
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = { run: buatRunner(null, null), host: { close: function () {} } };
})();
