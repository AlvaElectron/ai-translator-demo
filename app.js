// AI-Translator『コトリア』 Web 操作確認版: Pyodide（ブラウザの中の Python）で通訳機の画面のプログラムを動かし、できた絵を canvas に写す。
// Python 側の入り口は web/entry.py（start / tap / key / step）。
(async () => {
  const canvas = document.getElementById("screen");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("status");
  const WIDTH = 800, HEIGHT = 480, FRAME_MS = 33;

  let stage = "";
  const started = Date.now();
  const show = (text) => { stage = text; status.textContent = text; status.classList.remove("hidden"); };
  const fail = (error) => { console.error(error); show("読み込めませんでした: " + (error && error.message ? error.message : error) + "\n（F12 を押して「コンソール」を見ると、くわしい理由が出ます）"); };
  // 読み込みの様子を、画面の下に出す（どのファイルまで届いたか。止まったときに、どこで止まったかが分かる）
  const progress = document.getElementById("progress");
  const FILES = ["pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json", "pygame_ce", "bundle.zip"];
  const progressText = () => {
    const entries = (window.performance && performance.getEntriesByType) ? performance.getEntriesByType("resource") : [];
    return FILES.map((name) => {
      const entry = entries.find((e) => e.name.includes(name));
      if (!entry) return "…　" + name + "　（まだ届いていません）";
      const kb = Math.round((entry.encodedBodySize || entry.transferSize || 0) / 1024);
      return "✓　" + name + "　" + (entry.duration / 1000).toFixed(1) + " 秒　" + kb + "KB";
    }).join("\n");
  };
  // 止まって見えないように、読み込み中は経過の秒数を出す
  const ticker = window.setInterval(() => {
    if (!status.classList.contains("hidden") && !stage.startsWith("読み込めませんでした")) {
      const seconds = Math.round((Date.now() - started) / 1000);
      status.textContent = stage + "　" + seconds + " 秒" + (seconds > 90 ? "\n（時間がかかっています。下の「読み込みの様子」を見てください）" : "");
    }
    if (progress) progress.textContent = progressText();
  }, 1000);
  // 読み込みの途中で起きた、拾われなかった失敗も、画面に出す
  window.addEventListener("unhandledrejection", (event) => fail(event.reason));
  window.addEventListener("error", (event) => { if (!status.classList.contains("hidden")) fail(event.error || event.message); });

  // サーバーが .wasm の種類を「application/wasm」で返さないとき（古い Web Station など）でも動くよう、
  // 「ストリーミング読み込み」をやめて、中身を受け取ってから WebAssembly に渡す
  if (window.WebAssembly) {
    const bytesOf = async (source) => (await source).arrayBuffer();
    WebAssembly.compileStreaming = async (source) => WebAssembly.compile(await bytesOf(source));
    WebAssembly.instantiateStreaming = async (source, imports) => WebAssembly.instantiate(await bytesOf(source), imports);
  }

  try {
    show("Python を読み込んでいます…（初回は少し時間がかかります）");
    // Pyodide の場所は、ページからの絶対の場所にして渡す（相対のままだと、pyodide.js の場所から数えられて、見つからないことがある）
    const indexURL = new URL(window.PYODIDE_BASE, document.baseURI).href;
    const pyodide = await loadPyodide({ indexURL });
    show("画面の部品（pygame）を読み込んでいます…");
    await pyodide.loadPackage("pygame-ce");
    show("通訳機のプログラムを読み込んでいます…");
    const response = await fetch("bundle.zip");
    if (!response.ok) throw new Error("bundle.zip が見つかりません（" + response.status + "）");
    pyodide.unpackArchive(await response.arrayBuffer(), "zip", { extractDir: "/app" });
    pyodide.runPython('import sys\nsys.path.insert(0, "/app")\nimport web_entry\nweb_entry.start()');
    const entry = pyodide.pyimport("web_entry");

    // 画面の絵（Python が RGBA の 800 x 480 を返す）を canvas に写す
    const image = ctx.createImageData(WIDTH, HEIGHT);
    let busy = false;
    const draw = () => {
      if (busy) return;
      busy = true;
      try {
        const bytes = entry.step();
        if (bytes) {
          image.data.set(bytes.toJs());
          bytes.destroy();
          ctx.putImageData(image, 0, 0);
        }
      } catch (error) {
        fail(error);
        return;
      } finally {
        busy = false;
      }
      window.setTimeout(draw, FRAME_MS);
    };

    // クリック・タッチ → 画面の座標（0〜800 x 0〜480）にして渡す
    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      canvas.focus();
      const rect = canvas.getBoundingClientRect();
      entry.tap(Math.round(((event.clientX - rect.left) * WIDTH) / rect.width), Math.round(((event.clientY - rect.top) * HEIGHT) / rect.height));
    });
    // キーボード（画面にフォーカスがあるときだけ）
    canvas.addEventListener("keydown", (event) => {
      if (event.isComposing || event.metaKey || event.altKey) return;
      if (entry.key(event.key, event.shiftKey, event.ctrlKey)) event.preventDefault();
    });

    window.clearInterval(ticker);
    const diagnosis = document.getElementById("diagnosis");
    if (diagnosis) diagnosis.removeAttribute("open");
    status.classList.add("hidden");
    draw();
  } catch (error) {
    fail(error);
  }
})();
